<?php
// [PERBAIKAN] Ini adalah Controller, bukan Model.
// Pastikan kelas Model 'OtherContract' ada di folder models/OtherContract.php

class OtherContractController {
    private $validator;
    private $model;
    
    public function __construct() {
        $this->validator = new Validator();
        // Instansiasi Model OtherContract
        $this->model = new OtherContract();
    }
    
    public function store($request) {
        $data = $_POST;
        // Handle file uploads jika ada (sesuai kebutuhan)
        // $files = $_FILES; 
        
        // Validasi dasar
        $rules = [
            's_name' => 'required|max:100', // Nama Dagang/Perusahaan
            's_kana' => 'required|max:100',
            's_rep_name' => 'required',
            's_office_address' => 'required',
            's_office_tel' => 'required',
            'dt_contract_start' => 'required|date'
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'errors' => $validation['errors']]);
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            
            // Create Document via Model
            $docId = $this->model->createDocument($data);
            
            // Handle File Uploads jika diperlukan (contoh 'estimate_file')
            // if (!empty($files['estimate_file'])) { ... }
            
            return json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Other contract application submitted successfully'
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function show($request) {
        // [PERBAIKAN] Gunakan params dari routing
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'error' => 'ID Required']);
        }

        try {
            $doc = $this->model->find($id);
            
            if (!$doc) {
                http_response_code(API_NOT_FOUND);
                return json_encode(['success' => false, 'error' => 'Document not found']);
            }
            
            // Tambahkan info pelamar
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
            
            // Tambahkan info approver
            $doc['approver1_info'] = $doc['s_approved_1'] ? $userModel->findByEmployeeId($doc['s_approved_1']) : null;
            $doc['approver2_info'] = $doc['s_approved_2'] ? $userModel->findByEmployeeId($doc['s_approved_2']) : null;
            
            return json_encode(['success' => true, 'data' => $doc]);

        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
?>