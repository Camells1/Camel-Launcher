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
$writeActions = ['register','login','logout','friend_request','friend_accept','friend_decline','friend_remove','block','unblock','progress_save','chat_send','chat_report','chat_delete','ban','giveaway_enter','giveaway_collect','gift_send','gift_collect','bets','code_create','redeem'];
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
/* ---------- Hourly chat giveaway ----------
   Every GIVEAWAY_EVERY seconds a giveaway opens in global chat for GIVEAWAY_OPEN seconds.
   Logged-in players enter with one tap; when it closes, GIVEAWAY_WINNERS random entrants each win
   the prize (2,000 to 5,000 coins). Prizes wait server-side until the winner's browser collects them. */
define('GIVEAWAY_EVERY', max(60, (int)(getenv('CA_GA_EVERY') ?: 3600)));
define('GIVEAWAY_OPEN', max(20, (int)(getenv('CA_GA_OPEN') ?: 600)));
define('GIVEAWAY_WINNERS', 3);
function sys_chat($text){
  with_file('chat-global.json', true, function(&$d) use ($text){
    $d['seq'] = ($d['seq'] ?? 0) + 1; $d['msgs'] = $d['msgs'] ?? [];
    $d['msgs'][] = ['id'=>$d['seq'], 'u'=>'_sys', 'n'=>'🎁 GIVEAWAY', 'rk'=>'', 't'=>$text, 'ts'=>time(), 'rep'=>[], 'hid'=>false, 'sys'=>true];
    if (count($d['msgs']) > 150) $d['msgs'] = array_slice($d['msgs'], -150);
  });
}
function giveaway_tick(){
  $now = time(); $slot = intdiv($now, GIVEAWAY_EVERY); $start = $slot * GIVEAWAY_EVERY; $posts = [];
  // fast path: chat polls every second, so only take the write lock when something changes
  $peek = read_file('giveaway.json'); $c = $peek['cur'] ?? null;
  $needDraw = $c && !$c['drawn'] && $now >= $c['end'];
  $needOpen = (!$c || $c['slot'] !== $slot) && $now < $start + GIVEAWAY_OPEN;
  if (!$needDraw && !$needOpen) return $peek;
  $g = with_file('giveaway.json', true, function(&$d) use ($now, $slot, $start, &$posts){
    $cur = $d['cur'] ?? null;
    // draw the previous giveaway once it has closed
    if ($cur && !$cur['drawn'] && $now >= $cur['end']){
      $e = $cur['entries']; $wins = [];
      for ($i = 0; $i < GIVEAWAY_WINNERS && $e; $i++){ $k = random_int(0, count($e) - 1); $wins[] = $e[$k]; array_splice($e, $k, 1); }
      foreach ($wins as $w){ $d['pending'][$w] = ($d['pending'][$w] ?? 0) + $cur['prize']; }
      $cur['drawn'] = true; $cur['winners'] = $wins;
      $names = array_map(function($id){ $u = read_file('users.json')[$id] ?? null; return $u ? $u['name'] : $id; }, $wins);
      $posts[] = $wins ? '🎉 Giveaway #' . $cur['id'] . ' winners: ' . implode(', ', $names) . '! Each wins ' . number_format($cur['prize']) . ' 🪙 (' . count($cur['entries']) . ' entered). Next one in ' . ceil(($start + GIVEAWAY_EVERY - $now) / 60) . ' min.'
                       : '😴 Giveaway #' . $cur['id'] . ' had no entries. Next one in ' . ceil(($start + GIVEAWAY_EVERY - $now) / 60) . ' min.';
      $d['cur'] = $cur;
    }
    // open a new giveaway at the start of each slot
    if ((!$cur || $cur['slot'] !== $slot) && $now < $start + GIVEAWAY_OPEN){
      $prize = random_int(20, 50) * 100;
      $d['seq'] = ($d['seq'] ?? 0) + 1;
      $d['cur'] = ['id'=>$d['seq'], 'slot'=>$slot, 'start'=>$start, 'end'=>$start + GIVEAWAY_OPEN, 'prize'=>$prize, 'entries'=>[], 'drawn'=>false, 'winners'=>[]];
      $posts[] = '🎁 GIVEAWAY #' . $d['seq'] . ' is OPEN! ' . GIVEAWAY_WINNERS . ' winners get ' . number_format($prize) . ' 🪙 each. Tap ENTER above the chat in the next ' . round(GIVEAWAY_OPEN / 60) . ' min!';
    }
    return $d;
  });
  foreach ($posts as $t) sys_chat($t);
  return $g;
}
function giveaway_view($g, $u){
  $now = time(); $cur = $g['cur'] ?? null; $slot = intdiv($now, GIVEAWAY_EVERY);
  $open = $cur && !$cur['drawn'] && $now < $cur['end'];
  return ['ok'=>true, 'open'=>$open, 'id'=>$cur['id'] ?? 0, 'prize'=>$cur['prize'] ?? 0, 'winners'=>GIVEAWAY_WINNERS,
    'endsIn'=>$open ? $cur['end'] - $now : 0, 'entries'=>$cur ? count($cur['entries']) : 0,
    'entered'=>$cur && $u && in_array($u['id'], $cur['entries'], true), 'nextIn'=>($slot + 1) * GIVEAWAY_EVERY - $now,
    'pending'=>$u ? (int)($g['pending'][$u['id']] ?? 0) : 0,
    'gifts'=>$u ? count(read_file('gifts.json')['pending'][$u['id']] ?? []) : 0,
    'online'=>(function(){ $n = 0; $now = time(); foreach (read_file('presence.json') as $t) if ($now - $t < 60) $n++; return max(1, $n); })()];
}

