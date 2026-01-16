<?php
class AuthController {
    private $userModel;
    
    public function __construct() {
        $this->userModel = new User();
    }
    
    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // シングルサインオン経由の場合
        if (isset($_GET['UID'])) {
            $user = $this->userModel->findByEmployeeId($_GET['UID']);
            
            if ($user) {
                $_SESSION['user_id'] = $user['id_worker'];
                $_SESSION['user_name'] = $user['s_name'];
                $_SESSION['user_role'] = $this->determineRole($user);
                
                return json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id_worker'],
                        'name' => $user['s_name'],
                        'role' => $_SESSION['user_role']
                    ]
                ]);
            }
        }
        
        // 通常ログイン
        if (isset($data['username']) && isset($data['password'])) {
            // 認証ロジック実装
            // ...
        }
        
        return json_encode([
            'success' => false,
            'error' => '認証に失敗しました'
        ]);
    }
    
    public function logout() {
        session_destroy();
        return json_encode(['success' => true]);
    }
    
    public function getUserInfo() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(API_UNAUTHORIZED);
            return json_encode(['success' => false, 'error' => '未認証']);
        }
        
        $user = $this->userModel->findByEmployeeId($_SESSION['user_id']);
        
        if ($user) {
            return json_encode([
                'success' => true,
                'user' => [
                    'id' => $user['id_worker'],
                    'name' => $user['s_name'],
                    'department' => $user['s_department'],
                    'role' => $_SESSION['user_role'] ?? ROLE_USER,
                    'email' => $user['s_email']
                ]
            ]);
        }
        
        return json_encode(['success' => false, 'error' => 'ユーザー情報が見つかりません']);
    }
    
    private function determineRole($user) {
        // 管理者IDリスト
        $adminIds = ['0001', '0002', '0036'];
        
        if (in_array($user['id_worker'], $adminIds)) {
            return ROLE_ADMIN;
        }
        
        // 承認者チェック
        if ($user['n_chairperson'] == 1 || 
            in_array($user['s_post'], ['課長', '部長', 'マネージャー'])) {
            return ROLE_APPROVER;
        }
        
        return ROLE_USER;
    }
}
?>