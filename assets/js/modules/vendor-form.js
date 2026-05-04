class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form'); 
        this.init(); 
    }

    init() {
        if (!this.form) return; 

        this.generateDocumentNumber(); 
        this.setDefaultValues(); 
        this.bindEvents(); 
        this.initToggles(); 
        
        if ($.fn.autoKana) { 
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true }); 
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }
    }

    generateDocumentNumber() {
        const now = new Date(); 
        const yymmdd = now.getFullYear().toString().slice(-2) +
                     ('0' + (now.getMonth() + 1)).slice(-2) +
                     ('0' + now.getDate()).slice(-2); 
        
        const docIdEl = document.getElementById('id_doc'); 
        if (docIdEl) docIdEl.value = `CV${yymmdd}..`; 
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0]; 
        document.getElementById('apply-date').value = today; 
        
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user) {
            document.getElementById('applicant-name').value = ringiSystem.user.name; 
        }
    }

    initToggles() {
        $('input[name="n_send_to"]:checked').trigger('change'); 
        $('input[name="s_rep_title"]:checked').trigger('change');
    }

    bindEvents() {
        const self = this;

        $('input[name="n_send_to"]').on('change', function() {
            if ($(this).val() === '9') {
                $('.send-to-others-group').slideDown(); 
                $('input[name="s_send_to_others"]').prop('required', true); 
            } else {
                $('.send-to-others-group').slideUp(); 
                $('input[name="s_send_to_others"]').prop('required', false).val('');
                $('#s_send_to_others').css('border-color', '#ccc'); 
            }
        });

        $('input[name="s_rep_title"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#rep_title_others_input').show().prop('required', true); 
            } else {
                $('#rep_title_others_input').hide().prop('required', false).val('');
                $('#rep_title_others_input').css('border-color', '#ccc'); 
            }
        });

        $('#estimate_file').on('change', function(e) {
            self.handleFileUpload(e);
        });

        $('#btn-cancel').on('click', function(e) {
            e.preventDefault();
            if (confirm('入力内容が破棄されます。よろしいですか？')) { 
                window.location.href = 'list.html'; 
            }
        });

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            this.handleSubmit('apply'); 
        });

        const draftBtn = document.getElementById('btn-save-draft');
        if(draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit('draft'); 
            });
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0]; 
        const displaySpan = document.getElementById('file-name-display');

        if (!file) {
            displaySpan.textContent = '選択されていません'; 
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error'); 
            event.target.value = '';
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error'); 
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
        
        displaySpan.textContent = file.name; 
    }

    validateForm(saveMode) {
        const requiredFields = this.form.querySelectorAll('[required]'); 
        let isValid = true;
        
        requiredFields.forEach(field => {
            const isHidden = field.offsetParent === null; 
            
            if (!isHidden && field.type !== 'radio' && !field.value.trim() && field.id !== 'estimate_file') {
                field.style.borderColor = 'red'; 
                isValid = false;
            } else {
                field.style.borderColor = '#ccc'; 
            }
        });

        if (saveMode === 'apply') {
            const fileInput = document.getElementById('estimate_file');
            if (fileInput && !fileInput.value) {
                isValid = false;
                if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('見積書（PDF）を添付してください。', 'error');
            }
        }

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
            if (!this.validateForm('apply')) return; 
        }

        const formData = new FormData(this.form); 
        formData.append('save_mode', saveMode); 

        const repName = `${formData.get('rep_name_sei')} ${formData.get('rep_name_mei')}`.trim();
        formData.set('s_rep_name', repName);
        
        const repKana = `${formData.get('rep_kana_sei')} ${formData.get('rep_kana_mei')}`.trim();
        formData.set('s_rep_kana', repKana);

        formData.delete('rep_name_sei');
        formData.delete('rep_name_mei');
        formData.delete('rep_kana_sei');
        formData.delete('rep_kana_mei');
        
        try {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('送信中...', 'info'); 

            const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(msg, 'success');
                
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=vendor`; 
                }, 1500);
            } else {
                if (response.errors) {
                    const errorMsgs = Object.values(response.errors).flat().join('\n');
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(errorMsgs, 'error'); 
                } else {
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(response.error || '保存に失敗しました。', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('データ送信に失敗しました。', 'error'); 
        }
    }
}

$(document).ready(function() {
    if (document.getElementById('vendor-form')) {
        window.vendorFormHandler = new VendorFormHandler(); 
    }
});