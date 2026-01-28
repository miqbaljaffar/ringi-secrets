<?php
class VendorController {
    private $validator;
    private $fileUpload;
    private $model;
    
    // ベンダーの新規申請を処理する (Handle new vendor application)
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('cv'); 
        $this->model = new Vendor();
    }
    
    // ベンダーの新規申請を保存する (Store new vendor application)
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
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Vendor application submitted successfully'
            ];
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ベンダーの詳細を取得する (Get details of vendor)
    public function show($request) {
        $id = $request['params']['id'];
        $doc = $this->model->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return ['success' => false, 'error' => 'Document not found'];
        }
        
        $userModel = new User();
        $applicant = $userModel->findByEmployeeId($doc['s_applied']);
        $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        
        return ['success' => true, 'data' => $doc];
    }
}
?>