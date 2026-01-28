<?php
class Common extends BaseModel {
    protected $table = 't_common';
    protected $primaryKey = 'id_doc';
    
    // 新しいその他契約書ドキュメントを作成する (Create new other contract document)
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            $docId = $this->generateDocId();
            
            $mainData = [
                'id_doc' => $docId,
                'n_type' => $data['n_type'],
                's_title' => $data['s_title'],
                'dt_deadline' => $data['dt_deadline'],
                's_overview' => $data['s_overview'],
                's_applied' => $data['s_applied'],
                'ts_applied' => date('Y-m-d H:i:s')
            ];
            
            if (isset($data['s_file'])) $mainData['s_file'] = $data['s_file'];
            if (isset($data['s_memo'])) $mainData['s_memo'] = $data['s_memo'];
            
            $this->db->insert($this->table, $mainData);
            
            if (isset($data['details']) && is_array($data['details'])) {
                $detailModel = new CommonDetail();
                foreach ($data['details'] as $detail) {
                    $detail['n_doc'] = $docId;
                    $detailModel->createDetail($detail);
                }
            }
            
            $this->setApprovalRoute($docId, $data['n_type']);
            
            $this->commit();
            return $docId;
            
        } catch (Exception $e) {
            $this->rollback();
            error_log("Common Create Document Failed: " . $e->getMessage());
            throw $e;
        }
    }
    
    // ドキュメントIDを生成する (Generate Document ID)
    public function generateDocId() {
        $prefix = 'AR';
        $date = date('ymd');
        
        $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                WHERE id_doc LIKE :pattern";
        
        $result = $this->db->fetch($sql, [
            ':pattern' => $prefix . $date . '%'
        ]);
        
        $sequence = $result['count'] + 1;
        return $prefix . $date . str_pad($sequence, 2, '0', STR_PAD_LEFT);
    }
    
    // 承認ルートを設定する (Set Approval Route)
    private function setApprovalRoute($docId, $nType) {
        $userModel = new User();
        
        $docCategoryMap = [
            1 => 5,
            2 => 6
        ];
        
        $targetCategory = $docCategoryMap[$nType] ?? $nType;
        
        $approvers = $userModel->getApprovers($targetCategory);
        
        if (!empty($approvers)) {
            $updateData = [];
            
            if (isset($approvers[0])) {
                $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            }
            
            if (isset($approvers[0]['s_approved_2'])) { 
                $updateData['s_approved_2'] = $approvers[0]['s_approved_2'];
            }
            
            if (!empty($updateData)) {
                $this->update($docId, $updateData);
            }
        } else {
            throw new Exception("承認ルート (Approval Route) が見つかりません。トランザクションはキャンセルされました。");
        }
    }
    
    // その他契約書の新規作成を処理する (Handle new other contract creation)
    public function search($filters, $user) {
        $sql = "SELECT c.*, 
                (SELECT SUM(n_amount) FROM t_common_details WHERE n_doc = c.id_doc) as total_amount,
                u.s_name as applicant_name
                FROM {$this->table} c
                LEFT JOIN v_worker u ON c.s_applied = u.id_worker
                WHERE c.dt_deleted IS NULL";
        
        $params = [];
        $conditions = [];
        
        if ($user['role'] < ROLE_ADMIN) {
            $sql .= " AND (c.s_applied = :user_id OR c.s_approved_1 = :user_id OR c.s_approved_2 = :user_id)";
            $params[':user_id'] = $user['id'];
        }
        
        if (!empty($filters['type'])) {
            $conditions[] = "c.n_type = :type";
            $params[':type'] = $filters['type'];
        }
        
        if (!empty($filters['category'])) {
            $conditions[] = "EXISTS (SELECT 1 FROM t_common_details cd 
                                   WHERE cd.n_doc = c.id_doc AND cd.n_category = :category)";
            $params[':category'] = $filters['category'];
        }
        
        if (!empty($filters['applicant'])) {
            $conditions[] = "c.s_applied = :applicant";
            $params[':applicant'] = $filters['applicant'];
        }
        
        if (!empty($filters['keyword'])) {
            $conditions[] = "(c.s_title LIKE :keyword OR c.s_overview LIKE :keyword)";
            $params[':keyword'] = '%' . $filters['keyword'] . '%';
        }
        
        if (!empty($filters['status'])) {
            switch ($filters['status']) {
                case 'pending':
                    $conditions[] = "c.dt_approved_1 IS NULL AND c.dt_rejected IS NULL";
                    break;
                case 'approved':
                    $conditions[] = "c.dt_approved_1 IS NOT NULL AND c.dt_approved_2 IS NOT NULL";
                    break;
                case 'rejected':
                    $conditions[] = "c.dt_rejected IS NOT NULL";
                    break;
            }
        }
        
        if (!empty($conditions)) {
            $sql .= " AND " . implode(' AND ', $conditions);
        }
        
        $sql .= " ORDER BY c.dt_deadline ASC, c.ts_applied DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
    
    // 取下げ処理 (Handle withdrawal)
    public function withdraw($docId, $userId) {
        $document = $this->find($docId);
        
        if ($document['s_applied'] !== $userId) {
            throw new Exception("取下げ権限がありません");
        }
        
        if ($document['dt_approved_1'] !== null) {
            throw new Exception("承認済みのため取下げできません");
        }
        
        return $this->delete($docId);
    }
    
    // ドキュメントのステータスを取得する (Get document status)
    public function getStatus($document) {
        if ($document['dt_deleted'] !== null) {
            return 'withdrawn';
        }
        if ($document['dt_rejected'] !== null) {
            return 'rejected';
        }
        if ($document['dt_approved_2'] !== null) {
            return 'approved';
        }
        if ($document['dt_approved_1'] !== null) {
            return 'pending_second';
        }
        return 'pending';
    }
}
?>