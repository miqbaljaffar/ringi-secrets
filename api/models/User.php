<?php
class User extends BaseModel {
    protected $table = 'v_worker';
    protected $primaryKey = 'id_worker';
    
    // 従業員IDでユーザーを検索する (Find user by employee ID)
    public function findByEmployeeId($employeeId) {
        $sql = "SELECT * FROM {$this->table} WHERE id_worker = :id AND n_delete = 0";
        return $this->db->fetch($sql, [':id' => $employeeId]);
    }
    
    public function getApprovers($docType, $amount = 0, $category = null) {
        // 承認ルートを取得するロジック (Get approval route logic)
        $sql = "SELECT * FROM v_approval_route 
                WHERE n_doc_cat = :docType 
                AND (dt_end IS NULL OR dt_end >= CURDATE())
                AND dt_start <= CURDATE()
                ORDER BY id_route";
        
        return $this->db->fetchAll($sql, [':docType' => $docType]);
    }
    
    // 部署のユーザーを取得する (Get users by department)
    public function getDepartmentUsers($department) {
        $sql = "SELECT * FROM {$this->table} 
                WHERE s_department = :department 
                AND n_delete = 0 
                ORDER BY s_name";
        
        return $this->db->fetchAll($sql, [':department' => $department]);
    }
    
    // 指定された文書の承認者かどうかをチェックする (Check if user is approver for the document)
    public function isApprover($userId, $docId) {
        $sql = "SELECT COUNT(*) as count FROM t_common 
                WHERE id_doc = :docId 
                AND (s_approved_1 = :userId OR s_approved_2 = :userId)";
        
        $result = $this->db->fetch($sql, [
            ':docId' => $docId,
            ':userId' => $userId
        ]);
        
        return $result['count'] > 0;
    }
}
?>