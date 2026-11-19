<?php
/*
 * Cursed Crafting & Chaos — leaderboard backend
 * ------------------------------------------------
 * Upload this file next to index.html. It needs PHP 7.0+ and nothing else:
 * no database, no accounts. Scores are kept as small JSON files in the
 * "lb-data" folder it creates beside itself (the folder must be writable).
 *
 * GET  leaderboard.php?board=daily&date=2026-11-19&pid=...   -> top 10 + your rank
 * GET  leaderboard.php?board=endless|speedrun&pid=...
 * POST leaderboard.php  (JSON body: board, date, pid, name, score, correct, total, diff)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

define('DATA_DIR', __DIR__ . '/lb-data');
define('MAX_ENTRIES', 300);   // kept per board
define('TOP_N', 10);          // returned per request
define('KEEP_DAYS', 40);      // old daily boards are deleted after this
define('RATE_SECONDS', 6);    // min seconds between submissions per IP

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- storage setup ---------- */
if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
if (!is_dir(DATA_DIR) || !is_writable(DATA_DIR)) out(500, ['ok' => false, 'error' => 'storage not writable']);
if (!file_exists(DATA_DIR . '/.htaccess')) {
    @file_put_contents(DATA_DIR . '/.htaccess',
        "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
}
if (!file_exists(DATA_DIR . '/index.html')) @file_put_contents(DATA_DIR . '/index.html', '');

/* ---------- helpers ---------- */
function board_file($board, $date) {
    return DATA_DIR . '/' . ($board === 'daily' ? 'daily-' . $date : $board) . '.json';
}

/* Open a board under a file lock, let $fn modify it, write it back if asked. */
function with_board($file, $write, $fn) {
    $fh = @fopen($file, 'c+');
    if (!$fh) out(500, ['ok' => false, 'error' => 'storage open failed']);
    flock($fh, $write ? LOCK_EX : LOCK_SH);
    $raw = stream_get_contents($fh);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data)) $data = [];
    $result = $fn($data);
    if ($write) {
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE));
        fflush($fh);
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function hash_pid($pid) {
    return substr(hash('sha256', 'cursed-crafting|' . $pid), 0, 24);
}

function sort_entries(&$entries) {
    usort($entries, function ($a, $b) {
        if ($a['s'] !== $b['s']) return $b['s'] - $a['s'];
        return $a['ts'] - $b['ts'];        // earlier submission wins ties
    });
}

function summary($entries, $hpid) {
    $top = [];
    $you = null;
    foreach ($entries as $i => $e) {
        $me = $hpid !== null && $e['p'] === $hpid;
        if ($i < TOP_N) $top[] = ['n' => $e['n'], 's' => $e['s'], 'c' => $e['c'], 't' => $e['t'], 'd' => $e['d'], 'me' => $me];
        if ($me) $you = ['rank' => $i + 1, 's' => $e['s']];
    }
    return ['ok' => true, 'top' => $top, 'you' => $you, 'count' => count($entries)];
}

function clean_name($name) {
    $name = preg_replace('/[^\p{L}\p{N} _\-.!]/u', '', (string)$name);
    $name = trim(preg_replace('/\s+/u', ' ', $name));
    if (function_exists('mb_substr')) $name = mb_substr($name, 0, 16, 'UTF-8');
    else $name = substr($name, 0, 16);
    $flat = strtolower(preg_replace('/[^a-z]/i', '', $name));
    $blocked = ['fuck', 'shit', 'cunt', 'nigg', 'fagg', 'hitler', 'nazi', 'rape', 'whore', 'retard'];
    foreach ($blocked as $b) if (strpos($flat, $b) !== false) return 'Steve';
    return $name;
}

/* ---------- validate board ---------- */
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
$in = $_GET;
if ($isPost) {
    $body = json_decode(file_get_contents('php://input', false, null, 0, 4096), true);
    if (!is_array($body)) out(400, ['ok' => false, 'error' => 'bad json']);
    $in = $body;
}

$board = isset($in['board']) ? (string)$in['board'] : '';
if (!in_array($board, ['daily', 'endless', 'speedrun'], true)) out(400, ['ok' => false, 'error' => 'bad board']);

$date = '';
if ($board === 'daily') {
    $date = isset($in['date']) ? (string)$in['date'] : '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) out(400, ['ok' => false, 'error' => 'bad date']);
    // players are in different time zones: accept dates within 2 days of server UTC time
    $ts = strtotime($date . ' 00:00:00 UTC');
    if ($ts === false || abs($ts - time()) > 2.5 * 86400) out(400, ['ok' => false, 'error' => 'date out of range']);
}

