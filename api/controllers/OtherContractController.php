<?php
class OtherContractController {
    private $validator;
    private $fileUpload;
    private $model;
    
    public function __construct() {
        $this->validator = new Validator();
        // PDF Hal 25: Folder 'co'
        $this->fileUpload = new FileUpload('co'); 
        $this->model = new OtherContract();
    }
    
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        // Validasi Dasar (PDF Hal 18-20 - Red Text is Required)
        $rules = [
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_industry' => 'required',
            's_rep_name' => 'required',
            'dt_contract_start' => 'required|date',
            's_incharge' => 'required', // 顧客担当者
            's_situation' => 'required' // 経緯
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'errors' => $validation['errors']]);
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            
            // Generate ID dulu untuk nama file (opsional, tapi good practice)
            // Di sini kita biarkan model generate ID, file upload pakai temp name dulu atau logic lain.
            // Untuk simplicity, kita upload file dulu.
            
            // Upload Estimasi (PDF: "見積書(PDF)")
            // Disimpan sebagai "見積書.pdf" di folder ID nanti, atau unik di sini.
            // Karena kita belum punya ID Doc, kita simpan lalu nanti return ID untuk referensi folder
            
            // LOGIC SIMPLIFIKASI: Create Doc dulu baru pindahkan file, 
            // atau biarkan FileUpload handle rename.
            
            // Create Document
            $docId = $this->model->createDocument($data);
            
            // Handle File Uploads (Folder: files/co/{docId}/)
            if (!empty($files['estimate_file'])) {
                $this->fileUpload->save($files['estimate_file'], $docId . '/見積書'); // Save as 見積書.pdf
            }
            
            if (!empty($files['other_files'])) {
                $this->fileUpload->saveMultiple($files['other_files'], $docId);
            }
            
            return json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Pengajuan kontrak berhasil disimpan'
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
        
        // Tambah info user
        $userModel = new User();
        $doc['applicant_name'] = $userModel->findByEmployeeId($doc['s_applied'])['s_name'] ?? '';
        
        return json_encode(['success' => true, 'data' => $doc]);
    }
}
?>