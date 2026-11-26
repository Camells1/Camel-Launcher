<?php
// robots.txt (served at /robots.txt)
$host = preg_replace('~[^a-z0-9.:-]~i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
header('Content-Type: text/plain; charset=utf-8');
echo "User-agent: *\nDisallow: /api.php\nDisallow: /uploads/\n\nSitemap: {$scheme}://{$host}/sitemap.xml\n";
