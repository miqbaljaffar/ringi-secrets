<?php
return [
    // --- Auth ---
    'auth/login' => ['POST' => 'AuthController@login'],
    'auth/logout' => ['POST' => 'AuthController@logout'],
    'auth/user' => ['GET' => 'AuthController@getUserInfo'],
    'auth/validate' => ['GET' => 'AuthController@validateToken'], // Endpoint validasi token
    
    // --- Ringi Umum (Common - AR) ---
    'common' => [
        'GET' => 'CommonController@index',
        'POST' => 'CommonController@store'
    ],
    'common/{id}' => [
        'GET' => 'CommonController@show',
        'PUT' => 'CommonController@update',
        'DELETE' => 'CommonController@withdraw'
    ],
    'common/{id}/approve' => ['POST' => 'CommonController@approve'],
    
    // --- Ringi Pajak (Tax - CT) ---
    'tax' => ['POST' => 'TaxController@store'],
    'tax/{id}' => ['GET' => 'TaxController@show'],
    // FIX: Menambahkan rute approve untuk Tax
    'tax/{id}/approve' => ['POST' => 'CommonController@approve'], // Menggunakan CommonController jika logikanya sama, atau buat method di TaxController

    // --- Ringi Lainnya (Others - CO) ---
    'others' => ['POST' => 'OtherContractController@store'],
    'others/{id}' => ['GET' => 'OtherContractController@show'],
    // FIX: Menambahkan rute approve untuk Others
    'others/{id}/approve' => ['POST' => 'CommonController@approve'],

    // --- Ringi Vendor (Vendor - CV) ---
    'vendor' => ['POST' => 'VendorController@store'],
    'vendor/{id}' => ['GET' => 'VendorController@show'],
    // FIX: Menambahkan rute approve untuk Vendor
    'vendor/{id}/approve' => ['POST' => 'CommonController@approve'],
    
    // --- Master Data ---
    'categories' => ['GET' => 'CommonController@getCategories'],
    'approval-route' => ['GET' => 'AuthController@getApprovalRoute'],

    // --- Fitur Global ---
    'upload' => ['POST' => 'FileController@upload'],
    'search' => ['GET' => 'SearchController@search'],
];
?>