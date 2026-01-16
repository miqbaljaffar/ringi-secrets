<?php
require_once __DIR__ . '/../../config/constants.php';

class FileUpload {
    private $allowedExtensions = ['pdf'];
    private $maxSize = 5242880; // 5MB
    private $basePath;
    private $subDirectory;
    
    /**
     * @param string $subDirectory Direktori tipe dokumen (ar, ct, co, cv)
     */
    public function __construct($subDirectory = '') {
        $this->basePath = UPLOAD_PATH; // Dari constants.php
        $this->subDirectory = strtolower($subDirectory);
    }
    
    /**
     * Simpan file ke folder spesifik ID dokumen
     * Path: /files/{tipe}/{docId}/{filename}
     */
    public function save($file, $docId, $customName = null) {
        $this->validate($file);
        
        // Struktur folder: files/ar/AR25120401/
        $targetDir = $this->basePath . '/' . $this->subDirectory . '/' . $docId;
        
        if (!file_exists($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                throw new Exception("Gagal membuat direktori penyimpanan.");
            }
        }
        
        // Tentukan nama file
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($customName) {
            $filename = $customName . '.' . $extension;
        } else {
            // Sanitasi nama file asli jika tidak ada custom name
            $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file['name']);
        }
        
        $destination = $targetDir . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception("Gagal memindahkan file yang diunggah.");
        }
        
        return $filename;
    }
    
    public function saveMultiple($files, $docId) {
        $savedFiles = [];
        foreach ($files as $file) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                try {
                    $savedFiles[] = $this->save($file, $docId);
                } catch (Exception $e) {
                    error_log("Gagal upload salah satu file: " . $e->getMessage());
                }
            }
        }
        return $savedFiles;
    }
    
    private function validate($file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Error upload: " . $file['error']);
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
            throw new Exception("MIME type tidak valid (harus PDF).");
        }
    }
}
?>