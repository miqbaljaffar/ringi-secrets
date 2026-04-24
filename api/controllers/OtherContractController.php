<?php
require_once __DIR__ . '/../utils/Mailer.php';

class OtherContractController {
    private $validator;
    private $model;
    private $mailer;
    private $fileUpload;

    public function __construct() {
        $this->validator = new Validator();
        $this->model = new OtherContract();
        $this->mailer = new Mailer();
        $this->fileUpload = new FileUpload('co'); 
    }
    
    // 新規申請を保存する処理 (Store new application)
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        // Cek apakah ini mode simpan draf
        $isDraft = isset($data['save_mode']) && $data['save_mode'] === 'draft';
        
        // Memparsing Nomor Telepon menjadi berformat dengan hyphen (-)
        $tel1 = $data['tel1'] ?? '';
        $tel2 = $data['tel2'] ?? '';
        $tel3 = $data['tel3'] ?? '';
        if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
            $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
        }

        // Memparsing Kode Pos jika input dipisah
        $zip1 = $data['zip1'] ?? '';
        $zip2 = $data['zip2'] ?? '';
        if (empty($data['s_office_pcode']) && (!empty($zip1) || !empty($zip2))) {
            $data['s_office_pcode'] = $zip1 . $zip2;
        }
        
        // Membersihkan koma dari form nilai uang (amount)
        $moneyFields = ['n_pre_total', 'n_pre_sales', 'n_pre_debt', 'n_pre_income', 'n_pre_workers'];
        foreach($moneyFields as $field) {
            if(isset($data[$field])) {
                $data[$field] = str_replace(',', '', $data[$field]);
            }
        }
        
        // Inject / perbaiki value s_rep_email jika dinonaktifkan di Frontend
        if (isset($data['rep_email_exists']) && $data['rep_email_exists'] === '0') {
            $data['s_rep_email'] = 'なし';
        }

        // Inject / perbaiki value introducer jika dinonaktifkan di Frontend
        if (isset($data['n_introducer_type']) && $data['n_introducer_type'] === '0') {
            $data['s_introducer'] = 'なし';
        }

        // Aturan validasi dasar
        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_industry' => 'required|max:50',
            's_industry_type' => 'required|regex:/^[A-T][0-9]{2}[0-9]$/',
            's_office_pcode' => 'required',
            's_office_address' => 'required|max:100',
            's_office_tel' => 'required',
            'n_send_to' => 'required|in:1,2,9',
            's_rep_name' => 'required|max:30',
            's_rep_kana' => 'required|max:30',
            's_rep_title' => 'required|in:1,2,3,4,9',
            's_rep_email' => 'required|max:100',
            'n_pre_total' => 'required',
            'n_pre_sales' => 'required',
            'n_pre_debt' => 'required',
            'n_pre_income' => 'required',
            'n_pre_workers' => 'required',
            'n_comsumption_tax' => 'required|in:1,2,3',
            'n_trade' => 'required|in:0,1,2,3',
            'n_affiliated_company' => 'required|in:0,1',
            'dt_contract_start' => 'required|date',
            's_incharge' => 'required',
            's_introducer' => 'required',
            'n_introducer_type' => 'required|in:0,1,2,3,4,9',
            's_situation' => 'required'
        ];
        
        // Jika mode Draf, longgarkan validasi (hapus 'required' kecuali untuk field esensial)
        if ($isDraft) {
            foreach ($rules as $field => $ruleString) {
                if (!in_array($field, ['s_name', 's_kana'])) {
                    // Hapus string required dari rules untuk membiarkan form kosong saat draf
                    $rules[$field] = str_replace(['required|', '|required', 'required'], '', $ruleString);
                }
            }
            // Status 0 biasanya untuk Draf, 1 untuk Pending Approval
            $data['n_status'] = 0; 
        } else {
            $data['n_status'] = 1;
            
            // Backend validation: Pastikan file PDF terupload jika bukan draf
            if (empty($files['estimate_file']['name'])) {
                http_response_code(API_BAD_REQUEST);
                return ['success' => false, 'error' => '見積書（PDF）は必須です。']; // "Estimasi PDF wajib diunggah"
            }
        }
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            // MULAI TRANSAKSI
            $this->model->beginTransaction();

            $data['s_applied'] = $request['user']['id'];
            $docId = $this->model->createDocument($data);
            
            // Simpan file estimasi jika ada
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            // Menerima file attachment kedua jika ada
            if (!empty($files['attachment']) && $files['attachment']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['attachment'], $docId);
            }

            // HANYA kirim email notifikasi jika ini BUKAN DRAF
            if (!$isDraft) {
                $newDoc = $this->model->find($docId);
                if ($newDoc && !empty($newDoc['s_approved_1'])) {
                    $this->mailer->sendRequestNotification(
                        $docId,
                        $newDoc['s_approved_1'],      
                        $request['user']['name'],    
                        $data['s_name']               
                    );
                }
            }
            
            // COMMIT JIKA SUKSES
            $this->model->commit();

            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => $isDraft ? '下書きを保存しました' : '申請が正常に送信されました'
            ];
            
        } catch (Exception $e) {
            // ROLLBACK JIKA GAGAL
            $this->model->rollback();
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ドキュメントの詳細を取得する処理 (Retrieve document details)
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ID Required'];
        }

        try {
            $doc = $this->model->find($id);
            
            if (!$doc) {
                http_response_code(API_NOT_FOUND);
                return ['success' => false, 'error' => 'Document not found'];
            }
            
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
            
            $doc['approver1_info'] = $doc['s_approved_1'] ? $userModel->findByEmployeeId($doc['s_approved_1']) : null;
            $doc['approver2_info'] = $doc['s_approved_2'] ? $userModel->findByEmployeeId($doc['s_approved_2']) : null;
            
            return ['success' => true, 'data' => $doc];

        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
?>