/* ---------- Live bets feed + daily wager race ----------
   The casino posts settled bets in small batches. Each bet goes into the live feed (last 60)
   and adds its stake to today's race (UTC day). When a day ends, the top 5 of that day split
   the prize pool; prizes are paid through the gift inbox ("Daily Race"). */
define('RACE_SPLIT', [0.40, 0.25, 0.15, 0.12, 0.08]);
function race_day($offset = 0){ return gmdate('Ymd', time() + $offset * 86400); }
function race_pool($total){ return (int)min(2000000, 50000 + floor($total * 0.001)); }
function race_settle(){
  $y = race_day(-1);
  $meta = read_file('race-meta.json');
  if (($meta['paid'] ?? '') === $y) return;
  $paid = false;
  with_file('race-meta.json', true, function(&$m) use ($y, &$paid){ if (($m['paid'] ?? '') === $y) return; $m['paid'] = $y; $paid = true; });
  if (!$paid) return;
  $d = read_file('race-' . $y . '.json'); $e = $d['e'] ?? []; arsort($e);
  $pool = race_pool(array_sum($e)); $users = read_file('users.json'); $win = []; $i = 0;
  foreach ($e as $uid => $w){ if ($i >= count(RACE_SPLIT)) break; $prize = (int)floor($pool * RACE_SPLIT[$i]); $win[] = ['n'=>$users[$uid]['name'] ?? $uid, 'w'=>$w, 'p'=>$prize];
    with_file('gifts.json', true, function(&$g) use ($uid, $prize, $i){ $g['pending'][$uid][] = ['from'=>'🏁 Daily Race', 'amount'=>$prize, 'note'=>'You finished #' . ($i + 1) . ' in yesterday\'s race!', 'ts'=>time()]; });
    $i++; }
  with_file('race-meta.json', true, function(&$m) use ($y, $win, $pool){ $m['last'] = ['day'=>$y, 'pool'=>$pool, 'win'=>$win]; });
  if ($win) sys_chat('🏁 Daily race results: ' . implode(', ', array_map(function($w, $k){ return '#' . ($k + 1) . ' ' . $w['n'] . ' +' . number_format($w['p']) . ' 🪙'; }, $win, array_keys($win))) . '. A new race has started!');
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

case 'giveaway': { $u = current_user(); out(200, giveaway_view(giveaway_tick(), $u)); }

case 'giveaway_enter': {
  $u = require_user();
  if (!rate_ok('gaenter', $u['id'], 10, 60)) out(429, ['ok'=>false, 'error'=>'slow down']);
  giveaway_tick(); $err = null;
  $g = with_file('giveaway.json', true, function(&$d) use ($u, &$err){
    $cur = $d['cur'] ?? null;
    if (!$cur || $cur['drawn'] || time() >= $cur['end']) { $err = 'no giveaway is open right now'; return $d; }
    if (!in_array($u['id'], $cur['entries'], true)) $d['cur']['entries'][] = $u['id'];
    return $d;
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  out(200, giveaway_view($g, $u));
}

case 'giveaway_collect': {
  $u = require_user(); $amt = 0;
  with_file('giveaway.json', true, function(&$d) use ($u, &$amt){ $amt = (int)($d['pending'][$u['id']] ?? 0); unset($d['pending'][$u['id']]); });
  out(200, ['ok'=>true, 'coins'=>$amt]);
}

/* ---------- Coin gifts ----------
   The sender's browser takes the coins off only after the server accepts the gift; the gift waits
   server-side until the receiver's browser collects it (checked with the giveaway poll). */
case 'gift_send': {
  $u = require_user();
  $to = strtolower(trim((string)($in['to'] ?? ''))); $amt = filter_var($in['amount'] ?? null, FILTER_VALIDATE_INT);
  $note = (string)($in['note'] ?? ''); $note = $note === '' ? '' : clean_chat(function_exists('mb_substr') ? mb_substr($note, 0, 60, 'UTF-8') : substr($note, 0, 60));
  if ($amt === false || $amt < 10 || $amt > 1000000) out(400, ['ok'=>false, 'error'=>'gifts must be between 10 and 1,000,000 coins']);
  if ($to === $u['id']) out(400, ['ok'=>false, 'error'=>'you cannot gift yourself']);
  $users = read_file('users.json'); $other = $users[$to] ?? null;
  if (!$other) out(404, ['ok'=>false, 'error'=>'no player with that name']);
  if (in_array($u['id'], $other['blocked'] ?? [], true)) out(403, ['ok'=>false, 'error'=>'this player is not accepting gifts']);
  if (!rate_ok('gift', $u['id'], 10, 3600)) out(429, ['ok'=>false, 'error'=>'max 10 gifts per hour']);
  with_file('gifts.json', true, function(&$d) use ($u, $to, $amt, $note){
    $d['pending'][$to][] = ['from'=>$u['name'], 'amount'=>$amt, 'note'=>$note, 'ts'=>time()];
    if (count($d['pending'][$to]) > 50) $d['pending'][$to] = array_slice($d['pending'][$to], -50);
    $d['log'][] = [$u['id'], $to, $amt, time()]; if (count($d['log']) > 500) $d['log'] = array_slice($d['log'], -500);
  });
  out(200, ['ok'=>true, 'to'=>$other['name'], 'amount'=>$amt]);
}

case 'gift_collect': {
  $u = require_user(); $list = [];
  with_file('gifts.json', true, function(&$d) use ($u, &$list){ $list = $d['pending'][$u['id']] ?? []; unset($d['pending'][$u['id']]); });
  out(200, ['ok'=>true, 'gifts'=>$list]);
}

case 'bets': {
  $u = require_user();
  $list = $in['bets'] ?? null; if (!is_array($list) || !$list) out(400, ['ok'=>false, 'error'=>'no bets']);
  if (!rate_ok('bets', $u['id'], 40, 60)) out(429, ['ok'=>false, 'error'=>'slow down']);
  $list = array_slice($list, 0, 25); $clean = []; $sum = 0;
  foreach ($list as $b){
    $g = preg_replace('/[^a-z0-9]/', '', strtolower((string)($b['g'] ?? ''))); $bet = (int)($b['b'] ?? 0); $mult = round((float)($b['m'] ?? 0), 2);
    if (!$g || $bet < 1 || $bet > 1e12 || $mult < 0 || $mult > 1e6) continue;
    $clean[] = ['g'=>substr($g, 0, 16), 'n'=>$u['name'], 'rk'=>$u['rank'] ?? '', 'b'=>$bet, 'm'=>$mult, 'p'=>(int)floor($bet * $mult), 't'=>time()]; $sum += $bet;
  }
  if ($clean){
    with_file('bets.json', true, function(&$d) use ($clean){ $d['l'] = array_slice(array_merge($d['l'] ?? [], $clean), -60); });
    $day = race_day();
    with_file('race-' . $day . '.json', true, function(&$d) use ($u, $sum){ $d['e'][$u['id']] = ($d['e'][$u['id']] ?? 0) + $sum; });
  }
  out(200, ['ok'=>true, 'n'=>count($clean)]);
}

case 'live': {
  $d = read_file('bets.json'); $l = array_reverse($d['l'] ?? []); $now = time(); $min = 0; $wag = 0; $big = null;
  foreach ($l as $b){ if ($now - $b['t'] <= 60){ $min++; $wag += $b['b']; } if (!$big || $b['p'] - $b['b'] > $big['p'] - $big['b']) $big = $b; }
  $on = 0; foreach (read_file('presence.json') as $t) if ($now - $t < 60) $on++;
  out(200, ['ok'=>true, 'bets'=>array_slice($l, 0, 30), 'perMin'=>$min, 'wagMin'=>$wag, 'big'=>$big, 'online'=>max(1, $on)]);
}

case 'race': {
  race_settle(); $u = current_user(); $day = race_day();
  $d = read_file('race-' . $day . '.json'); $e = $d['e'] ?? []; arsort($e); $users = read_file('users.json');
  $top = []; $i = 0; $pool = race_pool(array_sum($e)); $mine = null;
  foreach ($e as $uid => $w){ $row = ['n'=>$users[$uid]['name'] ?? $uid, 'rk'=>$users[$uid]['rank'] ?? '', 'w'=>$w, 'p'=>$i < count(RACE_SPLIT) ? (int)floor($pool * RACE_SPLIT[$i]) : 0, 'me'=>$u && $uid === $u['id']];
    if ($i < 10) $top[] = $row; if ($row['me']) $mine = ['rank'=>$i + 1, 'w'=>$w]; $i++; }
  $meta = read_file('race-meta.json');
  out(200, ['ok'=>true, 'pool'=>$pool, 'split'=>RACE_SPLIT, 'top'=>$top, 'me'=>$mine, 'players'=>count($e), 'endsIn'=>86400 - (time() % 86400), 'last'=>$meta['last'] ?? null]);
}

/* ---------- Promo codes ----------
   Admins create codes (coins, max uses, hours valid); every account can redeem each code once. */
case 'code_create': {
  $u = require_user(); if (!is_admin($u)) out(403, ['ok'=>false, 'error'=>'admins only']);
  $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($in['code'] ?? ''))); $coins = (int)($in['coins'] ?? 0); $max = max(1, min(100000, (int)($in['max'] ?? 100))); $hours = max(1, min(24 * 90, (int)($in['hours'] ?? 24)));
  if (strlen($code) < 3 || strlen($code) > 20) out(400, ['ok'=>false, 'error'=>'code must be 3-20 letters/digits']);
  if ($coins < 1 || $coins > 10000000) out(400, ['ok'=>false, 'error'=>'coins must be 1 to 10,000,000']);
  with_file('codes.json', true, function(&$d) use ($code, $coins, $max, $hours, $u){ $d[$code] = ['coins'=>$coins, 'max'=>$max, 'exp'=>time() + $hours * 3600, 'used'=>[], 'by'=>$u['id']]; });
  out(200, ['ok'=>true, 'code'=>$code]);
}

case 'redeem': {
  $u = require_user();
  if (!rate_ok('redeem', $u['id'], 10, 600)) out(429, ['ok'=>false, 'error'=>'too many tries, wait a few minutes']);
  $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)($in['code'] ?? ''))); $err = null; $coins = 0;
  with_file('codes.json', true, function(&$d) use ($code, $u, &$err, &$coins){
    $c = $d[$code] ?? null;
    if (!$c) { $err = 'that code does not exist'; return; }
    if (time() > $c['exp']) { $err = 'that code has expired'; return; }
    if (in_array($u['id'], $c['used'], true)) { $err = 'you already used this code'; return; }
    if (count($c['used']) >= $c['max']) { $err = 'that code has been fully claimed'; return; }
    $d[$code]['used'][] = $u['id']; $coins = $c['coins'];
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  out(200, ['ok'=>true, 'coins'=>$coins, 'code'=>$code]);
}

case 'chat_poll': {
  $u = require_user(); $room = (string)($in['room'] ?? 'global'); $file = room_file($room, $u);
  if ($room === 'global') giveaway_tick();
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
