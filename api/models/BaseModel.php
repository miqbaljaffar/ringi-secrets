<?php
abstract class BaseModel {
    protected $table;
    protected $primaryKey = 'id';
    protected $db;
    
    public function __construct() {
        $this->db = DB::getInstance();
    }
    
    // 単一レコード取得
    public function find($id) {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id AND dt_deleted IS NULL";
        return $this->db->fetch($sql, [':id' => $id]);
    }
    
    // 全レコード取得
    public function all($conditions = [], $orderBy = '', $limit = null) {
        $sql = "SELECT * FROM {$this->table} WHERE dt_deleted IS NULL";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClauses = [];
            foreach ($conditions as $key => $value) {
                if (is_array($value)) {
                    $whereClauses[] = "{$key} IN (" . implode(',', array_fill(0, count($value), '?')) . ")";
                    $params = array_merge($params, $value);
                } else {
                    $whereClauses[] = "{$key} = ?";
                    $params[] = $value;
                }
            }
            $sql .= " AND " . implode(' AND ', $whereClauses);
        }
        
        if (!empty($orderBy)) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        if ($limit) {
            $sql .= " LIMIT {$limit}";
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    // 新規作成
    public function create(array $data) {
        // 自動設定項目
        $data['ts_applied'] = date('Y-m-d H:i:s');
        
        return $this->db->insert($this->table, $data);
    }
    
    // 更新
    public function update($id, array $data) {
        $where = "{$this->primaryKey} = :id";
        $whereParams = [':id' => $id];
        
        return $this->db->update($this->table, $data, $where, $whereParams);
    }
    
    // 論理削除
    public function delete($id) {
        return $this->db->softDelete($this->table, $id, $this->primaryKey);
    }
    
    // カウント取得
    public function count($conditions = []) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE dt_deleted IS NULL";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClauses = [];
            foreach ($conditions as $key => $value) {
                $whereClauses[] = "{$key} = ?";
                $params[] = $value;
            }
            $sql .= " AND " . implode(' AND ', $whereClauses);
        }
        
        $result = $this->db->fetch($sql, $params);
        return $result['count'];
    }
    
    // ページネーション
    public function paginate($page = 1, $perPage = 20, $conditions = [], $orderBy = '') {
        $offset = ($page - 1) * $perPage;
        
        $sql = "SELECT * FROM {$this->table} WHERE dt_deleted IS NULL";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClauses = [];
            foreach ($conditions as $key => $value) {
                $whereClauses[] = "{$key} = ?";
                $params[] = $value;
            }
            $sql .= " AND " . implode(' AND ', $whereClauses);
        }
        
        if (!empty($orderBy)) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        $sql .= " LIMIT {$perPage} OFFSET {$offset}";
        
        $data = $this->db->fetchAll($sql, $params);
        
        $total = $this->count($conditions);
        $totalPages = ceil($total / $perPage);
        
        return [
            'data' => $data,
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $totalPages
        ];
    }
    
    // トランザクション開始
    protected function beginTransaction() {
        $this->db->beginTransaction();
    }
    
    // コミット
    protected function commit() {
        $this->db->commit();
    }
    
    // ロールバック
    protected function rollback() {
        $this->db->rollback();
    }
}
?>