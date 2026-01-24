<?php
class TaxController {
    private $validator;
    private $fileUpload;
    private $taxModel;
    
    public function __construct() {
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('ct'); 
        $this->taxModel = new Tax();
    }
    
    public function store($request) {
        // 1. Ambil Data
        $data = $_POST;
        $files = $_FILES;
        
        // Gabungkan nomor telepon
        if (isset($data['tel1']) && isset($data['tel2']) && isset($data['tel3'])) {
            $data['s_office_tel'] = $data['tel1'] . '-' . $data['tel2'] . '-' . $data['tel3'];
        }
        
        // Validasi Rules
        $rules = [
            'n_type' => 'required|in:1,2',
            's_name' => 'required|max:100',
            's_office_address' => 'required|max:100',
            's_office_tel' => 'required|max:13',
            's_rep_name' => 'required|max:30',
            's_rep_title' => 'required', 
            's_rep_email' => 'required|email|max:100',
            'dt_rep_birth' => 'required|date',
            'dt_contract_start' => 'required|date',
            'n_closing_month' => 'required|numeric|min:1|max:12',
            's_tax_office' => 'required|max:20',
            's_tax_num' => 'required|max:8',
            'n_send_to' => 'required'
        ];
        
        $validation = $this->validator->validate($data, $rules);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode([
                'success' => false, 
                'errors' => $validation['errors'],
                'message' => 'Validasi gagal.'
            ]);
        }
        
        try {
            if (!isset($request['user']['id'])) {
                $data['s_applied'] = '0000'; 
            } else {
                $data['s_applied'] = $request['user']['id'];
            }
            
            // Simpan Database
            $docId = $this->taxModel->createDocument($data);
            
            // Upload File
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                try {
                    $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
                } catch (Exception $fileEx) {
                    error_log("File upload warning: " . $fileEx->getMessage());
                }
            }
            
            return json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Berhasil disimpan.'
            ]);
            
        } catch (Exception $e) {
            // [CRITICAL FIX] Handle Encoding Error untuk JSON
            $msg = $e->getMessage();
            
            // Coba bersihkan string jika mengandung karakter aneh yg bikin json_encode return false
            if (!mb_detect_encoding($msg, 'UTF-8', true)) {
                $msg = mb_convert_encoding($msg, 'UTF-8', 'SJIS, EUC-JP, JIS, ASCII');
            }

            error_log("TaxController Error: " . $msg);
            http_response_code(API_SERVER_ERROR);
            
            // Pastikan return JSON yang valid
            $response = [
                'success' => false, 
                'error' => 'Server Error: ' . $msg
            ];
            
            $json = json_encode($response);
            if ($json === false) {
                // Fallback jika JSON encode masih gagal
                return '{"success":false, "error":"JSON Encoding Error: ' . json_last_error_msg() . '"}';
            }
            return $json;
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