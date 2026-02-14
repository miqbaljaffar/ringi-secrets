<?php
require_once __DIR__ . '/../utils/Mailer.php';

class VendorController {
    private $validator;
    private $fileUpload;
    private $model;
    private $mailer; // Property Mailer
    
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('cv'); 
        $this->model = new Vendor();
        $this->mailer = new Mailer(); // Inisialisasi Mailer
    }
    
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

            // --- NOTIFIKASI EMAIL START ---
            $newDoc = $this->model->find($docId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $docId,
                    $newDoc['s_approved_1'],      // Ke Approver 1
                    $request['user']['name'],     // Dari Pemohon
                    $data['s_name']               // Judul (Nama Vendor)
                );
            }
            // --- NOTIFIKASI EMAIL END ---
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Aplikasi vendor berhasil dikirim'
            ];
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ... (Method show tetap sama) ...
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