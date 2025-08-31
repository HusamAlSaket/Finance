<?php
// Security headers to reduce browser warnings
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob:;");

// If you want to force HTTP (not recommended but will reduce warnings)
header("Strict-Transport-Security: max-age=0");

// Allow cross-origin requests for your domain
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include the main HTML file
include 'table_extractor.html';
?>
