<?php
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    // セッションベースの認証を処理する (Handle session-based authentication)
    public static function handle($request) {
        // Pastikan session dimulai
        if (session_status() === PHP_SESSION_NONE) {
            // Pengaturan cookie session agar aman
            ini_set('session.cookie_httponly', 1);
            ini_set('session.use_only_cookies', 1);
            session_start();
        }
        
        // Endpoint publik (Login manual dev / Logout)
        $publicEndpoints = ['auth/login', 'auth/logout'];
        if (in_array($request['endpoint'], $publicEndpoints)) {
            return $request;
        }

        // --- LOGIKA OTENTIKASI (SSO PRIORITY) ---
        
        // 1. Cek apakah user sudah ter-autentikasi di dalam aplikasi Ringi (Session Internal)
        if (isset($_SESSION['user_id'])) {
            $request['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'role' => $_SESSION['user_role'] ?? 0,
                'department' => $_SESSION['user_department'] ?? '',
            ];
            return $request;
        }

        // 2. Jika belum, Cek Session SSO dari Portal ($_SESSION['UID'])
        // Sesuai dokumentasi: 'UID' menyimpan nomor pegawai 4 digit.
        if (isset($_SESSION['UID']) && !empty($_SESSION['UID'])) {
            $employeeId = $_SESSION['UID'];
            
            // Cari data user di DB lokal Ringi (v_worker)
            $userModel = new User();
            $worker = $userModel->findByEmployeeId($employeeId);

            if ($worker) {
                // User ditemukan, set Session Internal Aplikasi Ringi
                $_SESSION['user_id'] = $worker['id_worker'];
                $_SESSION['user_name'] = $worker['s_name'];
                $_SESSION['user_department'] = $worker['s_department'];
                
                // HITUNG ROLE BERDASARKAN ID (Sesuai request Anda)
                // Admin: 0002, 0004, 0006
                // Approver: 0012, 0013
                // User: Sisanya
                $role = $userModel->calculateRole($worker['id_worker']);
                $_SESSION['user_role'] = $role;

                // Masukkan data user ke objek request untuk dipakai Controller
                $request['user'] = [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['user_name'],
                    'role' => $_SESSION['user_role'],
                    'department' => $_SESSION['user_department']
                ];
                
                return $request;
            } else {
                // UID ada di Portal, tapi data karyawan tidak ada di tabel v_worker
                http_response_code(403);
                echo json_encode([
                    'success' => false, 
                    'error' => 'Akses Ditolak: Data karyawan (ID: '.$employeeId.') tidak ditemukan di sistem Ringi.'
                ]);
                exit;
            }
        }

        // 3. Jika tidak ada Session Internal maupun Session SSO
        self::sendUnauthorizedResponse();
    }
    
    // Restrict access by role
    public static function requireRole($requiredRole, $request) {
        $userRole = $request['user']['role'] ?? -1;
        if ($userRole < $requiredRole) {
            http_response_code(403);
            echo json_encode([
                'success' => false, 
                'error' => 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.'
            ]);
            exit;
        }
    }

    // Send 401
    private static function sendUnauthorizedResponse() {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Sesi berakhir atau tidak valid. Silakan login kembali melalui Portal.'
        ]);
        exit;
    }
}
?>