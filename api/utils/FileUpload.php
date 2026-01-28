<?php

class FileUpload {
    private $allowedExtensions = ['pdf'];
    private $maxSize = 5242880; // 5MB
    private $basePath;
    private $subDirectory;
    
    // コンストラクタでアップロードディレクトリを設定 (Constructor to set upload directory)
    public function __construct($subDirectory = '') {
        if (defined('UPLOAD_PATH')) {
            $this->basePath = UPLOAD_PATH;
        } else {
            $this->basePath = realpath(__DIR__ . '/../../files');
        }

        if (defined('MAX_FILE_SIZE')) {
            $this->maxSize = MAX_FILE_SIZE;
        }

        $this->subDirectory = strtolower($subDirectory);
    }
    
    // ファイルを保存するメソッド (Method to save file)
    public function save($file, $docId, $customName = null) {
        $this->validate($file);
        
        if (!$this->basePath) {
            throw new Exception("cnfiguration error: UPLOAD_PATH is not defined.");
        }

        $targetDir = $this->basePath . '/' . $this->subDirectory . '/' . $docId;
        
        if (!file_exists($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                throw new Exception("Failed to create directory: " . $targetDir);
            }
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($customName) {
            $filename = $customName . '.' . $extension;
        } else {
            $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
        }
        
        $destination = $targetDir . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception("Failed to move uploaded file.");
        }
        
        return $filename;
    }
    
    // 複数ファイルを保存するメソッド (Method to save multiple files)
    public function saveMultiple($files, $docId) {
        $savedFiles = [];
        foreach ($files as $file) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                try {
                    $savedFiles[] = $this->save($file, $docId);
                } catch (Exception $e) {
                    error_log("Failed to upload one file: " . $e->getMessage());
                }
            }
        }
        return $savedFiles;
    }
    
    // ファイルのバリデーション (File validation)
    private function validate($file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'Ukuran file melebihi batas upload_max_filesize di php.ini',
                UPLOAD_ERR_FORM_SIZE  => 'Ukuran file melebihi batas MAX_FILE_SIZE form',
                UPLOAD_ERR_PARTIAL    => 'File hanya terupload sebagian',
                UPLOAD_ERR_NO_FILE    => 'Tidak ada file yang diupload',
                UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary hilang',
                UPLOAD_ERR_CANT_WRITE => 'Gagal menulis ke disk',
                UPLOAD_ERR_EXTENSION  => 'Upload dihentikan oleh ekstensi PHP'
            ];
            $msg = $errors[$file['error']] ?? 'Unknown Error';
            throw new Exception("Error upload: " . $msg);
        }
        
        if ($file['size'] > $this->maxSize) {
            throw new Exception("Ukuran file melebihi batas 5MB.");
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedExtensions)) {
            throw new Exception("Hanya file PDF yang diperbolehkan.");
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if ($mimeType !== 'application/pdf') {
            throw new Exception("MIME type tidak valid (harus PDF). Deteksi: " . $mimeType);
        }
    }
}
?>