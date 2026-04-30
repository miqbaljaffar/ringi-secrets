class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form'); 
        this.init(); 
    }

    init() {
        if (!this.form) return; 

        this.generateDocumentNumber(); // ドキュメント番号を生成 (Generate document number)
        this.setDefaultValues(); // デフォルト値を設定 (Set default values)
        this.bindEvents(); // イベントをバインド (Bind events)
        this.initToggles(); // トグル初期化 (Initialize toggles)
        
        if ($.fn.autoKana) { // autoKanaプラグインが存在するか確認 (Check if autoKana plugin exists)
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true }); // 名前→カナ自動変換 (Auto convert name to kana)
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }
    }

    generateDocumentNumber() {
        const now = new Date(); // 現在日時を取得 (Get current date)
        const yymmdd = now.getFullYear().toString().slice(-2) +
                     ('0' + (now.getMonth() + 1)).slice(-2) +
                     ('0' + now.getDate()).slice(-2); // YYMMDD形式に変換 (Convert to YYMMDD format)
        
        const docIdEl = document.getElementById('id_doc'); 
        if (docIdEl) docIdEl.value = `CV${yymmdd}..`; // ドキュメントIDを設定 (Set document ID)
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0]; // 今日の日付を取得 (Get today's date)
        document.getElementById('apply-date').value = today; // 申請日を設定 (Set apply date)
        
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user) {
            document.getElementById('applicant-name').value = ringiSystem.user.name; // 申請者名を設定 (Set applicant name)
        }
    }

    initToggles() {
        $('input[name="n_send_to"]:checked').trigger('change'); // 初期状態でchange発火 (Trigger change for initial state)
        $('input[name="s_rep_title"]:checked').trigger('change');
    }

    bindEvents() {
        const self = this;

        // 「その他」送信先トグル (Toggle "Others" for destination)
        $('input[name="n_send_to"]').on('change', function() {
            if ($(this).val() === '9') {
                $('.send-to-others-group').slideDown(); // 表示 (Show)
                $('input[name="s_send_to_others"]').prop('required', true); // 必須化 (Make required)
            } else {
                $('.send-to-others-group').slideUp(); // 非表示 (Hide)
                $('input[name="s_send_to_others"]').prop('required', false).val('');
                $('#s_send_to_others').css('border-color', '#ccc'); // エラーUIリセット (Reset error UI)
            }
        });

        // 「その他」役職トグル (Toggle "Others" for title)
        $('input[name="s_rep_title"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#rep_title_others_input').show().prop('required', true); // 表示＆必須 (Show & required)
            } else {
                $('#rep_title_others_input').hide().prop('required', false).val('');
                $('#rep_title_others_input').css('border-color', '#ccc'); // エラーUIリセット (Reset error UI)
            }
        });

        // ファイルアップロード処理 (File upload handler)
        $('#estimate_file').on('change', function(e) {
            self.handleFileUpload(e);
        });

        // キャンセルボタン (Cancel button)
        $('#btn-cancel').on('click', function(e) {
            e.preventDefault();
            if (confirm('入力内容が破棄されます。よろしいですか？')) { // 確認ダイアログ (Confirmation dialog)
                window.location.href = 'list.html'; // 一覧画面へ遷移 (Redirect to list)
            }
        });

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault(); // デフォルト送信を防止 (Prevent default submit)
            this.handleSubmit('apply'); // 申請モードで送信 (Submit in apply mode)
        });

        const draftBtn = document.getElementById('btn-save-draft');
        if(draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit('draft'); // 下書き保存 (Save as draft)
            });
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0]; // 選択ファイル取得 (Get selected file)
        const displaySpan = document.getElementById('file-name-display');

        if (!file) {
            displaySpan.textContent = '選択されていません'; // 未選択表示 (No file selected)
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error'); // サイズ制限エラー (File size error)
            event.target.value = '';
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error'); // PDF限定 (PDF only)
            event.target.value = '';
            displaySpan.textContent = '選択されていません';
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        displaySpan.textContent = file.name; // ファイル名表示 (Display file name)
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]'); // 必須項目取得 (Get required fields)
        let isValid = true;
        
        requiredFields.forEach(field => {
            const isHidden = field.offsetParent === null; // 非表示チェック (Check hidden)
            
            // 非表示・ラジオ除外 (Skip hidden & radio)
            if (!isHidden && field.type !== 'radio' && !field.value.trim() && field.id !== 'estimate_file') {
                field.style.borderColor = 'red'; // エラー表示 (Error highlight)
                isValid = false;
            } else {
                field.style.borderColor = '#ccc'; // リセット (Reset)
            }
        });

        // ファイル必須チェック (File validation)
        const fileInput = document.getElementById('estimate_file');
        if (fileInput && fileInput.required && !fileInput.value) {
            isValid = false;
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('見積書（PDF）を添付してください。', 'error');
        }

        // HTML5バリデーション (HTML5 validation)
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return false;
        }

        if (!isValid) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('必須項目が入力されていないか、形式が正しくありません。', 'error');
        }
        
        return isValid;
    }

    async handleSubmit(saveMode) {
        if (saveMode === 'apply') {
            if (!this.validateForm()) return; // バリデーション失敗時停止 (Stop if invalid)
        }

        const formData = new FormData(this.form); // フォームデータ作成 (Create form data)
        formData.append('save_mode', saveMode); 

        // 名前結合 (Merge name)
        const repName = `${formData.get('rep_name_sei')} ${formData.get('rep_name_mei')}`.trim();
        formData.set('s_rep_name', repName);
        
        // カナ結合 (Merge kana)
        const repKana = `${formData.get('rep_kana_sei')} ${formData.get('rep_kana_mei')}`.trim();
        formData.set('s_rep_kana', repKana);

        // 不要項目削除 (Remove temporary fields)
        formData.delete('rep_name_sei');
        formData.delete('rep_name_mei');
        formData.delete('rep_kana_sei');
        formData.delete('rep_kana_mei');
        
        try {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('送信中...', 'info'); // 送信中表示 (Sending...)

            const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(msg, 'success');
                
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=vendor`; // 詳細画面へ遷移 (Redirect to detail)
                }, 1500);
            } else {
                if (response.errors) {
                    const errorMsgs = Object.values(response.errors).flat().join('\n');
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(errorMsgs, 'error'); // エラー表示 (Show errors)
                } else {
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(response.error || '保存に失敗しました。', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('データ送信に失敗しました。', 'error'); // 通信エラー (Request failed)
        }
    }
}

// 初期ロード処理 (On document ready)
$(document).ready(function() {
    if (document.getElementById('vendor-form')) {
        window.vendorFormHandler = new VendorFormHandler(); // クラス初期化 (Initialize class)
    }
});