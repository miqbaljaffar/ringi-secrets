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

    // DEVELOPMENT ONLY: Login Manual (Simulasi SSO)
    // Di Production, fungsi ini jarang dipakai karena user masuk otomatis via Middleware
    public function login($request) {
        if ($request['method'] === 'POST') {
            $body = $request['body'];
            
            // Menerima input username (ID Karyawan)
            $employeeId = $body['username'] ?? '';

            if (empty($employeeId)) {
                return ['success' => false, 'error' => 'ID Karyawan wajib diisi.'];
            }

            $userModel = $this->getUserModel();
            $worker = $userModel->findByEmployeeId($employeeId);
            
            if ($worker) {
                if (session_status() === PHP_SESSION_NONE) session_start();
                session_regenerate_id(true);
                
                // 1. Simulasi Variable SSO Portal
                $_SESSION['UID'] = $worker['id_worker'];

                // 2. Set Session Internal Aplikasi
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                // 3. Hitung Role (Admin/Approver/User) menggunakan logika terpusat
                $role = $userModel->calculateRole($worker['id_worker']);
                $_SESSION['user_role'] = $role;
                
                return [
                    'success' => true,
                    'token' => 'session_active_dev', 
                    'message' => 'Login (Dev Mode) Berhasil',
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
                'error' => 'Login gagal. ID Karyawan tidak ditemukan.'
            ];
        }

        return ['success' => false, 'error' => 'Method not allowed.'];
    }

    // Logout
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'Logout berhasil.'];
    }
    
    // Get Info
    public function getUserInfo($request) {
        // Data user sudah di-inject oleh AuthMiddleware
        if (isset($request['user'])) {
            return [
                'success' => true,
                'user' => $request['user']
            ];
        }
        return ['success' => false, 'error' => 'User info tidak ditemukan.'];
    }

    // Validate Token
    public function validateToken($request) {
        if (isset($_SESSION['user_id']) || isset($_SESSION['UID'])) {
            return ['success' => true];
        }
        http_response_code(401);
        return ['success' => false, 'error' => 'Sesi tidak valid.'];
    }
}
?>