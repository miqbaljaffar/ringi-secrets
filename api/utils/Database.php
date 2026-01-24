<?php
class DB {
    private $pdo;
    private static $instance = null;
    
    private function __construct() {
        // PERBAIKAN: Gunakan DatabaseConfig, bukan Database::getInstance()
        // Pastikan DatabaseConfig sudah diload (kita akan load manual di index.php)
        $this->pdo = DatabaseConfig::getConnection();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    // クエリ実行メソッド
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage() . " SQL: " . $sql);
            
            // [PERBAIKAN DEBUGGING]
            // Tampilkan pesan error asli SQL agar kita tahu tabel mana yang hilang/salah
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                throw new Exception("SQL Error: " . $e->getMessage());
            } else {
                // Fallback untuk production
                throw new Exception("Database Error: " . $e->getMessage());
            }
        }
    }
    
    // SELECT - 単一行取得
    public function fetch($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch(PDO::FETCH_ASSOC); // Tambahkan FETCH_ASSOC agar lebih aman
    }
    
    // SELECT - 全行取得
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC); // Tambahkan FETCH_ASSOC
    }
    
    // INSERT
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        
        return $this->pdo->lastInsertId();
    }
    
    // UPDATE
    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach ($data as $key => $value) {
            $setClause[] = "{$key} = :{$key}";
        }
        
        $sql = "UPDATE {$table} SET " . implode(', ', $setClause) . " WHERE {$where}";
        $params = array_merge($data, $whereParams);
        
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }
    
    // DELETE (論理削除)
    public function softDelete($table, $id, $idColumn = 'id') {
        $sql = "UPDATE {$table} SET dt_deleted = NOW() WHERE {$idColumn} = :id";
        return $this->query($sql, [':id' => $id])->rowCount();
    }
    
    // トランザクション開始
    public function beginTransaction() {
        $this->pdo->beginTransaction();
    }
    
    // コミット
    public function commit() {
        $this->pdo->commit();
    }
    
    // ロールバック
    public function rollback() {
        $this->pdo->rollback();
    }
}
?>