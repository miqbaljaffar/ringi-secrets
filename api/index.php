<?php
// Start Output Buffering
// Ini MENAHAN semua output agar tidak langsung dikirim ke browser
ob_start();

// Error Reporting
error_reporting(E_ALL);
ini_set('display_errors', 0); // Matikan display error ke output
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_error.log');

date_default_timezone_set('Asia/Tokyo');

// CORS Helper
function sendCors() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");
}
sendCors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean(); // Bersihkan buffer sebelum exit
    http_response_code(200);
    exit();
}

try {
    // --- LOAD CONFIGS ---
    if (file_exists(__DIR__ . '/config/constants.php')) {
        require_once __DIR__ . '/config/constants.php';
    } else {
        define('API_NOT_FOUND', 404);
        define('API_SERVER_ERROR', 500);
        define('API_BAD_REQUEST', 400);
    }

    require_once __DIR__ . '/config/env.php';
    require_once __DIR__ . '/config/database.php';
    require_once __DIR__ . '/utils/Database.php';

    // --- AUTOLOADER ---
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

    // --- ROUTES ---
    $routesFile = __DIR__ . '/config/routes.php';
    if (!file_exists($routesFile)) {
        throw new Exception("Routes configuration missing.");
    }
    $routes = require_once $routesFile;

    // --- PATH PARSING ---
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $scriptName = $_SERVER['SCRIPT_NAME']; 
    $scriptDir = dirname($scriptName);
    $scriptDir = str_replace('\\', '/', $scriptDir);
    
    if (strpos($requestUri, $scriptDir) === 0) {
        $path = substr($requestUri, strlen($scriptDir));
    } else {
        $path = $requestUri;
    }

    if (strpos($path, '/index.php') === 0) {
        $path = substr($path, strlen('/index.php'));
    }

    $endpoint = trim($path, '/');
    $requestMethod = $_SERVER['REQUEST_METHOD'];

    // --- BODY PARSING ---
    $requestData = [
        'method' => $requestMethod,
        'endpoint' => $endpoint,
        'query' => $_GET,
        'body' => [],
        'files' => $_FILES
    ];

    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            $json = json_decode($input, true);
            $requestData['body'] = $json ?? []; 
        }
    }

    // --- MIDDLEWARE ---
    if (class_exists('AuthMiddleware')) {
        $requestData = AuthMiddleware::handle($requestData);
    }

    // --- ROUTING MATCH ---
    $matchedRoute = null;
    foreach ($routes as $routePattern => $methods) {
        $pattern = preg_replace('/\{(\w+)\}/', '([^/]+)', $routePattern);
        $pattern = str_replace('/', '\/', $pattern);
        
        if (preg_match('/^' . $pattern . '$/', $endpoint, $matches)) {
            array_shift($matches);
            if (isset($methods[$requestMethod])) {
                $matchedRoute = $methods[$requestMethod];
                preg_match_all('/\{(\w+)\}/', $routePattern, $paramNames);
                if (isset($paramNames[1])) {
                    foreach ($paramNames[1] as $index => $name) {
                        if (isset($matches[$index])) {
                            $requestData['params'][$name] = $matches[$index];
                        }
                    }
                }
                break;
            }
        }
    }
    
    // --- 404 HANDLING ---
    if (!$matchedRoute) {
        // CLEAN BUFFER: Hapus semua output text/warning sebelumnya
        ob_clean(); 
        
        http_response_code(404); 
        echo json_encode([
            'success' => false,
            'error' => 'Endpoint Not Found',
            'debug_endpoint' => $endpoint
        ]);
        exit();
    }
    
    // --- EXECUTE ---
    list($controllerName, $methodName) = explode('@', $matchedRoute);
    
    if (!class_exists($controllerName)) {
        throw new Exception("Controller {$controllerName} not found.");
    }
    
    $controller = new $controllerName();
    
    if (!method_exists($controller, $methodName)) {
        throw new Exception("Method {$methodName} not found.");
    }
    
    // Tangkap Output dari Controller
    // Kita gunakan output buffering controller juga jika dia 'echo' langsung
    $response = $controller->$methodName($requestData);
    
    // CLEAN BUFFER SEBELUM OUTPUT FINAL
    // Ini adalah kunci: membuang semua warning PHP yang tidak diinginkan
    ob_clean();
    
    if (is_array($response)) {
        echo json_encode($response);
    } else {
        echo $response;
    }

} catch (Exception $e) {
    // Log error asli ke file
    error_log("API Error: " . $e->getMessage());
    
    // CLEAN BUFFER
    ob_clean();
    
    http_response_code(500); 
    echo json_encode([
        'success' => false,
        'error' => 'Server Error',
        'message' => $e->getMessage()
    ]);
}

// Flush Buffer (Kirim ke browser)
ob_end_flush();
?>