<?php
require_once __DIR__ . '/../utils/Mailer.php';

class TaxController {
    private $validator;
    private $fileUpload;
    private $taxModel;
    private $mailer; 
    
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('ct'); 
        $this->taxModel = new Tax();
        $this->mailer = new Mailer(); 
    }
    
    // 新規申請を保存する処理 (Store new application)
    public function store($request) {
        try {
            // MULAI TRANSAKSI DI SINI
            $this->taxModel->beginTransaction();

            $data = $request['body'] ?? $_POST; 
            $files = $request['files'] ?? $_FILES;
            
            if (empty($data) && !empty($_POST)) {
                $data = $_POST;
            }

            $tel1 = $data['tel1'] ?? '';
            $tel2 = $data['tel2'] ?? '';
            $tel3 = $data['tel3'] ?? '';
            if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
                $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
            } else {
                $data['s_office_tel'] = $data['s_office_tel'] ?? '';
            }

            // Parsing telepon perwakilan (representative)
            $rep_tel1 = $data['rep_tel1'] ?? '';
            $rep_tel2 = $data['rep_tel2'] ?? '';
            $rep_tel3 = $data['rep_tel3'] ?? '';
            if (!empty($rep_tel1) || !empty($rep_tel2) || !empty($rep_tel3)) {
                $data['s_rep_tel'] = $rep_tel1 . '-' . $rep_tel2 . '-' . $rep_tel3;
            } else {
                $data['s_rep_tel'] = $data['s_rep_tel'] ?? '';
            }
            
            // PERBAIKAN : Field Mandatory & Validasi pilihan (radio button)
            $rules = [
                'n_type' => 'required|in:1,2',
                's_name' => 'required|max:100',
                's_kana' => 'required|max:100',
                's_office_address' => 'required|max:100',
                's_rep_name' => 'required|max:50',
                's_rep_title' => 'required|in:1,2,3,4,9',
                'dt_contract_start' => 'required|date',
                's_industry_type' => 'required|regex:/^[A-T][0-9]{2}[0-9]$/', 
                's_industry_oms' => 'required|regex:/^[0-9]{4}$/',
                's_office_pcode' => 'required|regex:/^[0-9]{7}$/', 
                's_tax_num' => 'required|regex:/^[0-9]{8}$/',
                'n_pre_total' => 'required',
                'n_pre_sales' => 'required',
                'n_pre_debt' => 'required',
                'n_pre_income' => 'required',
                'n_pre_workers' => 'required',
                // Validasi rentang nilai untuk boolean-like
                'n_tax_place' => 'in:1,2',
                'n_send_to' => 'in:1,2,9',
                'n_e_filing' => 'in:1,2',
                'n_comsumption_tax' => 'in:1,2,3',
                'n_trade' => 'in:0,1,2,3',
                'n_affiliated_company' => 'in:0,1',
                'n_self_accounting' => 'in:1,2,3,4,5,9',
                'n_accounting_apps' => 'in:1,2,3,4,8,9',
                'n_accounting_staff' => 'in:0,1',
                'n_account_type' => 'in:1,2,3,4',
                'n_introducer_type' => 'in:0,1,2,3,4,9'
            ];
            
            // Validasi Kondisional Khusus Korporat/Badan (n_type = 1)
            if (isset($data['n_type']) && $data['n_type'] == 1) {
                $rules['dt_establishment'] = 'required|date';
                $rules['n_capital'] = 'required';
                $rules['n_before'] = 'required';
                // PERBAIKAN : Validasi bulan (1-12)
                $rules['n_closing_month'] = 'required|in:1,2,3,4,5,6,7,8,9,10,11,12'; 
            }

            $validation = $this->validator->validate($data, $rules);
            if (!$validation['valid']) {
                $this->taxModel->rollback(); // Batalkan TX jika validasi gagal
                http_response_code(API_BAD_REQUEST);
                return ['success' => false, 'errors' => $validation['errors'], 'message' => 'バリデーションに失敗しました'];
            }
            
            $data['s_applied'] = $request['user']['id'] ?? '0000';
            
            $moneyFields = ['n_capital', 'n_pre_total', 'n_pre_sales', 'n_pre_debt', 'n_pre_income', 'n_rewards_tax', 'n_rewards_account'];
            foreach($moneyFields as $field) {
                if(isset($data[$field])) {
                    $data[$field] = str_replace(',', '', $data[$field]);
                }
            }

            $docId = $this->taxModel->createDocument($data);
            
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            if (!empty($files['attachment']) && $files['attachment']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['attachment'], $docId);
            }

            $newDoc = $this->taxModel->find($docId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $docId,
                    $newDoc['s_approved_1'],
                    $request['user']['name'],
                    $data['s_name']
                );
            }

            // TRANSAKSI SELESAI, COMMIT KE DB
            $this->taxModel->commit();

            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => '税務書類の申請が正常に送信されました'
            ];
            
        } catch (Throwable $e) {
            $this->taxModel->rollback();
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => 'サーバーエラー: ' . $e->getMessage()];
        }
    }
    

    // ドキュメントの詳細を取得する処理 (Retrieve document details)
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        if (!$id) { 
            http_response_code(API_BAD_REQUEST); 
            return ['success' => false, 'error' => 'IDが必要です']; 
        }
        
        $doc = $this->taxModel->find($id);
        if (!$doc) { 
            http_response_code(API_NOT_FOUND); 
            return ['success' => false, 'error' => '文書が見つかりません']; 
        }
        
        if (class_exists('User')) {
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        }
        return ['success' => true, 'data' => $doc];
    }
}
?>