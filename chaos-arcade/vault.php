<?php
/*
 * CHAOS ARCADE — VAULT: in-game money bridge for a Minecraft server
 *
 * The Vault balance lives ONLY on this server (lb-data/vault.json), never in the browser, so it
 * can't be edited by players. Money moves in and out through the ArcadeBridge Paper plugin:
 *   in-game  /arcade link <code>       ties a Minecraft account to a website account
 *   in-game  /arcade deposit <amount>   takes money in-game  -> adds to the Vault balance
 *   in-game  /arcade withdraw <amount>  takes from the Vault  -> pays in-game
 *   website  Withdraw button            queues a payout the plugin picks up within seconds
 * Plugin requests are signed: X-Mc-Ts (unix time) and X-Mc-Sig = HMAC-SHA256(MC_SECRET, ts + "\n" + body).
 * Vault bets (Dice, Limbo, Coin Flip) are settled here with random_int() at a fixed 2.5% house edge.
 *
 * SETUP: set MC_SECRET in lib.php to a long random string and put the same string in the plugin's config.yml.
 */
require __DIR__ . '/lib.php';
ensure_storage();

define('V_RTP', 0.975);
define('V_MIN_BET', 1);
define('V_MAX_BET', 1000000000);        // 1B per bet
define('V_MAX_PAYOUT', 5000000000);     // 5B max win per bet
define('V_MIN_WITHDRAW', 1000);
define('V_MAX_DEPOSIT', 100000000000);  // 100B per deposit

$in = input();
$action = $_GET['action'] ?? ($in['action'] ?? '');
$POST = $_SERVER['REQUEST_METHOD'] === 'POST';
$secretOk = defined('MC_SECRET') && strlen(MC_SECRET) >= 24 && strpos(MC_SECRET, 'CHANGE') === false;

function v_blank_user(){ return ['bal'=>0, 'mc'=>null, 'mcName'=>'', 'wag'=>0, 'dep'=>0, 'wd'=>0, 'hist'=>[]]; }
function v_hist(&$vu, $type, $amount, $note = ''){ array_unshift($vu['hist'], ['t'=>$type, 'a'=>$amount, 'n'=>$note, 'ts'=>time(), 'b'=>$vu['bal']]); $vu['hist'] = array_slice($vu['hist'], 0, 40); }
/* pay x coins exactly on average: whole part, plus 1 with probability = fraction */
function v_payout($x){ $f = floor($x); return (int)$f + ((random_int(0, 999999) / 1000000) < ($x - $f) ? 1 : 0); }
function v_rand(){ return random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX; }

/* ---------- signed plugin requests ---------- */
function plugin_auth(){
  global $secretOk;
  if (!$secretOk) out(503, ['ok'=>false, 'error'=>'vault is not set up: set MC_SECRET in lib.php']);
  $ts = (int)($_SERVER['HTTP_X_MC_TS'] ?? 0); $sig = (string)($_SERVER['HTTP_X_MC_SIG'] ?? '');
  if (abs(time() - $ts) > 90) out(401, ['ok'=>false, 'error'=>'stale request (check the server clock)']);
  $raw = file_get_contents('php://input', false, null, 0, 65536);
  if (!hash_equals(hash_hmac('sha256', $ts . "\n" . $raw, MC_SECRET), $sig)) out(401, ['ok'=>false, 'error'=>'bad signature']);
}
function valid_uuid($u){ return is_string($u) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $u); }
function valid_mc($n){ return is_string($n) && preg_match('/^[A-Za-z0-9_.]{2,20}$/', $n); }
function valid_tx($t){ return is_string($t) && preg_match('/^[A-Za-z0-9-]{8,64}$/', $t); }

