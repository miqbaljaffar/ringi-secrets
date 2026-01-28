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

        try {
            $data = $request['body'] ?? $_POST; 
            $files = $request['files'] ?? $_FILES;
            
            if (empty($data) && !empty($_POST)) {
                $data = $_POST;
            }

            $tel1 = $data['tel1'] ?? '';
            $tel2 = $data['tel2'] ?? '';
            $tel3 = $data['tel3'] ?? '';
            
            if (!empty($tel1) || !empty($tel2) || !empty($tel3)) {
                $data['s_office_tel'] = $tel1 . '-' . $tel2 . '-' . $tel3;
            } else {
                $data['s_office_tel'] = $data['s_office_tel'] ?? '';
            }
            
            $rules = [
                'n_type' => 'required|in:1,2',
                's_name' => 'required|max:100',
                's_office_address' => 'required|max:100',
                's_rep_name' => 'required|max:50',
                's_rep_title' => 'required',
                'dt_contract_start' => 'required|date',
                's_industry_type' => 'required|regex:/^[A-T][0-9]{2}[0-9]$/', 
                's_office_pcode' => 'required|regex:/^[0-9]{7}$/', 
                's_tax_num' => 'required|regex:/^[0-9]{8}$/' 
            ];
            
            
            $validation = $this->validator->validate($data, $rules);
            
            if (!$validation['valid']) {
                http_response_code(API_BAD_REQUEST);
                return [
                    'success' => false, 
                    'errors' => $validation['errors'],
                    'message' => 'Validation failed'
                ];
            }
            
            $data['s_applied'] = $request['user']['id'] ?? '0000';
            
            $moneyFields = ['n_capital', 'n_pre_total', 'n_pre_sales', 'n_pre_debt', 'n_pre_income', 'n_rewards_tax', 'n_rewards_account'];
            foreach($moneyFields as $field) {
                if(isset($data[$field])) {
                    $data[$field] = str_replace(',', '', $data[$field]);
                }
            }
            
            $docId = $this->taxModel->createDocument($data);
            
            if (!empty($files['estimate_file']) && $files['estimate_file']['error'] === UPLOAD_ERR_OK) {
                try {
                    $this->fileUpload->save($files['estimate_file'], $docId, '見積書');
                } catch (Exception $fileEx) {
                    error_log("File upload warning: " . $fileEx->getMessage());
                }
            }
            
            return [
                'success' => true, 
                'doc_id' => $docId,
                'message' => 'Tax document application submitted successfully'
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false, 
                'error' => 'Server Error: ' . $e->getMessage()
            ];
        }
    }
    
    // その他契約書の詳細を取得する (Get details of tax document)
    public function show($request) {
        $id = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$id) {
             http_response_code(API_BAD_REQUEST);
             return ['success' => false, 'error' => 'ID Required'];
        }

        $doc = $this->taxModel->find($id);
        
        if (!$doc) {
            http_response_code(API_NOT_FOUND);
            return ['success' => false, 'error' => 'Document not found'];
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