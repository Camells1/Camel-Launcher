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
            'eventTitle'    => 'Community Build Battle',
            'eventTime'     => '',
            'smpIp'         => '',
            'smpVersion'    => 'Java 1.21',
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
    $clips = array_map(fn($c) => array_intersect_key($c, array_flip(['id','type','src','title','by','created'])), $clips);
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
