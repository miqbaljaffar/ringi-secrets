<?php
require_once __DIR__ . '/../utils/Mailer.php';
require_once __DIR__ . '/../utils/IdGenerator.php'; 

class CommonController {
    private $commonModel;
    private $detailModel;
    private $validator;
    private $fileUpload;
    private $mailer;
    
    // コンストラクタで必要なクラスを初期化 (Initialize necessary classes in constructor)
    public function __construct() {
        $this->commonModel = new Common();
        $this->detailModel = new CommonDetail();
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('ar');
        $this->mailer = new Mailer();
    }
    
    // ドキュメントの一覧を取得する (Get list of documents)
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
                'error' => 'サーバーエラー'
            ];
        }
    }
    
    // ドキュメントの詳細を取得する (Get document details)
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
    
    // ドキュメントの検索 (Search documents)
    public function show($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'IDが指定されていません'];
        }
        
        try {
            $document = $this->commonModel->find($docId);
            if (!$document) {
                http_response_code(API_NOT_FOUND);
                return ['success' => false, 'error' => '見つかりません'];
            }
            
            $details = $this->detailModel->getByDocument($docId);
            $document['details'] = $details;
            
            if (class_exists('User')) {
                $userModel = new User();
                $document['applicant_info'] = $userModel->findByEmployeeId($document['s_applied']);
                $document['approver1_info'] = $document['s_approved_1'] ? $userModel->findByEmployeeId($document['s_approved_1']) : null;
                $document['approver2_info'] = $document['s_approved_2'] ? $userModel->findByEmployeeId($document['s_approved_2']) : null;
            }
            
            return [
                'success' => true,
                'data' => $document
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => 'サーバーエラー'
            ];
        }
    }
    
    // ドキュメントの検索 (Search documents)
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
            
            $docId = IdGenerator::generate('AR', 't_common');
            $data['id_doc'] = $docId; // Modelで使用するためにデータに挿入
            
            if (!empty($files['attachment']) && $files['attachment']['error'] === UPLOAD_ERR_OK) {
                // 生成したdocIdを使用
                $filename = $this->fileUpload->save($files['attachment'], $docId);
                $data['s_file'] = $filename;
            }
            if (is_string($data['details'])) {
                $data['details'] = json_decode($data['details'], true);
            }
            
            // createDocumentは作成済みのIDを使用
            $createdDocId = $this->commonModel->createDocument($data);
            
            $newDoc = $this->commonModel->find($createdDocId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $createdDocId,
                    $newDoc['s_approved_1'],      
                    $request['user']['name'],     
                    $data['s_title']              
                );
            }
            
            return [
                'success' => true,
                'doc_id' => $createdDocId,
                'message' => '申請が正常に送信されました。'
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => '申請の保存に失敗しました: ' . $e->getMessage()
            ];
        }
    }
    
    // ドキュメントの更新 (Update document)
    public function update($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'IDが必要です'];
        }
        
        if (isset($request['user']) && class_exists('AuthMiddleware')) {
            AuthMiddleware::requireRole(ROLE_ADMIN, $request);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $prefix = strtoupper(substr($docId, 0, 2));
            $targetModel = null;
            
            switch ($prefix) {
                case 'AR': $targetModel = $this->commonModel; break;
                case 'CT': $targetModel = new Tax(); break;
                case 'CO': $targetModel = new OtherContract(); break;
                case 'CV': $targetModel = new Vendor(); break;
                default: 
                    $targetModel = $this->commonModel; 
                    break;
            }

            $result = $targetModel->update($docId, $data);
            
            if ($result) {
                if (isset($data['s_memo']) && !empty($data['s_memo'])) {
                    $docData = $targetModel->find($docId);
                    $adminName = $request['user']['name'];
                    $newMemo = $data['s_memo'];

                    $recipients = [];
                    if (!empty($docData['s_applied'])) $recipients[] = $docData['s_applied'];
                    if (!empty($docData['s_approved_1'])) $recipients[] = $docData['s_approved_1'];
                    if (!empty($docData['s_approved_2'])) $recipients[] = $docData['s_approved_2'];
                    
                    $recipients = array_unique($recipients);

                    foreach ($recipients as $recipientId) {
                        if ($recipientId !== $request['user']['id']) {
                            $this->mailer->sendMemoUpdateNotification(
                                $docId,
                                $recipientId,
                                $adminName,
                                $newMemo
                            );
                        }
                    }
                }
                
                return ['success' => true, 'message' => '更新が成功しました（メモが更新されました）。'];
            } else {
                return ['success' => false, 'error' => '更新に失敗したか、変更されたデータがありません。'];
            }
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => 'サーバーエラー: ' . $e->getMessage()];
        }
    }
    
    // ドキュメントの申請 (Submit document application)
    public function approve($request) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['doc_id']) || !isset($data['action'])) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'パラメータが不完全です。'];
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
                default: throw new Exception('不明なドキュメントタイプです。');
            }

            $result = $targetModel->approve(
                $docId,
                $request['user']['id'],
                $data['action'],
                $data['comment'] ?? ''
            );
            
            if ($result) {
                $updatedDoc = $targetModel->find($docId);
                $applicantId = $updatedDoc['s_applied'];
                $approverName = $request['user']['name'];
                $title = $updatedDoc['s_title'] ?? $updatedDoc['s_name'] ?? 'ドキュメント'; 

                if ($data['action'] === 'approve') {
                    if (!empty($updatedDoc['dt_approved_1']) && empty($updatedDoc['dt_approved_2']) && !empty($updatedDoc['s_approved_2'])) {
                        $applicantName = $updatedDoc['applicant_name'] ?? $applicantId;
                        if (class_exists('User')) {
                             $uModel = new User();
                             $appUser = $uModel->findByEmployeeId($applicantId);
                             if($appUser) $applicantName = $appUser['s_name'];
                        }
                        $this->mailer->sendRequestNotification(
                            $docId,
                            $updatedDoc['s_approved_2'], 
                            $applicantName, 
                            $title . "（第1段階承認済み）"
                        );
                    } else {
                        $this->mailer->sendResultNotification(
                            $docId,
                            $applicantId,
                            'approved',
                            $approverName,
                            $data['comment'] ?? ''
                        );
                    }
                } elseif ($data['action'] === 'reject') {
                    $this->mailer->sendResultNotification(
                        $docId,
                        $applicantId,
                        'rejected',
                        $approverName,
                        $data['comment'] ?? ''
                    );
                }

                return ['success' => true, 'message' => '承認処理が成功しました。'];
            } else {
                return ['success' => false, 'error' => '承認処理に失敗しました。'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => 'サーバーエラー: ' . $e->getMessage()];
        }
    }
    
    // ドキュメントの撤回 (Withdraw document application)
    public function withdraw($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'IDがありません'];
        }
        
        try {
             $prefix = strtoupper(substr($docId, 0, 2));
             $targetModel = ($prefix === 'AR') ? $this->commonModel : null;
             
             if(!$targetModel && $prefix == 'CT') $targetModel = new Tax();
             if(!$targetModel && $prefix == 'CO') $targetModel = new OtherContract();
             if(!$targetModel && $prefix == 'CV') $targetModel = new Vendor();

             if(!$targetModel) throw new Exception('無効なタイプです');

            if(method_exists($targetModel, 'withdraw')) {
                $result = $targetModel->withdraw($docId, $request['user']['id']);
            } else {
                $doc = $targetModel->find($docId);
                if($doc['s_applied'] !== $request['user']['id']) throw new Exception('権限がありません');
                if(!empty($doc['dt_approved_1'])) throw new Exception('承認済みのドキュメントは撤回できません');
                $result = $targetModel->delete($docId);
            }
            
            if ($result) {
                return ['success' => true, 'message' => '申請が撤回されました。'];
            } else {
                return ['success' => false, 'error' => '申請の撤回に失敗しました。'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // カテゴリの取得 (Get categories)
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
            return ['success' => false, 'error' => 'カテゴリの取得中にエラーが発生しました'];
        }
    }
}
?>