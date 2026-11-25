<?php
// Admin panel: approve clips, go live, polls, leaderboard, builds, settings.
// It lives in its own folder; rename the folder to something secret (see HOW-TO-UPLOAD.txt).
const ROOT = __DIR__ . '/..';
// This folder's own address, e.g. /my-admin-folder/
$SELF = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';
require_once ROOT . '/lib.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

// ---------- secret link gate ----------
// Without the secret key after the "?" (or a session that already passed it)
// this page looks exactly like any other missing page.
$secretOk = strlen(ADMIN_SECRET) >= 12 && ADMIN_SECRET !== 'change-this-secret';
if (empty($_SESSION['gate'])) {
    $k = isset($_GET['k']) ? (string)$_GET['k'] : trim(rawurldecode((string)($_SERVER['QUERY_STRING'] ?? '')), '/');
    if ($secretOk && $k !== '' && hash_equals(ADMIN_SECRET, $k)) {
        session_regenerate_id(true);
        $_SESSION['gate'] = true;
        header('Location: ' . $SELF); // drop the key from the address bar / history
        exit;
    }
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    readfile(ROOT . '/404.html');
    exit;
}

function h($v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

/** Live tracker admin actions. */
function tracker_action(string $do): string {
    $user = load_state()['settings']['tiktok'] ?: 'yokii_fn.alt';
    if ($do === 'tracker_check') {
        $L = live_refresh($user, true);
        if (!$L['ok']) return 'Could not reach TikTok from your web host right now. The site will keep trying every minute.';
        return !empty($L['now']['live']) ? '🔴 Checked: LIVE with ' . $L['now']['viewers'] . ' viewers.' : 'Checked: not live right now. Followers: ' . ($L['profile']['followers'] ?? '?');
    }
    $lock = fopen(ROOT . '/data/.livelock', 'c'); flock($lock, LOCK_EX);
    $L = array_merge(live_default(), read_guarded(LIVE_FILE) ?? []);
    $msg = '';
    if ($do === 'stream_add') {
        $start = (int)($_POST['startTs'] ?? 0);
        $mins = max(0, (int)($_POST['minutes'] ?? 0));
        $peak = max(0, (int)($_POST['peak'] ?? 0));
        $total = max(0, (int)($_POST['total'] ?? 0));
        if (!$start) $msg = 'Pick the date and time the stream started.';
        else {
            $L['streams'][] = ['roomId' => 'manual-' . new_id(), 'title' => clean($_POST['title'] ?? '', 120), 'start' => $start,
                'end' => $mins ? $start + $mins * 60 : null, 'peak' => $peak ?: null, 'total' => $total, 'samples' => [], 'manual' => true,
                'partial' => $mins ? false : true];
            usort($L['streams'], fn($a, $b) => $a['start'] <=> $b['start']);
            if ($peak && (!$L['peak'] || $peak > $L['peak']['viewers'])) $L['peak'] = ['viewers' => $peak, 'at' => $start, 'title' => clean($_POST['title'] ?? '', 120)];
            $msg = 'Stream added to the history.';
        }
    } elseif ($do === 'stream_delete') {
        $L['streams'] = array_values(array_filter($L['streams'], fn($x) => ($x['roomId'] ?? '') !== ($_POST['id'] ?? '')));
        $msg = 'Stream removed.';
    } elseif ($do === 'tracker_reset_peak') {
        $best = null;
        foreach ($L['streams'] as $x) if (!empty($x['peak']) && (!$best || $x['peak'] > $best['viewers'])) $best = ['viewers' => $x['peak'], 'at' => $x['start'], 'title' => $x['title']];
        $L['peak'] = $best;
        $msg = 'Top viewer count recalculated from the stream history.';
    }
    write_guarded(LIVE_FILE, $L);
    flock($lock, LOCK_UN); fclose($lock);
    return $msg;
}
$flash = '';

// ---------- login / logout ----------
if (isset($_POST['login'])) {
    if (!rate_ok('login', 10)) { $flash = 'Too many tries. Wait an hour.'; }
    elseif (ADMIN_PASSWORD_HASH === '' && (ADMIN_PASSWORD === 'change-me-please' || strlen(ADMIN_PASSWORD) < 8)) { $flash = 'Set your own password in config.php first.'; }
    elseif (ADMIN_PASSWORD_HASH !== '' ? password_verify((string)$_POST['password'], ADMIN_PASSWORD_HASH) : hash_equals(ADMIN_PASSWORD, (string)$_POST['password'])) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        header('Location: ' . $SELF); exit;
    } else { $flash = 'Wrong password.'; }
}
if (isset($_GET['logout'])) { $_SESSION = []; session_destroy(); header('Location: ../'); exit; }
$authed = !empty($_SESSION['admin']);

