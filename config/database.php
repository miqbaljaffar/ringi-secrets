<?php
class DatabaseConfig {
    const HOST = 'mysqi320.phy.lolipop.lan';
    const DB_NAME = 'LAA1611970-ringi';
    const USERNAME = 'LAA1611970';
    const PASSWORD = 'Mhu1FNyK';
    const CHARSET = 'utf8mb4';
    const COLLATION = 'utf8mb4_general_ci';
    
    public static function getConnection() {
        $dsn = "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME . ";charset=" . self::CHARSET;
        
        try {
            $pdo = new PDO($dsn, self::USERNAME, self::PASSWORD);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec("SET NAMES " . self::CHARSET . " COLLATE " . self::COLLATION);
            return $pdo;
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
}

// グローバル接続インスタンス
class Database {
    private static $instance = null;
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = DatabaseConfig::getConnection();
        }
        return self::$instance;
    }
    
    public static function beginTransaction() {
        self::getInstance()->beginTransaction();
    }
    
    public static function commit() {
        self::getInstance()->commit();
    }
    
    public static function rollback() {
        self::getInstance()->rollback();
    }
}
?>