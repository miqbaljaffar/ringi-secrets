<?php
abstract class BaseModel {
    protected $table;
    protected $primaryKey = 'id';
    protected $db;
    
    // コンストラクタ (Constructor)
    public function __construct() {
        $this->db = DB::getInstance();
    }
    
    // 単一レコード取得 (Get single record)
    public function find($id) {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id AND dt_deleted IS NULL";
        return $this->db->fetch($sql, [':id' => $id]);
    }
    
    // 全レコード取得 (Get all records)
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
    
    // 新規作成 (Create new record)
    public function create(array $data) {
        // 自動設定項目 (Automatic fields)
        if (!isset($data['ts_applied'])) {
            $data['ts_applied'] = date('Y-m-d H:i:s');
        }
        
        return $this->db->insert($this->table, $data);
    }
    
    // 更新 (Update record)
    public function update($id, array $data) {
        $where = "{$this->primaryKey} = :id";
        $whereParams = [':id' => $id];
        
        return $this->db->update($this->table, $data, $where, $whereParams);
    }
    
    // 取下げ (Withdraw / Membatalkan pengajuan)
    // Dipindahkan dari Common.php ke sini agar semua kontrak (Tax, Vendor, dll) juga terlindungi secara valid.
    public function withdraw($docId, $userId) {
        $document = $this->find($docId);
        
        if (!$document) {
            throw new Exception("ドキュメントが見つかりません。"); // Dokumen tidak ditemukan
        }
        
        if ($document['s_applied'] !== $userId) {
            throw new Exception("取下げ権限がありません。"); // Tidak punya wewenang untuk withdraw
        }
        
        if (!empty($document['dt_approved_1'])) {
            throw new Exception("承認済みのため取下げできません。"); // Tidak bisa withdraw karena sudah disetujui (1 tahap sekalipun)
        }
        
        return $this->delete($docId);
    }
    
    // DELETE (論理削除)
    public function delete($id) {
        return $this->db->softDelete($this->table, $id, $this->primaryKey);
    }
    
    // カウント取得 (Get count)
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
    
    // ページネーション (Pagination)
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
    
    // 承認プロセスを処理する (Handle approval process)
    public function approve($docId, $userId, $action, $comment = '', $userRole = 0) {
        $document = $this->find($docId);
        
        if (!$document) {
            throw new Exception("ドキュメントが {$this->table} テーブルに存在しません。");
        }
        
        $updateData = [];
        $now = date('Y-m-d H:i:s');
        
        if ($action === 'approve') {
            if ($document['s_approved_1'] === $userId) {
                if (!empty($document['dt_approved_1'])) {
                     throw new Exception("このドキュメントはすでに承認済みです。");
                }
                $updateData['dt_approved_1'] = $now;
            } 
            elseif ($document['s_approved_2'] === $userId) {
                if (empty($document['dt_approved_1'])) {
                    throw new Exception("先に一次承認の完了をお待ちください。");
                }
                if (!empty($document['dt_approved_2'])) {
                     throw new Exception("このドキュメントはすでに承認済みです。");
                }
                $updateData['dt_approved_2'] = $now;
            } else {
                throw new Exception("このドキュメントを承認する権限がありません。");
            }
        } elseif ($action === 'reject') {
            if ($document['s_approved_1'] === $userId || $document['s_approved_2'] === $userId) {
                $updateData['dt_rejected'] = $now;
            } else {
                throw new Exception("このドキュメントを却下する権限がありません。");
            }
        } elseif ($action === 'complete') {
             if (array_key_exists('s_confirmed', $document) && $document['s_confirmed'] !== $userId && $userRole < 2) { // 2 = ROLE_ADMIN
                 throw new Exception("このドキュメントを完了する権限がありません。");
             }
             $updateData['dt_confirmed'] = $now;
        }
        
        if (!empty($comment) && array_key_exists('s_memo', $document)) {
             $updateData['s_memo'] = $comment; 
        }
        
        if (!empty($updateData)) {
            return $this->update($docId, $updateData);
        }
        
        return false;
    }
    
    // トランザクション開始 (Begin transaction)
    public function beginTransaction() {
        $this->db->beginTransaction();
    }
    
    // コミット (Commit transaction)
    public function commit() {
        $this->db->commit();
    }
    
    // ロールバック (Rollback transaction)
    public function rollback() {
        $this->db->rollback();
    }
}
?>