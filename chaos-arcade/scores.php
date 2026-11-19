<?php
/*
 * CHAOS ARCADE — global leaderboards for every game (plus total arcade XP)
 * Upload next to index.html. Needs PHP 7.0+. No database: scores are kept
 * in small JSON files inside "lb-data" (created automatically, must be writable).
 *
 * GET  scores.php?board=snake&pid=...      -> top 10 + your rank
 * POST scores.php  {board, pid, name, score}
 * board = a game id (letters, digits, dash) or "xp" for the arcade XP board.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

define('DATA_DIR', __DIR__ . '/lb-data');
define('MAX_ENTRIES', 200);
define('TOP_N', 10);
define('RATE_SECONDS', 4);
define('MAX_SCORE', 5000000);     // sanity cap for game scores
define('MAX_XP', 20000000);       // sanity cap for arcade XP

function out($code, $arr){ http_response_code($code); echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
if (!is_dir(DATA_DIR) || !is_writable(DATA_DIR)) out(500, ['ok'=>false, 'error'=>'storage not writable']);
if (!file_exists(DATA_DIR . '/.htaccess')) @file_put_contents(DATA_DIR . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
if (!file_exists(DATA_DIR . '/index.html')) @file_put_contents(DATA_DIR . '/index.html', '');

function with_file($file, $write, $fn){
    $fh = @fopen($file, 'c+');
    if (!$fh) out(500, ['ok'=>false, 'error'=>'storage open failed']);
    flock($fh, $write ? LOCK_EX : LOCK_SH);
    $raw = stream_get_contents($fh);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data)) $data = [];
    $res = $fn($data);
    if ($write){ ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE)); fflush($fh); }
    flock($fh, LOCK_UN); fclose($fh);
    return $res;
}
function clean_name($n){
    $n = preg_replace('/[^\p{L}\p{N} _\-.!]/u', '', (string)$n);
    $n = trim(preg_replace('/\s+/u', ' ', $n));
    $n = function_exists('mb_substr') ? mb_substr($n, 0, 16, 'UTF-8') : substr($n, 0, 16);
    $flat = strtolower(preg_replace('/[^a-z]/i', '', $n));
    foreach (['fuck','shit','cunt','nigg','fagg','hitler','nazi','rape','whore','retard'] as $b) if (strpos($flat, $b) !== false) return 'Player';
    return $n;
}
function summary($e, $hp){
    $top = []; $you = null;
    foreach ($e as $i => $x){
        $me = $hp !== null && $x['p'] === $hp;
        if ($i < TOP_N) $top[] = ['n'=>$x['n'], 's'=>$x['s'], 'me'=>$me];
        if ($me) $you = ['rank'=>$i + 1, 's'=>$x['s']];
    }
    return ['ok'=>true, 'top'=>$top, 'you'=>$you, 'count'=>count($e)];
}

$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$in = $_GET;
if ($post){ $in = json_decode(file_get_contents('php://input', false, null, 0, 2048), true); if (!is_array($in)) out(400, ['ok'=>false, 'error'=>'bad json']); }

$board = isset($in['board']) ? strtolower((string)$in['board']) : '';
if (!preg_match('/^[a-z0-9][a-z0-9-]{1,23}$/', $board)) out(400, ['ok'=>false, 'error'=>'bad board']);
$pid = isset($in['pid']) ? strtolower((string)$in['pid']) : '';
$hp = preg_match('/^[a-z0-9]{16,40}$/', $pid) ? substr(hash('sha256', 'chaos-arcade|' . $pid), 0, 24) : null;
$file = DATA_DIR . '/board-' . $board . '.json';

if (!$post){
    if (!file_exists($file)) out(200, ['ok'=>true, 'top'=>[], 'you'=>null, 'count'=>0]);
    out(200, with_file($file, false, function($d) use ($hp){ return summary(isset($d['e']) ? $d['e'] : [], $hp); }));
}

if ($hp === null) out(400, ['ok'=>false, 'error'=>'bad player id']);
$name = clean_name(isset($in['name']) ? $in['name'] : '');
if ($name === '') out(400, ['ok'=>false, 'error'=>'name required']);
$score = filter_var(isset($in['score']) ? $in['score'] : null, FILTER_VALIDATE_INT);
if ($score === false || $score < 1 || $score > ($board === 'xp' ? MAX_XP : MAX_SCORE)) out(400, ['ok'=>false, 'error'=>'bad score']);

// a new board can only be created for a known-looking game; cap the number of boards
if (!file_exists($file) && count(glob(DATA_DIR . '/board-*.json')) > 150) out(400, ['ok'=>false, 'error'=>'too many boards']);

$ipKey = substr(hash('sha256', 'ip|' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '')), 0, 16);
$limited = with_file(DATA_DIR . '/rate-scores.json', true, function(&$d) use ($ipKey){
    $now = time(); foreach ($d as $k => $t) if ($now - $t > 300) unset($d[$k]);
    if (isset($d[$ipKey]) && $now - $d[$ipKey] < RATE_SECONDS) return true;
    $d[$ipKey] = $now; return false;
});
if ($limited) out(429, ['ok'=>false, 'error'=>'slow down']);

out(200, with_file($file, true, function(&$d) use ($hp, $name, $score){
    if (!isset($d['e']) || !is_array($d['e'])) $d['e'] = [];
    $found = false;
    foreach ($d['e'] as $i => $x){
        if ($x['p'] !== $hp) continue;
        $found = true; $d['e'][$i]['n'] = $name;
        if ($score > $x['s']){ $d['e'][$i]['s'] = $score; $d['e'][$i]['ts'] = time(); }
        break;
    }
    if (!$found) $d['e'][] = ['p'=>$hp, 'n'=>$name, 's'=>$score, 'ts'=>time()];
    usort($d['e'], function($a, $b){ return $a['s'] !== $b['s'] ? $b['s'] - $a['s'] : $a['ts'] - $b['ts']; });
    $d['e'] = array_slice($d['e'], 0, MAX_ENTRIES);
    return summary($d['e'], $hp);
}));
