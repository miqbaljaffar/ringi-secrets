<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    public static function handle($request) {
        // 
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // 1. Cek Single Sign-On (SSO) via UID Parameter (Sesuai PDF Hal 25)
        if (isset($_GET['UID'])) {
            $userId = $_GET['UID'];
            if (self::loginWithUID($userId)) {
                // Jika login berhasil, redirect untuk membersihkan URL (opsional, tapi bagus untuk keamanan)
                // header("Location: " . strtok($_SERVER["REQUEST_URI"], '?'));
                // exit;
            }
        }

        // 2. Cek Authorization Header (Bearer Token) untuk AJAX Request
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            // Di sistem sederhana ini, kita asumsikan Token = UID yang disimpan di LocalStorage
            // Pada produksi, gunakan JWT yang valid.
            if (!isset($_SESSION['user_id'])) {
                self::loginWithUID($token);
            }
        }
        
        // 3. Cek Session PHP Standar
        if (!isset($_SESSION['user_id'])) {
            self::sendUnauthorizedResponse();
        }
        
        // 4. Inject User Info ke dalam Request untuk Controller
        $request['user'] = [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'] ?? '',
            'role' => $_SESSION['user_role'] ?? ROLE_USER,
            'department' => $_SESSION['user_department'] ?? '',
            'committee' => $_SESSION['user_committee'] ?? ''
        ];
        
        return $request;
    }
    
    private static function loginWithUID($uid) {
        // Sanitasi input
        $uid = preg_replace('/[^a-zA-Z0-9]/', '', $uid);
        
        // Gunakan Model User untuk mencari data
        $userModel = new User();
        $user = $userModel->findByEmployeeId($uid);
        
        if ($user) {
            $_SESSION['user_id'] = $user['id_worker'];
            $_SESSION['user_name'] = $user['s_name'];
            $_SESSION['user_department'] = $user['s_department'];
            $_SESSION['user_committee'] = $user['s_committee'];
            $_SESSION['user_role'] = self::determineRole($user);
            return true;
        }
        
        return false;
    }
    
    private static function determineRole($user) {
        // Logika Role sesuai PDF Hal 1
        
        // Admin: Fixed list
        $adminIds = ['0001', '0002', '0036'];
        if (in_array($user['id_worker'], $adminIds)) {
            return ROLE_ADMIN;
        }
        
        // Approver (Penyetuju): Ketua komite atau Jabatan tertentu
        // Asumsi: field n_chairperson 1 = Ketua
        if ($user['n_chairperson'] == 1 || 
            in_array($user['s_post'], ['課長', '部長', 'マネージャー'])) {
            return ROLE_APPROVER;
        }
        
        return ROLE_USER;
    }
    
    private static function sendUnauthorizedResponse() {
        http_response_code(API_UNAUTHORIZED);
        echo json_encode([
            'success' => false,
            'error' => 'Sesi berakhir atau tidak valid. Silakan login kembali.'
        ]);
        exit;
    }
    
    public static function requireRole($requiredRole, $request) {
        $userRole = $request['user']['role'] ?? ROLE_USER;
        
        if ($userRole < $requiredRole) {
            http_response_code(API_FORBIDDEN);
            echo json_encode([
                'success' => false,
                'error' => 'Anda tidak memiliki hak akses untuk tindakan ini.'
            ]);
            exit;
        }
    }
}
?>