<?php
// Konstanta Aplikasi
define('APP_NAME', 'Sistem Manajemen Ringi');
define('APP_VERSION', '1.0.0');

// PATH FILE UPLOAD
// Sesuai struktur folder: ringi/files/
// __DIR__ menunjuk ke ringi/config/, jadi naik satu level ke ringi/ lalu ke files/
define('UPLOAD_PATH', realpath(__DIR__ . '/../../files')); 

define('MAX_FILE_SIZE', 5242880); // 5MB
define('ALLOWED_FILE_TYPES', ['application/pdf']);

// Jenis Dokumen Ringi
define('DOC_TYPE_COMMON', 1);      // Ringi Umum (AR)
define('DOC_TYPE_TAX', 2);         // Kontrak Pajak (CT)
define('DOC_TYPE_OTHER', 3);       // Kontrak Lainnya (CO)
define('DOC_TYPE_VENDOR', 4);      // Kontrak Vendor (CV)

// Status
define('STATUS_PENDING', 0);
define('STATUS_APPROVED', 1);
define('STATUS_REJECTED', 2);
define('STATUS_WITHDRAWN', 3);
define('STATUS_COMPLETED', 4);

// Level Akses
define('ROLE_USER', 0);
define('ROLE_APPROVER', 1);
define('ROLE_ADMIN', 2);

// Kode Respon API
define('API_SUCCESS', 200);
define('API_CREATED', 201);
define('API_BAD_REQUEST', 400);
define('API_UNAUTHORIZED', 401);
define('API_FORBIDDEN', 403);
define('API_NOT_FOUND', 404);
define('API_SERVER_ERROR', 500);
?>