switch ($action){

/* ================= website (logged-in player) ================= */
case 'info': {
  $u = require_user(); $d = read_file('vault.json'); $vu = $d['u'][$u['id']] ?? v_blank_user();
  $queue = array_values(array_filter($d['q'] ?? [], function($q) use ($u){ return $q['uid'] === $u['id'] && in_array($q['s'], ['queued','sent'], true); }));
  out(200, ['ok'=>true, 'enabled'=>$secretOk, 'bal'=>$vu['bal'], 'mc'=>$vu['mcName'] ?: null, 'wag'=>$vu['wag'], 'dep'=>$vu['dep'], 'wd'=>$vu['wd'], 'hist'=>array_slice($vu['hist'], 0, 20),
    'pending'=>array_map(function($q){ return ['a'=>$q['a'], 's'=>$q['s'], 'ts'=>$q['ts']]; }, $queue),
    'limits'=>['minBet'=>V_MIN_BET, 'maxBet'=>V_MAX_BET, 'maxPayout'=>V_MAX_PAYOUT, 'minWithdraw'=>V_MIN_WITHDRAW], 'rtp'=>V_RTP]);
}

case 'linkcode': {
  if (!$POST) out(405, ['ok'=>false, 'error'=>'use POST']);
  $u = require_user(); if (!rate_ok('vlink', $u['id'], 10, 600)) out(429, ['ok'=>false, 'error'=>'slow down']);
  $code = ''; $alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for ($i = 0; $i < 6; $i++) $code .= $alpha[random_int(0, strlen($alpha) - 1)];
  with_file('vault.json', true, function(&$d) use ($u, $code){ foreach (($d['codes'] ?? []) as $c => $x) if ($x['exp'] < time() || $x['uid'] === $u['id']) unset($d['codes'][$c]); $d['codes'][$code] = ['uid'=>$u['id'], 'exp'=>time() + 600]; });
  out(200, ['ok'=>true, 'code'=>$code, 'expiresIn'=>600]);
}

case 'unlink': {
  if (!$POST) out(405, ['ok'=>false, 'error'=>'use POST']);
  $u = require_user();
  with_file('vault.json', true, function(&$d) use ($u){ $vu = $d['u'][$u['id']] ?? null; if ($vu && $vu['mc']) { unset($d['mc'][$vu['mc']]); $d['u'][$u['id']]['mc'] = null; $d['u'][$u['id']]['mcName'] = ''; } });
  out(200, ['ok'=>true]);
}

case 'withdraw': {
  if (!$POST) out(405, ['ok'=>false, 'error'=>'use POST']);
  $u = require_user(); if (!rate_ok('vwd', $u['id'], 6, 600)) out(429, ['ok'=>false, 'error'=>'too many withdrawals, wait a few minutes']);
  $amt = filter_var($in['amount'] ?? null, FILTER_VALIDATE_INT); $err = null;
  if ($amt === false || $amt < V_MIN_WITHDRAW) out(400, ['ok'=>false, 'error'=>'minimum withdrawal is ' . number_format(V_MIN_WITHDRAW)]);
  with_file('vault.json', true, function(&$d) use ($u, $amt, &$err){
    $vu = $d['u'][$u['id']] ?? null;
    if (!$vu || !$vu['mc']) { $err = 'link your Minecraft account first'; return; }
    if ($vu['bal'] < $amt) { $err = 'not enough in your Vault'; return; }
    $d['u'][$u['id']]['bal'] -= $amt; v_hist($d['u'][$u['id']], 'withdraw', -$amt, 'queued');
    $d['qseq'] = ($d['qseq'] ?? 0) + 1;
    $d['q'][] = ['id'=>$d['qseq'], 'uid'=>$u['id'], 'mc'=>$vu['mc'], 'name'=>$vu['mcName'], 'a'=>$amt, 's'=>'queued', 'ts'=>time()];
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  out(200, ['ok'=>true]);
}

case 'bet': {
  if (!$POST) out(405, ['ok'=>false, 'error'=>'use POST']);
  $u = require_user(); if (!rate_ok('vbet', $u['id'], 40, 10)) out(429, ['ok'=>false, 'error'=>'slow down']);
  $game = (string)($in['game'] ?? ''); $amt = filter_var($in['amount'] ?? null, FILTER_VALIDATE_INT);
  if ($amt === false || $amt < V_MIN_BET || $amt > V_MAX_BET) out(400, ['ok'=>false, 'error'=>'bet must be ' . V_MIN_BET . ' to ' . number_format(V_MAX_BET)]);
  // work out chance and multiplier for the chosen game
  if ($game === 'dice'){
    $ch = round((float)($in['chance'] ?? 0), 1); $over = !empty($in['over']);
    if ($ch < 2 || $ch > 95) out(400, ['ok'=>false, 'error'=>'chance must be 2 to 95']);
    $mult = V_RTP * 100 / $ch; $roll = random_int(0, 9999) / 100; $win = $over ? $roll >= 100 - $ch : $roll < $ch; $res = ['roll'=>$roll];
  } elseif ($game === 'limbo'){
    $t = floor((float)($in['target'] ?? 0) * 100) / 100;
    if ($t < 1.01 || $t > 1000) out(400, ['ok'=>false, 'error'=>'target must be 1.01 to 1000']);
    $uu = 1 - v_rand(); $r = max(1, floor(V_RTP * 100 / $uu) / 100); $mult = $t; $win = $r >= $t; $res = ['result'=>min($r, 1e6)];
  } elseif ($game === 'coinflip'){
    $side = ($in['side'] ?? 'H') === 'T' ? 'T' : 'H'; $flip = random_int(0, 1) ? 'H' : 'T'; $mult = 2 * V_RTP; $win = $flip === $side; $res = ['flip'=>$flip];
  } else out(400, ['ok'=>false, 'error'=>'this game can\'t be played with the Vault']);
  if ($amt * $mult > V_MAX_PAYOUT) out(400, ['ok'=>false, 'error'=>'max win per bet is ' . number_format(V_MAX_PAYOUT)]);
  $pay = $win ? v_payout($amt * $mult) : 0; $err = null; $bal = 0;
  with_file('vault.json', true, function(&$d) use ($u, $amt, $pay, $game, $mult, &$err, &$bal){
    $vu = $d['u'][$u['id']] ?? null;
    if (!$vu || $vu['bal'] < $amt) { $err = 'not enough in your Vault'; return; }
    $d['u'][$u['id']]['bal'] += $pay - $amt; $d['u'][$u['id']]['wag'] += $amt; $bal = $d['u'][$u['id']]['bal'];
    if ($pay >= $amt * 10) v_hist($d['u'][$u['id']], 'win', $pay - $amt, $game . ' ' . round($mult, 2) . 'x');
    $d['house'] = ($d['house'] ?? 0) + $amt - $pay;
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  // show in the live bets feed (marked as a Vault bet)
  with_file('bets.json', true, function(&$d) use ($u, $game, $amt, $pay){ $d['l'] = array_slice(array_merge($d['l'] ?? [], [['g'=>'v' . $game, 'n'=>$u['name'], 'rk'=>'💰', 'b'=>$amt, 'm'=>round($pay / $amt, 2), 'p'=>$pay, 't'=>time()]]), -60); });
  out(200, ['ok'=>true, 'win'=>$win, 'pay'=>$pay, 'mult'=>round($mult, 4), 'bal'=>$bal] + $res);
}

/* ================= plugin (signed) ================= */
case 'mc_link': {
  plugin_auth();
  $code = strtoupper((string)($in['code'] ?? '')); $uuid = (string)($in['uuid'] ?? ''); $name = (string)($in['name'] ?? '');
  if (!valid_uuid($uuid) || !valid_mc($name)) out(400, ['ok'=>false, 'error'=>'bad player']);
  $err = null; $site = '';
  with_file('vault.json', true, function(&$d) use ($code, $uuid, $name, &$err, &$site){
    $c = $d['codes'][$code] ?? null;
    if (!$c || $c['exp'] < time()) { $err = 'that code is wrong or expired. Get a new one on the website.'; return; }
    $uid = $c['uid']; unset($d['codes'][$code]);
    if (isset($d['mc'][$uuid]) && $d['mc'][$uuid] !== $uid) { $old = $d['mc'][$uuid]; $d['u'][$old]['mc'] = null; $d['u'][$old]['mcName'] = ''; }
    $vu = $d['u'][$uid] ?? v_blank_user(); if ($vu['mc'] && $vu['mc'] !== $uuid) unset($d['mc'][$vu['mc']]);
    $vu['mc'] = $uuid; $vu['mcName'] = $name; $d['u'][$uid] = $vu; $d['mc'][$uuid] = $uid; $site = $uid;
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  $users = read_file('users.json');
  out(200, ['ok'=>true, 'account'=>$users[$site]['name'] ?? $site]);
}

case 'mc_deposit': case 'mc_withdraw': {
  plugin_auth();
  $uuid = (string)($in['uuid'] ?? ''); $tx = (string)($in['tx'] ?? ''); $amt = filter_var($in['amount'] ?? null, FILTER_VALIDATE_INT);
  if (!valid_uuid($uuid) || !valid_tx($tx)) out(400, ['ok'=>false, 'error'=>'bad request']);
  if ($amt === false || $amt < 1 || $amt > V_MAX_DEPOSIT) out(400, ['ok'=>false, 'error'=>'bad amount']);
  if ($action === 'mc_withdraw' && $amt < V_MIN_WITHDRAW) out(400, ['ok'=>false, 'error'=>'minimum withdrawal is ' . number_format(V_MIN_WITHDRAW)]);
  $err = null; $bal = 0; $dup = false;
  with_file('vault.json', true, function(&$d) use ($uuid, $tx, $amt, $action, &$err, &$bal, &$dup){
    if (isset($d['tx'][$tx])) { $dup = true; $uid = $d['mc'][$uuid] ?? null; $bal = $uid ? $d['u'][$uid]['bal'] : 0; return; }
    $uid = $d['mc'][$uuid] ?? null;
    if (!$uid) { $err = 'your Minecraft account is not linked. Get a code on the website and run /arcade link <code>.'; return; }
    if ($action === 'mc_withdraw'){
      if ($d['u'][$uid]['bal'] < $amt) { $err = 'not enough in your Vault'; return; }
      $d['u'][$uid]['bal'] -= $amt; $d['u'][$uid]['wd'] += $amt; v_hist($d['u'][$uid], 'withdraw', -$amt, 'in-game');
    } else { $d['u'][$uid]['bal'] += $amt; $d['u'][$uid]['dep'] += $amt; v_hist($d['u'][$uid], 'deposit', $amt, 'in-game'); }
    $d['tx'][$tx] = [$action, $uid, $amt, time()]; if (count($d['tx']) > 5000) $d['tx'] = array_slice($d['tx'], -4000, null, true);
    $bal = $d['u'][$uid]['bal'];
  });
  if ($err) out(400, ['ok'=>false, 'error'=>$err]);
  out(200, ['ok'=>true, 'bal'=>$bal, 'duplicate'=>$dup]);
}

case 'mc_refund': {
  // the plugin took money off the Vault for an in-game withdrawal but could not pay it: put it back
  plugin_auth(); $tx = (string)($in['tx'] ?? '');
  if (!valid_tx($tx)) out(400, ['ok'=>false, 'error'=>'bad request']);
  with_file('vault.json', true, function(&$d) use ($tx){ $t = $d['tx'][$tx] ?? null; if (!$t || $t[0] !== 'mc_withdraw' || !empty($d['tx'][$tx]['refunded'])) return;
    $d['u'][$t[1]]['bal'] += $t[2]; $d['u'][$t[1]]['wd'] -= $t[2]; v_hist($d['u'][$t[1]], 'refund', $t[2], 'payout failed'); $d['tx'][$tx][] = 'refunded'; $d['tx'][$tx]['refunded'] = 1; });
  out(200, ['ok'=>true]);
}

case 'mc_balance': {
  plugin_auth(); $uuid = (string)($in['uuid'] ?? '');
  $d = read_file('vault.json'); $uid = $d['mc'][$uuid] ?? null;
  out(200, ['ok'=>true, 'linked'=>(bool)$uid, 'bal'=>$uid ? $d['u'][$uid]['bal'] : 0]);
}

case 'mc_queue': {
  // hand out website withdrawals; each is leased to the plugin until it reports back with mc_done
  plugin_auth(); $out = [];
  with_file('vault.json', true, function(&$d) use (&$out){
    foreach (($d['q'] ?? []) as $i => $q){ if ($q['s'] === 'queued' && count($out) < 20){ $d['q'][$i]['s'] = 'sent'; $d['q'][$i]['sent'] = time(); $out[] = ['id'=>$q['id'], 'uuid'=>$q['mc'], 'name'=>$q['name'], 'amount'=>$q['a']]; } }
    $d['q'] = array_values(array_filter($d['q'] ?? [], function($q){ return !in_array($q['s'], ['done','failed'], true) || time() - $q['ts'] < 7 * 86400; }));
  });
  out(200, ['ok'=>true, 'jobs'=>$out]);
}

case 'mc_done': {
  plugin_auth(); $id = (int)($in['id'] ?? 0); $ok = !empty($in['ok']); $why = substr((string)($in['reason'] ?? ''), 0, 80);
  with_file('vault.json', true, function(&$d) use ($id, $ok, $why){
    foreach (($d['q'] ?? []) as $i => $q){ if ($q['id'] !== $id || $q['s'] !== 'sent') continue;
      $d['q'][$i]['s'] = $ok ? 'done' : 'failed';
      if ($ok) $d['u'][$q['uid']]['wd'] += $q['a'];
      else { $d['u'][$q['uid']]['bal'] += $q['a']; v_hist($d['u'][$q['uid']], 'refund', $q['a'], 'payout failed: ' . $why); }
    }
  });
  out(200, ['ok'=>true]);
}

default: out(400, ['ok'=>false, 'error'=>'unknown action']);
}
