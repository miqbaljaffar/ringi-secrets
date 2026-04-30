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
        
        // 下書き保存モードかどうかを確認 (Check whether this is draft save mode)
        $isDraft = isset($data['save_mode']) && $data['save_mode'] === 'draft';
        
        // 電話番号をハイフン形式に整形 (Format phone number with hyphens)
        $tel1 = $data['tel1'] ?? '';
        $tel2 = $data['tel2'] ?? '';
        $tel3 = $data['tel3'] ?? '';
        if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
            $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
        }

        // 郵便番号を結合して整形 (Combine postal code parts)
        $zip1 = $data['zip1'] ?? '';
        $zip2 = $data['zip2'] ?? '';
        if (empty($data['s_office_pcode']) && (!empty($zip1) || !empty($zip2))) {
            $data['s_office_pcode'] = $zip1 . $zip2;
        }
        
        // 金額フィールドのカンマを削除 (Remove commas from money fields)
        $moneyFields = ['n_pre_total', 'n_pre_sales', 'n_pre_debt', 'n_pre_income', 'n_pre_workers'];
        foreach($moneyFields as $field) {
            if(isset($data[$field])) {
                $data[$field] = str_replace(',', '', $data[$field]);
            }
        }
        
        // フロントで無効化された場合のメール値を補完 (Fix email value if disabled on frontend)
        if (isset($data['rep_email_exists']) && $data['rep_email_exists'] === '0') {
            $data['s_rep_email'] = 'なし';
        }

        // フロントで無効化された場合の紹介者値を補完 (Fix introducer value if disabled on frontend)
        if (isset($data['n_introducer_type']) && $data['n_introducer_type'] === '0') {
            $data['s_introducer'] = 'なし';
        }

        // 基本バリデーションルール (Basic validation rules)
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
        
        // 下書きの場合、バリデーションを緩和 (Relax validation for draft mode)
        if ($isDraft) {
            foreach ($rules as $field => $ruleString) {
                if (!in_array($field, ['s_name', 's_kana'])) {
                    // requiredルールを削除 (Remove required rule)
                    $rules[$field] = str_replace(['required|', '|required', 'required'], '', $ruleString);
                }
            }
            // 未入力や不完全な場合は厳密なチェックを除外 (Remove strict regex if incomplete)
            if (empty($data['s_industry_type']) || strlen($data['s_industry_type']) < 4) unset($rules['s_industry_type']);
            if (empty($data['s_office_pcode'])) unset($rules['s_office_pcode']);

            $data['n_status'] = 0; 
        } else {
            $data['n_status'] = 1;
            
            // ドラフト以外の場合、PDFアップロード必須 (Require PDF upload if not draft)
            if (empty($files['estimate_file']['name'])) {
                http_response_code(API_BAD_REQUEST);
                return ['success' => false, 'error' => '見積書（PDF）は必須です。'];
            }
        }
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            // トランザクション開始 (Begin transaction)
            $this->model->beginTransaction();

            $data['s_applied'] = $request['user']['id'];
            $docId = $this->model->createDocument($data);
            
            // 見積書ファイルを保存 (Save estimate file)
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            // 添付ファイルを保存 (Save attachment file)
            if (!empty($files['attachment']) && $files['attachment']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['attachment'], $docId);
            }

            // ドラフト以外のみメール送信 (Send email only if not draft)
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
            
            // コミット (Commit transaction)
            $this->model->commit();

            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => $isDraft ? '下書きを保存しました' : '申請が正常に送信されました'
            ];
            
        } catch (Exception $e) {
            // ロールバック (Rollback transaction)
            $this->model->rollback();
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ドキュメント詳細取得処理 (Retrieve document details)
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        // IDが存在するか確認 (Check if ID exists)
        if (!$id) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ID Required'];
        }

        try {
            $doc = $this->model->find($id);
            
            // ドキュメントが存在するか確認 (Check if document exists)
            if (!$doc) {
                http_response_code(API_NOT_FOUND);
                return ['success' => false, 'error' => 'Document not found'];
            }
            
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
            
            $doc['approver1_info'] = $doc['s_approved_1'] ? $userModel->findByEmployeeId($doc['s_approved_1']) : null;
            $doc['approver2_info'] = $doc['s_approved_2'] ? $userModel->findByEmployeeId($doc['s_approved_2']) : null;
            
            // ファイルパス取得のためディレクトリをスキャン (Scan directory to get file paths)
            $docIdLower = strtolower($id);
            $dir = realpath(__DIR__ . '/../../files/co/' . $docIdLower);
            
            $doc['s_file_estimate_path'] = null;
            $doc['s_file_others_path'] = null;

            if ($dir && is_dir($dir)) {
                $files = scandir($dir);
                foreach ($files as $file) {
                    if ($file !== '.' && $file !== '..') {
                        $relativePath = "files/co/{$docIdLower}/{$file}";
                        // 見積書ファイルを識別 (Identify estimate file)
                        if (mb_strpos($file, '見積書') === 0) {
                            $doc['s_file_estimate_path'] = $relativePath;
                        } else {
                            $doc['s_file_others_path'] = $relativePath;
                        }
                    }
                }
            }

            return ['success' => true, 'data' => $doc];

        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
?>