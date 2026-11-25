<?php
// Shared helpers. You normally don't need to edit this file.
require_once __DIR__ . '/config.php';

const DATA_FILE = __DIR__ . '/data/state.json.php';
const RATE_FILE = __DIR__ . '/data/rate.json.php';
// Every data file starts with this line so nobody can read it from the web,
// even on hosts that ignore .htaccess.
const GUARD = "<?php http_response_code(404); exit; ?>\n";

function default_state(): array {
    return [
        'settings' => [
            'siteName'      => "Danny's Hangout",
            'streamerName'  => 'yokii',
            'tiktok'        => 'yokii_fn.alt',
            'discordInvite' => 'm7G76JxKnS',
            'live'          => false,
            'liveNote'      => 'Minecraft stream — come hang out!',
            'schedule'      => 'Live basically every day on TikTok',
            'eventTitle'    => 'Giveaway',
            'eventTime'     => '',
            'smpIp'         => 'breezevanilla.eu',
            'smpVersion'    => '',
            'mapUrl'        => '',
            'seed'          => '',
            'seedNote'      => '',
            'mcUsername'    => '',
            'clipPerson'    => 'fastdannydog',
            'secretWord'    => '',
        ],
        'clips'       => [],
        'polls'       => [],
        'leaderboard' => [],
        'donators'    => [],
        'builds'      => [],
        'videos'      => [],
        'pedia'       => [],
    ];
}

function read_guarded(string $file): ?array {
    if (!is_file($file)) return null;
    $raw = file_get_contents($file);
    if (str_starts_with($raw, GUARD)) $raw = substr($raw, strlen(GUARD));
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function write_guarded(string $file, array $data): void {
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, GUARD . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    rename($tmp, $file);
}

function load_state(): array {
    $s = read_guarded(DATA_FILE) ?? default_state();
    $def = default_state();
    $s['settings'] = array_merge($def['settings'], $s['settings'] ?? []);
    foreach ($def as $k => $v) if (!isset($s[$k])) $s[$k] = $v;
    return $s;
}

/** Load, change and save the state while holding a lock, so two visitors can't overwrite each other. */
function with_state(callable $fn) {
    $lock = fopen(__DIR__ . '/data/.lock', 'c');
    flock($lock, LOCK_EX);
    try {
        $s = load_state();
        $result = $fn($s);
        write_guarded(DATA_FILE, $s);
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function public_state(array $s): array {
    $clips = array_values(array_filter($s['clips'], fn($c) => ($c['status'] ?? '') === 'approved'));
    $clips = array_map(fn($c) => array_intersect_key($c, array_flip(['id','type','provider','src','link','title','by','created'])), $clips);
    $polls = array_map(function ($p) {
        unset($p['voters']);
        return $p;
    }, $s['polls']);
    return [
        'settings'    => $s['settings'],
        'clips'       => $clips,
        'polls'       => $polls,
        'leaderboard' => $s['leaderboard'],
        'donators'    => $s['donators'],
        'builds'      => $s['builds'],
        'videos'      => $s['videos'],
        'pedia'       => $s['pedia'],
    ];
}

function client_hash(): string {
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ADMIN_PASSWORD);
}

/** Returns true if this visitor is still under $limit actions of $kind in the last hour. */
function rate_ok(string $kind, int $limit): bool {
    $lock = fopen(__DIR__ . '/data/.ratelock', 'c');
    flock($lock, LOCK_EX);
    $r = read_guarded(RATE_FILE) ?? [];
    $now = time();
    foreach ($r as $k => $times) {
        $r[$k] = array_values(array_filter($times, fn($t) => $t > $now - 3600));
        if (!$r[$k]) unset($r[$k]);
    }
    $key = $kind . ':' . client_hash();
    $ok = count($r[$key] ?? []) < $limit;
    if ($ok) $r[$key][] = $now;
    write_guarded(RATE_FILE, $r);
    flock($lock, LOCK_UN);
    fclose($lock);
    return $ok;
}

function clean(string $v, int $max = 80): string {
    $v = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $v));
    return mb_substr($v, 0, $max);
}

