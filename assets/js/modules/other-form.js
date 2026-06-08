class OtherFormHandler {
    constructor() {
        this.form = document.getElementById('other-form');
        this.init();
    }

    async init() {
        if (!this.form) return;

        this.bindEvents();
        await this.loadEmployees();
        await this.fetchApprovalRoute(); 
        
        // Inisialisasi AutoKana
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
        if (docIdEl) docIdEl.value = `CO${yymmdd}..`;
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('apply-date');
        if (dateInput) dateInput.value = today;
        
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user) {
            const applicantInput = document.getElementById('applicant-name');
            if (applicantInput) applicantInput.value = ringiSystem.user.name;
        }
    }

    async loadEmployees() {
        const select = document.querySelector('select[name="s_incharge"]');
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        try {
            const response = await ringiSystem.apiRequest('GET', 'users/list'); 
            if (response.success && response.data.length > 0) {
                this.renderEmployeeOptions(select, response.data);
                return;
            }
            throw new Error('社員データが空です');
        } catch (error) {
            console.warn('モック社員データを使用します:', error);
            const mockEmployees = [
                { id_worker: '0001', s_name: 'Test User 1' },
                { id_worker: '0036', s_name: 'Admin System' }
            ];
            this.renderEmployeeOptions(select, mockEmployees);
        }
    }

    renderEmployeeOptions(selectElement, employees) {
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id_worker;
            opt.textContent = `${emp.id_worker}: ${emp.s_name}`;
            selectElement.appendChild(opt);
        });
    }

    // FIX UX: Menampilkan Approval Route sesuai tabel kategori = 5
    async fetchApprovalRoute() {
        const tbody = document.getElementById('approval-route-tbody');
        if (!tbody) return;

        try {
            const response = await ringiSystem.apiRequest('GET', 'approval-route?type=1');
            if (response.success && response.data.length > 0) {
                let html = '';
                response.data.forEach((approver, index) => {
                    html += `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #ccc;">第${index + 1}承認</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ccc; color:#666;">(申請後に確定)</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ccc;"><strong>${approver.name}</strong> <span style="font-size:12px; color:#888;">(${approver.role})</span></td>
                        </tr>
                    `;
                });
                
                // Sesuai spesifikasi, tambahkan admin penerima kontrak
                html += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ccc;">契約受付者</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ccc; color:#666;">(申請後に確定)</td>
                        <td style="padding: 8px; border-bottom: 1px solid #ccc;"><strong>システム管理者</strong> <span style="font-size:12px; color:#888;">(0036)</span></td>
                    </tr>
                `;
                tbody.innerHTML = html;
            }
        } catch(error) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">承認ルートの取得に失敗しました</td></tr>`;
        }
    }

    initToggles() {
        $('input[name="n_send_to"]:checked').trigger('change');
        $('input[name="s_rep_title"]:checked').trigger('change');
        $('input[name="rep_email_exists"]:checked').trigger('change');
        $('input[name="n_introducer_type"]:checked').trigger('change');
    }

    bindEvents() {
        const self = this;

        this.form.addEventListener('submit', (e) => {
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

        $('#btn-cancel').on('click', function(e) {
            e.preventDefault();
            if (confirm('入力内容が破棄されます。よろしいですか？ (Data yang diinput akan hilang. Lanjutkan?)')) {
                window.location.href = 'list.html';
            }
        });

        // Format angka ribuan (Money Format)
        $(document).on('blur', '.money-input', function() {
            let val = $(this).val().replace(/,/g, '');
            if (!isNaN(val) && val !== '') {
                $(this).val(Number(val).toLocaleString('ja-JP'));
            }
        });

        $(document).on('focus', '.money-input', function() {
            let val = $(this).val().replace(/,/g, '');
            $(this).val(val);
        });

        // Toggle untuk Alamat Surat Menyurat
        $('input[name="n_send_to"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#s_send_to_others').slideDown().prop('required', true);
            } else {
                $('#s_send_to_others').slideUp().prop('required', false).val('');
            }
        });

        // Toggle untuk Jabatan Representatif
        $('input[name="s_rep_title"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#s_rep_title_others').slideDown().prop('required', true);
            } else {
                $('#s_rep_title_others').slideUp().prop('required', false).val('');
            }
        });

        // Toggle untuk Email Representatif
        $('input[name="rep_email_exists"]').on('change', function() {
            if ($(this).val() === '0') {
                $('#s_rep_email').prop('readonly', true).prop('required', false).val('なし');
                $('#s_rep_email').css('background-color', '#e9ecef');
            } else {
                $('#s_rep_email').prop('readonly', false).prop('required', true).val('');
                $('#s_rep_email').css('background-color', '#fff');
            }
        });

        // Toggle untuk Pengenal (Introducer)
        $('input[name="n_introducer_type"]').on('change', function() {
            const val = $(this).val();
            const introInput = $('#s_introducer');
            const othersInput = $('#s_introducer_type_others');

            if (val === '0') {
                introInput.val('なし').prop('readonly', true).css('background-color', '#e9ecef');
            } else {
                if (introInput.val() === 'なし') introInput.val('');
                introInput.prop('readonly', false).css('background-color', '#fff');
            }

            if (val === '9') {
                othersInput.slideDown().prop('required', true);
            } else {
                othersInput.slideUp().prop('required', false).val('');
            }
        });

        // Handler untuk Upload File dengan Peringatan Invoice
        $('input[type="file"]').on('change', function(e) {
            self.handleFileUpload(e);
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        const displaySpan = $(event.target).siblings('.file-name-badge');

        if (!file) {
            displaySpan.text('選択されていません');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            displaySpan.text('選択されていません');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            displaySpan.text('選択されていません');
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            displaySpan.text('選択されていません');
            return;
        }
        
        displaySpan.text('📄 ' + file.name);
    }

    validateForm() {
        this.combineFields(); // Pastikan field digabung dulu sebelum check validasi
        
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            const isHidden = field.offsetParent === null && field.type !== 'hidden'; 
            
            if (!isHidden && field.type !== 'radio' && !field.value.trim()) {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                field.style.borderColor = '#ccc';
            }
        });

        // Cek file estimate wajib
        const estimateFile = document.getElementById('file-estimate');
        if (estimateFile && estimateFile.required && !estimateFile.value) {
            isValid = false;
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('見積書（PDF）を添付してください。', 'error');
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
             if (!this.validateForm()) return;
        } else {
             this.combineFields(); // Gabungkan untuk draft juga
        }

        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode); 

        if ($('#id_doc').length) {
            formData.set('id_doc', $('#id_doc').val());
        }
        if ($('#apply-date').length) {
            formData.set('ts_applied', $('#apply-date').val());
        }
        
        // Membersihkan koma dari angka sebelum dikirim
        $('.money-input').each(function() {
            const name = $(this).attr('name');
            if (name) {
                const rawVal = $(this).val().replace(/,/g, '');
                formData.set(name, rawVal);
            }
        });
        
        // Gabung kode pos kantor
        const zip1 = formData.get('zip1') || '';
        const zip2 = formData.get('zip2') || '';
        if (zip1 && zip2) {
            formData.set('s_office_pcode', zip1 + zip2);
        }

        // Gabung Telpon
        const tel1 = formData.get('tel1') || '';
        const tel2 = formData.get('tel2') || '';
        const tel3 = formData.get('tel3') || '';
        if (tel1 && tel2 && tel3) {
            formData.set('s_office_tel', `${tel1}-${tel2}-${tel3}`);
        }

        // Gabung nama representatif
        if(formData.get('rep_name_sei') && formData.get('rep_name_mei')) {
            const repName = `${formData.get('rep_name_sei')} ${formData.get('rep_name_mei')}`;
            formData.set('s_rep_name', repName.trim());
        }
        
        // Gabung kana representatif
        if(formData.get('rep_kana_sei') && formData.get('rep_kana_mei')) {
            const repKana = `${formData.get('rep_kana_sei')} ${formData.get('rep_kana_mei')}`;
            formData.set('s_rep_kana', repKana.trim());
        }

        try {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('送信中...', 'info');

            const response = await ringiSystem.apiRequest('POST', 'others', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=others`;
                }, 1500);
            } else {
                if (response.errors) {
                    const errMsgs = Object.values(response.errors).flat().join('\n');
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(errMsgs, 'error');
                } else {
                    if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(response.error, 'error');
                }
            }
        } catch (error) {
            console.error('送信エラー:', error);
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(error.message || 'データ送信に失敗しました。', 'error');
        }
    }

    combineFields() {
        const t1 = this.form.querySelector('[name="s_industry_type_1"]')?.value || '';
        const t2 = this.form.querySelector('[name="s_industry_type_2"]')?.value || '';
        const t3 = this.form.querySelector('[name="s_industry_type_3"]')?.value || '';
        
        const combinedType = t1 + t2 + t3;

        let hiddenInput = this.form.querySelector('input[name="s_industry_type"]');
        if (hiddenInput) {
            hiddenInput.value = combinedType;
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
                const response = await ringiSystem.apiRequest('GET', `others/${id}`);
                if (response.success) {
                    const d = response.data;
                    
                    // 1. Document ID
                    const docIdEl = document.getElementById('id_doc');
                    if (docIdEl) docIdEl.value = d.id_doc;
                    
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
                    $('input[name="s_industry"]').val(d.s_industry || '');
                    
                    if (d.s_industry_type && d.s_industry_type.length >= 4) {
                        $('select[name="s_industry_type_1"]').val(d.s_industry_type.charAt(0));
                        $('input[name="s_industry_type_2"]').val(d.s_industry_type.substring(1, 3));
                        $('input[name="s_industry_type_3"]').val(d.s_industry_type.substring(3));
                    }
                    
                    // 5. Office Address & Zip
                    if (d.s_office_pcode && d.s_office_pcode.length >= 7) {
                        $('input[name="zip1"]').val(d.s_office_pcode.substring(0, 3));
                        $('input[name="zip2"]').val(d.s_office_pcode.substring(3));
                    }
                    $('input[name="s_office_address"]').val(d.s_office_address || '');
                    $('input[name="s_office_address2"]').val(d.s_office_address2 || '');
                    
                    $('input[name="n_send_to"][value="' + d.n_send_to + '"]').prop('checked', true).trigger('change');
                    if (d.n_send_to === '9') {
                        $('#s_send_to_others').val(d.s_send_to_others || '');
                    }
                    
                    // Office Tel
                    if (d.s_office_tel) {
                        const telParts = d.s_office_tel.split('-');
                        $('input[name="tel1"]').val(telParts[0] || '');
                        $('input[name="tel2"]').val(telParts[1] || '');
                        $('input[name="tel3"]').val(telParts[2] || '');
                    }
                    
                    // 6. Representative Info
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
                        $('#s_rep_title_others').val(d.s_rep_title_others || '');
                    }
                    
                    if (d.s_rep_email && d.s_rep_email !== 'なし') {
                        $('input[name="rep_email_exists"][value="1"]').prop('checked', true).trigger('change');
                        $('#s_rep_email').val(d.s_rep_email);
                    } else {
                        $('input[name="rep_email_exists"][value="0"]').prop('checked', true).trigger('change');
                    }
                    
                    // 7. Financials
                    $('input[name="n_pre_total"]').val(d.n_pre_total ? Number(d.n_pre_total).toLocaleString('ja-JP') : '');
                    $('input[name="n_pre_sales"]').val(d.n_pre_sales ? Number(d.n_pre_sales).toLocaleString('ja-JP') : '');
                    $('input[name="n_pre_debt"]').val(d.n_pre_debt ? Number(d.n_pre_debt).toLocaleString('ja-JP') : '');
                    $('input[name="n_pre_income"]').val(d.n_pre_income ? Number(d.n_pre_income).toLocaleString('ja-JP') : '');
                    $('input[name="n_pre_workers"]').val(d.n_pre_workers || '');
                    
                    $('input[name="n_comsumption_tax"][value="' + d.n_comsumption_tax + '"]').prop('checked', true);
                    $('input[name="n_trade"][value="' + d.n_trade + '"]').prop('checked', true);
                    
                    // 8. Contract Details
                    $('textarea[name="s_contract_overview"]').val(d.s_contract_overview || '');
                    
                    $('input[name="dt_contract_start"]').val(d.dt_contract_start ? d.dt_contract_start.split(' ')[0] : '');
                    $('select[name="s_incharge"]').val(d.s_incharge || '');
                    
                    $('input[name="n_introducer_type"][value="' + d.n_introducer_type + '"]').prop('checked', true).trigger('change');
                    $('#s_introducer').val(d.s_introducer || '');
                    if (d.n_introducer_type === '9') {
                        $('#s_introducer_type_others').val(d.s_introducer_type_others || '');
                    }
                    
                    $('textarea[name="s_situation"]').val(d.s_situation || '');
                    
                    // 9. Files
                    if (d.s_file_estimate_path) {
                        const parts = d.s_file_estimate_path.split('/');
                        const name = parts[parts.length - 1];
                        $('#estimate-name-display').text('📄 ' + name + ' (アップロード済み)').css('color', '#28a745');
                        $('#file-estimate').prop('required', false);
                    }
                    if (d.s_file_others_path) {
                        const parts = d.s_file_others_path.split('/');
                        const name = parts[parts.length - 1];
                        $('#attachment-name-display').text('📄 ' + name + ' (アップロード済み)').css('color', '#28a745');
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
    if (document.getElementById('other-form')) {
        window.otherFormHandler = new OtherFormHandler();
    }
});