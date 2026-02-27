<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    // セッションベースの認証を処理する (Session-based authentication handling)
    public static function handle($request) {
        // セッションが開始されていることを確認 (Ensure session is started)
        if (session_status() === PHP_SESSION_NONE) {
            // セッションクッキーを安全に設定 (セキュリティ強化のため) (Set session cookies securely for enhanced security)
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            session_start();
        }
        
        // 公開エンドポイント（開発用手動ログイン/ログアウト） (Allow public endpoints for development manual login/logout)
        $publicEndpoints = ['auth/login', 'auth/logout'];
        if (in_array($request['endpoint'], $publicEndpoints)) {
            return $request;
        }

        // --- 認証ロジック（SSO優先） --- (SSO-first authentication logic)
        
        // 1. Ringiアプリケーション内でユーザーが既に認証済みかチェック（内部セッション） (Check if user is already authenticated within Ringi application (internal session))
        if (isset($_SESSION['user_id'])) {
            $request['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'role' => $_SESSION['user_role'] ?? 0,
                'department' => $_SESSION['user_department'] ?? '',
            ];
            return $request;
        }

        // 2. 未認証の場合、ポータルからのSSOセッション（$_SESSION['UID']）をチェック (Check for SSO session from portal if not authenticated)
        if (isset($_SESSION['UID']) && !empty($_SESSION['UID'])) {
            $employeeId = $_SESSION['UID'];
            
            $userModel = new User();
            $worker = $userModel->findByEmployeeId($employeeId);

            if ($worker) {
                // ユーザーが見つかった場合、Ringiアプリケーションの内部セッションを設定 (Set internal session for Ringi application if user is found)
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                // IDに基づいて役割を計算（ご依頼に基づく） (Calculate role based on ID as per request)
                // 管理者: 0002, 0004, 0006 (例) (Admin: 0002, 0004, 0006 (example))
                // 承認者: 0012, 0013 (例) (Approver: 0012, 0013 (example))
                // 一般ユーザー: 上記以外 (General user: others)
                $role = $userModel->calculateRole($worker['id_worker']);
                $_SESSION['user_role'] = $role;

                // コントローラーで使用するためにリクエストオブジェクトにユーザーデータを追加 (Add user data to request object for use in controllers)
                $request['user'] = [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['user_role'],
                    'department' => $_SESSION['user_department']
                ];
                
                return $request;
            } else {
                // ポータルにUIDはあるが、v_workerテーブルに従業員データがない場合 (UID exists in portal but no employee data in v_worker table)
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'error' => 'アクセス拒否: 従業員データ（ID: '.$employeeId.'）がRingiシステムに見つかりません。'
                ]);
                exit;
            }
        }

        // 3. 内部セッションもSSOセッションもない場合 (Neither internal session nor SSO session exists)
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

    // 401エラーを送信 (セッションが期限切れか無効な場合) (Send 401 error if session is expired or invalid)
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