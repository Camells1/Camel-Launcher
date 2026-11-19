<?php
/*
 * CHAOS ARCADE — accounts, friends, chat and progress sync
 * POST/GET api.php?action=...   (logged-in requests send the token in the X-Auth header)
 * Needs PHP 7.0+. Data lives in lb-data/ (blocked from the web by .htaccess).
 */
require __DIR__ . '/lib.php';
ensure_storage();

$in = input();
$action = isset($_GET['action']) ? $_GET['action'] : ($in['action'] ?? '');
$POST = $_SERVER['REQUEST_METHOD'] === 'POST';
$writeActions = ['register','login','logout','friend_request','friend_accept','friend_decline','friend_remove','block','unblock','progress_save','chat_send','chat_report','chat_delete','ban'];
if (in_array($action, $writeActions, true) && !$POST) out(405, ['ok'=>false, 'error'=>'use POST']);

function issue_token($uid){
  $t = bin2hex(random_bytes(32));
  with_file('tokens.json', true, function(&$d) use ($t, $uid){
    $now = time(); foreach ($d as $k => $v) if ($v['exp'] < $now) unset($d[$k]);
    $d[hash('sha256', $t)] = ['uid'=>$uid, 'exp'=>$now + TOKEN_DAYS * 86400];
  });
  return $t;
}
function room_file($room, $u){
  if ($room === 'global') return 'chat-global.json';
  if (strpos($room, 'dm:') === 0){
    $other = strtolower(substr($room, 3));
    if (!in_array($other, $u['friends'] ?? [], true)) out(403, ['ok'=>false, 'error'=>'you can only chat privately with friends']);
    $pair = [$u['id'], $other]; sort($pair);
    return 'chat-dm-' . $pair[0] . '__' . $pair[1] . '.json';
  }
  out(400, ['ok'=>false, 'error'=>'bad room']);
}
function me_payload($u){
  $users = read_file('users.json');
  $map = function($ids) use ($users){ $o = []; foreach ($ids as $id) if (isset($users[$id])) $o[] = public_user($users[$id]); return $o; };
  $presence = read_file('presence.json'); $now = time();
  $friends = $map($u['friends'] ?? []);
  foreach ($friends as &$f) $f['online'] = isset($presence[$f['id']]) && $now - $presence[$f['id']] < 60;
  return ['ok'=>true, 'user'=>public_user($u), 'admin'=>is_admin($u), 'friends'=>$friends, 'incoming'=>$map($u['incoming'] ?? []), 'outgoing'=>$map($u['outgoing'] ?? []), 'blocked'=>array_values($u['blocked'] ?? [])];
}
/* Change two users' records atomically. $fn(&$a, &$b) */
function edit_pair($aid, $bid, $fn){
  return with_file('users.json', true, function(&$d) use ($aid, $bid, $fn){
    if (!isset($d[$aid]) || !isset($d[$bid])) return 'nouser';
    foreach (['friends','incoming','outgoing','blocked'] as $k){ $d[$aid][$k] = $d[$aid][$k] ?? []; $d[$bid][$k] = $d[$bid][$k] ?? []; }
    return $fn($d[$aid], $d[$bid]);
  });
}
function rm(&$arr, $v){ $arr = array_values(array_filter($arr, function($x) use ($v){ return $x !== $v; })); }

