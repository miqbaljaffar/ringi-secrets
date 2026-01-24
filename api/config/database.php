<?php
// Load environment variables
require_once __DIR__ . '/env.php';

class DatabaseConfig {
    const HOST = DB_HOST;
    const DB_NAME = DB_NAME;
    const USERNAME = DB_USER;
    const PASSWORD = DB_PASS;

    public static function getConnection() {
        $conn = null;
        try {
            $conn = new PDO(
                "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME, 
                self::USERNAME, 
                self::PASSWORD
            );
            $conn->exec("set names utf8");
            
            // [PENTING] Set ERRMODE ke EXCEPTION agar error SQL muncul di try-catch
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Opsi tambahan untuk mencegah emulasi prepare statement (lebih aman dari SQL Injection)
            $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
        } catch(PDOException $exception) {
            // Log ke file server (xampp/apache/logs/error.log)
            error_log("Connection error: " . $exception->getMessage());
            
            // [MODIFIKASI DEBUG]
            // Kita paksa throw message asli agar muncul di JSON response browser
            // Kembalikan ke kode lama jika sudah production
            throw new Exception("DB Connection/SQL Failed: " . $exception->getMessage());
            
            /*
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                 throw new Exception("DB Connection Failed: " . $exception->getMessage());
            } else {
                 throw new Exception("Database Connection Error. Please checks logs.");
            }
            */
        }
        return $conn;
    }
}
?>