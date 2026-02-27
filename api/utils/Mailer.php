<?php
require_once __DIR__ . '/../models/User.php';

class Mailer {
    private $userModel;
    private $fromEmail = 'system@ringi.local';
    private $appName = '稟議管理システム';

    public function __construct() {
        $this->userModel = new User();
        mb_language("uni");
        mb_internal_encoding("UTF-8");
    }

    // 承認依頼の通知を送信する (Send approval request notification)
    public function sendRequestNotification($docId, $approverId, $applicantName, $title) {
        $approver = $this->userModel->findByEmployeeId($approverId);

        if (!$approver || empty($approver['s_email'])) {
            error_log("Mailer: 承認者のメールアドレスが見つかりません。ID: $approverId");
            return false;
        }

        $subject = "[{$this->appName}] 新しい承認依頼: $docId";

        $body  = $approver['s_name'] . " 様\n\n";
        $body .= "新しい承認依頼が届いています。\n\n";
        $body .= "文書番号: $docId\n";
        $body .= "申請者: $applicantName\n";
        $body .= "件名: $title\n\n";
        $body .= "システムにログインして、内容をご確認の上、承認をお願いいたします。\n";

        return $this->send($approver['s_email'], $subject, $body);
    }

    // 承認結果の通知を送信する (Send approval result notification)
    public function sendResultNotification($docId, $applicantId, $status, $approverName, $comment = '') {
        $applicant = $this->userModel->findByEmployeeId($applicantId);

        if (!$applicant || empty($applicant['s_email'])) {
            error_log("Mailer: 申請者のメールアドレスが見つかりません。ID: $applicantId");
            return false;
        }

        $statusText = ($status === 'approved' || $status === 'completed') ? '【承認】' : '【却下】';
        $subject = "[{$this->appName}] 文書ステータス更新 $statusText: $docId";

        $body  = $applicant['s_name'] . " 様\n\n";
        $body .= "ご申請いただいた文書のステータスが更新されました。\n\n";
        $body .= "文書番号: $docId\n";
        $body .= "ステータス: $statusText\n";
        $body .= "処理者: $approverName\n";

        if (!empty($comment)) {
            $body .= "コメント: $comment\n";
        }

        $body .= "\n詳細はシステムにログインしてご確認ください。\n";

        return $this->send($applicant['s_email'], $subject, $body);
    }

    // メモ更新の通知を送信する (Send memo update notification)
    public function sendMemoUpdateNotification($docId, $targetUserId, $updaterName, $newMemo) {
        $targetUser = $this->userModel->findByEmployeeId($targetUserId);

        if (!$targetUser || empty($targetUser['s_email'])) {
            return false;
        }

        $subject = "[{$this->appName}] 文書のメモ更新: $docId";

        $body  = $targetUser['s_name'] . " 様\n\n";
        $body .= "管理者によって以下の文書のメモが更新されました。\n\n";
        $body .= "文書番号: $docId\n";
        $body .= "更新者: $updaterName (管理者)\n";
        $body .= "新しいメモ内容:\n";
        $body .= "--------------------------------------------------\n";
        $body .= $newMemo . "\n";
        $body .= "--------------------------------------------------\n";
        $body .= "\n詳細はシステムにログインしてご確認ください。\n";

        return $this->send($targetUser['s_email'], $subject, $body);
    }

    // メール送信の共通処理 (Common email sending logic)
    private function send($to, $subject, $body) {
        // ヘッダー設定
        $headers = "From: " . mb_encode_mimeheader($this->appName) . " <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        if (mb_send_mail($to, $subject, $body, $headers)) {
            return true;
        } else {
            error_log("Mailer: メール送信に失敗しました。宛先: $to");
            return false;
        }
    }
}
?>