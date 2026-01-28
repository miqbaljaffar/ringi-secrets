<?php
class Tax extends BaseModel {
    protected $table = 't_tax';
    protected $primaryKey = 'id_doc';
    
    // 企業税務ドキュメントを作成する (Create tax document)
    private function safeSubstr($str, $start, $length) {
        $str = (string)($str ?? '');
        if (function_exists('mb_substr')) {
            return mb_substr($str, $start, $length);
        }
        return substr($str, $start, $length);
    }

    // 新しい税務ドキュメントを作成する (Create new tax document)
    public function createDocument($data) {
        $this->beginTransaction();
        
        try {
            $docId = IdGenerator::generate('CT', $this->table);
            
            $postalCode = $data['s_office_pcode'] ?? '';
            if (empty($postalCode)) {
                $z1 = $data['zip1'] ?? '';
                $z2 = $data['zip2'] ?? '';
                if ($z1 && $z2) {
                    $postalCode = $z1 . $z2;
                }
            }
            
            $declarationType = '1'; 
            if (isset($data['s_declaration_type'])) {
                $val = strtolower($data['s_declaration_type']);
                if ($val === 'white' || $val === '2' || $val === 'w') $declarationType = '2';
            }

            $capital = isset($data['n_capital']) && $data['n_capital'] !== '' ? (int)str_replace(',', '', $data['n_capital']) : 0;
            $before  = isset($data['n_before']) && $data['n_before'] !== '' ? (int)str_replace(',', '', $data['n_before']) : 0;
            $closing = isset($data['n_closing_month']) && $data['n_closing_month'] !== '' ? (int)$data['n_closing_month'] : 3;

            $approverData = $this->getInitialApprovers();

            $dbData = [
                'id_doc' => $docId,
                'n_type' => $data['n_type'] ?? 1,
                's_name' => $this->safeSubstr($data['s_name'] ?? '', 0, 100),
                's_kana' => $this->safeSubstr($data['s_kana'] ?? '', 0, 100), 
                
                'dt_establishment' => !empty($data['dt_establishment']) ? $data['dt_establishment'] : null,
                'n_capital' => $capital,
                'n_before' => $before, 
                
                's_industry' => $this->safeSubstr($data['s_industry'] ?? '', 0, 50), 
                's_industry_type' => $this->safeSubstr($data['s_industry_type'] ?? '', 0, 4), 
                's_industry_oms' => $this->safeSubstr($data['s_industry_oms'] ?? '', 0, 4),   
                
                's_declaration_type' => $declarationType,
                'n_closing_month' => $closing,
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
                's_rep_address' => $this->safeSubstr($data['s_rep_address'] ?? '', 0, 100),
                's_rep_address2' => $this->safeSubstr($data['s_rep_address2'] ?? '', 0, 100),
                's_rep_tel' => $this->safeSubstr($data['s_rep_tel'] ?? '', 0, 13),
                's_rep_email' => $this->safeSubstr($data['s_rep_email'] ?? '', 0, 100), 

                'n_e_filing' => $data['n_e_filing'] ?? 2,
                's_e_filing_reason' => $data['s_e_filing_reason'] ?? '',
                's_national_tax_id' => $this->safeSubstr($data['s_national_tax_id'] ?? '', 0, 16),
                's_national_tax_pw' => $data['s_national_tax_pw'] ?? '',
                's_local_tax_id' => $this->safeSubstr($data['s_local_tax_id'] ?? '', 0, 11),
                's_local_tax_pw' => $data['s_local_tax_pw'] ?? '',
                
                'n_pre_total' => (isset($data['n_pre_total']) && $data['n_pre_total'] !== '') ? (int)str_replace(',', '', $data['n_pre_total']) : 0,
                'n_pre_sales' => (isset($data['n_pre_sales']) && $data['n_pre_sales'] !== '') ? (int)str_replace(',', '', $data['n_pre_sales']) : 0,
                'n_pre_debt'  => (isset($data['n_pre_debt']) && $data['n_pre_debt'] !== '') ? (int)str_replace(',', '', $data['n_pre_debt']) : 0,
                'n_pre_income'=> (isset($data['n_pre_income']) && $data['n_pre_income'] !== '') ? (int)str_replace(',', '', $data['n_pre_income']) : 0,
                'n_pre_workers'=> (isset($data['n_pre_workers']) && $data['n_pre_workers'] !== '') ? (int)str_replace(',', '', $data['n_pre_workers']) : 0,
                
                'n_comsumption_tax' => $data['n_comsumption_tax'] ?? 1,
                'n_trade' => $data['n_trade'] ?? 0,
                'n_affiliated_company' => $data['n_affiliated_company'] ?? 0,
                
                'n_self_accounting' => $data['n_self_accounting'] ?? 1,
                's_self_accounting_others' => $this->safeSubstr($data['s_self_accounting_others'] ?? '', 0, 50), 
                'n_accounting_apps' => $data['n_accounting_apps'] ?? 1,
                's_accounting_apps_others' => $this->safeSubstr($data['s_accounting_apps_others'] ?? '', 0, 100), 
                's_books' => $this->safeSubstr($data['s_books'] ?? '', 0, 30), 
                's_books_others' => $this->safeSubstr($data['s_books_others'] ?? '', 0, 100), 
                'n_slip_count' => (isset($data['n_slip_count']) && $data['n_slip_count'] !== '') ? (int)str_replace(',', '', $data['n_slip_count']) : 0,
                'n_accounting_staff' => $data['n_accounting_staff'] ?? 0, 
                
                's_pre_accountant' => $this->safeSubstr($data['s_pre_accountant'] ?? '', 0, 50),
                'n_pre_account_type' => !empty($data['n_pre_account_type']) ? (int)$data['n_pre_account_type'] : null,
                'n_rewards_account' => (isset($data['n_rewards_account']) && $data['n_rewards_account'] !== '') ? (int)str_replace(',', '', $data['n_rewards_account']) : 0,
                'n_rewards_tax' => (isset($data['n_rewards_tax']) && $data['n_rewards_tax'] !== '') ? (int)str_replace(',', '', $data['n_rewards_tax']) : 0,
                'n_rewards_yearly' => (isset($data['n_rewards_yearly']) && $data['n_rewards_yearly'] !== '') ? (int)str_replace(',', '', $data['n_rewards_yearly']) : 0,

                'n_account_type' => $data['n_account_type'] ?? 1, 
                's_contract_overview' => $data['s_contract_overview'] ?? '', 
                'dt_contract_start' => !empty($data['dt_contract_start']) ? $data['dt_contract_start'] : date('Y-m-d'),
                
                's_incharge_bigin' => $this->safeSubstr($data['s_incharge_bigin'] ?? '', 0, 50), 
                's_incharge_close' => $this->safeSubstr($data['s_incharge_close'] ?? '', 0, 50), 
                's_incharge' => $this->safeSubstr($data['s_incharge'] ?? '', 0, 4),
                's_situation' => $data['s_situation'] ?? '',
                
                's_introducer' => $this->safeSubstr($data['s_introducer'] ?? '', 0, 50),
                'n_introducer_type' => $data['n_introducer_type'] ?? 0,
                's_introducer_type_others' => $this->safeSubstr($data['s_introducer_type_others'] ?? '', 0, 50),

                'ts_applied' => date('Y-m-d H:i:s'),
                's_applied' => $this->safeSubstr($data['s_applied'] ?? '0000', 0, 4),

                's_approved_1' => $approverData['s_approved_1'] ?? '0000', 
                's_approved_2' => $approverData['s_approved_2'] ?? null,
                's_confirmed' => '0036' 
            ];

            $this->db->insert($this->table, $dbData);
            
            $this->commit();
            return $docId;
            
        } catch (Throwable $e) { 
            $this->rollback();
            error_log("Tax Create Error: " . $e->getMessage());
            throw new Exception("Database Error: " . $e->getMessage());
        }
    }

    // 初期承認者を取得する (Get initial approvers)
    private function getInitialApprovers() {
        $userModel = new User();
        $approvers = $userModel->getApprovers(5); 
        
        $result = [];
        if (!empty($approvers) && isset($approvers[0])) {
            $result['s_approved_1'] = $approvers[0]['s_approved_1'];
            if(isset($approvers[0]['s_approved_2'])) {
                $result['s_approved_2'] = $approvers[0]['s_approved_2'];
            }
        }
        
        return $result;
    }
}
?>