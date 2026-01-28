<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    // セッションベースの認証を処理する (Handle session-based authentication)
    public static function handle($request) {
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            session_start();
        }
        
        $publicEndpoints = ['auth/login', 'auth/logout'];
        if (in_array($request['endpoint'], $publicEndpoints)) {
            return $request;
        }

        if (isset($_SESSION['user_id'])) {
            $request['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'role' => $_SESSION['user_role'] ?? 0,
                'department' => $_SESSION['user_department'] ?? '',
            ];
            return $request;
        }

        self::sendUnauthorizedResponse();
    }
    
    // 指定された役割を持つユーザーのみがアクセスできるようにする (Restrict access to users with specified role)
    public static function requireRole($requiredRole, $request) {
        $userRole = $request['user']['role'] ?? -1;
        if ($userRole < $requiredRole) {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'error' => 'アクセスが拒否されました。権限が不足しています。'
            ]);
            exit;
        }
    }

    // 不正なリクエストに対して401レスポンスを送信する (Send 401 response for unauthorized requests)
    private static function sendUnauthorizedResponse() {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => '認証が無効です。再度ログインしてください。'
        ]);
        exit;
    }
}
?>