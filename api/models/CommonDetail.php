<?php
class CommonDetail extends BaseModel {
    protected $table = 't_common_details';
    protected $primaryKey = 'id_details';
    
    // 詳細を作成する (Create detail)
    public function createDetail($data) {
        return $this->db->insert($this->table, $data);
    }
    
    // ドキュメントに関連する詳細を取得する (Get details related to document)
    public function getByDocument($docId) {
        $sql = "SELECT cd.*, c.s_category 
                FROM {$this->table} cd
                LEFT JOIN tm_category c ON cd.n_category = c.id_category
                WHERE cd.n_doc = :docId
                ORDER BY cd.id_details";
        
        return $this->db->fetchAll($sql, [':docId' => $docId]);
    }
    
    // ドキュメントの詳細を更新する (Update document details)
    public function updateDetails($docId, $details) {
        // 既存の詳細を削除 (Delete existing details)
        $this->db->query("DELETE FROM {$this->table} WHERE n_doc = :docId", [':docId' => $docId]);
        
        // 新しい詳細を追加 (Add new details)
        foreach ($details as $detail) {
            $detail['n_doc'] = $docId;
            $this->createDetail($detail);
        }
    }
    
    // ドキュメントの合計金額を取得する (Get total amount of document)
    public function getTotalAmount($docId) {
        $sql = "SELECT SUM(n_amount) as total FROM {$this->table} WHERE n_doc = :docId";
        $result = $this->db->fetch($sql, [':docId' => $docId]);
        return $result['total'] ?? 0;
    }
}
?>