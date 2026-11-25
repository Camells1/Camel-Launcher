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
        'chatTop'     => [],
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
    $clips = array_map(fn($c) => array_intersect_key($c, array_flip(['id','type','provider','src','link','title','by','created','start','end','clip','clipt'])), $clips);
    $polls = array_map(function ($p) {
        unset($p['voters']);
        if (!empty($p['closes']) && $p['closes'] <= time()) $p['open'] = false;
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
        'chatTop'     => $s['chatTop'],
        'chat'        => chat_public($s),
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
    // YouTube: watch, shorts, youtu.be, embed, live, timestamps (?t=1m30s) and Clips (/clip/Ugkx…)
    if (in_array($host, ['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'], true) && preg_match('~^/clip/([\w-]{20,60})~', $path, $m)) {
        return yt_clip($url, $m[1]);
    }
    $ytId = null;
    if (in_array($host, ['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'], true)) {
        if (!empty($q['v']) && preg_match('~^[\w-]{11}$~', $q['v'])) $ytId = $q['v'];
        elseif (preg_match('~^/(?:shorts|embed|live|v)/([\w-]{11})~', $path, $m)) $ytId = $m[1];
    }
    if ($host === 'youtu.be' && preg_match('~^/([\w-]{11})~', $path, $m)) $ytId = $m[1];
    if ($ytId) {
        $c = $embed('youtube', $ytId);
        $t = yt_seconds((string)($q['t'] ?? $q['start'] ?? ''));
        if ($t) $c['start'] = $t;
        if (!empty($q['end']) && ($e = yt_seconds((string)$q['end'])) > $t) $c['end'] = $e;
        return $c;
    }
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

/** "90", "90s", "1m30s", "1h2m3s" -> seconds */
function yt_seconds(string $t): int {
    if (preg_match('~^\d+$~', $t)) return (int)$t;
    if (preg_match('~^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$~', $t, $m) && $t !== '') return (int)($m[1] ?? 0) * 3600 + (int)($m[2] ?? 0) * 60 + (int)($m[3] ?? 0);
    return 0;
}

/** Title of a YouTube video via YouTube's public oEmbed (used when no title is given). */
function yt_title(string $url): string {
    $j = tt_get('https://www.youtube.com/oembed?format=json&url=' . rawurlencode($url));
    $d = $j ? json_decode($j, true) : null;
    return is_array($d) ? clean((string)($d['title'] ?? ''), 60) : '';
}

/**
 * A YouTube Clip link (youtube.com/clip/Ugkx…). We need the video it was cut
 * from and its start/end. 1) YouTube's oEmbed, 2) the clip page itself,
 * 3) if YouTube blocks both: keep it as a "Watch on YouTube" link.
 */
function yt_clip(string $url, string $clipId): array {
    $j = tt_get('https://www.youtube.com/oembed?format=json&url=' . rawurlencode($url));
    $d = $j ? json_decode($j, true) : null;
    if (is_array($d) && preg_match('~/embed/([\w-]{11})(\?[^"\\\\]*)?~', (string)($d['html'] ?? ''), $m)) {
        $c = ['type' => 'embed', 'provider' => 'youtube', 'src' => $m[1], 'link' => $url, 'ytclip' => $clipId, 'autoTitle' => clean((string)($d['title'] ?? ''), 60)];
        parse_str(html_entity_decode(ltrim($m[2] ?? '', '?')), $p);
        if (!empty($p['clip']) && preg_match('~^[\w-]{10,80}$~', $p['clip'])) $c['clip'] = $p['clip'];
        if (!empty($p['clipt']) && preg_match('~^[\w=%-]{4,80}$~', $p['clipt'])) $c['clipt'] = $p['clipt'];
        if (!empty($p['start'])) $c['start'] = (int)$p['start'];
        if (!empty($p['end'])) $c['end'] = (int)$p['end'];
        if (!empty($c['clip']) || !empty($c['start'])) return $c;
        $base = $c; // video known, times not yet
    }
    $html = tt_get($url);
    if ($html && preg_match('~"clipConfig":\{[^}]*"startTimeMs":"(\d+)"[^}]*"endTimeMs":"(\d+)"~', $html, $t)
        && preg_match('~"videoId":"([\w-]{11})"~', $html, $v)) {
        return ($base ?? ['type' => 'embed', 'provider' => 'youtube', 'link' => $url, 'ytclip' => $clipId])
            + ['src' => $v[1]] + ['start' => intdiv((int)$t[1], 1000), 'end' => (int)ceil((int)$t[2] / 1000)];
    }
    if (isset($base)) return $base; // whole video is better than nothing
    return ['type' => 'link', 'provider' => 'youtube', 'src' => $url, 'link' => $url];
}

/** Query string for a YouTube player: clip / start / end times. */
function yt_params(array $c): string {
    $p = [];
    foreach (['clip', 'clipt'] as $k) if (!empty($c[$k])) $p[$k] = $c[$k];
    if (!empty($c['start'])) $p['start'] = (int)$c['start'];
    if (!empty($c['end'])) $p['end'] = (int)$c['end'];
    return $p ? '&' . http_build_query($p) : '';
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
                case 'youtube': return $frame("https://www.youtube-nocookie.com/embed/$id?rel=0" . yt_params($c));
                case 'twitch-clip': return $frame("https://clips.twitch.tv/embed?clip=$id&parent=$host&autoplay=false");
                case 'twitch-vod': return $frame("https://player.twitch.tv/?video=$id&parent=$host&autoplay=false");
                case 'instagram': return $frame("https://www.instagram.com/reel/$id/embed");
                case 'streamable': return $frame("https://streamable.com/e/$id");
                case 'medal': return $frame("https://medal.tv/clip/$id?autoplay=0");
            }
    }
    return '<a class="btn btn-small" href="' . $e($c['link'] ?? $c['src']) . '" target="_blank" rel="noopener noreferrer">Open link ↗</a> <span class="muted small">' . $e(parse_url($c['link'] ?? $c['src'], PHP_URL_HOST)) . '</span>';
}

