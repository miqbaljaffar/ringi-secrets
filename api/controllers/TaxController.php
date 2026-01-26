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
        // [FIX No. 2] Hapus ini_set('display_errors', 0); biarkan index.php yang handle.

        try {
            // 1. Ambil Data
            $data = $request['body'] ?? $_POST; 
            $files = $request['files'] ?? $_FILES;
            
            if (empty($data) && !empty($_POST)) {
                $data = $_POST;
            }

            // Gabungkan nomor telepon
            $tel1 = $data['tel1'] ?? '';
            $tel2 = $data['tel2'] ?? '';
            $tel3 = $data['tel3'] ?? '';
            
            if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
                $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
            } else {
                $data['s_office_tel'] = $data['s_office_tel'] ?? '';
            }
            
            // [FIX No. 3] Validasi Strict Diaktifkan Kembali (Sesuai PDF Hal 15)
            $rules = [
                'n_type' => 'required|in:1,2',
                's_name' => 'required|max:100',
                's_office_address' => 'required|max:100',
                's_rep_name' => 'required|max:50',
                's_rep_title' => 'required',
                'dt_contract_start' => 'required|date',
                
                // Validasi Ketat (Regex)
                's_industry_type' => 'required|regex:/^[A-T][0-9]{2}[0-9]$/', // Format A011
                's_office_pcode' => 'required|regex:/^[0-9]{7}$/', // 7 digit angka tanpa strip
                's_tax_num' => 'required|regex:/^[0-9]{8}$/' // 8 digit angka
            ];
            
            // Validasi tambahan untuk Telepon (Format angka dengan strip)
            // 's_office_tel' => 'required|regex:/^[0-9]{2,5}-[0-9]{1,4}-[0-9]{4}$/'
            
            $validation = $this->validator->validate($data, $rules);
            
            if (!$validation['valid']) {
                http_response_code(API_BAD_REQUEST);
                // [FIX No. 1] Return array, jangan echo
                return [
                    'success' => false, 
                    'errors' => $validation['errors'],
                    'message' => 'Validasi gagal'
                ];
            }
            
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
            
            // [FIX No. 1] Return Array
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Berhasil disimpan.'
            ];
            
        } catch (Throwable $e) {
            // Biarkan index.php menangkap Exception global, atau return format error khusus disini
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false, 
                'error' => 'Server Error: ' . $e->getMessage()
            ];
        }
    }
    
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
             http_response_code(API_BAD_REQUEST);
             return ['success' => false, 'error' => 'ID Required'];
        }

        $doc = $this->taxModel->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return ['success' => false, 'error' => 'Dokumen tidak ditemukan'];
        }
        
        if (class_exists('User')) {
            $userModel = new User();
            $applicant = $userModel->findByEmployeeId($doc['s_applied']);
            $doc['applicant_name'] = $applicant ? $applicant['s_name'] : $doc['s_applied'];
        }
        
        return ['success' => true, 'data' => $doc];
    }
}
?>