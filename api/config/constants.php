<?php
define('APP_NAME', 'Sistem Manajemen Ringi');
define('APP_VERSION', '1.0.0');

define('UPLOAD_PATH', realpath(__DIR__ . '/../../files')); 

define('MAX_FILE_SIZE', 5242880); 
define('ALLOWED_FILE_TYPES', ['application/pdf']);

define('DOC_TYPE_COMMON', 1);     
define('DOC_TYPE_TAX', 2);         
define('DOC_TYPE_OTHER', 3);      
define('DOC_TYPE_VENDOR', 4);      

define('STATUS_PENDING', 0);
define('STATUS_APPROVED', 1);
define('STATUS_REJECTED', 2);
define('STATUS_WITHDRAWN', 3);
define('STATUS_COMPLETED', 4);

define('ROLE_USER', 0);
define('ROLE_APPROVER', 1);
define('ROLE_ADMIN', 2);

define('API_SUCCESS', 200);
define('API_CREATED', 201);
define('API_BAD_REQUEST', 400);
define('API_UNAUTHORIZED', 401);
define('API_FORBIDDEN', 403);
define('API_NOT_FOUND', 404);
define('API_SERVER_ERROR', 500);
?>