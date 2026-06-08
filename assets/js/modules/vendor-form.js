class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form'); 
        this.init(); 
    }

    async init() {
        if (!this.form) return; 

        this.bindEvents(); 
        
        if ($.fn.autoKana) { 
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true }); 
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }

        this.id = this.getUrlParameter('id');
        if (this.id) {
            await this.loadDraftData(this.id);
        } else {
            this.generateDocumentNumber(); 
            this.setDefaultValues(); 
            this.initToggles(); 
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

    getUrlParameter(name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? results[1] : null;
    }

    async loadDraftData(id) {
        try {
            if (typeof ringiSystem !== 'undefined') {
                ringiSystem.showNotification('下書きデータを読み込み中...', 'info');
                const response = await ringiSystem.apiRequest('GET', `vendor/${id}`);
                if (response.success) {
                    const d = response.data;
                    
                    // 1. Document ID
                    document.getElementById('id_doc').value = d.id_doc;
                    
                    // 2. Applicant Info
                    const applicantInput = document.getElementById('applicant-name');
                    if (applicantInput) {
                        applicantInput.value = d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied || '');
                    }
                    
                    // 3. Application Date
                    const today = new Date().toISOString().split('T')[0];
                    const dateInput = document.getElementById('apply-date');
                    if (dateInput) dateInput.value = today;
                    
                    // 4. Company Info
                    $('input[name="s_name"]').val(d.s_name || '');
                    $('input[name="s_kana"]').val(d.s_kana || '');
                    
                    // Office Address & Zip
                    if (d.s_office_pcode && d.s_office_pcode.length >= 7) {
                        $('input[name="zip1"]').val(d.s_office_pcode.substring(0, 3));
                        $('input[name="zip2"]').val(d.s_office_pcode.substring(3));
                    }
                    $('input[name="s_office_address"]').val(d.s_office_address || '');
                    $('input[name="s_office_address2"]').val(d.s_office_address2 || '');
                    
                    $('input[name="n_send_to"][value="' + d.n_send_to + '"]').prop('checked', true).trigger('change');
                    if (d.n_send_to === '9') {
                        $('input[name="s_send_to_others"]').val(d.s_send_to_others || '');
                    }
                    
                    // Office Tel
                    if (d.s_office_tel) {
                        const telParts = d.s_office_tel.split('-');
                        $('input[name="tel1"]').val(telParts[0] || '');
                        $('input[name="tel2"]').val(telParts[1] || '');
                        $('input[name="tel3"]').val(telParts[2] || '');
                    }
                    
                    // 5. Representative Info
                    if (d.s_rep_name) {
                        const parts = d.s_rep_name.split(/\s+/);
                        $('#rep_name_sei').val(parts[0] || '');
                        $('#rep_name_mei').val(parts.slice(1).join(' ') || '');
                    }
                    if (d.s_rep_kana) {
                        const parts = d.s_rep_kana.split(/\s+/);
                        $('#rep_kana_sei').val(parts[0] || '');
                        $('#rep_kana_mei').val(parts.slice(1).join(' ') || '');
                    }
                    
                    $('input[name="s_rep_title"][value="' + d.s_rep_title + '"]').prop('checked', true).trigger('change');
                    if (d.s_rep_title === '9') {
                        $('input[name="s_rep_title_others"]').val(d.s_rep_title_others || '');
                    }
                    
                    // 6. Contract Details
                    $('textarea[name="s_contract_overview"]').val(d.s_contract_overview || '');
                    $('textarea[name="s_situation"]').val(d.s_situation || '');
                    
                    // 7. Files
                    if (d.s_file_estimate_path) {
                        const parts = d.s_file_estimate_path.split('/');
                        const name = parts[parts.length - 1];
                        document.getElementById('file-name-display').textContent = '📄 ' + name + ' (アップロード済み)';
                        document.getElementById('file-name-display').style.color = '#28a745';
                        $('#estimate_file').prop('required', false);
                    }
                    
                    ringiSystem.showNotification('下書きデータを読み込みました', 'success');
                } else {
                    ringiSystem.showNotification('下書きデータの取得に失敗しました', 'error');
                }
            }
        } catch (error) {
            console.error('Load draft data error:', error);
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('下書きの読み込み中にエラーが発生しました', 'error');
        }
    }
}

$(document).ready(function() {
    if (document.getElementById('vendor-form')) {
        window.vendorFormHandler = new VendorFormHandler(); 
    }
});