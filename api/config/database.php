<?php
class DatabaseConfig {
    // Sesuai spesifikasi PDF Halaman 1
    const HOST = 'localhost'; //mysqi320.phy.lolipop.lan
    const DB_NAME = 'LAA1611970-ringi';
    const USERNAME = 'LAA1611970';
    const PASSWORD = 'Iqbal#0811'; //Mhu1FNyK
    
    // Spesifikasi: utf8mb4_general_ci
    const CHARSET = 'utf8mb4';
    const COLLATION = 'utf8mb4_general_ci';
    
    public static function getConnection() {
        $dsn = "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME . ";charset=" . self::CHARSET;
        
        try {
            $pdo = new PDO($dsn, self::USERNAME, self::PASSWORD);
            // Error handling level Exception untuk debugging yang lebih baik
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
            // Memaksa collation spesifik saat koneksi
            $pdo->exec("SET NAMES " . self::CHARSET . " COLLATE " . self::COLLATION);
            
            return $pdo;
        } catch (PDOException $e) {
            // Log error di server, jangan tampilkan detail sensitif ke user
            error_log("Database Connection Error: " . $e->getMessage());
            throw new Exception("Koneksi database gagal. Silakan hubungi administrator.");
        }
    }
}

// Wrapper Singleton untuk akses global yang efisien
class Database {
    private static $instance = null;
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = DatabaseConfig::getConnection();
        }
        return self::$instance;
    }
}
?>