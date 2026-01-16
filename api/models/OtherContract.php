<?php
require_once __DIR__ . '/../utils/IdGenerator.php';

class OtherContract extends BaseModel {
    protected $table = 't_others';
    protected $primaryKey = 'id_doc';
    
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            // 1. Generate ID (CO + YYMMDD + 00)
            $docId = IdGenerator::generate('CO', $this->table);
            $data['id_doc'] = $docId;
            
            // 2. Default Values sesuai PDF
            $defaults = [
                'n_trade' => 0,
                'n_affiliated_company' => 0,
                'n_introducer_type' => 0,
                'ts_applied' => date('Y-m-d H:i:s')
            ];
            $data = array_merge($defaults, $data);
            
            // 3. Insert Data
            $this->db->insert($this->table, $data);
            
            // 4. Set Approval Route
            // PDF Hal 18: t_approval_route.n_doc_cat = 5
            // Dan penerima kontrak (s_confirmed) fixed '0036'
            $this->setApprovalRoute($docId);
            
            $this->commit();
            return $docId;
            
        } catch (Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    private function setApprovalRoute($docId) {
        $userModel = new User();
        $approvers = $userModel->getApprovers(5); // Kategori 5 untuk Kontrak
        
        $updateData = [];
        if (isset($approvers[0])) {
            $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            $updateData['s_approved_2'] = $approvers[0]['s_approved_2'] ?? null;
        }
        
        // Fixed receiver as per spec
        $updateData['s_confirmed'] = '0036'; 

        if (!empty($updateData)) {
            $this->update($docId, $updateData);
        }
    }
}
?>