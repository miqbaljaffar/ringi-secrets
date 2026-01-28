<?php
class DB {
    private $pdo;
    private static $instance = null;
    
    // シングルトンパターンの実装 (Singleton pattern implementation)
    private function __construct() {
        $this->pdo = DatabaseConfig::getConnection();
    }
    
    // インスタンス取得メソッド (Get instance method)
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    // クエリ実行メソッド (Execute query method)
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Query failed: " . $e->getMessage() . " SQL: " . $sql);
            
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                throw new Exception("SQL Error: " . $e->getMessage());
            } else {
                throw new Exception("Database Error: " . $e->getMessage());
            }
        }
    }
    
    // フェッチメソッド (Fetch method)
    public function fetch($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch(PDO::FETCH_ASSOC); // added FETCH_ASSOC for clarity
    }
    
    // フェッチオールメソッド (Fetch all method)
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC); // added FETCH_ASSOC for clarity
    }
    
    // INSERT メソッド (Insert method)
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        
        return $this->pdo->lastInsertId();
    }
    
    // UPDATE メソッド (Update method)
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
    
    // トランザクション開始 (Begin transaction)
    public function beginTransaction() {
        $this->pdo->beginTransaction();
    }
    
    // コミット (Commit)
    public function commit() {
        $this->pdo->commit();
    }
    
    // ロールバック (Rollback)
    public function rollback() {
        $this->pdo->rollback();
    }
}
?>