<?php
class VendorController {
    private $validator;
    private $fileUpload;
    private $model;
    
    public function __construct() {
        $this->validator = new Validator();
        // PDF Hal 25: Folder 'cv'
        $this->fileUpload = new FileUpload('cv'); 
        $this->model = new Vendor();
    }
    
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        // Validasi Dasar (PDF Hal 20-21)
        $rules = [
            's_name' => 'required|max:100', // Nama Dagang
            's_kana' => 'required|max:100',
            's_rep_name' => 'required',     // Nama Perwakilan
            's_situation' => 'required'     // Latar belakang
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'errors' => $validation['errors']]);
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            
            // Create Document
            $docId = $this->model->createDocument($data);
            
            // Handle File Uploads (Folder: files/cv/{docId}/)
            if (!empty($files['estimate_file'])) {
                $this->fileUpload->save($files['estimate_file'], $docId . '/見積書');
            }
            
            return json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Pengajuan vendor berhasil disimpan'
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function show($request) {
        $id = $request['params']['id'];
        $doc = $this->model->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return json_encode(['success' => false, 'error' => 'Dokumen tidak ditemukan']);
        }
        
        $userModel = new User();
        $doc['applicant_name'] = $userModel->findByEmployeeId($doc['s_applied'])['s_name'] ?? '';
        
        return json_encode(['success' => true, 'data' => $doc]);
    }
}
?>