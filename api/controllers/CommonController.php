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
            
            // タブ別フィルタリング
            if ($filters['tab'] !== 'all') {
                $documents = array_filter($documents, function($doc) use ($filters, $request) {
                    return $this->filterByTab($doc, $filters['tab'], $request['user']);
                });
            }
            
            return json_encode([
                'success' => true,
                'data' => array_values($documents),
                'count' => count($documents)
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    private function filterByTab($document, $tab, $user) {
        $status = $this->commonModel->getStatus($document);
        
        switch ($tab) {
            case 'all':
                return true;
                
            case 'pending':
                return $status === 'pending' || $status === 'pending_second';
                
            case 'approved':
                return $status === 'approved';
                
            case 'rejected':
                return $status === 'rejected' || $status === 'withdrawn';
                
            case 'to_approve':
                // 自分が承認者である文書
                return ($document['s_approved_1'] === $user['id'] && empty($document['dt_approved_1'])) ||
                       ($document['s_approved_2'] === $user['id'] && empty($document['dt_approved_2']));
                
            default:
                return true;
        }
    }
    
    public function show($request) {
        $docId = $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'error' => '文書IDが必要です']);
        }
        
        try {
            $document = $this->commonModel->find($docId);
            
            if (!$document) {
                http_response_code(API_NOT_FOUND);
                return json_encode(['success' => false, 'error' => '文書が見つかりません']);
            }
            
            // 詳細情報取得
            $details = $this->detailModel->getByDocument($docId);
            $document['details'] = $details;
            
            // 申請者・承認者情報取得
            $userModel = new User();
            $document['applicant_info'] = $userModel->findByEmployeeId($document['s_applied']);
            $document['approver1_info'] = $document['s_approved_1'] ? 
                $userModel->findByEmployeeId($document['s_approved_1']) : null;
            $document['approver2_info'] = $document['s_approved_2'] ? 
                $userModel->findByEmployeeId($document['s_approved_2']) : null;
            
            return json_encode([
                'success' => true,
                'data' => $document
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public function store($request) {
        // マルチパートフォームデータ処理
        if ($_SERVER['CONTENT_TYPE'] === 'application/x-www-form-urlencoded' || 
            strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
            $data = $_POST;
            $files = $_FILES;
        } else {
            $data = json_decode(file_get_contents('php://input'), true);
            $files = [];
        }
        
        // バリデーション
        $validation = $this->validator->validate($data, [
            'n_type' => 'required|in:1,2',
            's_title' => 'required|max:30',
            'dt_deadline' => 'required|date',
            's_overview' => 'required',
            'details' => 'required'
        ]);
        
        if (!$validation['valid']) {
            http_response_code(API_BAD_REQUEST);
            return json_encode([
                'success' => false,
                'errors' => $validation['errors']
            ]);
        }
        
        try {
            // 申請者情報追加
            $data['s_applied'] = $request['user']['id'];
            
            // ファイルアップロード処理
            if (!empty($files['attachment'])) {
                $docId = $this->commonModel->generateDocId(); // 一時的なID生成
                $filename = $this->fileUpload->save($files['attachment'], $docId);
                $data['s_file'] = $filename;
            }
            
            // 詳細データのデコード
            if (is_string($data['details'])) {
                $data['details'] = json_decode($data['details'], true);
            }
            
            // 文書作成
            $docId = $this->commonModel->createDocument($data);
            
            // メール通知
            $this->sendNotification($docId, 'created');
            
            return json_encode([
                'success' => true,
                'doc_id' => $docId,
                'message' => '申請が完了しました'
            ]);
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public function update($request) {
        $docId = $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'error' => '文書IDが必要です']);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // 備考更新のみ管理者権限
        if (isset($data['s_memo'])) {
            AuthMiddleware::requireRole(ROLE_ADMIN, $request);
        }
        
        try {
            $result = $this->commonModel->update($docId, $data);
            
            if ($result) {
                return json_encode([
                    'success' => true,
                    'message' => '更新が完了しました'
                ]);
            } else {
                return json_encode([
                    'success' => false,
                    'error' => '更新に失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public function approve($request) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['doc_id']) || !isset($data['action'])) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'error' => '必要なパラメータが不足しています']);
        }
        
        try {
            $result = $this->commonModel->approve(
                $data['doc_id'],
                $request['user']['id'],
                $data['action'],
                $data['comment'] ?? ''
            );
            
            if ($result) {
                // 通知送信
                $this->sendNotification($data['doc_id'], $data['action']);
                
                return json_encode([
                    'success' => true,
                    'message' => '処理が完了しました'
                ]);
            } else {
                return json_encode([
                    'success' => false,
                    'error' => '処理に失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public function withdraw($request) {
        $docId = $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return json_encode(['success' => false, 'error' => '文書IDが必要です']);
        }
        
        try {
            $result = $this->commonModel->withdraw($docId, $request['user']['id']);
            
            if ($result) {
                $this->sendNotification($docId, 'withdrawn');
                
                return json_encode([
                    'success' => true,
                    'message' => '取下げが完了しました'
                ]);
            } else {
                return json_encode([
                    'success' => false,
                    'error' => '取下げに失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            http_response_code(API_SERVER_ERROR);
            return json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    private function sendNotification($docId, $action) {
        // メール送信ロジック
        // 実際の実装ではPHPMailerなどのライブラリを使用
        error_log("Notification: Document {$docId} - Action: {$action}");
    }
    
    public function getCategories() {
        $db = DB::getInstance();
        $sql = "SELECT * FROM tm_category WHERE dt_delete IS NULL ORDER BY s_category";
        $categories = $db->fetchAll($sql);
        
        return json_encode([
            'success' => true,
            'data' => $categories
        ]);
    }
}
?>