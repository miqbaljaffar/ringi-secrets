<?php
require_once __DIR__ . '/../utils/IdGenerator.php';

class Vendor extends BaseModel {
    protected $table = 't_vendors';
    protected $primaryKey = 'id_doc';
    
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            // 1. Generate ID (CV + YYMMDD + 00)
            $docId = IdGenerator::generate('CV', $this->table);
            $data['id_doc'] = $docId;
            
            // 2. Default Values
            $defaults = [
                'n_send_to' => 1, // Default ke kantor
                'ts_applied' => date('Y-m-d H:i:s')
            ];
            $data = array_merge($defaults, $data);
            
            // 3. Insert Data
            $this->db->insert($this->table, $data);
            
            // 4. Set Approval Route
            // PDF Hal 21: t_approval_route.n_doc_cat = 5 (Sama dengan Others)
            // Fixed receiver '0036'
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
        $approvers = $userModel->getApprovers(5); 
        
        $updateData = [];
        if (isset($approvers[0])) {
            $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            $updateData['s_approved_2'] = $approvers[0]['s_approved_2'] ?? null;
        }
        
        $updateData['s_confirmed'] = '0036'; 

        if (!empty($updateData)) {
            $this->update($docId, $updateData);
        }
    }
}
?>