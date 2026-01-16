<?php
class DB {
    private $pdo;
    private static $instance = null;
    
    private function __construct() {
        $this->pdo = Database::getInstance();
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
            throw new Exception("データベースクエリの実行に失敗しました");
        }
    }
    
    // SELECT - 単一行取得
    public function fetch($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    // SELECT - 全行取得
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
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