// =====================================================================
//  Chat counter
//  A small "collector" script running in a browser tab on the TikTok live
//  page sends the chat messages it sees. We count them per stream and for
//  all time. Only the counts are kept, never who said what.
// =====================================================================
const CHAT_FILE = __DIR__ . '/data/chat.json.php';

/** Secret key the collector uses. Derived from the admin secrets, so it is never stored or shown publicly. */
function chat_token(): string {
    return substr(hash_hmac('sha256', 'chat-collector', ADMIN_SECRET . '|' . ADMIN_PASSWORD_HASH . '|' . ADMIN_PASSWORD), 0, 32);
}

function chat_norm(string $m): string {
    $m = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $m);
    $m = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $m)));
    if ($m === '' || mb_strlen($m) > 80 || preg_match('~https?://|www\.|\.com\b~i', $m)) return '';
    return mb_substr($m, 0, 60);
}

function chat_load(): array {
    return array_merge(['all' => [], 'streams' => [], 'updated' => 0, 'total' => 0], read_guarded(CHAT_FILE) ?? []);
}

/** Add a batch of chat messages to the counts. */
function chat_add(array $msgs): int {
    $live = read_guarded(LIVE_FILE) ?? [];
    $key = !empty($live['now']['live']) && !empty($live['now']['roomId']) ? 'room-' . $live['now']['roomId'] : 'day-' . gmdate('Y-m-d');
    $lock = fopen(__DIR__ . '/data/.chatlock', 'c'); flock($lock, LOCK_EX);
    $C = chat_load();
    $n = 0;
    foreach (array_slice($msgs, 0, 500) as $m) {
        $m = chat_norm((string)$m);
        if ($m === '') continue;
        $C['all'][$m] = ($C['all'][$m] ?? 0) + 1;
        $C['streams'][$key]['counts'][$m] = ($C['streams'][$key]['counts'][$m] ?? 0) + 1;
        $n++;
    }
    if ($n) {
        $C['streams'][$key]['updated'] = time();
        $C['updated'] = time();
        $C['total'] += $n;
        // keep files small: top 400 messages, last 30 streams
        arsort($C['all']); $C['all'] = array_slice($C['all'], 0, 400, true);
        arsort($C['streams'][$key]['counts']); $C['streams'][$key]['counts'] = array_slice($C['streams'][$key]['counts'], 0, 400, true);
        uasort($C['streams'], fn($a, $b) => ($b['updated'] ?? 0) <=> ($a['updated'] ?? 0));
        $C['streams'] = array_slice($C['streams'], 0, 30, true);
        write_guarded(CHAT_FILE, $C);
    }
    flock($lock, LOCK_UN); fclose($lock);
    return $n;
}

function chat_top(array $counts, array $hidden, int $n = 5): array {
    $out = [];
    foreach ($counts as $m => $c) {
        if (in_array((string)$m, $hidden, true)) continue;
        $out[] = ['msg' => (string)$m, 'count' => $c];
        if (count($out) >= $n) break;
    }
    return $out;
}

/** What the Live page shows: automatic counts if the collector has been used, else the hand-made list. */
function chat_public(array $state): array {
    $hidden = $state['settings']['chatHidden'] ?? [];
    $C = chat_load();
    if (!$C['all']) return ['source' => 'manual', 'top' => $state['chatTop'] ?? [], 'all' => []];
    arsort($C['all']);
    $latest = reset($C['streams']) ?: ['counts' => [], 'updated' => 0];
    $live = read_guarded(LIVE_FILE)['now']['live'] ?? false;
    arsort($latest['counts']);
    return ['source' => 'auto', 'live' => (bool)$live, 'updated' => $C['updated'],
            'top' => chat_top($latest['counts'], $hidden), 'all' => chat_top($C['all'], $hidden)];
}
