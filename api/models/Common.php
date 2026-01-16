<?php
class Common extends BaseModel {
    protected $table = 't_common';
    protected $primaryKey = 'id_doc';
    
    // Biasanya Ringi Umum (Common)
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            // 1. Generate Doc ID
            $docId = $this->generateDocId();
            
            // 2. Prepare Main Data
            $mainData = [
                'id_doc' => $docId,
                'n_type' => $data['n_type'],
                's_title' => $data['s_title'],
                'dt_deadline' => $data['dt_deadline'],
                's_overview' => $data['s_overview'],
                's_applied' => $data['s_applied'],
                'ts_applied' => date('Y-m-d H:i:s')
            ];
            
            // Optional Fields
            if (isset($data['s_file'])) $mainData['s_file'] = $data['s_file'];
            if (isset($data['s_memo'])) $mainData['s_memo'] = $data['s_memo'];
            
            $this->db->insert($this->table, $mainData);
            
            // 3. Save Details
            if (isset($data['details']) && is_array($data['details'])) {
                $detailModel = new CommonDetail();
                foreach ($data['details'] as $detail) {
                    $detail['n_doc'] = $docId;
                    $detailModel->createDetail($detail);
                }
            }
            
            // 4. Set Approval Route (PERBAIKAN LOGIKA SESUAI PDF HAL 13)
            $this->setApprovalRoute($docId, $data['n_type']);
            
            $this->commit();
            return $docId;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }
    
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
    
    // PERBAIKAN: Mapping n_type ke n_doc_cat
    private function setApprovalRoute($docId, $nType) {
        $userModel = new User();
        
        // Sesuai PDF Halaman 13:
        // n_type = 1 (部課/Departemen) -> Gunakan Rute Kategori 5
        // n_type = 2 (委員会/Komite)   -> Gunakan Rute Kategori 6
        $docCategoryMap = [
            1 => 5,
            2 => 6
        ];
        
        // Default ke n_type jika tidak ada di map (fallback safety)
        $targetCategory = $docCategoryMap[$nType] ?? $nType;
        
        $approvers = $userModel->getApprovers($targetCategory);
        
        if (!empty($approvers)) {
            $updateData = [];
            
            if (isset($approvers[0])) {
                $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            }
            
            if (isset($approvers[0]['s_approved_2'])) { // Biasanya approver 2 ada di baris yang sama atau logika array
                $updateData['s_approved_2'] = $approvers[0]['s_approved_2'];
            }
            
            if (!empty($updateData)) {
                $this->update($docId, $updateData);
            }
        }
    }
    
    // 検索機能
    public function search($filters, $user) {
        $sql = "SELECT c.*, 
                (SELECT SUM(n_amount) FROM t_common_details WHERE n_doc = c.id_doc) as total_amount,
                u.s_name as applicant_name
                FROM {$this->table} c
                LEFT JOIN v_worker u ON c.s_applied = u.id_worker
                WHERE c.dt_deleted IS NULL";
        
        $params = [];
        $conditions = [];
        
        // 権限によるフィルタリング
        if ($user['role'] < ROLE_ADMIN) {
            // 一般ユーザーは自分の申請と承認対象のみ
            $sql .= " AND (c.s_applied = :user_id OR c.s_approved_1 = :user_id OR c.s_approved_2 = :user_id)";
            $params[':user_id'] = $user['id'];
        }
        
        // 検索条件
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
    
    // 承認処理
    public function approve($docId, $userId, $action, $comment = '') {
        $document = $this->find($docId);
        
        if (!$document) {
            throw new Exception("文書が見つかりません");
        }
        
        $updateData = [];
        
        if ($action === 'approve') {
            // 承認者が適切かチェック
            if ($document['s_approved_1'] === $userId && empty($document['dt_approved_1'])) {
                $updateData['dt_approved_1'] = date('Y-m-d H:i:s');
            } elseif ($document['s_approved_2'] === $userId && empty($document['dt_approved_2'])) {
                $updateData['dt_approved_2'] = date('Y-m-d H:i:s');
            } else {
                throw new Exception("承認権限がありません");
            }
        } elseif ($action === 'reject') {
            $updateData['dt_rejected'] = date('Y-m-d H:i:s');
        } elseif ($action === 'complete') {
            $updateData['dt_confirmed'] = date('Y-m-d H:i:s');
        }
        
        if (!empty($updateData)) {
            return $this->update($docId, $updateData);
        }
        
        return false;
    }
    
    // 取下げ処理
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
    
    // ステータス取得
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