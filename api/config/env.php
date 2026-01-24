<?php
// --- Konfigurasi Database Environment ---

// [PENTING] Sesuaikan dengan Environment Anda (Localhost vs Hosting)

// A. KONFIGURASI LOKAL (XAMPP / Laragon Default)
// Gunakan ini saat development di komputer sendiri
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'LAA1611970-ringi'); 
// define('DB_USER', 'root');             
// define('DB_PASS', 'Iqbal#0811');                

// B. KONFIGURASI PRODUCTION (Lolipop Hosting - Sesuai PDF)
// Uncomment (hilangkan //) baris di bawah ini HANYA jika sudah di-upload ke server
define('DB_HOST', 'mysql320.phy.lolipop.lan');
define('DB_NAME', 'LAA1611970-ringi'); 
define('DB_USER', 'LAA1611970');
define('DB_PASS', 'Mhu1FNyK'); 

// --- SECURITY SETTINGS ---
define('SS_SECRET_KEY', 'RingiSystemSecureKey2025!@#'); 
define('SSO_TIMEOUT', 60);

define('DEBUG_MODE', true); 
?>