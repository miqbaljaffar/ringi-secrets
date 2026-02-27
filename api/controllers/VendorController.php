<?php
require_once __DIR__ . '/../utils/Mailer.php';

class VendorController {
    private $validator;
    private $fileUpload;
    private $model;
    private $mailer;
    
    // コンストラクタで必要なクラスを初期化 (Initialize necessary classes in constructor)
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('cv'); 
        $this->model = new Vendor();
        $this->mailer = new Mailer(); 
    }
    
    // ベンダー申請を処理するメソッド (Method to handle vendor application)
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_rep_name' => 'required',     
            's_situation' => 'required'     
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            
            $docId = $this->model->createDocument($data);
            
            if (!empty($files['estimate_file'])) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            // --- メール通知 開始 --- (Start email notification)
            $newDoc = $this->model->find($docId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $docId,
                    $newDoc['s_approved_1'],      // 承認者1へ (Approver 1)
                    $request['user']['name'],     // 申請者より (Applicant's name)
                    $data['s_name']               // タイトル（ベンダー名） (Title (Vendor name))
                );
            }
            // --- メール通知 終了 --- (End email notification)
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'ベンダー申請が正常に送信されました'
            ];
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ベンダー申請の詳細を取得するメソッド (Method to get details of a vendor application)
    public function show($request) {
        $id = $request['params']['id'];
        $doc = $this->model->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return ['success' => false, 'error' => 'ドキュメントが見つかりません'];
        }
        
        $userModel = new User();
        $applicant = $userModel->findByEmployeeId($doc['s_applied']);
        $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        
        return ['success' => true, 'data' => $doc];
    }
}
?>