$pid = isset($in['pid']) ? strtolower((string)$in['pid']) : '';
$hpid = preg_match('/^[a-z0-9]{16,40}$/', $pid) ? hash_pid($pid) : null;
$file = board_file($board, $date);

/* ---------- GET: read board ---------- */
if (!$isPost) {
    if (!file_exists($file)) out(200, ['ok' => true, 'top' => [], 'you' => null, 'count' => 0]);
    $res = with_board($file, false, function ($data) use ($hpid) {
        return summary(isset($data['e']) ? $data['e'] : [], $hpid);
    });
    out(200, $res);
}

/* ---------- POST: submit score ---------- */
if ($hpid === null) out(400, ['ok' => false, 'error' => 'bad player id']);

$name = clean_name(isset($in['name']) ? $in['name'] : '');
if ($name === '') out(400, ['ok' => false, 'error' => 'name required']);

$diff = isset($in['diff']) ? (string)$in['diff'] : 'normal';
if (!in_array($diff, ['peaceful', 'normal', 'hard', 'hardcore'], true)) out(400, ['ok' => false, 'error' => 'bad difficulty']);
if ($board === 'daily') $diff = 'normal';

$score   = filter_var(isset($in['score'])   ? $in['score']   : null, FILTER_VALIDATE_INT);
$correct = filter_var(isset($in['correct']) ? $in['correct'] : null, FILTER_VALIDATE_INT);
$total   = filter_var(isset($in['total'])   ? $in['total']   : null, FILTER_VALIDATE_INT);
if ($score === false || $correct === false || $total === false) out(400, ['ok' => false, 'error' => 'bad numbers']);
if ($score < 0 || $correct < 0 || $total < 1 || $correct > $total) out(400, ['ok' => false, 'error' => 'bad numbers']);

/* Plausibility caps (based on the game's scoring rules) to stop obviously fake scores. */
if ($board === 'daily') {
    if ($total !== 10 || $score > 4200) out(400, ['ok' => false, 'error' => 'implausible score']);
} elseif ($board === 'endless') {
    if ($total > 2000 || $score > $correct * 2400) out(400, ['ok' => false, 'error' => 'implausible score']);
} else { // speedrun
    if ($total > 250 || $score > $correct * 1600) out(400, ['ok' => false, 'error' => 'implausible score']);
}

/* Simple per-IP rate limit. */
$ipKey = substr(hash('sha256', 'ip|' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '')), 0, 16);
$limited = with_board(DATA_DIR . '/rate.json', true, function (&$data) use ($ipKey) {
    $now = time();
    foreach ($data as $k => $t) if ($now - $t > 600) unset($data[$k]);
    if (isset($data[$ipKey]) && $now - $data[$ipKey] < RATE_SECONDS) return true;
    $data[$ipKey] = $now;
    return false;
});
if ($limited) out(429, ['ok' => false, 'error' => 'slow down']);

$entry = ['p' => $hpid, 'n' => $name, 's' => $score, 'c' => $correct, 't' => $total, 'd' => $diff, 'ts' => time()];

$res = with_board($file, true, function (&$data) use ($entry, $board, $hpid) {
    if (!isset($data['e']) || !is_array($data['e'])) $data['e'] = [];
    $found = false;
    foreach ($data['e'] as $i => $e) {
        if ($e['p'] !== $hpid) continue;
        $found = true;
        if ($board === 'daily') {
            $data['e'][$i]['n'] = $entry['n'];        // first daily score counts; allow a name change
        } elseif ($entry['s'] > $e['s']) {
            $data['e'][$i] = $entry;                  // endless / speedrun: keep personal best
        } else {
            $data['e'][$i]['n'] = $entry['n'];
        }
        break;
    }
    if (!$found) $data['e'][] = $entry;
    sort_entries($data['e']);
    $data['e'] = array_slice($data['e'], 0, MAX_ENTRIES);
    return summary($data['e'], $hpid);
});

/* Occasionally clean up old daily boards. */
if ($board === 'daily' && mt_rand(1, 25) === 1) {
    foreach (glob(DATA_DIR . '/daily-*.json') as $f) {
        if (filemtime($f) < time() - KEEP_DAYS * 86400) @unlink($f);
    }
}

out(200, $res);
