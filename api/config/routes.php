<?php
return [
    // --- Auth ---
    'auth/login' => ['POST' => 'AuthController@login'],
    'auth/logout' => ['POST' => 'AuthController@logout'],
    'auth/user' => ['GET' => 'AuthController@getUserInfo'],
    
    // --- Ringi Umum (Common - AR) ---
    'common' => [
        'GET' => 'CommonController@index', // List khusus common
        'POST' => 'CommonController@store'
    ],
    'common/{id}' => [
        'GET' => 'CommonController@show',
        'PUT' => 'CommonController@update',
        'DELETE' => 'CommonController@withdraw'
    ],
    'common/{id}/approve' => ['POST' => 'CommonController@approve'],
    'common/{id}/complete' => ['POST' => 'CommonController@complete'], // Tambahan untuk tombol "Tepai"
    
    // --- Ringi Pajak (Tax - CT) ---
    'tax' => ['POST' => 'TaxController@store'],
    'tax/{id}' => ['GET' => 'TaxController@show'],
    
    // --- Ringi Lainnya (Others - CO) ---
    'others' => ['POST' => 'OtherContractController@store'],
    'others/{id}' => ['GET' => 'OtherContractController@show'],

    // --- Ringi Vendor (Vendor - CV) ---
    'vendor' => ['POST' => 'VendorController@store'],
    'vendor/{id}' => ['GET' => 'VendorController@show'],
    
    // --- Master Data ---
    'categories' => ['GET' => 'CommonController@getCategories'],
    'approval-route' => ['GET' => 'AuthController@getApprovalRoute'], // Endpoint untuk ambil rute approval dinamis

    // --- Fitur Global ---
    'upload' => ['POST' => 'FileController@upload'],
    
    // Search Controller (PENTING: Menggabungkan semua tipe dokumen)
    'search' => ['GET' => 'SearchController@search'],
    
    'dashboard/stats' => ['GET' => 'DashboardController@getStats']
];
?>