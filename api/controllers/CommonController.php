<?php
class CommonController {
    private $commonModel;
    private $detailModel;
    private $validator;
    private $fileUpload;
    
    public function __construct() {
        $this->commonModel = new Common();
        $this->detailModel = new CommonDetail();
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('ar');
    }
    
    // ドキュメントの一覧を取得する (Get list of documents with filters)
    public function index($request) {
        $filters = [
            'type' => $_GET['type'] ?? null,
            'category' => $_GET['category'] ?? null,
            'applicant' => $_GET['applicant'] ?? null,
            'keyword' => $_GET['keyword'] ?? null,
            'status' => $_GET['status'] ?? 'all',
            'tab' => $_GET['tab'] ?? 'all'
        ];
        
        try {
            $documents = $this->commonModel->search($filters, $request['user']);
            
            if ($filters['tab'] !== 'all') {
                $documents = array_filter($documents, function($doc) use ($filters, $request) {
                    return $this->filterByTab($doc, $filters['tab'], $request['user']);
                });
            }
            
            return [
                'success' => true,
                'data' => array_values($documents),
                'count' => count($documents)
            ];
            
        } catch (Throwable $e) { 
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => 'サーバーエラーが発生しました。'
            ];
        }
    }
    
    // タブによるフィルタリング (Filter documents by tab)
    private function filterByTab($document, $tab, $user) {
        $status = $this->commonModel->getStatus($document);
        
        switch ($tab) {
            case 'all': return true;
            case 'pending': return $status === 'pending' || $status === 'pending_second';
            case 'approved': return $status === 'approved';
            case 'rejected': return $status === 'rejected' || $status === 'withdrawn';
            case 'to_approve':
                return ($document['s_approved_1'] === $user['id'] && empty($document['dt_approved_1'])) ||
                       ($document['s_approved_2'] === $user['id'] && empty($document['dt_approved_2']));
            default: return true;
        }
    }
    
    // ドキュメントの詳細を取得する (Get document details by ID)
    public function show($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ドキュメントIDが指定されていません。'];
        }
        
        try {
            $document = $this->commonModel->find($docId);
            if (!$document) {
                http_response_code(API_NOT_FOUND);
                return ['success' => false, 'error' => '該当するドキュメントが見つかりません。'];
            }
            
            $details = $this->detailModel->getByDocument($docId);
            $document['details'] = $details;
            
            if (class_exists('User')) {
                $userModel = new User();
                $document['applicant_info'] = $userModel->findByEmployeeId($document['s_applied']);
                $document['approver1_info'] = $document['s_approved_1'] ? $userModel->findByEmployeeId($document['s_approved_1']) : null;
                $document['approver2_info'] = $document['s_approved_2'] ? $userModel->findByEmployeeId($document['s_approved_2']) : null;
            } else {
                $document['applicant_info'] = ['s_name' => $document['s_applied']];
                $document['approver1_info'] = ['s_name' => $document['s_approved_1']];
                $document['approver2_info'] = ['s_name' => $document['s_approved_2']];
            }
            
            return [
                'success' => true,
                'data' => $document
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => 'サーバー処理中にエラーが発生しました。'
            ];
        }
    }
    
    // 新しいドキュメントを作成する (Create a new document)
    public function store($request) {
        if ($_SERVER['CONTENT_TYPE'] === 'application/x-www-form-urlencoded' || 
            strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
            $data = $_POST;
            $files = $_FILES;
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
            $files = [];
        }
        
        $validation = $this->validator->validate($data, [
            'n_type' => 'required|in:1,2',
            's_title' => 'required|max:30',
            'dt_deadline' => 'required|date',
            's_overview' => 'required',
            'details' => 'required'
        ]);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return [
                'success' => false,
                'errors' => $validation['errors']
            ];
        }
        
        try {
            $data['s_applied'] = $request['user']['id'];
            if (!empty($files['attachment'])) {
                $docId = $this->commonModel->generateDocId(); 
                $filename = $this->fileUpload->save($files['attachment'], $docId);
                $data['s_file'] = $filename;
            }
            if (is_string($data['details'])) {
                $data['details'] = json_decode($data['details'], true);
            }
            
            $docId = $this->commonModel->createDocument($data);
            
            return [
                'success' => true,
                'doc_id' => $docId,
                'message' => '申請が正常に送信されました。'
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => '申請の登録中にエラーが発生しました。'
            ];
        }
    }
    
    // ドキュメントを更新する (Update an existing document)
    public function update($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ドキュメントIDが必要です。'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['s_memo']) && class_exists('AuthMiddleware')) {
            AuthMiddleware::requireRole(ROLE_ADMIN, $request);
        }
        
        try {
            $result = $this->commonModel->update($docId, $data);
            if ($result) {
                return ['success' => true, 'message' => '更新が完了しました。'];
            } else {
                return ['success' => false, 'error' => '更新に失敗しました。'];
            }
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => '更新処理中にエラーが発生しました。'];
        }
    }
    
    // ドキュメントの承認を処理する (Handle document approval)
    public function approve($request) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['doc_id']) || !isset($data['action'])) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => '必要なパラメータが不足しています。'];
        }
        
        try {
            $docId = $data['doc_id'];
            $prefix = strtoupper(substr($docId, 0, 2));
            $targetModel = null;
            
            switch ($prefix) {
                case 'AR': $targetModel = $this->commonModel; break;
                case 'CT': $targetModel = new Tax(); break;
                case 'CO': $targetModel = new OtherContract(); break;
                case 'CV': $targetModel = new Vendor(); break;
                default: throw new Exception('不明なドキュメント種別です。');
            }

            $result = $targetModel->approve(
                $docId,
                $request['user']['id'],
                $data['action'],
                $data['comment'] ?? ''
            );
            
            if ($result) {
                return ['success' => true, 'message' => '承認処理が完了しました。'];
            } else {
                return ['success' => false, 'error' => '承認処理に失敗しました。'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => '承認処理中にエラーが発生しました。'];
        }
    }
    
    // ドキュメントの申請を取り下げる (Withdraw a document application)
    public function withdraw($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ドキュメントIDが指定されていません。'];
        }
        
        try {
             $prefix = strtoupper(substr($docId, 0, 2));
             $targetModel = ($prefix === 'AR') ? $this->commonModel : null;
             
             if(!$targetModel && $prefix == 'CT') $targetModel = new Tax();
             if(!$targetModel && $prefix == 'CO') $targetModel = new OtherContract();
             if(!$targetModel && $prefix == 'CV') $targetModel = new Vendor();

             if(!$targetModel) throw new Exception('このドキュメントは取り下げできません。');

            if(method_exists($targetModel, 'withdraw')) {
                $result = $targetModel->withdraw($docId, $request['user']['id']);
            } else {
                $doc = $targetModel->find($docId);
                if($doc['s_applied'] !== $request['user']['id']) throw new Exception('操作権限がありません。');
                if(!empty($doc['dt_approved_1'])) throw new Exception('承認済みのドキュメントは取り下げできません。');
                $result = $targetModel->delete($docId);
            }
            
            if ($result) {
                return ['success' => true, 'message' => '申請を取り下げました。'];
            } else {
                return ['success' => false, 'error' => '取り下げに失敗しました。'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // カテゴリ一覧を取得する (Get list of categories)
    public function getCategories() {
        try {
            $db = DB::getInstance();
            $sql = "SELECT * FROM tm_category WHERE dt_delete IS NULL ORDER BY s_category";
            $categories = $db->fetchAll($sql);
            
            return [
                'success' => true,
                'data' => $categories
            ];
        } catch (Throwable $e) {
            return ['success' => false, 'error' => 'カテゴリ取得中にエラーが発生しました。'];
        }
    }
}
?>