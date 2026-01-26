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
            
            // 2. Mapping Explicit (Agar aman)
            $dbData = [
                'id_doc' => $docId,
                's_name' => $data['s_name'],
                's_kana' => $data['s_kana'] ?? '',
                
                // Address & Contact
                's_office_pcode' => $data['s_office_pcode'] ?? ($data['zip1'].$data['zip2'] ?? ''),
                's_office_address' => $data['s_office_address'] ?? '',
                's_office_address2' => $data['s_office_address2'] ?? '',
                's_office_tel' => $data['s_office_tel'] ?? '',
                
                'n_send_to' => $data['n_send_to'] ?? 1,
                's_send_to_others' => $data['s_send_to_others'] ?? '',
                
                // Representative
                's_rep_name' => $data['s_rep_name'] ?? '',
                's_rep_kana' => $data['s_rep_kana'] ?? '',
                's_rep_title' => $data['s_rep_title'] ?? 1,
                's_rep_title_others' => $data['s_rep_title_others'] ?? '',
                
                's_contract_overview' => $data['s_contract_overview'] ?? '',
                's_situation' => $data['s_situation'] ?? '',
                's_memo' => $data['s_memo'] ?? '',
                
                'ts_applied' => date('Y-m-d H:i:s'),
                's_applied' => $data['s_applied']
            ];
            
            // 3. Insert Data
            $this->db->insert($this->table, $dbData);
            
            // 4. Set Approval Route
            $this->setApprovalRoute($docId);
            
            $this->commit();
            return $docId;
            
        } catch (Exception $e) {
            $this->rollback();
            error_log("Vendor Insert Error: " . $e->getMessage());
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