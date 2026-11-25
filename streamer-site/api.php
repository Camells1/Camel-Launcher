<?php
// Public API used by the website pages.
require_once __DIR__ . '/lib.php';

$a = $_GET['a'] ?? $_POST['a'] ?? 'state';

if ($a === 'state') {
    json_out(public_state(load_state()));
}

// ---------- Live tracker (also safe to call from a cron job every 1-2 minutes) ----------
if ($a === 'live') {
    $st = load_state()['settings'];
    json_out(live_public(live_refresh($st['tiktok'] ?: 'yokii_fn.alt'), $st));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'Use POST'], 405);

// ---------- Submit a clip (file or TikTok link) ----------
if ($a === 'submit_clip') {
    $title = clean($_POST['title'] ?? '', 60);
    $by    = clean($_POST['by'] ?? '', 30);
    $link  = trim($_POST['link'] ?? '');
    if ($by === '') $by = 'anonymous';

    $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE;
    if (!$hasFile && $link === '') json_out(['error' => 'Pick a video file or paste a link to the clip.'], 400);

    if ($hasFile) {
        $f = $_FILES['file'];
        if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE)
            json_out(['error' => 'That file is too big for this server. Try a shorter clip or paste a TikTok link.'], 400);
        if ($f['error'] !== UPLOAD_ERR_OK) json_out(['error' => 'Upload failed (code ' . $f['error'] . '). Try again.'], 400);
        if ($f['size'] > MAX_CLIP_MB * 1024 * 1024) json_out(['error' => 'Max file size is ' . MAX_CLIP_MB . ' MB.'], 400);
        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, VIDEO_EXT, true)) json_out(['error' => 'That file type is not supported. Use a video file (MP4, MOV, WEBM, MKV, AVI…) or a GIF.'], 400);
        if (function_exists('finfo_open')) {
            $mime = (string)finfo_file(finfo_open(FILEINFO_MIME_TYPE), $f['tmp_name']);
            if (!str_starts_with($mime, 'video/') && !in_array($mime, ['image/gif', 'application/octet-stream', 'application/ogg'], true))
                json_out(['error' => "That doesn't look like a video file."], 400);
        }
    } else {
        $fromLink = clip_from_link($link);
        if (!$fromLink) json_out(['error' => 'That link does not work. Copy the full link (starting with https://) from the clip and paste it here.'], 400);
        // no title typed? use the video's own title (YouTube)
        if ($title === '' && ($fromLink['provider'] ?? '') === 'youtube') $title = $fromLink['autoTitle'] ?? yt_title($link);
        unset($fromLink['autoTitle']);
    }
    if ($title === '') json_out(['error' => 'Give your clip a title.'], 400);

    if (!rate_ok('upload', UPLOADS_PER_HOUR)) json_out(['error' => 'Slow down! You can send ' . UPLOADS_PER_HOUR . ' clips per hour.'], 429);

    if ($hasFile) {
        $name = new_id() . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/uploads/clips/' . $name))
            json_out(['error' => 'Server could not save the file (check the uploads folder permissions).'], 500);
        $clip = ['type' => 'file', 'src' => 'uploads/clips/' . $name];
    } else {
        $clip = $fromLink;
    }
    $clip += ['id' => new_id(), 'title' => $title, 'by' => $by, 'status' => 'pending', 'created' => time()];
    with_state(function (&$s) use ($clip) { $s['clips'][] = $clip; });
    json_out(['ok' => true, 'message' => 'Thanks! Your clip will show up on the wheel once a mod approves it.']);
}

// ---------- Vote in a poll ----------
if ($a === 'vote') {
    $pollId = $_POST['poll'] ?? '';
    $opt = (int)($_POST['option'] ?? -1);
    $voter = client_hash();
    $res = with_state(function (&$s) use ($pollId, $opt, $voter) {
        foreach ($s['polls'] as &$p) {
            if ($p['id'] !== $pollId) continue;
            if (empty($p['open'])) return ['error' => 'This poll is closed.'];
            if (in_array($voter, $p['voters'] ?? [], true)) return ['error' => 'You already voted!'];
            if (!isset($p['options'][$opt])) return ['error' => 'Unknown option.'];
            $p['options'][$opt]['votes']++;
            $p['voters'][] = $voter;
            return ['ok' => true];
        }
        return ['error' => 'Poll not found.'];
    });
    json_out($res, isset($res['error']) ? 400 : 200);
}

json_out(['error' => 'Unknown action'], 400);