switch ($action){

case 'register': {
  if (!rate_ok('register', ip_key(), 5, 3600)) out(429, ['ok'=>false, 'error'=>'too many new accounts from your network, try later']);
  $name = (string)($in['username'] ?? ''); $pw = (string)($in['password'] ?? '');
  if (!valid_username($name)) out(400, ['ok'=>false, 'error'=>'username must be 3–16 letters, numbers or _ (and nothing rude)']);
  if (strlen($pw) < 6 || strlen($pw) > 100) out(400, ['ok'=>false, 'error'=>'password must be at least 6 characters']);
  $id = strtolower($name);
  $res = with_file('users.json', true, function(&$d) use ($id, $name, $pw){
    if (isset($d[$id])) return false;
    $d[$id] = ['id'=>$id, 'name'=>$name, 'hash'=>password_hash($pw, PASSWORD_DEFAULT), 'created'=>time(), 'friends'=>[], 'incoming'=>[], 'outgoing'=>[], 'blocked'=>[], 'banned'=>false, 'xp'=>0, 'rank'=>'🕹️'];
    return true;
  });
  if (!$res) out(409, ['ok'=>false, 'error'=>'that username is taken']);
  out(200, ['ok'=>true, 'token'=>issue_token($id), 'user'=>['id'=>$id, 'name'=>$name, 'xp'=>0, 'rank'=>'🕹️']]);
}

case 'login': {
  if (!rate_ok('login', ip_key(), 10, 600)) out(429, ['ok'=>false, 'error'=>'too many login attempts, wait a few minutes']);
  $id = strtolower((string)($in['username'] ?? '')); $pw = (string)($in['password'] ?? '');
  $users = read_file('users.json'); $u = $users[$id] ?? null;
  if (!$u || !password_verify($pw, $u['hash'])) out(401, ['ok'=>false, 'error'=>'wrong username or password']);
  if (!empty($u['banned'])) out(403, ['ok'=>false, 'error'=>'this account is banned']);
  out(200, ['ok'=>true, 'token'=>issue_token($id), 'user'=>public_user($u)]);
}

case 'logout': {
  $t = auth_token();
  if ($t) with_file('tokens.json', true, function(&$d) use ($t){ unset($d[hash('sha256', $t)]); });
  out(200, ['ok'=>true]);
}

case 'me': { out(200, me_payload(require_user())); }

case 'search': {
  $u = require_user(); $q = strtolower(preg_replace('/[^A-Za-z0-9_]/', '', (string)($in['q'] ?? '')));
  if (strlen($q) < 2) out(200, ['ok'=>true, 'users'=>[]]);
  $users = read_file('users.json'); $o = [];
  foreach ($users as $id => $x){ if ($id !== $u['id'] && empty($x['banned']) && strpos($id, $q) === 0){ $o[] = public_user($x); if (count($o) >= 10) break; } }
  out(200, ['ok'=>true, 'users'=>$o]);
}

case 'friend_request': {
  $u = require_user(); $other = strtolower((string)($in['name'] ?? ''));
  if ($other === $u['id']) out(400, ['ok'=>false, 'error'=>'you cannot friend yourself']);
  if (!rate_ok('friendreq', $u['id'], 20, 3600)) out(429, ['ok'=>false, 'error'=>'slow down']);
  $r = edit_pair($u['id'], $other, function(&$a, &$b){
    if (in_array($a['id'], $b['blocked'], true)) return 'blocked';
    if (in_array($b['id'], $a['friends'], true)) return 'already';
    if (in_array($b['id'], $a['incoming'], true)){ rm($a['incoming'], $b['id']); rm($b['outgoing'], $a['id']); $a['friends'][] = $b['id']; $b['friends'][] = $a['id']; return 'friends'; }
    if (!in_array($b['id'], $a['outgoing'], true)){ $a['outgoing'][] = $b['id']; $b['incoming'][] = $a['id']; }
    return 'sent';
  });
  if ($r === 'nouser') out(404, ['ok'=>false, 'error'=>'no player with that name']);
  if ($r === 'blocked') out(403, ['ok'=>false, 'error'=>'that player is not accepting requests from you']);
  out(200, ['ok'=>true, 'result'=>$r]);
}

case 'friend_accept': case 'friend_decline': case 'friend_remove': case 'block': case 'unblock': {
  $u = require_user(); $other = strtolower((string)($in['name'] ?? ''));
  $r = edit_pair($u['id'], $other, function(&$a, &$b) use ($action){
    if ($action === 'friend_accept'){ if (!in_array($b['id'], $a['incoming'], true)) return 'none'; rm($a['incoming'], $b['id']); rm($b['outgoing'], $a['id']); if (!in_array($b['id'], $a['friends'], true)){ $a['friends'][] = $b['id']; $b['friends'][] = $a['id']; } return 'ok'; }
    if ($action === 'friend_decline'){ rm($a['incoming'], $b['id']); rm($b['outgoing'], $a['id']); rm($a['outgoing'], $b['id']); rm($b['incoming'], $a['id']); return 'ok'; }
    if ($action === 'friend_remove'){ rm($a['friends'], $b['id']); rm($b['friends'], $a['id']); return 'ok'; }
    if ($action === 'block'){ rm($a['friends'], $b['id']); rm($b['friends'], $a['id']); rm($a['incoming'], $b['id']); rm($b['outgoing'], $a['id']); rm($a['outgoing'], $b['id']); rm($b['incoming'], $a['id']); if (!in_array($b['id'], $a['blocked'], true)) $a['blocked'][] = $b['id']; return 'ok'; }
    if ($action === 'unblock'){ rm($a['blocked'], $b['id']); return 'ok'; }
  });
  if ($r === 'nouser') out(404, ['ok'=>false, 'error'=>'no player with that name']);
  out(200, ['ok'=>true]);
}

case 'progress_get': {
  $u = require_user();
  $p = read_file('prog-' . $u['id'] . '.json');
  out(200, ['ok'=>true, 'progress'=>$p['data'] ?? null, 'saved'=>$p['ts'] ?? 0]);
}

case 'progress_save': {
  $u = require_user();
  $data = $in['data'] ?? null; $json = json_encode($data);
  if (!is_array($data) || strlen($json) > 60000) out(400, ['ok'=>false, 'error'=>'progress too large']);
  if (!rate_ok('progress', $u['id'], 30, 300)) out(429, ['ok'=>false, 'error'=>'slow down']);
  with_file('prog-' . $u['id'] . '.json', true, function(&$d) use ($data){ $d = ['data'=>$data, 'ts'=>time()]; });
  $xp = max(0, min(20000000, (int)($data['xp'] ?? 0))); $rank = (string)($in['rank'] ?? '🕹️'); $rank = function_exists('mb_substr') ? mb_substr($rank, 0, 4, 'UTF-8') : substr($rank, 0, 8);
  with_file('users.json', true, function(&$d) use ($u, $xp, $rank){ if (isset($d[$u['id']])){ $d[$u['id']]['xp'] = $xp; $d[$u['id']]['rank'] = $rank; } });
  out(200, ['ok'=>true]);
}

case 'chat_send': {
  $u = require_user(); $room = (string)($in['room'] ?? 'global'); $file = room_file($room, $u);
  $text = clean_chat($in['text'] ?? '');
  if ($text === '') out(400, ['ok'=>false, 'error'=>'empty message']);
  if (!rate_ok('chat', $u['id'], 5, 8)) out(429, ['ok'=>false, 'error'=>'you are typing too fast, slow down']);
  if (strpos($room, 'dm:') === 0){
    $users = read_file('users.json'); $other = $users[strtolower(substr($room, 3))] ?? null;
    if ($other && in_array($u['id'], $other['blocked'] ?? [], true)) out(403, ['ok'=>false, 'error'=>'this player is not accepting messages']);
  }
  $msg = with_file($file, true, function(&$d) use ($u, $text){
    $d['seq'] = ($d['seq'] ?? 0) + 1; $d['msgs'] = $d['msgs'] ?? [];
    $m = ['id'=>$d['seq'], 'u'=>$u['id'], 'n'=>$u['name'], 'rk'=>$u['rank'] ?? '🕹️', 't'=>$text, 'ts'=>time(), 'rep'=>[], 'hid'=>false];
    $d['msgs'][] = $m; if (count($d['msgs']) > 150) $d['msgs'] = array_slice($d['msgs'], -150);
    return $m;
  });
  unset($msg['rep']);
  out(200, ['ok'=>true, 'msg'=>$msg]);
}

case 'chat_poll': {
  $u = require_user(); $room = (string)($in['room'] ?? 'global'); $file = room_file($room, $u);
  $since = max(0, (int)($in['since'] ?? 0));
  $d = read_file($file); $blocked = $u['blocked'] ?? []; $out = [];
  foreach (($d['msgs'] ?? []) as $m){ if ($m['id'] > $since && !$m['hid'] && !in_array($m['u'], $blocked, true)){ unset($m['rep']); $out[] = $m; } }
  if (count($out) > 60) $out = array_slice($out, -60);
  $hidden = [];
  foreach (($d['msgs'] ?? []) as $m) if ($m['hid']) $hidden[] = $m['id'];
  // presence (written at most every 20s per player)
  $now = time(); $pres = read_file('presence.json');
  if (!isset($pres[$u['id']]) || $now - $pres[$u['id']] > 20) with_file('presence.json', true, function(&$p) use ($u, $now){ foreach ($p as $k => $t) if ($now - $t > 600) unset($p[$k]); $p[$u['id']] = $now; });
  $online = 0; foreach ($pres as $t) if ($now - $t < 60) $online++;
  out(200, ['ok'=>true, 'msgs'=>$out, 'last'=>$d['seq'] ?? 0, 'hidden'=>array_slice($hidden, -50), 'online'=>max(1, $online)]);
}

case 'inbox': {
  $u = require_user(); $o = [];
  foreach (($u['friends'] ?? []) as $f){ $pair = [$u['id'], $f]; sort($pair); $d = read_file('chat-dm-' . $pair[0] . '__' . $pair[1] . '.json'); $msgs = $d['msgs'] ?? []; $last = $msgs ? $msgs[count($msgs) - 1] : null; $o[$f] = $last ? ['id'=>$last['id'], 'from'=>$last['u']] : null; }
  out(200, ['ok'=>true, 'inbox'=>$o]);
}

case 'chat_report': {
  $u = require_user(); $room = (string)($in['room'] ?? 'global'); $file = room_file($room, $u); $id = (int)($in['id'] ?? 0);
  if (!rate_ok('report', $u['id'], 20, 3600)) out(429, ['ok'=>false, 'error'=>'slow down']);
  with_file($file, true, function(&$d) use ($u, $id){ if (!isset($d['msgs'])) $d['msgs'] = []; foreach ($d['msgs'] as &$m) if ($m['id'] === $id && $m['u'] !== $u['id']){ if (!in_array($u['id'], $m['rep'], true)) $m['rep'][] = $u['id']; if (count($m['rep']) >= 3) $m['hid'] = true; } });
  with_file('reports.json', true, function(&$d) use ($u, $room, $id){ $d[] = ['by'=>$u['id'], 'room'=>$room, 'id'=>$id, 'ts'=>time()]; if (count($d) > 500) $d = array_slice($d, -500); });
  out(200, ['ok'=>true]);
}

case 'chat_delete': {
  $u = require_user(); if (!is_admin($u)) out(403, ['ok'=>false, 'error'=>'admins only']);
  $room = (string)($in['room'] ?? 'global'); $id = (int)($in['id'] ?? 0);
  $file = $room === 'global' ? 'chat-global.json' : null; if (!$file) out(400, ['ok'=>false, 'error'=>'admins moderate the global room']);
  with_file($file, true, function(&$d) use ($id){ if (!isset($d['msgs'])) $d['msgs'] = []; foreach ($d['msgs'] as &$m) if ($m['id'] === $id) $m['hid'] = true; });
  out(200, ['ok'=>true]);
}

case 'ban': {
  $u = require_user(); if (!is_admin($u)) out(403, ['ok'=>false, 'error'=>'admins only']);
  $other = strtolower((string)($in['name'] ?? '')); $on = !empty($in['on']);
  with_file('users.json', true, function(&$d) use ($other, $on){ if (isset($d[$other])) $d[$other]['banned'] = $on; });
  if ($on) with_file('chat-global.json', true, function(&$d) use ($other){ if (!isset($d['msgs'])) $d['msgs'] = []; foreach ($d['msgs'] as &$m) if ($m['u'] === $other) $m['hid'] = true; });
  out(200, ['ok'=>true]);
}

default: out(400, ['ok'=>false, 'error'=>'unknown action']);
}
