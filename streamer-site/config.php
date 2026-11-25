<?php
// ================================================================
//  SITE CONFIG — edit this file before uploading!
// ================================================================

// THE ADMIN PANEL lives in the folder "secret-admin". Rename that folder to
// something random (e.g. "hdbahedehuyuf"), then set the key below.
// Your admin link is:   yoursite.com/FOLDER-NAME?YOUR-SECRET-KEY
// Without the key the folder just shows "page not found".

// 1) SECRET KEY: letters and numbers only, at least 12 characters.
const ADMIN_SECRET = 'change-this-secret';

// 2) PASSWORD. Best: put a password HASH here (scrambled, so nobody can read
//    your password even if they see this file). If you leave the hash empty,
//    the plain ADMIN_PASSWORD below is used instead (8+ characters).
const ADMIN_PASSWORD_HASH = '';
const ADMIN_PASSWORD = 'change-me-please';

// Biggest clip file people can upload, in megabytes.
// (Your host may have its own lower limit — see HOW-TO-UPLOAD.txt.)
const MAX_CLIP_MB = 100;

// How many uploads one person (IP address) can send per hour.
const UPLOADS_PER_HOUR = 5;
