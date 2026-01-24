<?php
// エラーレポーティング設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_error.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// --- [MANUAL REQUIRE] ---
// Memuat file yang nama class-nya tidak sama dengan nama file
// (Autoloader gagal menemukannya jika tidak diload manual)
require_once __DIR__ . '/config/env.php';      // Load Konstanta DB
require_once __DIR__ . '/config/database.php'; // Load Class DatabaseConfig
require_once __DIR__ . '/utils/Database.php';  // Load Class DB
// ------------------------

// 自動読み込み (Autoloader untuk file yang sesuai standar ClassName.php)
spl_autoload_register(function ($class) {
    $paths = [
        __DIR__ . '/controllers/',
        __DIR__ . '/models/',
        __DIR__ . '/middlewares/',
        __DIR__ . '/utils/',
        __DIR__ . '/config/'
    ];
    
    foreach ($paths as $path) {
        $file = $path . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// CORSヘッダー設定
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 定数読み込み
require_once __DIR__ . '/config/constants.php';

// ルート定義読み込み
$routes = require_once __DIR__ . '/config/routes.php';

// --- [ROUTING FIX] ---
// Deteksi path secara dinamis agar aman di XAMPP/Subfolder
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Ambil folder dimana index.php berada
$scriptName = $_SERVER['SCRIPT_NAME']; 
$scriptDir = str_replace('\\', '/', dirname($scriptName)); 

// Bersihkan URI dari folder path
if (strpos($requestUri, $scriptDir) === 0) {
    $path = substr($requestUri, strlen($scriptDir));
} else {
    $path = $requestUri;
}

// Bersihkan '/index.php' jika ada di URL
if (strpos($path, '/index.php') === 0) {
    $path = substr($path, strlen('/index.php'));
}

// Hapus slash di awal/akhir
$endpoint = trim($path, '/');
// ----------------------------

// リクエストデータの準備
$requestData = [
    'method' => $requestMethod,
    'endpoint' => $endpoint,
    'query' => $_GET,
    'body' => [],
    'files' => $_FILES
];

// JSONボディの解析
if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        $requestData['body'] = json_decode($input, true) ?? [];
    }
}

try {
    // ミドルウェア適用（認証）
    $requestData = AuthMiddleware::handle($requestData);
    
    // ルートマッチング
    $matchedRoute = null;
    $routeParams = [];
    
    foreach ($routes as $routePattern => $methods) {
        $pattern = preg_replace('/\{(\w+)\}/', '([^/]+)', $routePattern);
        $pattern = str_replace('/', '\/', $pattern);
        
        if (preg_match('/^' . $pattern . '$/', $endpoint, $matches)) {
            array_shift($matches);
            
            if (isset($methods[$requestMethod])) {
                $matchedRoute = $methods[$requestMethod];
                
                preg_match_all('/\{(\w+)\}/', $routePattern, $paramNames);
                foreach ($paramNames[1] as $index => $name) {
                    if (isset($matches[$index])) {
                        $requestData['params'][$name] = $matches[$index];
                    }
                }
                break;
            }
        }
    }
    
    if (!$matchedRoute) {
        http_response_code(API_NOT_FOUND);
        echo json_encode([
            'success' => false,
            'error' => 'Endpoint Not Found',
            'debug_endpoint' => $endpoint
        ]);
        exit();
    }
    
    // コントローラーとメソッドの抽出
    list($controllerName, $methodName) = explode('@', $matchedRoute);
    
    // コントローラーインスタンス作成とメソッド実行
    if (!class_exists($controllerName)) {
        throw new Exception("コントローラー {$controllerName} が見つかりません");
    }
    
    $controller = new $controllerName();
    
    if (!method_exists($controller, $methodName)) {
        throw new Exception("メソッド {$methodName} がコントローラー {$controllerName} に見つかりません");
    }
    
    // メソッド実行
    $response = $controller->$methodName($requestData);
    
    // レスポンス出力
    if (is_array($response)) {
        echo json_encode($response);
    } else {
        echo $response;
    }
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    
    http_response_code(API_SERVER_ERROR);
    echo json_encode([
        'success' => false,
        'error' => 'Server Error',
        'message' => $e->getMessage()
    ]);
}
?>