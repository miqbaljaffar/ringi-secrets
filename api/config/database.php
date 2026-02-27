<?php
require_once __DIR__ . '/env.php';

class DatabaseConfig {
    const HOST = DB_HOST;
    const DB_NAME = DB_NAME;
    const USERNAME = DB_USER;
    const PASSWORD = DB_PASS;

    // DB接続を取得する (Get DB connection)
    public static function getConnection() {
        $conn = null;
        try {
            $conn = new PDO(
                "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME, 
                self::USERNAME, 
                self::PASSWORD
            );
            $conn->exec("set names utf8");
            
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            
            throw new Exception("DB Connection/SQL Failed: " . $exception->getMessage());
            
        }
        return $conn;
    }
}
?>