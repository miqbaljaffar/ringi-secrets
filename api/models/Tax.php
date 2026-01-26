<?php
require_once __DIR__ . '/../utils/IdGenerator.php';

class Tax extends BaseModel {
    protected $table = 't_tax';
    protected $primaryKey = 'id_doc';
    
    // Helper aman untuk substring
    private function safeSubstr($str, $start, $length) {
        // Cek mbstring availability
        if (function_exists('mb_substr')) {
            return mb_substr($str ?? '', $start, $length);
        }
        return substr($str ?? '', $start, $length);
    }

    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            $docId = IdGenerator::generate('CT', $this->table);
            
            // Helper: Gabungkan Kode Pos (Safe Check)
            $postalCode = $data['s_office_pcode'] ?? '';
            if (empty($postalCode)) {
                $z1 = $data['zip1'] ?? '';
                $z2 = $data['zip2'] ?? '';
                if ($z1 && $z2) {
                    $postalCode = $z1 . $z2;
                }
            }
            
            // Helper: Declaration Type
            $declarationType = '1'; 
            if (isset($data['s_declaration_type'])) {
                $val = strtolower($data['s_declaration_type']);
                if ($val === 'white' || $val === '2' || $val === 'w') $declarationType = '2';
            }

            // Mapping Data Aman
            $dbData = [
                'id_doc' => $docId,
                'n_type' => $data['n_type'] ?? 1,
                's_name' => $data['s_name'] ?? '',
                's_kana' => $data['s_kana'] ?? '', 
                
                'dt_establishment' => !empty($data['dt_establishment']) ? $data['dt_establishment'] : null,
                'n_capital' => (int)str_replace(',', '', $data['n_capital'] ?? 0),
                'n_before' => 0, 
                
                's_industry' => $this->safeSubstr($data['s_industry'] ?? '', 0, 50), 
                's_industry_type' => $this->safeSubstr($data['s_industry_type'] ?? '', 0, 4), 
                's_industry_oms' => $this->safeSubstr($data['s_industry_oms'] ?? '', 0, 4),   
                
                's_declaration_type' => $declarationType,
                'n_closing_month' => (int)($data['n_closing_month'] ?? 3),
                'n_tax_place' => $data['n_tax_place'] ?? 1,
                's_tax_office' => $this->safeSubstr($data['s_tax_office'] ?? '', 0, 20),
                's_tax_num' => $this->safeSubstr($data['s_tax_num'] ?? '', 0, 8),
                
                's_office_pcode' => $this->safeSubstr($postalCode, 0, 7), 
                's_office_address' => $this->safeSubstr($data['s_office_address'] ?? '', 0, 100),
                's_office_address2' => $this->safeSubstr($data['s_office_address2'] ?? '', 0, 100),
                's_office_tel' => $this->safeSubstr($data['s_office_tel'] ?? '', 0, 13), 
                'n_send_to' => $data['n_send_to'] ?? 1,
                's_send_to_others' => $this->safeSubstr($data['s_send_to_others'] ?? '', 0, 100), 
                
                's_rep_name' => $this->safeSubstr($data['s_rep_name'] ?? '', 0, 30),
                's_rep_kana' => $this->safeSubstr($data['s_rep_kana'] ?? '', 0, 30),
                's_rep_title' => $data['s_rep_title'] ?? 1,
                's_rep_title_others' => $this->safeSubstr($data['s_rep_title_others'] ?? '', 0, 30), 
                
                'dt_rep_birth' => !empty($data['dt_rep_birth']) ? $data['dt_rep_birth'] : '1970-01-01', 
                
                's_rep_pcode' => $data['s_rep_pcode'] ?? '', 
                's_rep_address' => $data['s_rep_address'] ?? '',
                's_rep_address2' => $data['s_rep_address2'] ?? '',
                's_rep_tel' => $data['s_rep_tel'] ?? '',
                's_rep_email' => $this->safeSubstr($data['s_rep_email'] ?? '', 0, 100), 

                'n_e_filing' => $data['n_e_filing'] ?? 2,
                's_e_filing_reason' => $data['s_e_filing_reason'] ?? '',
                's_national_tax_id' => $this->safeSubstr($data['s_national_tax_id'] ?? '', 0, 16),
                's_national_tax_pw' => $data['s_national_tax_pw'] ?? '',
                's_local_tax_id' => $this->safeSubstr($data['s_local_tax_id'] ?? '', 0, 11),
                's_local_tax_pw' => $data['s_local_tax_pw'] ?? '',
                
                // Financials
                'n_pre_total' => (int)str_replace(',', '', $data['n_pre_total'] ?? 0),
                'n_pre_sales' => (int)str_replace(',', '', $data['n_pre_sales'] ?? 0),
                'n_pre_debt'  => (int)str_replace(',', '', $data['n_pre_debt'] ?? 0),
                'n_pre_income'=> (int)str_replace(',', '', $data['n_pre_income'] ?? 0),
                'n_pre_workers'=> (int)str_replace(',', '', $data['n_pre_workers'] ?? 0),
                
                'n_consumption_tax' => $data['n_consumption_tax'] ?? 1,
                
                'n_trade' => $data['n_trade'] ?? 0,
                'n_affiliated_company' => $data['n_affiliated_company'] ?? 0,
                
                // Accounting
                'n_self_accounting' => $data['n_self_accounting'] ?? 1,
                's_self_accounting_others' => $data['s_self_accounting_others'] ?? '', 
                'n_accounting_apps' => $data['n_accounting_apps'] ?? 1,
                's_accounting_apps_others' => $data['s_accounting_apps_others'] ?? '', 
                's_books' => $data['s_books'] ?? '', 
                's_books_others' => $data['s_books_others'] ?? '', 
                'n_slip_count' => (int)str_replace(',', '', $data['n_slip_count'] ?? 0),
                'n_accounting_staff' => $data['n_accounting_staff'] ?? 0, 
                
                // Previous Accountant
                's_pre_accountant' => $data['s_pre_accountant'] ?? '',
                'n_pre_account_type' => !empty($data['n_pre_account_type']) ? $data['n_pre_account_type'] : null,
                'n_rewards_account' => (int)str_replace(',', '', $data['n_rewards_account'] ?? 0),
                'n_rewards_tax' => (int)str_replace(',', '', $data['n_rewards_tax'] ?? 0),
                'n_rewards_yearly' => (int)str_replace(',', '', $data['n_rewards_yearly'] ?? 0),

                // Contract
                'n_account_type' => $data['n_account_type'] ?? 1, 
                's_contract_overview' => $data['s_contract_overview'] ?? '', 
                'dt_contract_start' => !empty($data['dt_contract_start']) ? $data['dt_contract_start'] : date('Y-m-d'),
                
                's_incharge_bigin' => $data['s_incharge_bigin'] ?? '', 
                's_incharge_close' => $data['s_incharge_close'] ?? '', 
                's_incharge' => $this->safeSubstr($data['s_incharge'] ?? '', 0, 4),
                's_situation' => $data['s_situation'] ?? '',
                
                's_introducer' => $data['s_introducer'] ?? '',
                'n_introducer_type' => $data['n_introducer_type'] ?? 0,
                's_introducer_type_others' => $data['s_introducer_type_others'] ?? '',

                'ts_applied' => date('Y-m-d H:i:s'),
                's_applied' => $data['s_applied'] ?? '0000'
            ];

            $this->db->insert($this->table, $dbData);
            $this->setApprovalRoute($docId);
            $this->commit();
            return $docId;
            
        } catch (Throwable $e) { 
            $this->rollback();
            // Re-throw agar ditangkap Controller dan dikirim sebagai JSON 500
            throw new Exception("SQL Error: " . $e->getMessage());
        }
    }

    private function setApprovalRoute($docId) {
        $userModel = new User();
        $approvers = $userModel->getApprovers(5); 
        
        $updateData = [];
        if (isset($approvers[0])) {
            $updateData['s_approved_1'] = $approvers[0]['s_approved_1'];
            if(isset($approvers[0]['s_approved_2'])) {
                $updateData['s_approved_2'] = $approvers[0]['s_approved_2'];
            }
        }
        $updateData['s_confirmed'] = '0036'; 
        
        // Cek jika update data tidak kosong
        if (!empty($updateData)) {
            $this->update($docId, $updateData);
        }
    }
}
?>