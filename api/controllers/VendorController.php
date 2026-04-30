<?php
require_once __DIR__ . '/../utils/Mailer.php';

class VendorController {
    private $validator;
    private $fileUpload;
    private $model;
    private $mailer;
    
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('cv'); 
        $this->model = new Vendor();
        $this->mailer = new Mailer(); 
    }
    
    // 新規申請を保存する処理 (Store new application)
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        // 下書きモードかどうかを判定 (Detect whether this is draft mode)
        $isDraft = isset($data['save_mode']) && $data['save_mode'] === 'draft';
        
        // 電話番号の結合 (Combine phone number)
        $tel1 = $data['tel1'] ?? '';
        $tel2 = $data['tel2'] ?? '';
        $tel3 = $data['tel3'] ?? '';
        if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
            $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
        }

        // 郵便番号の結合 (Combine postal code)
        $zip1 = $data['zip1'] ?? '';
        $zip2 = $data['zip2'] ?? '';
        if (empty($data['s_office_pcode']) && (!empty($zip1) || !empty($zip2))) {
            $data['s_office_pcode'] = $zip1 . $zip2;
        }

        // 基本的なバリデーションルール (Basic validation rules)
        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_office_pcode' => 'required|regex:/^[0-9]{7}$/',
            's_office_address' => 'required|max:100',
            's_office_tel' => 'required',
            'n_send_to' => 'required|in:1,2,9',
            's_rep_name' => 'required|max:30',
            's_rep_kana' => 'required|max:30',
            's_rep_title' => 'required|in:1,2,3,4,9',
            's_situation' => 'required'
        ];
        
        // 下書きモードの場合はバリデーションを緩和 (Relax validation if draft mode)
        if ($isDraft) {
            foreach ($rules as $field => $ruleString) {
                // 識別のため s_name と s_kana は必須のまま (Keep s_name and s_kana required for identification)
                if (!in_array($field, ['s_name', 's_kana'])) {
                    $rules[$field] = str_replace(['required|', '|required', 'required'], '', $ruleString);
                }
            }
        } else {
            // PDFファイルは必須 (PDF file is required)
            if (empty($files['estimate_file']['name'])) {
                http_response_code(API_BAD_REQUEST);
                return ['success' => false, 'error' => '見積書（PDF）は必須です。'];
            }
        }
        
        $validation = $this->validator->validate($data, $rules);
        
        // バリデーション失敗時の処理 (Handle validation failure)
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            // トランザクション開始 (Start transaction)
            $this->model->beginTransaction();

            // 申請者IDを設定 (Set applicant ID)
            $data['s_applied'] = $request['user']['id'];
            $docId = $this->model->createDocument($data);
            
            // ファイル保存処理 (Save file)
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            // 下書きでない場合のみ通知を送信 (Send notification only if not draft)
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
            
            // 成功時コミット (Commit if success)
            $this->model->commit();

            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => $isDraft ? '下書きを保存しました' : 'ベンダー申請が正常に送信されました'
            ];
            
        } catch (Exception $e) {
            // エラー時ロールバック (Rollback on failure)
            $this->model->rollback();
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ドキュメント詳細取得処理 (Retrieve document details)
    public function show($request) {
        $id = $request['params']['id'];
        $doc = $this->model->find($id);
        
        // ドキュメントが存在しない場合 (If document not found)
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return ['success' => false, 'error' => 'ドキュメントが見つかりません'];
        }
        
        // ユーザー情報の取得 (Fetch user information)
        if (class_exists('User')) {
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        }
        
        return ['success' => true, 'data' => $doc];
    }
}
?>