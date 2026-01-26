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
            
            // 2. Mapping Data Secara Eksplisit (Agar aman dari field sampah di $_POST)
            // Sesuai struktur tabel t_others
            $dbData = [
                'id_doc' => $docId,
                's_name' => $data['s_name'],
                's_kana' => $data['s_kana'] ?? '',
                
                's_industry' => $data['s_industry'] ?? '',
                's_industry_type' => $data['s_industry_type'] ?? '',
                
                // Gabungan Alamat/Telp (Ditangani Frontend, tapi fallback disini aman)
                's_office_pcode' => $data['s_office_pcode'] ?? ($data['zip1'].$data['zip2'] ?? ''),
                's_office_address' => $data['s_office_address'] ?? '',
                's_office_address2' => $data['s_office_address2'] ?? '',
                's_office_tel' => $data['s_office_tel'] ?? '',
                
                'n_send_to' => $data['n_send_to'] ?? 1,
                's_send_to_others' => $data['s_send_to_others'] ?? '',
                
                's_rep_name' => $data['s_rep_name'] ?? '',
                's_rep_kana' => $data['s_rep_kana'] ?? '',
                's_rep_title' => $data['s_rep_title'] ?? 1,
                's_rep_title_others' => $data['s_rep_title_others'] ?? '',
                's_rep_email' => $data['s_rep_email'] ?? '',
                
                // Financials (Hapus koma jika ada)
                'n_pre_total' => (int)str_replace(',', '', $data['n_pre_total'] ?? 0),
                'n_pre_sales' => (int)str_replace(',', '', $data['n_pre_sales'] ?? 0),
                'n_pre_debt' => (int)str_replace(',', '', $data['n_pre_debt'] ?? 0),
                'n_pre_income' => (int)str_replace(',', '', $data['n_pre_income'] ?? 0),
                'n_pre_workers' => (int)str_replace(',', '', $data['n_pre_workers'] ?? 0),
                
                'n_consumption_tax' => $data['n_consumption_tax'] ?? 1,
                'n_trade' => $data['n_trade'] ?? 0,
                'n_affiliated_company' => $data['n_affiliated_company'] ?? 0,
                
                's_contract_overview' => $data['s_contract_overview'] ?? '',
                'dt_contract_start' => $data['dt_contract_start'] ?? date('Y-m-d'),
                
                's_incharge' => $data['s_incharge'] ?? '',
                's_introducer' => $data['s_introducer'] ?? '',
                'n_introducer_type' => $data['n_introducer_type'] ?? 0,
                's_introducer_type_others' => $data['s_introducer_type_others'] ?? '',
                's_situation' => $data['s_situation'] ?? '',
                
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
            // Log error agar mudah didebug
            error_log("OtherContract Insert Error: " . $e->getMessage());
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