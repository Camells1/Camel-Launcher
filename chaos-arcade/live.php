<?php
/*
 * CHAOS ARCADE — "Is ___ live right now?" (TikTok)
 * GET live.php  -> live status of the TikTok account in LIVE_TIKTOK (lib.php)
 *
 * TikTok is asked at most once every 45 seconds (cached in lb-data/live-cache.json). Every check also
 * keeps a small history in lb-data/live.json: when a stream ends we store its start, end, length and
 * the most viewers we saw, so the page can show "last stream: 3 days ago, 2h 14m, peak 1,234".
 */
require __DIR__ . '/lib.php';
ensure_storage();
if (!defined('LIVE_TIKTOK')) define('LIVE_TIKTOK', 'ohnepixel');

function tiktok_room($user){
  // local testing only: CA_LIVE_FAKE=/path/to/answer.json makes this read a saved answer instead of TikTok
  if (getenv('CA_LIVE_FAKE')) { $j = json_decode(@file_get_contents(getenv('CA_LIVE_FAKE')), true); return is_array($j) ? $j : null; }
  $url = 'https://www.tiktok.com/api-live/user/room/?aid=1988&app_language=en&app_name=tiktok_web&sourceType=54&uniqueId=' . rawurlencode($user);
  $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
  $body = false;
  if (function_exists('curl_init')){
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_USERAGENT=>$ua, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_HTTPHEADER=>['Accept: application/json']]);
    $body = curl_exec($c); curl_close($c);
  } elseif (ini_get('allow_url_fopen')) {
    $body = @file_get_contents($url, false, stream_context_create(['http'=>['timeout'=>8, 'header'=>"User-Agent: $ua\r\nAccept: application/json\r\n"]]));
  }
  $j = $body ? json_decode($body, true) : null;
  return is_array($j) ? $j : null;
}

$user = preg_replace('/[^A-Za-z0-9_.]/', '', LIVE_TIKTOK);
$now = time();
$cache = read_file('live-cache.json');
if (($cache['user'] ?? '') === $user && $now - ($cache['at'] ?? 0) < 45) out(200, $cache['data']);

$j = tiktok_room($user);
$d = $j['data'] ?? null;
if (!$d || empty($d['user'])) {
  // TikTok didn't answer: serve the last good answer (marked stale) rather than an error
  if (!empty($cache['data'])) out(200, ['stale'=>true] + $cache['data']);
  out(502, ['ok'=>false, 'error'=>'TikTok did not answer, try again in a minute', 'user'=>$user]);
}
$u = $d['user']; $r = $d['liveRoom'] ?? [];
$live = (int)($r['status'] ?? $u['status'] ?? 0) === 2;
$start = (int)($r['startTime'] ?? 0);
$viewers = (int)($r['liveRoomStats']['userCount'] ?? 0);
$title = (string)($r['title'] ?? '');

// ---- history: track the stream we are watching, close it when it ends
$hist = with_file('live.json', true, function(&$h) use ($user, $live, $start, $viewers, $title, $now){
  if (($h['user'] ?? '') !== $user) $h = ['user'=>$user, 'cur'=>null, 'past'=>[]];
  $cur = $h['cur'];
  if ($live){
    if (!$cur || $cur['start'] !== $start){
      if ($cur) array_unshift($h['past'], ['start'=>$cur['start'], 'end'=>$cur['seen'], 'peak'=>$cur['peak'], 'title'=>$cur['title']]);
      $cur = ['start'=>$start ?: $now, 'seen'=>$now, 'peak'=>$viewers, 'title'=>$title];
    }
    $cur['seen'] = $now; $cur['peak'] = max($cur['peak'], $viewers); $cur['title'] = $title ?: $cur['title'];
    $h['cur'] = $cur;
  } elseif ($cur){
    array_unshift($h['past'], ['start'=>$cur['start'], 'end'=>$cur['seen'], 'peak'=>$cur['peak'], 'title'=>$cur['title']]);
    $h['cur'] = null;
  }
  $h['past'] = array_slice($h['past'], 0, 30);
  return $h;
});

$past = $hist['past'] ?? [];
$last = $past[0] ?? null;
if (!$live && !$last && $start) $last = ['start'=>$start, 'end'=>null, 'peak'=>null, 'title'=>$title];   // seen by TikTok, not by us
$out = ['ok'=>true, 'user'=>$user, 'name'=>(string)($u['nickname'] ?? $user), 'avatar'=>(string)($u['avatarMedium'] ?? ''),
  'live'=>$live, 'start'=>$live ? $start : null, 'viewers'=>$live ? $viewers : null, 'peak'=>$live ? ($hist['cur']['peak'] ?? $viewers) : null,
  'title'=>$live ? $title : null, 'last'=>$last, 'history'=>array_slice($past, 0, 10), 'checked'=>$now,
  'url'=>'https://www.tiktok.com/@' . $user . ($live ? '/live' : '')];
with_file('live-cache.json', true, function(&$c) use ($user, $out, $now){ $c = ['user'=>$user, 'at'=>$now, 'data'=>$out]; });
out(200, $out);
