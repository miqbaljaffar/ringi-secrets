<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    /**
     * Menangani autentikasi berdasarkan session.
     * Tidak boleh ada logika login otomatis di sini untuk mencegah bypass keamanan.
     */
    public static function handle($request) {
        if (session_status() === PHP_SESSION_NONE) {
            // Pengaturan sesi yang lebih ketat
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            session_start();
        }
        
        // 1. Daftar Endpoint yang dikecualikan (Public Routes)
        $publicEndpoints = ['auth/login', 'auth/logout'];
        if (in_array($request['endpoint'], $publicEndpoints)) {
            return $request;
        }

        // 2. Cek apakah session user_id sudah ada
        if (isset($_SESSION['user_id'])) {
            $request['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'role' => $_SESSION['user_role'] ?? 0,
                'department' => $_SESSION['user_department'] ?? '',
            ];
            return $request;
        }

        // 3. Jika tidak ada sesi, kirim 401 Unauthorized
        self::sendUnauthorizedResponse();
    }
    
    public static function requireRole($requiredRole, $request) {
        $userRole = $request['user']['role'] ?? -1;
        if ($userRole < $requiredRole) {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'error' => 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.'
            ]);
            exit;
        }
    }

    private static function sendUnauthorizedResponse() {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Sesi tidak valid atau telah berakhir. Silakan login kembali melalui portal.'
        ]);
        exit;
    }
}
?>