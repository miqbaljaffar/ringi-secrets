<?php
class OtherContractController {
    private $validator;
    private $model;

    // その他契約書の新規申請を処理する (Handle new other contract application)
    public function __construct() {
        $this->validator = new Validator();
        $this->model = new OtherContract();
    }
    
    // その他契約書の新規申請を保存する (Store new other contract application)
    public function store($request) {
        $data = $_POST;
        
        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_rep_name' => 'required',
            's_office_address' => 'required',
            's_office_tel' => 'required',
            'dt_contract_start' => 'required|date'
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'errors' => $validation['errors']];
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            
            $docId = $this->model->createDocument($data);
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Other contract application submitted successfully'
            ];
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // その他契約書の詳細を取得する (Get details of other contract)
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