// ---------- actions ----------
if ($authed && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do'])) {
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(400); exit('Bad token, reload the page.'); }
    $do = $_POST['do'];
    if (in_array($do, ['tracker_check', 'stream_add', 'stream_delete', 'tracker_reset_peak'], true)) {
        $flash = tracker_action($do);
        $_SESSION['flash'] = $flash;
        header('Location: ' . $SELF . '#tracker');
        exit;
    }
    $flash = with_state(function (&$s) use ($do) {
        switch ($do) {
            case 'live':
                $s['settings']['live'] = !empty($_POST['live']);
                $s['settings']['liveNote'] = clean($_POST['liveNote'] ?? '', 120);
                return $s['settings']['live'] ? '🔴 You are LIVE on the site.' : 'Set to offline.';
            case 'settings':
                $text = ['siteName'=>60,'streamerName'=>40,'tiktok'=>40,'discordInvite'=>40,'schedule'=>120,'eventTitle'=>80,
                         'smpIp'=>80,'smpVersion'=>40,'mapUrl'=>200,'seed'=>40,'seedNote'=>200,'mcUsername'=>16,'clipPerson'=>40,'secretWord'=>40];
                foreach ($text as $k => $max) $s['settings'][$k] = clean($_POST[$k] ?? '', $max);
                $s['settings']['tiktok'] = ltrim($s['settings']['tiktok'], '@');
                $s['settings']['discordInvite'] = preg_replace('~^.*/~', '', $s['settings']['discordInvite']);
                $t = $_POST['eventTime'] ?? '';
                $s['settings']['eventTime'] = $t ? (string)((int)$_POST['eventTs']) : '';
                if (!preg_match('~^https?://~', $s['settings']['mapUrl'])) $s['settings']['mapUrl'] = '';
                return 'Settings saved.';
            case 'clip_approve':
                foreach ($s['clips'] as &$c) if ($c['id'] === $_POST['id']) $c['status'] = 'approved';
                return 'Clip approved — it is on the wheel now.';
            case 'clip_delete':
                foreach ($s['clips'] as $i => $c) if ($c['id'] === $_POST['id']) {
                    if ($c['type'] === 'file') @unlink(ROOT . '/' . $c['src']);
                    array_splice($s['clips'], $i, 1);
                    break;
                }
                return 'Clip deleted.';
            case 'poll_create':
                $opts = array_values(array_filter(array_map(fn($o) => clean($o, 80), explode("\n", $_POST['options'] ?? ''))));
                $q = clean($_POST['question'] ?? '', 120);
                if (!$q || count($opts) < 2) return 'A poll needs a question and at least 2 options.';
                array_unshift($s['polls'], ['id' => new_id(), 'question' => $q, 'open' => true, 'created' => time(),
                    'options' => array_map(fn($o) => ['text' => $o, 'votes' => 0], array_slice($opts, 0, 8)), 'voters' => []]);
                return 'Poll created.';
            case 'poll_toggle':
                foreach ($s['polls'] as &$p) if ($p['id'] === $_POST['id']) $p['open'] = empty($p['open']);
                return 'Poll updated.';
            case 'poll_delete':
                $s['polls'] = array_values(array_filter($s['polls'], fn($p) => $p['id'] !== $_POST['id']));
                return 'Poll deleted.';
            case 'leaderboard':
                $rows = [];
                foreach (explode("\n", $_POST['rows'] ?? '') as $line) {
                    $parts = array_map('trim', explode('|', $line));
                    if ($parts[0] === '') continue;
                    $rows[] = ['name' => clean($parts[0], 30), 'score' => (int)preg_replace('/[^\d-]/', '', $parts[1] ?? '0'), 'note' => clean($parts[2] ?? '', 60)];
                }
                usort($rows, fn($a, $b) => $b['score'] <=> $a['score']);
                $s['leaderboard'] = array_slice($rows, 0, 50);
                $s['settings']['leaderboardTitle'] = clean($_POST['lbTitle'] ?? 'Top Viewers', 60);
                return 'Leaderboard saved.';
            case 'donators':
                $rows = [];
                foreach (explode("\n", $_POST['rows'] ?? '') as $line) {
                    $parts = array_map('trim', explode('|', $line));
                    if ($parts[0] === '') continue;
                    $amt = (float)str_replace(',', '.', preg_replace('/[^\d.,]/', '', $parts[1] ?? '0'));
                    $rows[] = ['name' => clean($parts[0], 30), 'amount' => $amt, 'note' => clean($parts[2] ?? '', 60)];
                }
                usort($rows, fn($a, $b) => $b['amount'] <=> $a['amount']);
                $s['donators'] = array_slice($rows, 0, 50);
                $s['settings']['donateUnit'] = clean($_POST['donateUnit'] ?? 'coins', 12);
                $s['settings']['donateUrl'] = preg_match('~^https?://~', $_POST['donateUrl'] ?? '') ? clean($_POST['donateUrl'], 200) : '';
                return 'Top donators saved.';
            case 'pedia_add':
                $term = clean($_POST['term'] ?? '', 40);
                $desc = clean($_POST['desc'] ?? '', 400);
                if ($term === '') return 'Give the entry a word or name.';
                $entry = ['id' => new_id(), 'term' => $term, 'desc' => $desc, 'sound' => ''];
                $f = $_FILES['sound'] ?? null;
                if ($f && $f['error'] !== UPLOAD_ERR_NO_FILE) {
                    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 5 * 1024 * 1024) return 'Sound upload failed (max 5 MB).';
                    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
                    if (!in_array($ext, ['mp3', 'ogg', 'wav', 'm4a', 'aac', 'webm'], true)) return 'Sounds must be MP3, OGG, WAV or M4A.';
                    $mime = function_exists('finfo_open') ? (string)finfo_file(finfo_open(FILEINFO_MIME_TYPE), $f['tmp_name']) : 'audio/';
                    if (!preg_match('~^(audio/|video/webm|application/octet-stream)~', $mime)) return "That doesn't look like a sound file.";
                    if (!is_dir(ROOT . '/uploads/sounds')) mkdir(ROOT . '/uploads/sounds', 0755, true);
                    $name = new_id() . '.' . $ext;
                    move_uploaded_file($f['tmp_name'], ROOT . '/uploads/sounds/' . $name);
                    $entry['sound'] = 'uploads/sounds/' . $name;
                }
                $s['pedia'][] = $entry;
                usort($s['pedia'], fn($a, $b) => strcasecmp($a['term'], $b['term']));
                return 'Added "' . $term . '" to the Yokii-pedia.';
            case 'pedia_delete':
                foreach ($s['pedia'] as $i => $e) if ($e['id'] === $_POST['id']) {
                    if ($e['sound']) @unlink(ROOT . '/' . $e['sound']);
                    array_splice($s['pedia'], $i, 1);
                    break;
                }
                return 'Entry removed.';
            case 'videos':
                $ids = [];
                foreach (explode("\n", $_POST['videos'] ?? '') as $line) {
                    $line = trim($line);
                    if ($line && ($id = tiktok_id($line))) $ids[] = $id;
                }
                $s['videos'] = array_slice(array_values(array_unique($ids)), 0, 24);
                return 'Saved ' . count($s['videos']) . ' videos for the clip wall.';
            case 'build_add':
                $f = $_FILES['img'] ?? null;
                if (!$f || $f['error'] !== UPLOAD_ERR_OK) return 'Pick an image.';
                $info = @getimagesize($f['tmp_name']);
                $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
                if (!$info || !isset($types[$info[2]])) return 'Only JPG, PNG, WEBP or GIF images.';
                $name = new_id() . '.' . $types[$info[2]];
                move_uploaded_file($f['tmp_name'], ROOT . '/uploads/builds/' . $name);
                $s['builds'][] = ['id' => new_id(), 'img' => 'uploads/builds/' . $name,
                    'title' => clean($_POST['title'] ?? '', 60), 'by' => clean($_POST['by'] ?? '', 30)];
                return 'Build added.';
            case 'build_delete':
                foreach ($s['builds'] as $i => $b) if ($b['id'] === $_POST['id']) {
                    @unlink(ROOT . '/' . $b['img']);
                    array_splice($s['builds'], $i, 1);
                    break;
                }
                return 'Build removed.';
        }
        return 'Unknown action.';
    });
    $_SESSION['flash'] = $flash;
    header('Location: ' . $SELF . (isset($_POST['anchor']) ? '#' . preg_replace('/\W/', '', $_POST['anchor']) : ''));
    exit;
}
if (isset($_SESSION['flash'])) { $flash = $_SESSION['flash']; unset($_SESSION['flash']); }
$s = load_state();
$st = $s['settings'];
$csrf = $_SESSION['csrf'] ?? '';
function hidden($do, $anchor, $csrf, $extra = []) {
    $o = '<input type="hidden" name="do" value="' . h($do) . '"><input type="hidden" name="anchor" value="' . h($anchor) . '"><input type="hidden" name="csrf" value="' . h($csrf) . '">';
    foreach ($extra as $k => $v) $o .= '<input type="hidden" name="' . h($k) . '" value="' . h($v) . '">';
    return $o;
}
$pending = array_filter($s['clips'], fn($c) => $c['status'] === 'pending');
$approved = array_filter($s['clips'], fn($c) => $c['status'] === 'approved');
function clip_preview($c) { return clip_player_html($c, '../'); }
function clip_icon($c) {
    if ($c['type'] === 'file') return '🎬';
    $p = $c['type'] === 'tiktok' ? 'tiktok' : ($c['provider'] ?? 'web');
    return ['tiktok' => '🎵', 'youtube' => '▶️', 'twitch-clip' => '💜', 'twitch-vod' => '💜', 'instagram' => '📸', 'streamable' => '🎞', 'medal' => '🏅', 'kick' => '🟩', 'x' => '✖️'][$p] ?? '🔗';
}
?><!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Admin · <?= h($st['siteName']) ?></title>
<link rel="stylesheet" href="../assets/style.css">
<link rel="icon" href="../assets/favicon.svg">
</head><body class="admin">
<header class="topbar"><a class="brand" href="../">⛏ <?= h($st['siteName']) ?></a><nav class="nav-links"><a href="../" target="_blank">View site</a><?php if ($authed): ?><a href="?logout=1">Log out</a><?php endif ?></nav></header>
<main class="wrap">
<?php if ($flash): ?><div class="flash"><?= h($flash) ?></div><?php endif ?>
<?php if (!$authed): ?>
  <section class="card narrow">
    <h1>Admin login</h1>
    <form method="post"><label>Password <input type="password" name="password" autofocus required></label>
    <button class="btn btn-grass" name="login" value="1">Log in</button></form>
  </section>
