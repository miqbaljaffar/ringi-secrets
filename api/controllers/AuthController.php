<?php
class AuthController {
    private $userModel = null;
    
    public function __construct() {
        // Kita biarkan kosong, Model di-load saat dibutuhkan saja (Lazy Loading)
    }
    
    private function getUserModel() {
        if ($this->userModel === null) {
            $this->userModel = new User();
        }
        return $this->userModel;
    }
    
    public function login($request) {
        // 1. Handle POST (Form Login dari login.html)
        if ($request['method'] === 'POST') {
            $body = $request['body'];
            
            // Di form login, input 'username' diisi dengan Employee ID (misal: 0001, 0002)
            // Password diabaikan karena sistem menggunakan konsep Intranet/SSO (kepercayaan pada ID)
            $employeeId = $body['username'] ?? '';

            if (empty($employeeId)) {
                return json_encode(['success' => false, 'error' => 'Employee ID (User ID) wajib diisi']);
            }

            // --- [PERBAIKAN: DATABASE CHECK] ---
            // Cek apakah Employee ID benar-benar ada di tabel v_worker / tm_worker
            $userModel = $this->getUserModel();
            $worker = $userModel->findByEmployeeId($employeeId);
            
            if ($worker) {
                // JIKA USER DITEMUKAN DI DATABASE -> LOGIN SUKSES
                
                if (session_status() === PHP_SESSION_NONE) session_start();
                session_regenerate_id(true);
                
                // Simpan data asli dari Database ke Session
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                // Tentukan Role (Hak Akses) untuk Testing
                // Default: User Biasa (0)
                // Jika ID 0036 (Admin Contract di data dummy) -> Admin (2)
                // Jika ID muncul di tabel approval route -> Approver (1) (Logic ini bisa dikembangkan nanti)
                
                $role = 0; // User
                if ($worker['id_worker'] === '0036' || $worker['id_worker'] === '0001') {
                    $role = 2; // Admin / Super User untuk testing
                } elseif ($worker['n_chairperson'] == 1) {
                    $role = 1; // Approver (Contoh sederhana berdasarkan flag ketua)
                }
                
                $_SESSION['user_role'] = $role;
                
                return json_encode([
                    'success' => true,
                    'token' => 'session_token_active', // Token dummy (kita pakai Session PHP)
                    'user' => [
                        'id' => $_SESSION['user_id'],
                        'name' => $_SESSION['user_name'],
                        'role' => $_SESSION['user_role'],
                        'department' => $_SESSION['user_department']
                    ]
                ]);
            }
            
            // JIKA USER TIDAK DITEMUKAN
            return json_encode([
                'success' => false, 
                'error' => 'Login Gagal. ID Karyawan ' . $employeeId . ' tidak ditemukan di database.'
            ]);
        }

        return json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

    public function logout() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_unset();
        session_destroy();
        return json_encode(['success' => true, 'message' => 'Berhasil logout']);
    }
    
    public function getUserInfo($request) {
        // Mengembalikan info user dari Session (via Middleware)
        return json_encode([
            'success' => true,
            'user' => $request['user']
        ]);
    }

    public function validateToken($request) {
        if (isset($_SESSION['user_id'])) {
            return json_encode(['success' => true]);
        }
        http_response_code(401);
        return json_encode(['success' => false, 'error' => 'Invalid Token']);
    }
}
?>