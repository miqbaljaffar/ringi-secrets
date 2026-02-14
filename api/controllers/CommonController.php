<?php
require_once __DIR__ . '/../utils/Mailer.php';

class CommonController {
    private $commonModel;
    private $detailModel;
    private $validator;
    private $fileUpload;
    private $mailer; // Property Mailer
    
    public function __construct() {
        $this->commonModel = new Common();
        $this->detailModel = new CommonDetail();
        $this->validator = new Validator();
        $this->fileUpload = new FileUpload('ar');
        $this->mailer = new Mailer(); // Inisialisasi Mailer
    }
    
    // ... (Method index tetap sama) ...
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
                'error' => 'Server Error'
            ];
        }
    }
    
    // ... (Method filterByTab tetap sama) ...
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
    
    // ... (Method show tetap sama) ...
    public function show($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'No ID provided'];
        }
        
        try {
            $document = $this->commonModel->find($docId);
            if (!$document) {
                http_response_code(API_NOT_FOUND);
                return ['success' => false, 'error' => 'Not found'];
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
                'error' => 'Server Error'
            ];
        }
    }
    
    // MODIFIKASI: Method store dengan Notifikasi Email (Apply -> Approver)
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
            
            // --- NOTIFIKASI EMAIL START ---
            // Ambil data dokumen yang baru dibuat untuk mendapatkan ID Approver 1
            $newDoc = $this->commonModel->find($docId);
            if ($newDoc && !empty($newDoc['s_approved_1'])) {
                $this->mailer->sendRequestNotification(
                    $docId,
                    $newDoc['s_approved_1'],      // Ke Approver 1
                    $request['user']['name'],     // Dari Nama Pemohon
                    $data['s_title']              // Judul
                );
            }
            // --- NOTIFIKASI EMAIL END ---
            
            return [
                'success' => true,
                'doc_id' => $docId,
                'message' => 'Pengajuan berhasil dikirim.'
            ];
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return [
                'success' => false,
                'error' => 'Gagal menyimpan pengajuan: ' . $e->getMessage()
            ];
        }
    }
    
    // ... (Method update tetap sama) ...
    public function update($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;

        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'ID Required'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['s_memo']) && class_exists('AuthMiddleware')) {
            AuthMiddleware::requireRole(ROLE_ADMIN, $request);
        }
        
        try {
            $result = $this->commonModel->update($docId, $data);
            
            // Opsional: Jika admin update memo, bisa kirim notifikasi di sini (sesuai dokumen: Update Keterangan -> Notifikasi semua)
            // Namun untuk fokus perbaikan utama, kita fokus pada Approve/Reject dulu.
            
            if ($result) {
                return ['success' => true, 'message' => 'Update berhasil.'];
            } else {
                return ['success' => false, 'error' => 'Update gagal.'];
            }
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => 'Server Error'];
        }
    }
    
    // MODIFIKASI: Method approve dengan Notifikasi Email (Approve/Reject -> Applicant/Next Approver)
    public function approve($request) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['doc_id']) || !isset($data['action'])) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'Parameter tidak lengkap.'];
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
                default: throw new Exception('Tipe dokumen tidak diketahui.');
            }

            $result = $targetModel->approve(
                $docId,
                $request['user']['id'],
                $data['action'],
                $data['comment'] ?? ''
            );
            
            if ($result) {
                // --- NOTIFIKASI EMAIL START ---
                // Ambil data dokumen TERBARU setelah update DB
                $updatedDoc = $targetModel->find($docId);
                
                // Ambil data untuk email
                $applicantId = $updatedDoc['s_applied'];
                $approverName = $request['user']['name'];
                
                // Judul berbeda tergantung tipe dokumen
                $title = $updatedDoc['s_title'] ?? $updatedDoc['s_name'] ?? 'Dokumen'; 

                if ($data['action'] === 'approve') {
                    // Cek apakah ini baru tahap 1 dan masih butuh tahap 2?
                    if (!empty($updatedDoc['dt_approved_1']) && empty($updatedDoc['dt_approved_2']) && !empty($updatedDoc['s_approved_2'])) {
                        // Kasus: Disetujui Approver 1 -> Kirim email ke Approver 2
                        // Ambil nama pemohon (perlu query user, atau gunakan ID sementara)
                        $applicantName = $updatedDoc['applicant_name'] ?? $applicantId; // Fallback jika join belum ada
                        if (class_exists('User')) {
                             $uModel = new User();
                             $appUser = $uModel->findByEmployeeId($applicantId);
                             if($appUser) $applicantName = $appUser['s_name'];
                        }

                        $this->mailer->sendRequestNotification(
                            $docId,
                            $updatedDoc['s_approved_2'], // Ke Approver 2
                            $applicantName, 
                            $title . " (Telah disetujui Tahap 1)"
                        );
                    } else {
                        // Kasus: Disetujui Final (oleh Approver 2 ATAU Approver 1 jika tidak ada Approver 2)
                        // Kirim notifikasi SUKSES ke Pemohon
                        $this->mailer->sendResultNotification(
                            $docId,
                            $applicantId,
                            'approved',
                            $approverName,
                            $data['comment'] ?? ''
                        );
                    }
                } elseif ($data['action'] === 'reject') {
                    // Kasus: Ditolak -> Kirim notifikasi DITOLAK ke Pemohon
                    $this->mailer->sendResultNotification(
                        $docId,
                        $applicantId,
                        'rejected',
                        $approverName,
                        $data['comment'] ?? ''
                    );
                }
                // --- NOTIFIKASI EMAIL END ---

                return ['success' => true, 'message' => 'Proses persetujuan berhasil.'];
            } else {
                return ['success' => false, 'error' => 'Gagal memproses persetujuan.'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => 'Server Error: ' . $e->getMessage()];
        }
    }
    
    // ... (Method withdraw tetap sama) ...
    public function withdraw($request) {
        $docId = $request['params']['id'] ?? $_GET['id'] ?? null;
        
        if (!$docId) {
            http_response_code(API_BAD_REQUEST);
            return ['success' => false, 'error' => 'No ID'];
        }
        
        try {
             $prefix = strtoupper(substr($docId, 0, 2));
             $targetModel = ($prefix === 'AR') ? $this->commonModel : null;
             
             if(!$targetModel && $prefix == 'CT') $targetModel = new Tax();
             if(!$targetModel && $prefix == 'CO') $targetModel = new OtherContract();
             if(!$targetModel && $prefix == 'CV') $targetModel = new Vendor();

             if(!$targetModel) throw new Exception('Invalid Type');

            if(method_exists($targetModel, 'withdraw')) {
                $result = $targetModel->withdraw($docId, $request['user']['id']);
            } else {
                $doc = $targetModel->find($docId);
                if($doc['s_applied'] !== $request['user']['id']) throw new Exception('Unauthorized');
                if(!empty($doc['dt_approved_1'])) throw new Exception('Cannot withdraw approved doc');
                $result = $targetModel->delete($docId);
            }
            
            if ($result) {
                return ['success' => true, 'message' => 'Pengajuan ditarik.'];
            } else {
                return ['success' => false, 'error' => 'Gagal menarik pengajuan.'];
            }
            
        } catch (Throwable $e) {
            http_response_code(API_SERVER_ERROR);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // ... (Method getCategories tetap sama) ...
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
            return ['success' => false, 'error' => 'Error fetching categories'];
        }
    }
}
?>