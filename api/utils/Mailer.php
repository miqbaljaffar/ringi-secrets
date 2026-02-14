<?php
require_once __DIR__ . '/../models/User.php';

class Mailer {
    private $userModel;
    private $fromEmail = 'system@ringi.local'; // Ganti dengan email sistem yang valid
    private $appName = 'Sistem Manajemen Ringi';

    public function __construct() {
        $this->userModel = new User();
        // Set internal encoding untuk multibyte string (penting untuk karakter Jepang/Indonesia)
        mb_language("uni");
        mb_internal_encoding("UTF-8");
    }

    /**
     * Mengirim notifikasi permintaan persetujuan ke Approver
     */
    public function sendRequestNotification($docId, $approverId, $applicantName, $title) {
        $approver = $this->userModel->findByEmployeeId($approverId);
        
        if (!$approver || empty($approver['s_email'])) {
            error_log("Mailer: Email approver tidak ditemukan untuk ID $approverId");
            return false;
        }

        $subject = "[{$this->appName}] Permintaan Persetujuan Baru: $docId";
        
        $body  = "Yth. " . $approver['s_name'] . ",\n\n";
        $body .= "Anda memiliki permintaan persetujuan baru.\n\n";
        $body .= "No Dokumen: $docId\n";
        $body .= "Pemohon: $applicantName\n";
        $body .= "Judul/Perihal: $title\n\n";
        $body .= "Silakan login ke sistem untuk memeriksa dan memberikan persetujuan.\n";
        
        return $this->send($approver['s_email'], $subject, $body);
    }

    /**
     * Mengirim notifikasi hasil (Disetujui/Ditolak) ke Pemohon
     */
    public function sendResultNotification($docId, $applicantId, $status, $approverName, $comment = '') {
        $applicant = $this->userModel->findByEmployeeId($applicantId);

        if (!$applicant || empty($applicant['s_email'])) {
            error_log("Mailer: Email pemohon tidak ditemukan untuk ID $applicantId");
            return false;
        }

        $statusText = ($status === 'approved' || $status === 'completed') ? 'DISETUJUI (Approved)' : 'DITOLAK (Rejected)';
        $subject = "[{$this->appName}] Status Dokumen $statusText: $docId";

        $body  = "Yth. " . $applicant['s_name'] . ",\n\n";
        $body .= "Dokumen pengajuan Anda telah diperbarui.\n\n";
        $body .= "No Dokumen: $docId\n";
        $body .= "Status: $statusText\n";
        $body .= "Oleh: $approverName\n";
        
        if (!empty($comment)) {
            $body .= "Komentar: $comment\n";
        }
        
        $body .= "\nSilakan login ke sistem untuk detail lebih lanjut.\n";

        return $this->send($applicant['s_email'], $subject, $body);
    }

    /**
     * Fungsi dasar pengiriman email
     */
    private function send($to, $subject, $body) {
        // Header
        $headers = "From: " . mb_encode_mimeheader($this->appName) . " <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // Menggunakan mb_send_mail agar aman untuk karakter non-ASCII
        if (mb_send_mail($to, $subject, $body, $headers)) {
            return true;
        } else {
            error_log("Mailer: Gagal mengirim email ke $to");
            return false;
        }
    }
}
?>