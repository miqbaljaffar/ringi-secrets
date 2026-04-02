<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    // セッションベースの認証を処理する (Session-based authentication handling)
    public static function handle($request) {
        // セッションが開始されていることを確認 (Ensure session is started)
        if (session_status() === PHP_SESSION_NONE) {
            // セッションクッキーを安全に設定 (セキュリティ強化のため)
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            session_start();
        }
        
        // 公開エンドポイント（開発用手動ログイン/ログアウト）
        $publicEndpoints = ['auth/login', 'auth/logout'];
        if (in_array($request['endpoint'], $publicEndpoints)) {
            return $request;
        }

        
        // 1. Ringiアプリケーション内でユーザーが既に認証済みかチェック（内部セッション）
        if (isset($_SESSION['user_id'])) {
            $request['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'role' => $_SESSION['user_role'] ?? 0,
                'department' => $_SESSION['user_department'] ?? '',
            ];
            return $request;
        }

        // 2. 未認証の場合、ポータルからのSSOセッション（$_SESSION['UID']）をチェック
        if (isset($_SESSION['UID']) && !empty($_SESSION['UID'])) {
            $employeeId = $_SESSION['UID'];
            
            $userModel = new User();
            $worker = $userModel->findByEmployeeId($employeeId);

            if ($worker) {
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                $role = $userModel->calculateRole($worker['id_worker']);
                $_SESSION['user_role'] = $role;

                $request['user'] = [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['user_role'],
                    'department' => $_SESSION['user_department']
                ];
                
                return $request;
            } else {
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'error' => 'アクセス拒否: 従業員データ（ID: '.$employeeId.'）がRingiシステムに見つかりません。'
                ]);
                exit;
            }
        }

        // 3. 内部セッションもSSOセッションもない場合
        
        // BEST PRACTICE FIX:
        // Jika endpoint yang diminta adalah endpoint "Soft Check" (seperti auth/user),
        // jangan hentikan eksekusi dengan melempar 401 Error. 
        // Biarkan lolos tanpa data $request['user']. Nanti Controller (AuthController.php) 
        // yang akan mengembalikan HTTP 200 OK dengan {"success": false}.
        $softAuthEndpoints = ['auth/user'];
        if (in_array($request['endpoint'], $softAuthEndpoints)) {
            return $request; 
        }

        // Untuk Endpoint DATA lainnya (strict), tetap tolak dengan 401
        self::sendUnauthorizedResponse();
    }
    
    // 役割によるアクセス制限 (Access control based on roles)
    public static function requireRole($requiredRole, $request) {
        $userRole = $request['user']['role'] ?? -1;
        if ($userRole < $requiredRole) {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'error' => 'アクセス拒否。この操作を実行する権限がありません。'
            ]);
            exit;
        }
    }

    // 401エラーを送信 (Send 401 error if session is expired or invalid)
    private static function sendUnauthorizedResponse() {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'セッションが期限切れか無効です。ポータルから再ログインしてください。'
        ]);
        exit;
    }
}
?>