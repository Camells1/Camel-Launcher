<?php
/*
 * CHAOS ARCADE — leaderboards for every game (plus total arcade XP)
 * GET  scores.php?board=snake[&friends=1]&pid=...   -> top 10 + your rank
 * POST scores.php  {board, pid, name, score}
 * Logged-in players (X-Auth header) post under their account name, which
 * nobody else can use. Guests post with a nickname; a guest using a
 * registered username is shown with a "~" so they cannot impersonate.
 */
require __DIR__ . '/lib.php';
ensure_storage();

define('MAX_ENTRIES', 300);
define('TOP_N', 10);
define('MAX_SCORE', 5000000);
define('MAX_XP', 20000000);

function summary($e, $me){
  $top = []; $you = null;
  foreach (array_values($e) as $i => $x){
    $isMe = $me !== null && $x['p'] === $me;
    if ($i < TOP_N) $top[] = ['n'=>$x['n'], 's'=>$x['s'], 'me'=>$isMe, 'acct'=>strpos($x['p'], 'u:') === 0];
    if ($isMe) $you = ['rank'=>$i + 1, 's'=>$x['s']];
  }
  return ['ok'=>true, 'top'=>$top, 'you'=>$you, 'count'=>count($e)];
}

$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$in = input();
$board = strtolower((string)($in['board'] ?? ''));
if (!preg_match('/^[a-z0-9][a-z0-9-]{1,23}$/', $board)) out(400, ['ok'=>false, 'error'=>'bad board']);
$file = 'board-' . $board . '.json';

$user = current_user();
$pid = strtolower((string)($in['pid'] ?? ''));
$guestKey = preg_match('/^[a-z0-9]{16,40}$/', $pid) ? substr(hash('sha256', 'chaos-arcade|' . $pid), 0, 24) : null;
$me = $user ? 'u:' . $user['id'] : $guestKey;

if (!$post){
  if (!data_exists($file)) out(200, ['ok'=>true, 'top'=>[], 'you'=>null, 'count'=>0]);
  $d = read_file($file); $e = $d['e'] ?? [];
  if (!empty($in['friends'])){
    if (!$user) out(401, ['ok'=>false, 'error'=>'log in to see your friends board']);
    $keep = array_map(function($f){ return 'u:' . $f; }, $user['friends'] ?? []); $keep[] = 'u:' . $user['id'];
    $e = array_values(array_filter($e, function($x) use ($keep){ return in_array($x['p'], $keep, true); }));
  }
  out(200, summary($e, $me));
}

if ($me === null) out(400, ['ok'=>false, 'error'=>'bad player id']);
$score = filter_var($in['score'] ?? null, FILTER_VALIDATE_INT);
if ($score === false || $score < 1 || $score > ($board === 'xp' ? MAX_XP : MAX_SCORE)) out(400, ['ok'=>false, 'error'=>'bad score']);

if ($user) $name = $user['name'];
else {
  $name = preg_replace('/[^\p{L}\p{N} _\-.!]/u', '', (string)($in['name'] ?? ''));
  $name = trim(function_exists('mb_substr') ? mb_substr($name, 0, 15, 'UTF-8') : substr($name, 0, 15));
  if ($name === '' ) out(400, ['ok'=>false, 'error'=>'name required']);
  if (is_bad($name)) $name = 'Player';
  $users = read_file('users.json');
  if (isset($users[strtolower(preg_replace('/[^A-Za-z0-9_]/', '', $name))])) $name .= '~';
}
if (!data_exists($file) && count(glob(DATA_DIR . '/board-*.json.php')) > 150) out(400, ['ok'=>false, 'error'=>'too many boards']);
if (!rate_ok('scores', $user ? 'u:' . $user['id'] : ip_key(), 6, 20)) out(429, ['ok'=>false, 'error'=>'slow down']);

out(200, with_file($file, true, function(&$d) use ($me, $name, $score){
  if (!isset($d['e']) || !is_array($d['e'])) $d['e'] = [];
  $found = false;
  foreach ($d['e'] as $i => $x){
    if ($x['p'] !== $me) continue;
    $found = true; $d['e'][$i]['n'] = $name;
    if ($score > $x['s']){ $d['e'][$i]['s'] = $score; $d['e'][$i]['ts'] = time(); }
    break;
  }
  if (!$found) $d['e'][] = ['p'=>$me, 'n'=>$name, 's'=>$score, 'ts'=>time()];
  usort($d['e'], function($a, $b){ return $a['s'] !== $b['s'] ? $b['s'] - $a['s'] : $a['ts'] - $b['ts']; });
  $d['e'] = array_slice($d['e'], 0, MAX_ENTRIES);
  return summary($d['e'], $me);
}));
