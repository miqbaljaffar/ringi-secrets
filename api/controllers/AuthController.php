<?php
class AuthController {
    private $userModel = null;
    
    // コンストラクタ (Constructor)
    public function __construct() {}
    
    // ユーザーモデルの遅延初期化 (Lazy initialization of User model)
    private function getUserModel() {
        if ($this->userModel === null) {
            $this->userModel = new User();
        }
        return $this->userModel;
    }

    // ログイン処理 (Login process)
    public function login($request) {
        if ($request['method'] === 'POST') {
            $body = $request['body'];
            
            $employeeId = $body['username'] ?? '';

            if (empty($employeeId)) {
                return ['success' => false, 'error' => '従業員IDは必須です。'];
            }

            $userModel = $this->getUserModel();
            $worker = $userModel->findByEmployeeId($employeeId);
            
            if ($worker) {
                if (session_status() === PHP_SESSION_NONE) session_start();
                session_regenerate_id(true);
                
                // 1. SSOポータル変数のシミュレーション
                $_SESSION['UID'] = $worker['id_worker'];

                // 2. アプリケーション内部セッションの設定
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                // 3. 集中ロジックを使用してロール（管理者/承認者/ユーザー）を計算
                $role = $userModel->calculateRole($worker['id_worker']);
                $_SESSION['user_role'] = $role;
                
                return [
                    'success' => true,
                    'token' => 'session_active_dev', 
                    'message' => 'ログイン（開発モード）に成功しました',
                    'user' => [
                        'id' => $_SESSION['user_id'],
                        'name' => $_SESSION['user_name'],
                        'role' => $_SESSION['user_role'],
                        'department' => $_SESSION['user_department']
                    ]
                ];
            }
            
            return [
                'success' => false, 
                'error' => 'ログインに失敗しました。従業員IDが見つかりません。'
            ];
        }

        return ['success' => false, 'error' => '許可されていないメソッドです。'];
    }

    // ログアウト (Logout)
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'ログアウトに成功しました。'];
    }
    
    // 情報取得 (Get user info)
    public function getUserInfo($request) {
        // ユーザーデータはAuthMiddlewareによって既に注入されています
        if (isset($request['user'])) {
            return [
                'success' => true,
                'user' => $request['user']
            ];
        }
        return ['success' => false, 'error' => 'ユーザー情報が見つかりません。'];
    }

    // トークン検証 (Token validation)
    public function validateToken($request) {
        if (isset($_SESSION['user_id']) || isset($_SESSION['UID'])) {
            return ['success' => true];
        }
        http_response_code(401);
        return ['success' => false, 'error' => 'セッションが無効です。'];
    }
}
?>