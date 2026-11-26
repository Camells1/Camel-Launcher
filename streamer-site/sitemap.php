<?php
// sitemap.xml for search engines (served at /sitemap.xml). The admin folder is never listed.
$host = preg_replace('~[^a-z0-9.:-]~i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
$base = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://') . $host . '/';
$pages = ['' => '1.0', 'live' => '0.9', 'spinner' => '0.8', 'vote' => '0.7', 'donators' => '0.7', 'server' => '0.6', 'yokii-pedia' => '0.6', 'games' => '0.5'];
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($pages as $p => $prio) {
    $file = __DIR__ . '/' . ($p === '' ? 'index' : $p) . '.html';
    $mod = is_file($file) ? date('Y-m-d', filemtime($file)) : date('Y-m-d');
    echo "  <url><loc>{$base}{$p}</loc><lastmod>{$mod}</lastmod><priority>{$prio}</priority></url>\n";
}
echo "</urlset>\n";
