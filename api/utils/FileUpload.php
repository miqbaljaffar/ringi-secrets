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
    
    // ファイルを保存するメソッド (Save file method)
    public function save($file, $docId, $customName = null) {
        $this->validate($file);
        
        if (!$this->basePath) {
            throw new Exception("設定エラー: UPLOAD_PATHが定義されていません。");
        }

        $targetDir = $this->basePath . '/' . $this->subDirectory . '/' . $docId;
        
        if (!file_exists($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                throw new Exception("ディレクトリの作成に失敗しました: " . $targetDir);
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
            throw new Exception("アップロードされたファイルの移動に失敗しました。");
        }
        
        return $filename;
    }
    
    // 複数ファイルを保存するメソッド (Save multiple files method)
    public function saveMultiple($files, $docId) {
        $savedFiles = [];
        foreach ($files as $file) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                try {
                    $savedFiles[] = $this->save($file, $docId);
                } catch (Exception $e) {
                    error_log("ファイルのアップロードに失敗: " . $e->getMessage());
                }
            }
        }
        return $savedFiles;
    }
    
    // ファイルのバリデーション (Validation of files)
    private function validate($file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors = [
                UPLOAD_ERR_INI_SIZE   => 'ファイルサイズがphp.iniのupload_max_filesize制限を超えています',
                UPLOAD_ERR_FORM_SIZE  => 'ファイルサイズがフォームのMAX_FILE_SIZE制限を超えています',
                UPLOAD_ERR_PARTIAL    => 'ファイルの一部のみがアップロードされました',
                UPLOAD_ERR_NO_FILE    => 'ファイルがアップロードされていません',
                UPLOAD_ERR_NO_TMP_DIR => '一時フォルダが存在しません',
                UPLOAD_ERR_CANT_WRITE => 'ディスクへの書き込みに失敗しました',
                UPLOAD_ERR_EXTENSION  => 'PHP拡張機能によりアップロードが中止されました'
            ];
            $msg = $errors[$file['error']] ?? '不明なエラー';
            throw new Exception("アップロードエラー: " . $msg);
        }
        
        if ($file['size'] > $this->maxSize) {
            throw new Exception("ファイルサイズが5MBの制限を超えています。");
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedExtensions)) {
            throw new Exception("PDFファイルのみ許可されています。");
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if ($mimeType !== 'application/pdf') {
            throw new Exception("MIMEタイプが無効です（PDFが必要です）。検出されたタイプ: " . $mimeType);
        }
    }
}
?>