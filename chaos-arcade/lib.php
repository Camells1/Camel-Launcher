<?php
/*
 * CHAOS ARCADE — shared server helpers (storage, accounts, safety)
 * Used by api.php and scores.php. Requesting this file directly does nothing.
 *
 * ============ SETTINGS YOU CAN CHANGE ============
 * ADMINS: usernames (lowercase) that may delete chat messages and ban players.
 *   After you register your own account, put its name here, e.g. ['myname'].
 */
define('ADMINS', []);
// Vault bridge secret: a long random string, the SAME one as secret: in the ArcadeBridge plugin's config.yml.
// Leave it containing CHANGE and the Vault stays switched off.
if (!defined('MC_SECRET')) define('MC_SECRET', 'CHANGE-ME-to-a-long-random-string');
// The Minecraft account (your alt) running the ArcadeBridge mod: players pay and message this account.
if (!defined('VAULT_BOT')) define('VAULT_BOT', 'YourAltName');
define('DATA_DIR', __DIR__ . '/lb-data');
define('TOKEN_DAYS', 60);
/* ================================================= */

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'lib.php'){ http_response_code(404); exit; }

function out($code, $arr){ http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff'); echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

function ensure_storage(){
  if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
  if (!is_dir(DATA_DIR) || !is_writable(DATA_DIR)) out(500, ['ok'=>false, 'error'=>'storage not writable']);
  if (!file_exists(DATA_DIR . '/.htaccess')) @file_put_contents(DATA_DIR . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
  if (!file_exists(DATA_DIR . '/index.html')) @file_put_contents(DATA_DIR . '/index.html', '');
}

/* Open a JSON file under an exclusive or shared lock, let $fn change it, write back if $write. */
/* Every data file is stored as "<name>.php" starting with an exit line, so even on servers
   that ignore .htaccess (e.g. nginx) nobody can download passwords, tokens or chats. */
define('GUARD', "<?php http_response_code(404); exit; ?>\n");
function data_path($name){ return DATA_DIR . '/' . $name . '.php'; }
function data_exists($name){ return file_exists(data_path($name)); }
function with_file($name, $write, $fn){
  $fh = @fopen(data_path($name), 'c+');
  if (!$fh) out(500, ['ok'=>false, 'error'=>'storage open failed']);
  flock($fh, $write ? LOCK_EX : LOCK_SH);
  $raw = stream_get_contents($fh);
  if (strncmp($raw, '<?php', 5) === 0){ $nl = strpos($raw, "\n"); $raw = $nl === false ? '' : substr($raw, $nl + 1); }
  $data = $raw ? json_decode($raw, true) : null;
  if (!is_array($data)) $data = [];
  $res = $fn($data);
  if ($write){ ftruncate($fh, 0); rewind($fh); fwrite($fh, GUARD . json_encode($data, JSON_UNESCAPED_UNICODE)); fflush($fh); }
  flock($fh, LOCK_UN); fclose($fh);
  return $res;
}
function read_file($name){ return with_file($name, false, function($d){ return $d; }); }

function input(){
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') return $_GET;
  $in = json_decode(file_get_contents('php://input', false, null, 0, 65536), true);
  return is_array($in) ? $in : [];
}
function ip_key(){ return substr(hash('sha256', 'ip|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 16); }

/* Simple per-key rate limiter: returns true if the action is allowed. */
function rate_ok($bucket, $key, $max, $window){
  return with_file('rate-' . $bucket . '.json', true, function(&$d) use ($key, $max, $window){
    $now = time();
    foreach ($d as $k => $list){ $d[$k] = array_values(array_filter($list, function($t) use ($now, $window){ return $now - $t < $window; })); if (!$d[$k]) unset($d[$k]); }
    $list = $d[$key] ?? [];
    if (count($list) >= $max) return false;
    $list[] = $now; $d[$key] = $list; return true;
  });
}

/* ---------- text safety ---------- */
function bad_words(){ return ['fuck','shit','cunt','nigg','fagg','hitler','nazi','rape','whore','retard','bitch','dick','pussy','slut','porn','kys']; }
function is_bad($s){ $flat = strtolower(preg_replace('/[^a-z]/i', '', $s)); foreach (bad_words() as $b) if (strpos($flat, $b) !== false) return true; return false; }
function clean_chat($s){
  $s = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string)$s);
  $s = trim(preg_replace('/\s+/u', ' ', $s));
  $s = function_exists('mb_substr') ? mb_substr($s, 0, 200, 'UTF-8') : substr($s, 0, 200);
  $s = preg_replace('~\b(?:https?://|www\.)\S+~i', '[link removed]', $s);
  $s = preg_replace('~\b[a-z0-9-]+\.(?:com|net|org|io|gg|xyz|ru|tk|ly|me|co)\b(?:/\S*)?~i', '[link removed]', $s);
  foreach (bad_words() as $b){ $s = preg_replace('/' . implode('[^a-z]*', str_split($b)) . '/i', str_repeat('*', strlen($b)), $s); }
  return $s;
}
function valid_username($u){ return is_string($u) && preg_match('/^[A-Za-z0-9_]{3,16}$/', $u) && !is_bad($u); }

/* ---------- accounts ---------- */
function auth_token(){
  $h = $_SERVER['HTTP_X_AUTH'] ?? '';
  return preg_match('/^[a-f0-9]{64}$/', $h) ? $h : '';
}
/* Returns the logged-in user record (array with 'id','name',...) or null. */
function current_user(){
  static $cached = false;
  if ($cached !== false) return $cached;
  $t = auth_token(); $cached = null;
  if (!$t) return null;
  $th = hash('sha256', $t);
  $tokens = read_file('tokens.json');
  if (!isset($tokens[$th]) || $tokens[$th]['exp'] < time()) return null;
  $users = read_file('users.json');
  $u = $users[$tokens[$th]['uid']] ?? null;
  if (!$u || !empty($u['banned'])) return null;
  $cached = $u;
  return $u;
}
function require_user(){ $u = current_user(); if (!$u) out(401, ['ok'=>false, 'error'=>'login required']); return $u; }
function is_admin($u){ return $u && in_array($u['id'], ADMINS, true); }
function public_user($u){ return ['id'=>$u['id'], 'name'=>$u['name'], 'xp'=>$u['xp'] ?? 0, 'rank'=>$u['rank'] ?? '🕹️']; }
