<?php
require_once __DIR__ . '/../utils/IdGenerator.php';

class Tax extends BaseModel {
    protected $table = 't_tax';
    protected $primaryKey = 'id_doc';
    
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            $docId = IdGenerator::generate('CT', $this->table);
            
            $dbData = [
                'id_doc' => $docId,
                'n_type' => $data['n_type'],
                's_name' => $data['s_name'],
                's_kana' => $data['s_kana'],
                'dt_establishment' => !empty($data['dt_establishment']) ? $data['dt_establishment'] : null,
                'n_capital' => !empty($data['n_capital']) ? $data['n_capital'] : null,
                
                // Field Industri & Klasifikasi
                's_industry' => $data['s_industry'] ?? 'General', 
                's_industry_type' => $data['s_industry_type'] ?? '0000', // Char(4)
                's_industry_oms' => $data['s_industry_oms'] ?? '0000',   // Char(4)
                
                // Field Pajak
                's_declaration_type' => $data['s_declaration_type'] ?? '1',
                'n_closing_month' => $data['n_closing_month'],
                'n_tax_place' => $data['n_tax_place'] ?? 1,
                's_tax_office' => $data['s_tax_office'],
                's_tax_num' => $data['s_tax_num'],
                
                // Alamat
                's_office_pcode' => isset($data['pcode1']) ? $data['pcode1'] . $data['pcode2'] : ($data['s_office_pcode'] ?? ''),
                's_office_address' => $data['s_office_address'],
                's_office_address2' => $data['s_office_address2'] ?? '',
                's_office_tel' => $data['s_office_tel'],
                'n_send_to' => $data['n_send_to'] ?? 1,
                
                // Perwakilan
                's_rep_name' => $data['s_rep_name'],
                's_rep_kana' => $data['s_rep_kana'],
                's_rep_title' => $data['s_rep_title'] ?? 1,
                'dt_rep_birth' => $data['dt_rep_birth'] ?? '1980-01-01',
                
                // Data Default Lainnya (Placeholder untuk field mandatory yg tidak ada di form simple)
                's_rep_pcode' => '0000000',
                's_rep_address' => '-',
                's_rep_tel' => '-',
                's_rep_email' => '-',
                'n_e_filing' => 1,
                's_national_tax_id' => '0000000000000000',
                's_national_tax_pw' => 'dummy',
                
                // Data Finansial
                'n_pre_total' => $data['n_pre_total'] ?? 0,
                'n_pre_sales' => $data['n_pre_sales'] ?? 0,
                'n_pre_debt'  => $data['n_pre_debt'] ?? 0,
                'n_pre_income'=> $data['n_pre_income'] ?? 0,
                'n_pre_workers'=> 0,
                
                // Flags
                'n_comsumption_tax' => 1,
                'n_trade' => 0,
                'n_affiliated_company' => 0,
                'n_self_accounting' => 1,
                'n_accounting_apps' => 1,
                's_books' => 'General',
                'n_slip_count' => 0,
                'n_accounting_staff' => 0,
                's_pre_accountant' => '-',
                'n_account_type' => 1,
                
                // Kontrak
                'dt_contract_start' => $data['dt_contract_start'],
                's_incharge' => $data['s_incharge'],
                's_introducer' => 'None',
                'n_introducer_type' => 0,
                's_situation' => $data['s_situation'],
                
                // System Info
                'ts_applied' => date('Y-m-d H:i:s'),
                's_applied' => $data['s_applied']
            ];

            $this->db->insert($this->table, $dbData);
            
            // 4. Approval Route (Penerima '0036' fixed sesuai PDF Hal 18)
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
        // Asumsi Tax (Kontrak Pajak) menggunakan Kategori 5
        $approvers = $userModel->getApprovers(5); 
        
        $updateData = [];
        // Set Approver 1 & 2
        if (isset($approvers[0])) {
            $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            if(isset($approvers[0]['s_approved_2'])) {
                $updateData['s_approved_2'] = $approvers[0]['s_approved_2'];
            }
        }
        
        // Fixed Receiver (Penerima Kontrak)
        $updateData['s_confirmed'] = '0036'; 

        $this->update($docId, $updateData);
    }
}
?>