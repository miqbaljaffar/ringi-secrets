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
        // Matikan output error text ke browser agar JSON tidak rusak
        ini_set('display_errors', 0);

        try {
            // 1. Ambil Data
            $data = $request['body'] ?? $_POST; // Prioritaskan body JSON/Parsed Body
            $files = $request['files'] ?? $_FILES;
            
            // Fallback jika $data kosong (misal FormData tidak terparsing sempurna di index.php)
            if (empty($data) && !empty($_POST)) {
                $data = $_POST;
            }

            // Gabungkan nomor telepon (Hanya jika salah satu terisi)
            $tel1 = $data['tel1'] ?? '';
            $tel2 = $data['tel2'] ?? '';
            $tel3 = $data['tel3'] ?? '';
            
            if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
                $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
            } else {
                // Jangan set null jika validasi require string
                $data['s_office_tel'] = $data['s_office_tel'] ?? '';
            }
            
            // 2. Definisi Aturan Validasi
            $rules = [
                'n_type' => 'required|in:1,2',
                's_name' => 'required|max:100',
                's_office_address' => 'required|max:100',
                // Relax validation slightly for debugging
                // 's_office_tel' => 'required|max:15', 
                's_rep_name' => 'required|max:50',
                's_rep_title' => 'required',
                'dt_contract_start' => 'required|date'
            ];
            
            $validation = $this->validator->validate($data, $rules);
            
            if (!$validation['valid']) {
                http_response_code(API_BAD_REQUEST);
                echo json_encode([
                    'success' => false, 
                    'errors' => $validation['errors'],
                    'message' => 'Validasi gagal'
                ]);
                return; // Stop execution
            }
            
            // Set User
            $data['s_applied'] = $request['user']['id'] ?? '0000';
            
            // Clean Money Fields
            $moneyFields = ['n_capital', 'n_pre_total', 'n_pre_sales', 'n_pre_debt', 'n_pre_income', 'n_rewards_tax', 'n_rewards_account'];
            foreach($moneyFields as $field) {
                if(isset($data[$field])) {
                    $data[$field] = str_replace(',', '', $data[$field]);
                }
            }
            
            // Simpan ke Database
            $docId = $this->taxModel->createDocument($data);
            
            // Upload File
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                try {
                    $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
                } catch (Exception $fileEx) {
                    error_log("File upload warning: " . $fileEx->getMessage());
                }
            }
            
            echo json_encode([
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Berhasil disimpan.'
            ]);
            
        } catch (Throwable $e) {
            error_log("TaxController Error: " . $e->getMessage());
            http_response_code(API_SERVER_ERROR);
            
            // Pastikan return JSON valid
            echo json_encode([
                'success' => false, 
                'error' => 'Server Error: ' . $e->getMessage()
            ]);
        }
    }
    
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
             http_response_code(API_BAD_REQUEST);
             echo json_encode(['success' => false, 'error' => 'ID Required']);
             return;
        }

        $doc = $this->taxModel->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            echo json_encode(['success' => false, 'error' => 'Dokumen tidak ditemukan']);
            return;
        }
        
        if (class_exists('User')) {
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        }
        
        echo json_encode(['success' => true, 'data' => $doc]);
    }
}
?>