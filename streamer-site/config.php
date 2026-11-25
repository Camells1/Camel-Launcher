<?php
// ================================================================
//  SITE CONFIG — edit this file before uploading!
// ================================================================

// 1) SECRET KEY for the hidden admin link.
//    Make it long and random, e.g. mash your keyboard: 'k8Rq2xLm9vTz4hWp'
//    (letters and numbers only, at least 12 characters).
//    Your admin link is then:  yoursite.com/admin.php?k=YOUR-SECRET-KEY
//    Without the key, admin.php just shows "page not found".
const ADMIN_SECRET = 'change-this-secret';

// 2) PASSWORD for the admin panel (at least 8 characters).
const ADMIN_PASSWORD = 'change-me-please';

// Biggest clip file people can upload, in megabytes.
// (Your host may have its own lower limit — see HOW-TO-UPLOAD.txt.)
const MAX_CLIP_MB = 100;

// How many uploads one person (IP address) can send per hour.
const UPLOADS_PER_HOUR = 5;
