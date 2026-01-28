<?php
return [
    'auth/login' => ['POST' => 'AuthController@login'],
    'auth/logout' => ['POST' => 'AuthController@logout'],
    'auth/user' => ['GET' => 'AuthController@getUserInfo'],
    'auth/validate' => ['GET' => 'AuthController@validateToken'], 
    
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
    
    'tax' => ['POST' => 'TaxController@store'],
    'tax/{id}' => ['GET' => 'TaxController@show'],
    'tax/{id}/approve' => ['POST' => 'CommonController@approve'], 

    'others' => ['POST' => 'OtherContractController@store'],
    'others/{id}' => ['GET' => 'OtherContractController@show'],

    'others/{id}/approve' => ['POST' => 'CommonController@approve'],

    'vendor' => ['POST' => 'VendorController@store'],
    'vendor/{id}' => ['GET' => 'VendorController@show'],
    'vendor/{id}/approve' => ['POST' => 'CommonController@approve'],
    
    'categories' => ['GET' => 'CommonController@getCategories'],
    'approval-route' => ['GET' => 'AuthController@getApprovalRoute'],

    'upload' => ['POST' => 'FileController@upload'],
    'search' => ['GET' => 'SearchController@search'],
];
?>