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
        
        $tel1 = $data['tel1'] ?? '';
        $tel2 = $data['tel2'] ?? '';
        $tel3 = $data['tel3'] ?? '';
        if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
            $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
        }

        $zip1 = $data['zip1'] ?? '';
        $zip2 = $data['zip2'] ?? '';
        if (empty($data['s_office_pcode']) && (!empty($zip1) || !empty($zip2))) {
            $data['s_office_pcode'] = $zip1 . $zip2;
        }

        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_office_pcode' => 'required',
            's_office_address' => 'required|max:100',
            's_office_tel' => 'required',
            'n_send_to' => 'required|in:1,2,9',
            's_rep_name' => 'required|max:30',
            's_rep_kana' => 'required|max:30',
            's_rep_title' => 'required|in:1,2,3,4,9',
            's_situation' => 'required'
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            $this->model->beginTransaction();

            $data['s_applied'] = $request['user']['id'];
            $docId = $this->model->createDocument($data);
            
            if (!empty($files['estimate_file'])) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }

            $newDoc = $this->model->find($docId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $docId,
                    $newDoc['s_approved_1'],      
                    $request['user']['name'],     
                    $data['s_name']               
                );
            }
            
            // COMMIT JIKA SUKSES
            $this->model->commit();

            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'ベンダー申請が正常に送信されました'
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