<?php else: ?>
  <h1>Admin panel</h1>
  <p class="muted">Jump to: <a href="#tracker">Live tracker</a> · <a href="#pedia">Yokii-pedia</a> · <a href="#clips">Clips (<?= count($pending) ?> waiting)</a> · <a href="#polls">Polls</a> · <a href="#lb">Leaderboard</a> · <a href="#don">Top donators</a> · <a href="#videos">Clip wall</a> · <a href="#builds">Builds</a> · <a href="#settings">Settings</a></p>

  <?php $L = array_merge(live_default(), read_guarded(LIVE_FILE) ?? []); ?>
  <section class="card" id="tracker">
    <h2>📈 Live tracker</h2>
    <p>The site checks <b>@<?= h($st['tiktok']) ?></b> on TikTok by itself (at most once a minute, when someone visits) and shows the LIVE banner, viewer count and stream history automatically.</p>
    <p class="muted small">Last check: <?= $L['checkedAt'] ? date('M j, H:i:s', $L['checkedAt']) . ($L['ok'] ? ' ✅ worked' : ' ⚠️ TikTok did not answer') : 'never' ?>
      <?php if (!empty($L['now']['live'])): ?> · <b style="color:var(--tiktok)">🔴 LIVE, <?= (int)$L['now']['viewers'] ?> watching</b><?php endif ?>
      · Followers: <?= h($L['profile']['followers'] ?? '?') ?> · Top viewer count: <?= h($L['peak']['viewers'] ?? '—') ?></p>
    <div class="btn-row">
      <form method="post"><?= hidden('tracker_check', 'tracker', $csrf) ?><button class="btn btn-grass">Check TikTok now</button></form>
      <form method="post"><?= hidden('tracker_reset_peak', 'tracker', $csrf) ?><button class="btn btn-small">Recalculate top viewers</button></form>
    </div>

    <h3>Add a past stream</h3>
    <p class="muted small">For streams from before the site existed (like the one with 311 viewers). Leave a field empty if you don't know it.</p>
    <form method="post" class="grid-form" id="streamForm"><?= hidden('stream_add', 'tracker', $csrf) ?>
      <label>Started (your local time) <input type="datetime-local" id="streamStart" required></label>
      <input type="hidden" name="startTs" id="streamStartTs">
      <label>Title <input name="title" placeholder="breezevanilla.eu"></label>
      <label>How long (minutes) <input type="number" name="minutes" min="0" placeholder="120"></label>
      <label>Most viewers at once (peak) <input type="number" name="peak" min="0" placeholder="80"></label>
      <label>Total viewers (TikTok's "kijkers") <input type="number" name="total" min="0" placeholder="311"></label>
      <button class="btn btn-gold span2">Add stream</button>
    </form>

    <h3>Stream history (<?= count($L['streams']) ?>)</h3>
    <table class="table"><?php foreach (array_reverse(array_slice($L['streams'], -30)) as $x): ?>
      <tr><td><?= date('D M j, H:i', $x['start']) ?><br><span class="muted small"><?= h($x['title'] ?: 'untitled') ?><?= !empty($x['manual']) ? ' · added by hand' : '' ?></span></td>
        <td class="muted small"><?= $x['end'] ? round(($x['end'] - $x['start']) / 60) . ' min' : ($x['end'] === null && empty($x['partial']) ? '🔴 live' : '?') ?></td>
        <td class="muted small">peak <?= h($x['peak'] ?? '?') ?> · total <?= h($x['total'] ?: '?') ?></td>
        <td><form method="post" onsubmit="return confirm('Remove this stream from the history?')"><?= hidden('stream_delete', 'tracker', $csrf, ['id' => $x['roomId']]) ?><button class="btn btn-small btn-red">Remove</button></form></td></tr>
    <?php endforeach ?></table>
    <script>
      document.getElementById('streamForm').addEventListener('submit', () => {
        const v = document.getElementById('streamStart').value;
        document.getElementById('streamStartTs').value = v ? Math.floor(new Date(v).getTime() / 1000) : '';
      });
    </script>
  </section>

  <section class="card" id="live">
    <h2>Force the LIVE banner</h2>
    <p class="muted small">Normally not needed, the tracker above does this by itself. Use it if TikTok can't be reached from your host.</p>
    <form method="post" class="row-form"><?= hidden('live', 'live', $csrf) ?>
      <label class="switch"><input type="checkbox" name="live" value="1" <?= $st['live'] ? 'checked' : '' ?>> Show LIVE banner</label>
      <label>Banner text <input name="liveNote" value="<?= h($st['liveNote']) ?>"></label>
      <button class="btn btn-tiktok">Save</button>
    </form>
  </section>

  <section class="card" id="pedia">
    <h2>📖 Yokii-pedia &amp; soundboard</h2>
    <p class="muted small">Inside jokes, catchphrases, names chat always says. Add a sound and it also shows on the soundboard.</p>
    <form method="post" enctype="multipart/form-data" class="grid-form"><?= hidden('pedia_add', 'pedia', $csrf) ?>
      <label>Word / name <input name="term" maxlength="40" required placeholder="e.g. a catchphrase"></label>
      <label>Sound (optional, MP3/OGG/WAV/M4A, max 5 MB) <input type="file" name="sound" accept="audio/*"></label>
      <label class="span2">What it means <textarea name="desc" rows="3" maxlength="400" placeholder="Where it comes from and why chat keeps saying it."></textarea></label>
      <button class="btn btn-grass span2">Add to Yokii-pedia</button>
    </form>
    <table class="table"><?php foreach ($s['pedia'] as $e): ?>
      <tr><td><b><?= h($e['term']) ?></b> <?= $e['sound'] ? '🔊' : '' ?><br><span class="muted small"><?= h($e['desc']) ?></span></td>
      <td><form method="post" onsubmit="return confirm('Remove this entry?')"><?= hidden('pedia_delete', 'pedia', $csrf, ['id' => $e['id']]) ?><button class="btn btn-small btn-red">Remove</button></form></td></tr>
    <?php endforeach ?></table>
  </section>

  <section class="card" id="clips">
    <h2>Clips waiting for approval (<?= count($pending) ?>)</h2>
    <?php if (!$pending): ?><p class="muted">Nothing waiting. 🎉</p><?php endif ?>
    <div class="admin-clips">
    <?php foreach ($pending as $c): ?>
      <div class="admin-clip"><?= clip_preview($c) ?>
        <b><?= clip_icon($c) ?> <?= h($c['title']) ?></b><span class="muted small">by <?= h($c['by']) ?> · <?= date('M j, H:i', $c['created']) ?><?php if (!empty($c['link'])): ?> · <a href="<?= h($c['link']) ?>" target="_blank" rel="noopener noreferrer">original</a><?php endif ?></span>
        <div class="btn-row">
          <form method="post"><?= hidden('clip_approve', 'clips', $csrf, ['id' => $c['id']]) ?><button class="btn btn-grass">Approve</button></form>
          <form method="post" onsubmit="return confirm('Delete this clip?')"><?= hidden('clip_delete', 'clips', $csrf, ['id' => $c['id']]) ?><button class="btn btn-red">Delete</button></form>
        </div></div>
    <?php endforeach ?>
    </div>
    <h3>On the wheel (<?= count($approved) ?>)</h3>
    <table class="table"><?php foreach ($approved as $c): ?>
      <tr><td><?= clip_icon($c) ?> <?= h($c['title']) ?></td><td class="muted"><?= h($c['by']) ?></td>
      <td><form method="post" onsubmit="return confirm('Remove from wheel?')"><?= hidden('clip_delete', 'clips', $csrf, ['id' => $c['id']]) ?><button class="btn btn-small btn-red">Remove</button></form></td></tr>
    <?php endforeach ?></table>
  </section>

  <section class="card" id="polls">
    <h2>Polls</h2>
    <form method="post"><?= hidden('poll_create', 'polls', $csrf) ?>
      <label>Question <input name="question" placeholder="What should I do next stream?" required></label>
      <label>Options (one per line, 2–8) <textarea name="options" rows="4" placeholder="Hardcore attempt&#10;No armor challenge&#10;Speedrun the Ender Dragon"></textarea></label>
      <button class="btn btn-grass">Create poll</button>
    </form>
    <table class="table"><?php foreach ($s['polls'] as $p): $total = array_sum(array_column($p['options'], 'votes')); ?>
      <tr><td><b><?= h($p['question']) ?></b><br><span class="muted small"><?= implode(' · ', array_map(fn($o) => h($o['text']) . ' (' . $o['votes'] . ')', $p['options'])) ?> — <?= $total ?> votes</span></td>
      <td><?= $p['open'] ? '🟢 open' : '⚫ closed' ?></td>
      <td class="btn-row"><form method="post"><?= hidden('poll_toggle', 'polls', $csrf, ['id' => $p['id']]) ?><button class="btn btn-small"><?= $p['open'] ? 'Close' : 'Reopen' ?></button></form>
      <form method="post" onsubmit="return confirm('Delete poll?')"><?= hidden('poll_delete', 'polls', $csrf, ['id' => $p['id']]) ?><button class="btn btn-small btn-red">Delete</button></form></td></tr>
    <?php endforeach ?></table>
  </section>

  <section class="card" id="lb">
    <h2>Leaderboard</h2>
    <form method="post"><?= hidden('leaderboard', 'lb', $csrf) ?>
      <label>Title <input name="lbTitle" value="<?= h($st['leaderboardTitle'] ?? 'Top Viewers') ?>"></label>
      <label>One per line: <code>name | score | note</code> (sorted automatically)
      <textarea name="rows" rows="8" placeholder="Steve | 1200 | Never misses a stream&#10;Alex | 950"><?= h(implode("\n", array_map(fn($r) => $r['name'] . ' | ' . $r['score'] . ($r['note'] ? ' | ' . $r['note'] : ''), $s['leaderboard']))) ?></textarea></label>
      <button class="btn btn-grass">Save leaderboard</button>
    </form>
  </section>

  <section class="card" id="don">
    <h2>👑 Top donators</h2>
    <form method="post"><?= hidden('donators', 'don', $csrf) ?>
      <div class="grid-form">
        <label>What are amounts counted in? <input name="donateUnit" value="<?= h($st['donateUnit'] ?? 'coins') ?>" placeholder="coins, €, $, gifts…"></label>
        <label>Donate / support link (optional) <input name="donateUrl" value="<?= h($st['donateUrl'] ?? '') ?>" placeholder="https://ko-fi.com/…"></label>
      </div>
      <label>One per line: <code>name | amount | note</code> (biggest first automatically; #1 gets the crown on the home page)
      <textarea name="rows" rows="8" placeholder="Steve | 5000 | Sent a Lion 🦁&#10;Alex | 1200"><?= h(implode("\n", array_map(fn($r) => $r['name'] . ' | ' . (+$r['amount']) . ($r['note'] ? ' | ' . $r['note'] : ''), $s['donators'] ?? []))) ?></textarea></label>
      <button class="btn btn-gold">Save top donators</button>
    </form>
    <p class="muted small">Tip: after each stream, check the TikTok LIVE top gifters and update the numbers here.</p>
  </section>

  <section class="card" id="videos">
    <h2>Clip wall (TikTok videos on the home page)</h2>
    <form method="post"><?= hidden('videos', 'videos', $csrf) ?>
      <label>Paste TikTok video links, one per line (max 24)
      <textarea name="videos" rows="6" placeholder="https://www.tiktok.com/@yokii_fn.alt/video/1234567890123456789"><?= h(implode("\n", array_map(fn($id) => 'https://www.tiktok.com/@' . $st['tiktok'] . '/video/' . $id, $s['videos']))) ?></textarea></label>
      <button class="btn btn-grass">Save clip wall</button>
    </form>
  </section>

  <section class="card" id="builds">
    <h2>Build showcase</h2>
    <form method="post" enctype="multipart/form-data" class="row-form"><?= hidden('build_add', 'builds', $csrf) ?>
      <label>Screenshot <input type="file" name="img" accept="image/*" required></label>
      <label>Title <input name="title" placeholder="Spawn castle"></label>
      <label>Built by <input name="by" placeholder="yokii"></label>
      <button class="btn btn-grass">Add build</button>
    </form>
    <div class="builds-grid"><?php foreach ($s['builds'] as $b): ?>
      <figure class="build"><img src="../<?= h($b['img']) ?>" alt=""><figcaption><?= h($b['title']) ?> <span class="muted"><?= h($b['by']) ?></span>
      <form method="post" onsubmit="return confirm('Remove build?')"><?= hidden('build_delete', 'builds', $csrf, ['id' => $b['id']]) ?><button class="btn btn-small btn-red">Remove</button></form></figcaption></figure>
    <?php endforeach ?></div>
  </section>

  <section class="card" id="settings">
    <h2>Site settings</h2>
    <form method="post" class="grid-form" id="settingsForm"><?= hidden('settings', 'settings', $csrf) ?>
      <label>Site name <input name="siteName" value="<?= h($st['siteName']) ?>"></label>
      <label>Streamer name <input name="streamerName" value="<?= h($st['streamerName']) ?>"></label>
      <label>TikTok username <input name="tiktok" value="<?= h($st['tiktok']) ?>"></label>
      <label>Discord invite code or link <input name="discordInvite" value="<?= h($st['discordInvite']) ?>"></label>
      <label class="span2">Stream schedule text <input name="schedule" value="<?= h($st['schedule']) ?>"></label>
      <label>Next giveaway (what can people win?) <input name="eventTitle" value="<?= h($st['eventTitle']) ?>" placeholder="e.g. Minecraft Java account"></label>
      <label>Giveaway ends (date &amp; time, your local time) <input type="datetime-local" name="eventTime" id="eventTime"></label>
      <input type="hidden" name="eventTs" id="eventTs" value="<?= h($st['eventTime']) ?>">
      <label>Server we play on (shown on the Server page) <input name="smpIp" value="<?= h($st['smpIp']) ?>" placeholder="breezevanilla.eu"></label>
      <label>Server version (optional) <input name="smpVersion" value="<?= h($st['smpVersion']) ?>" placeholder="e.g. Java 1.21"></label>
      <label class="span2">Live world map link (BlueMap / Dynmap, optional) <input name="mapUrl" value="<?= h($st['mapUrl']) ?>" placeholder="https://map.example.net"></label>
      <label>Seed of the week <input name="seed" value="<?= h($st['seed']) ?>"></label>
      <label>Seed note <input name="seedNote" value="<?= h($st['seedNote']) ?>" placeholder="Village + ruined portal at spawn"></label>
      <label>His Minecraft username (for the skin viewer) <input name="mcUsername" value="<?= h($st['mcUsername']) ?>"></label>
      <label>Clip spinner is about… <input name="clipPerson" value="<?= h($st['clipPerson']) ?>"></label>
      <label class="span2">🔐 Vault secret word (people who find the secret Vault page see this; they type it in Discord for a special role)
        <input name="secretWord" value="<?= h($st['secretWord'] ?? '') ?>" placeholder="e.g. diamondpickaxe42"></label>
      <button class="btn btn-grass span2">Save settings</button>
    </form>
  </section>
  <script>
    // datetime-local works in local time; store a unix timestamp so every visitor sees the right countdown.
    const ts = document.getElementById('eventTs'), dt = document.getElementById('eventTime');
    if (ts.value) { const d = new Date(ts.value * 1000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); dt.value = d.toISOString().slice(0, 16); }
    document.getElementById('settingsForm').addEventListener('submit', () => { ts.value = dt.value ? Math.floor(new Date(dt.value).getTime() / 1000) : ''; });
  </script>
<?php endif ?>
</main></body></html>
