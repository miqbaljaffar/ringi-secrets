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
    
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
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
            
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                try {
                    $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
                } catch (Exception $fileEx) {
                    error_log("Upload 見積書 gagal: " . $fileEx->getMessage());
                }
            }

            if (!empty($files['attachment']) && $files['attachment']['error'] === UPLOAD_ERR_OK) {
                try {
                    $this->fileUpload->save($files['attachment'], $docId);
                } catch (Exception $fileEx) {
                    error_log("Upload file tambahan gagal: " . $fileEx->getMessage());
                }
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
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Aplikasi kontrak dan file berhasil dikirim'
            ];
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

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