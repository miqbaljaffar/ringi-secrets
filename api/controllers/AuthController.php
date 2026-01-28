<?php
class AuthController {
    private $userModel = null;
    
    public function __construct() {}
    
    private function getUserModel() {
        if ($this->userModel === null) {
            $this->userModel = new User();
        }
        return $this->userModel;
    }

    // 社員IDでログインし、セッションと権限情報を設定する (Handle login by employee ID and initialize session data)
    public function login($request) {
        if ($request['method'] === 'POST') {
            $body = $request['body'];
            
            $employeeId = $body['username'] ?? '';

            if (empty($employeeId)) {
                return ['success' => false, 'error' => '社員ID（ユーザーID）を入力してください。'];
            }

            $userModel = $this->getUserModel();
            $worker = $userModel->findByEmployeeId($employeeId);
            
            if ($worker) {
                if (session_status() === PHP_SESSION_NONE) session_start();
                session_regenerate_id(true);
                
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                $role = 0; // User
                if ($worker['id_worker'] === '0036' || $worker['id_worker'] === '0001') {
                    $role = 2; // Admin
                } elseif ($worker['n_chairperson'] == 1) {
                    $role = 1; // Approver
                }
                
                $_SESSION['user_role'] = $role;
                
                return [
                    'success' => true,
                    'token' => 'session_token_active', 
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
                'error' => 'ログインに失敗しました。社員ID「' . $employeeId . '」は登録されていません。'
            ];
        }

        return ['success' => false, 'error' => '許可されていないリクエストです。'];
    }

    // ログアウトしてセッションを破棄する (Handle logout and destroy session)
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'ログアウトしました。'];
    }
    
    // ログインユーザー情報を取得する (Get logged-in user information)
    public function getUserInfo($request) {
        return [
            'success' => true,
            'user' => $request['user']
        ];
    }

    // トークンの有効性を検証する (Validate the session token)
    public function validateToken($request) {
        if (isset($_SESSION['user_id'])) {
            return ['success' => true];
        }
        http_response_code(401);
        return ['success' => false, 'error' => '認証が無効です。再度ログインしてください。'];
    }
}
?>