/** Pulls the numeric video id out of a TikTok link. Follows short vm.tiktok.com links if possible. */
function tiktok_id(string $url): ?string {
    if (preg_match('~tiktok\.com/@[^/]+/video/(\d{8,25})~', $url, $m)) return $m[1];
    if (preg_match('~tiktok\.com/(?:embed/(?:v2/)?|v/)(\d{8,25})~', $url, $m)) return $m[1];
    if (preg_match('~^https?://(vm|vt|www)\.tiktok\.com/(t/)?[A-Za-z0-9]+/?~', $url) && function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5,
            CURLOPT_TIMEOUT => 8, CURLOPT_RETURNTRANSFER => true, CURLOPT_USERAGENT => 'Mozilla/5.0']);
        curl_exec($ch);
        $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);
        if ($final && preg_match('~/video/(\d{8,25})~', $final, $m)) return $m[1];
    }
    return null;
}

function new_id(): string { return bin2hex(random_bytes(6)); }

function json_out($data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// =====================================================================
//  TikTok live tracker
//  Reads Yokii's public TikTok pages (no login, no API key) and keeps a
//  small history: every stream, its peak viewers, viewers over time,
//  the all-time top viewer count and daily follower counts.
// =====================================================================
const LIVE_FILE = __DIR__ . '/data/live.json.php';
const LIVE_CHECK_EVERY = 60;      // seconds between TikTok checks
const PROFILE_CHECK_EVERY = 900;  // followers/likes every 15 minutes

function tt_get(string $url): ?string {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3,
        CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        CURLOPT_HTTPHEADER => ['Accept-Language: en-US,en;q=0.9', 'Accept: text/html,application/xhtml+xml'],
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ($body !== false && $code === 200) ? $body : null;
}

function tt_script_json(string $html, string $id): ?array {
    if (!preg_match('~<script id="' . preg_quote($id, '~') . '"[^>]*>(.*?)</script>~s', $html, $m)) return null;
    $d = json_decode($m[1], true);
    return is_array($d) ? $d : null;
}

/** Live room info: status 2 = live, 4 = ended. */
function tt_live_info(string $user): ?array {
    $html = tt_get('https://www.tiktok.com/@' . rawurlencode($user) . '/live');
    if (!$html) return null;
    $d = tt_script_json($html, 'SIGI_STATE');
    $info = $d['LiveRoom']['liveRoomUserInfo'] ?? null;
    if (!$info) return null;
    $room = $info['liveRoom'] ?? [];
    return [
        'roomId'  => (string)($info['user']['roomId'] ?? ''),
        'status'  => (int)($room['status'] ?? $info['user']['status'] ?? 0),
        'title'   => mb_substr((string)($room['title'] ?? ''), 0, 120),
        'start'   => (int)($room['startTime'] ?? 0),
        'viewers' => (int)($room['liveRoomStats']['userCount'] ?? 0),
        'total'   => (int)($room['liveRoomStats']['enterCount'] ?? 0),
    ];
}

function tt_profile(string $user): ?array {
    $html = tt_get('https://www.tiktok.com/@' . rawurlencode($user));
    if (!$html) return null;
    $d = tt_script_json($html, '__UNIVERSAL_DATA_FOR_REHYDRATION__');
    $ui = $d['__DEFAULT_SCOPE__']['webapp.user-detail']['userInfo'] ?? null;
    if (!$ui) return null;
    $st = $ui['statsV2'] ?? $ui['stats'] ?? [];
    return [
        'nickname'  => (string)($ui['user']['nickname'] ?? ''),
        'followers' => (int)($st['followerCount'] ?? 0),
        'likes'     => (int)($st['heartCount'] ?? $st['heart'] ?? 0),
        'videos'    => (int)($st['videoCount'] ?? 0),
    ];
}

function live_default(): array {
    return ['checkedAt' => 0, 'profileAt' => 0, 'ok' => false, 'now' => null, 'profile' => null,
            'streams' => [], 'peak' => null, 'followers' => []];
}

/** Checks TikTok if the cache is old, updates the history, returns the stored data. */
function live_refresh(string $user, bool $force = false): array {
    $lock = fopen(__DIR__ . '/data/.livelock', 'c');
    flock($lock, LOCK_EX);
    try {
        $L = array_merge(live_default(), read_guarded(LIVE_FILE) ?? []);
        $t = time();
        if (!$force && $t - $L['checkedAt'] < LIVE_CHECK_EVERY) return $L;
        $L['checkedAt'] = $t;

        $info = tt_live_info($user);
        $L['ok'] = $info !== null;
        if ($info) {
            $isLive = $info['status'] === 2 && $info['roomId'] !== '';
            $L['now'] = $info + ['live' => $isLive];
            $idx = null;
            foreach ($L['streams'] as $i => $s) if (($s['roomId'] ?? '') === $info['roomId'] && $info['roomId'] !== '') $idx = $i;

            if ($isLive) {
                if ($idx === null) {
                    $L['streams'][] = ['roomId' => $info['roomId'], 'title' => $info['title'], 'start' => $info['start'] ?: $t,
                        'end' => null, 'peak' => 0, 'total' => 0, 'samples' => []];
                    $idx = count($L['streams']) - 1;
                }
                $s = &$L['streams'][$idx];
                $s['title'] = $info['title'] ?: $s['title'];
                $s['end'] = null;
                $s['peak'] = max((int)$s['peak'], $info['viewers']);
                $s['total'] = max((int)$s['total'], $info['total']);
                $last = end($s['samples']);
                if (!$last || $t - $last[0] >= 55) $s['samples'][] = [$t, $info['viewers']];
                if (count($s['samples']) > 1500) $s['samples'] = array_values(array_filter($s['samples'], fn($x, $k) => $k % 2 === 0, ARRAY_FILTER_USE_BOTH));
                if (!$L['peak'] || $info['viewers'] > $L['peak']['viewers'])
                    $L['peak'] = ['viewers' => $info['viewers'], 'at' => $t, 'title' => $s['title']];
                unset($s);
            } else {
                // close streams that were live last time we looked
                foreach ($L['streams'] as &$s) if ($s['end'] === null && empty($s['partial'])) {
                    $lastSample = end($s['samples']);
                    $s['end'] = $lastSample ? $lastSample[0] : $t;
                    if ($s['roomId'] === $info['roomId']) $s['total'] = max((int)$s['total'], $info['total']);
                }
                unset($s);
                // a stream we never saw live (e.g. before the site existed): keep what TikTok tells us
                if ($idx === null && $info['roomId'] !== '' && $info['start'] > 0)
                    $L['streams'][] = ['roomId' => $info['roomId'], 'title' => $info['title'], 'start' => $info['start'],
                        'end' => null, 'ended' => true, 'peak' => null, 'total' => $info['total'], 'samples' => [], 'partial' => true];
            }
            usort($L['streams'], fn($a, $b) => $a['start'] <=> $b['start']);
            if (count($L['streams']) > 400) $L['streams'] = array_slice($L['streams'], -400);
        }

        if ($force || $t - $L['profileAt'] >= PROFILE_CHECK_EVERY) {
            $p = tt_profile($user);
            if ($p) {
                $L['profile'] = $p;
                $L['profileAt'] = $t;
                $day = gmdate('Y-m-d', $t);
                $n = count($L['followers']);
                if ($n && $L['followers'][$n - 1][0] === $day) $L['followers'][$n - 1][1] = $p['followers'];
                else $L['followers'][] = [$day, $p['followers']];
                $L['followers'] = array_slice($L['followers'], -730);
            }
        }
        write_guarded(LIVE_FILE, $L);
        return $L;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/** The part of the tracker data the public pages get. */
function live_public(array $L, array $settings): array {
    $streams = $L['streams'];
    $live = !empty($L['now']['live']);
    $cur = $live ? end($streams) : null;
    $done = array_values(array_filter($streams, fn($s) => !$live || $s !== $cur));
    $hours = 0; $peaks = [];
    foreach ($streams as $s) {
        $end = $s['end'] ?? ($live && $s === $cur ? time() : null);
        if ($end && empty($s['partial'])) $hours += max(0, $end - $s['start']) / 3600;
        if (!empty($s['peak'])) $peaks[] = $s['peak'];
    }
    $strip = fn($s) => array_diff_key($s, ['samples' => 1, 'roomId' => 1]);
    $lastWithSamples = null;
    foreach (array_reverse($streams) as $s) if (count($s['samples'] ?? []) > 1) { $lastWithSamples = $s; break; }
    return [
        'ok'        => $L['ok'],
        'checkedAt' => $L['checkedAt'],
        'live'      => $live || !empty($settings['live']),
        'autoLive'  => $live,
        'now'       => $live ? ['title' => $L['now']['title'], 'start' => $L['now']['start'], 'viewers' => $L['now']['viewers'],
                                'total' => $L['now']['total'], 'peak' => $cur['peak'] ?? 0] : null,
        'chart'     => $lastWithSamples ? ['title' => $lastWithSamples['title'], 'start' => $lastWithSamples['start'],
                                           'live' => $live && $lastWithSamples === $cur, 'samples' => $lastWithSamples['samples']] : null,
        'last'      => $done ? $strip(end($done)) : null,
        'history'   => array_map($strip, array_reverse(array_slice($done, -40))),
        'peak'      => $L['peak'],
        'profile'   => $L['profile'],
        'followers' => $L['followers'],
        'totals'    => ['streams' => count($streams), 'hours' => round($hours, 1),
                        'avgPeak' => $peaks ? (int)round(array_sum($peaks) / count($peaks)) : null],
    ];
}

// =====================================================================
//  Clip links from anywhere
//  Turns a pasted link into something the wheel can play. Known sites are
//  stored as  provider + id  (the page builds the player from that), any
//  other web link is kept as a plain link people can open.
// =====================================================================
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'ogv', 'ogg', 'avi', '3gp', 'gif'];

function clip_from_link(string $url): ?array {
    $url = trim($url);
    if (strlen($url) > 600 || !preg_match('~^https?://[^\s<>"\']+$~i', $url)) return null;
    $host = strtolower(preg_replace('~^www\.|^m\.~', '', (string)parse_url($url, PHP_URL_HOST)));
    $path = (string)parse_url($url, PHP_URL_PATH);
    parse_str((string)parse_url($url, PHP_URL_QUERY), $q);
    $embed = fn($provider, $id) => ['type' => 'embed', 'provider' => $provider, 'src' => $id, 'link' => $url];

    // TikTok (also short vm./vt. links)
    if (str_ends_with($host, 'tiktok.com') && ($id = tiktok_id($url))) return ['type' => 'tiktok', 'src' => $id, 'link' => $url];
    // YouTube: watch, shorts, youtu.be, embed, live
    if (in_array($host, ['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'], true)) {
        if (!empty($q['v']) && preg_match('~^[\w-]{11}$~', $q['v'])) return $embed('youtube', $q['v']);
        if (preg_match('~^/(?:shorts|embed|live|v)/([\w-]{11})~', $path, $m)) return $embed('youtube', $m[1]);
    }
    if ($host === 'youtu.be' && preg_match('~^/([\w-]{11})~', $path, $m)) return $embed('youtube', $m[1]);
    // Twitch clips and VODs
    if ($host === 'clips.twitch.tv') {
        $slug = $q['clip'] ?? trim($path, '/');
        if (preg_match('~^[\w-]{3,120}$~', $slug)) return $embed('twitch-clip', $slug);
    }
    if ($host === 'twitch.tv') {
        if (preg_match('~/clip/([\w-]{3,120})~', $path, $m)) return $embed('twitch-clip', $m[1]);
        if (preg_match('~^/videos/(\d+)~', $path, $m)) return $embed('twitch-vod', $m[1]);
    }
    // Instagram reels / posts
    if ($host === 'instagram.com' && preg_match('~^/(?:reel|reels|p|tv)/([\w-]{5,40})~', $path, $m)) return $embed('instagram', $m[1]);
    // Streamable
    if ($host === 'streamable.com' && preg_match('~^/(?:e/|o/)?([a-z0-9]{3,12})/?$~i', $path, $m)) return $embed('streamable', $m[1]);
    // Medal.tv
    if ($host === 'medal.tv' && preg_match('~/clips?/([\w-]{4,60})~', $path, $m)) return $embed('medal', $m[1]);
    // Kick clips
    if ($host === 'kick.com') {
        $cid = $q['clip'] ?? (preg_match('~/clips/(clip_[\w-]+)~', $path, $m) ? $m[1] : '');
        if (preg_match('~^clip_[\w-]{4,60}$~', $cid)) return ['type' => 'link', 'provider' => 'kick', 'src' => $url, 'link' => $url];
    }
    // A direct video file somewhere on the web (Discord, Google Drive download links etc.)
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (in_array($ext, VIDEO_EXT, true)) return ['type' => 'video_url', 'src' => $url, 'link' => $url];
    // Anything else: keep it as a link
    $known = ['x.com' => 'x', 'twitter.com' => 'x', 'facebook.com' => 'facebook', 'fb.watch' => 'facebook', 'reddit.com' => 'reddit',
              'snapchat.com' => 'snapchat', 'drive.google.com' => 'drive', 'outplayed.tv' => 'outplayed', 'allstar.gg' => 'allstar'];
    return ['type' => 'link', 'provider' => $known[$host] ?? 'web', 'src' => $url, 'link' => $url];
}

/** Server-side player HTML (admin preview). Mirrors Site.clipHtml() in site.js. */
function clip_player_html(array $c, string $base = ''): string {
    $e = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $host = preg_replace('~:\d+$~', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $frame = fn($src) => '<iframe src="' . $e($src) . '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    switch ($c['type']) {
        case 'file':
            if (str_ends_with($c['src'], '.gif')) return '<img src="' . $e($base . $c['src']) . '" alt="">';
            return '<video src="' . $e($base . $c['src']) . '" controls preload="metadata"></video>';
        case 'video_url': return '<video src="' . $e($c['src']) . '" controls preload="metadata"></video>';
        case 'tiktok': return $frame('https://www.tiktok.com/embed/v2/' . $c['src']);
        case 'embed':
            $id = rawurlencode($c['src']);
            switch ($c['provider']) {
                case 'youtube': return $frame("https://www.youtube-nocookie.com/embed/$id");
                case 'twitch-clip': return $frame("https://clips.twitch.tv/embed?clip=$id&parent=$host&autoplay=false");
                case 'twitch-vod': return $frame("https://player.twitch.tv/?video=$id&parent=$host&autoplay=false");
                case 'instagram': return $frame("https://www.instagram.com/reel/$id/embed");
                case 'streamable': return $frame("https://streamable.com/e/$id");
                case 'medal': return $frame("https://medal.tv/clip/$id?autoplay=0");
            }
    }
    return '<a class="btn btn-small" href="' . $e($c['link'] ?? $c['src']) . '" target="_blank" rel="noopener noreferrer">Open link ↗</a> <span class="muted small">' . $e(parse_url($c['link'] ?? $c['src'], PHP_URL_HOST)) . '</span>';
}
