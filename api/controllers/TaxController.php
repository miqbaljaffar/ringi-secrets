<?php
class TaxController {
    private $validator;
    private $fileUpload;
    private $taxModel;
    
    public function __construct() {
        $this->validator = new Validator();
        // Upload path 'ct' sesuai PDF
        $this->fileUpload = new FileUpload('ct'); 
        $this->taxModel = new Tax();
    }
    
    public function store($request) {
        $data = $_POST;
        $files = $_FILES;
        
        // Aturan validasi sesuai PDF Hal 3-6 (Yang merah = mandatory)
        $rules = [
            'n_type' => 'required|in:1,2',
            's_name' => 'required|max:100',
            's_kana' => 'required|max:100',
            's_office_address' => 'required',
            's_office_tel' => 'required',
            's_rep_name' => 'required',
            'n_closing_month' => 'required|numeric|min:1|max:12',
            's_tax_office' => 'required',
            's_tax_num' => 'required',
            's_incharge' => 'required', // Penanggung jawab internal
            's_situation' => 'required' // Latar belakang
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'errors' => $validation['errors']]);
        }
        
        try {
            // Set User Login
            $data['s_applied'] = $request['user']['id'];
            
            // Format Data Khusus
            // Gabung no telp jika dikirim terpisah
            if (isset($data['tel1']) && isset($data['tel2']) && isset($data['tel3'])) {
                $data['s_office_tel'] = $data['tel1'] . '-' . $data['tel2'] . '-' . $data['tel3'];
            }
            
            // Generate Document
            $docId = $this->taxModel->createDocument($data);
            
            // Handle File Uploads (Estimasi)
            if (!empty($files['estimate_file'])) {
                $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
            }
            
            return json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Pengajuan kontrak pajak berhasil.'
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    
    public function show($request) {
        $id = $request['params']['id'];
        $doc = $this->taxModel->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return json_encode(['success' => false, 'error' => 'Dokumen tidak ditemukan']);
        }
        
        $userModel = new User();
        $applicant = $userModel->findByEmployeeId($doc['s_applied']);
        $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        
        return json_encode(['success' => true, 'data' => $doc]);
    }
}
?>