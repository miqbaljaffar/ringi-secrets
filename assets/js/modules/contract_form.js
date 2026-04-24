class ContractFormHandler {
    constructor() {
        this.form = document.getElementById('contract-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.bindEvents();
        this.setupAutoKana();
        this.generateDocumentNumber();
        this.setDefaultValues();
        this.loadEmployees(); 
        this.fetchApprovalRoute(); 
        this.toggleCorporateFields(); 
        this.initToggles();
    }

    bindEvents() {
        const self = this;

        $(this.form).on('submit', function(e) {
            e.preventDefault();
            self.handleSubmit('apply');
        });

        $('#btn-save-draft').on('click', function(e) {
            e.preventDefault();
            self.handleSubmit('draft');
        });

        $('#btn-cancel').on('click', function(e) {
            e.preventDefault();
            if (confirm('入力内容が破棄されます。よろしいですか？ (Data yang diinput akan hilang. Lanjutkan?)')) {
                window.location.href = 'list.html';
            }
        });

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

        $('input[name="n_type"]').on('change', () => this.toggleCorporateFields());
        
        $('input[name="n_send_to"]').on('change', function() {
            if ($(this).val() === '9') {
                $('.send-to-others-group').slideDown();
                $('input[name="s_send_to_others"]').prop('required', true);
            } else {
                $('.send-to-others-group').slideUp();
                $('input[name="s_send_to_others"]').prop('required', false).val('');
            }
        });

        $('input[name="s_rep_title"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#rep_title_others_input').show().prop('required', true);
            } else {
                $('#rep_title_others_input').hide().prop('required', false).val('');
            }
        });

        $('input[name="rep_email_exists"]').on('change', function() {
            if ($(this).val() === '0') {
                $('#rep_email_input').prop('disabled', true).prop('required', false).val('');
            } else {
                $('#rep_email_input').prop('disabled', false).prop('required', true);
            }
        });

        $('input[name="rep_tel_exists"]').on('change', function() {
            if ($(this).val() === '0') {
                $('#rep_tel_group input').prop('disabled', true).prop('required', false).val('');
            } else {
                $('#rep_tel_group input').prop('disabled', false).prop('required', true);
            }
        });

        $('input[name="n_self_accounting"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#self_accounting_others').show().prop('required', true);
            } else {
                $('#self_accounting_others').hide().prop('required', false).val('');
            }
        });

        $('input[name="n_accounting_apps"]').on('change', function() {
            if ($(this).val() === '9') {
                $('#accounting_soft_others').show().prop('required', true);
            } else {
                $('#accounting_soft_others').hide().prop('required', false).val('');
            }
        });

        $('#book_other_check').on('change', function() {
            if ($(this).is(':checked')) {
                $('#books_others_input').prop('disabled', false).prop('required', true);
            } else {
                $('#books_others_input').prop('disabled', true).prop('required', false).val('');
            }
        });

        $('select[name="n_introducer_type"]').on('change', function() {
            const val = $(this).val();
            if (val === '0') {
                $('input[name="s_introducer"]').val('なし');
            }
            
            if (val === '9') {
                $('#introducer_type_others').show().prop('required', true);
            } else {
                $('#introducer_type_others').hide().prop('required', false).val('');
            }
        });

        // Kontrak Sebelumnya (Previous Accountant Toggle)
        $('input[name="pre_accountant_status"]').on('change', function() {
            if ($(this).val() === '1') {
                $('.pre-accountant-group').slideDown();
                $('#s_pre_accountant, #n_rewards_account, #n_rewards_tax, #n_rewards_yearly').prop('required', true);
            } else {
                $('.pre-accountant-group').slideUp();
                $('#s_pre_accountant, #n_rewards_account, #n_rewards_tax, #n_rewards_yearly').prop('required', false).val('');
            }
        });

        // E-Filing Reason Toggle
        $('input[name="n_e_filing"]').on('change', function() {
            if ($(this).val() === '1') {
                $('.e-filing-reason-group').slideDown();
            } else {
                $('.e-filing-reason-group').slideUp();
                $('textarea[name="s_e_filing_reason"]').val('');
            }
        });

        $('.btn-address-search').on('click', function() {
            const target = $(this).data('target');
            if (target === 'office') {
                AjaxZip3.zip2addr('zip1', 'zip2', 's_office_address', 's_office_address');
            } else if (target === 'rep') {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 's_rep_address', 's_rep_address');
            }
        });

        $('input[type="file"]').on('change', function(e) {
            self.handleFileUpload(e);
        });

        // Date converters
        $('#dt_est_seireki').on('change', function() { $('#dt_est_wareki').val(self.convertToWareki($(this).val())); });
        $('#dt_birth_seireki').on('change', function() { $('#dt_birth_wareki').val(self.convertToWareki($(this).val())); });
        $('#dt_start_seireki').on('change', function() { $('#dt_start_wareki').val(self.convertToWareki($(this).val())); });

        $('#dt_est_wareki').on('change blur', function() { $('#dt_est_seireki').val(self.parseWarekiToSeireki($(this).val())); });
        $('#dt_birth_wareki').on('change blur', function() { $('#dt_birth_seireki').val(self.parseWarekiToSeireki($(this).val())); });
        $('#dt_start_wareki').on('change blur', function() { $('#dt_start_seireki').val(self.parseWarekiToSeireki($(this).val())); });
    }

    setupAutoKana() {
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }
    }

    generateDocumentNumber() {
        const now = new Date();
        const yymmdd = now.getFullYear().toString().slice(-2) +
                     ('0' + (now.getMonth() + 1)).slice(-2) +
                     ('0' + now.getDate()).slice(-2);
        
        const $docId = $('#id_doc');
        if ($docId.length) {
             $docId.val(`CT${yymmdd}..`); 
        }
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        $('#applied_date').val(today);
    }
    
    async loadEmployees() {
        const select = document.querySelector('select[name="s_incharge"]');
        if (!select) return;

        while (select.options.length > 1) { select.remove(1); }

        try {
            const response = await ringiSystem.apiRequest('GET', 'users/list'); 
            if (response.success && response.data && response.data.length > 0) {
                response.data.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id_worker;
                    opt.textContent = `${emp.id_worker}: ${emp.s_name}`;
                    select.appendChild(opt);
                });
            } else { throw new Error('Data karyawan kosong'); }
        } catch (error) {
            console.warn('Gagal memuat data pegawai (Fallback aktif):', error);
            const mockEmployees = [
                { id_worker: '0001', s_name: 'Test User' },
                { id_worker: '0036', s_name: 'Admin System' }
            ];
            mockEmployees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.id_worker;
                opt.textContent = `${emp.id_worker}: ${emp.s_name}`;
                select.appendChild(opt);
            });
        }
    }

    async fetchApprovalRoute() {
        const tbody = document.getElementById('approval-route-tbody');
        if (!tbody) return;

        try {
            // Mengambil Approval Route (Type 1 memicu kategori 5 pada sistem backend ini)
            const response = await ringiSystem.apiRequest('GET', 'approval-route?type=1');
            if (response.success && response.data.length > 0) {
                let html = '';
                response.data.forEach((approver, index) => {
                    html += `
                        <tr>
                            <td>第${index + 1}承認</td>
                            <td style="color:#666;">(申請後に確定)</td>
                            <td><strong>${approver.name}</strong> <span style="font-size:12px; color:#888;">(${approver.role})</span></td>
                        </tr>
                    `;
                });
                
                html += `
                    <tr>
                        <td>契約受付者</td>
                        <td style="color:#666;">(申請後に確定)</td>
                        <td><strong>システム管理者</strong> <span style="font-size:12px; color:#888;">(0036)</span></td>
                    </tr>
                `;
                tbody.innerHTML = html;
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">ルートが見つかりません</td></tr>`;
            }
        } catch(error) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">承認ルートの取得に失敗しました</td></tr>`;
        }
    }

    initToggles() {
        $('input[name="s_rep_title"]:checked').trigger('change');
        $('input[name="rep_email_exists"]:checked').trigger('change');
        $('input[name="rep_tel_exists"]:checked').trigger('change');
        $('input[name="n_send_to"]:checked').trigger('change');
        $('select[name="n_introducer_type"]').trigger('change');
        $('input[name="pre_accountant_status"]:checked').trigger('change');
        $('input[name="n_e_filing"]:checked').trigger('change');
    }

    toggleCorporateFields() {
        const isCorporate = $('input[name="n_type"]:checked').val() === '1';
        if (isCorporate) {
            $('.corporate-only').slideDown();
            $('#dt_est_seireki').prop('required', true);
            $('select[name="n_closing_month"]').prop('required', true);
            $('input[name="n_capital"], input[name="n_before"]').prop('required', true);
        } else {
            $('.corporate-only').slideUp();
            $('#dt_est_seireki').prop('required', false).val('');
            $('select[name="n_closing_month"]').prop('required', false).val('');
            $('input[name="n_capital"], input[name="n_before"]').prop('required', false).val('');
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        const displaySpan = $(event.target).siblings('.file-name-display');

        if (!file) {
            displaySpan.text('');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            displaySpan.text('');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            displaySpan.text('');
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            displaySpan.text('');
            return;
        }
        
        displaySpan.text(file.name);
    }

    convertToWareki(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        
        return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
            era: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        }).format(d);
    }

    parseWarekiToSeireki(warekiStr) {
        if(!warekiStr) return '';
        const match = warekiStr.match(/(令和|平成|昭和|大正|明治)([0-9０-９]+|元)年([0-9０-９]+)月([0-9０-９]+)日/);
        if(!match) return '';

        const era = match[1];
        let yearStr = match[2] === '元' ? '1' : match[2].replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        let monthStr = match[3].replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        let dayStr = match[4].replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

        let year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const day = parseInt(dayStr);

        let seirekiYear = year;
        if (era === '令和') seirekiYear += 2018;
        else if (era === '平成') seirekiYear += 1988;
        else if (era === '昭和') seirekiYear += 1925;
        else if (era === '大正') seirekiYear += 1911;
        else if (era === '明治') seirekiYear += 1867;

        return `${seirekiYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            // Melewati validasi elemen tersembunyi karena parent di hide oleh toggle display:none
            const isHidden = field.offsetParent === null; 
            
            if (!isHidden && !field.disabled && field.type !== 'radio' && !field.value.trim()) {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                field.style.borderColor = '#ccc';
            }
        });

        // Validasi File Upload Wajib (Khusus saat Apply)
        const estimateFile = document.getElementById('estimate_file');
        if (estimateFile && estimateFile.required && !estimateFile.value) {
            isValid = false;
            ringiSystem.showNotification('見積書（PDF）を添付してください。', 'error');
        }

        // Check HTML5 default validity
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return false;
        }
        
        if (!isValid) {
            ringiSystem.showNotification('必須項目が入力されていないか、形式が正しくありません。赤枠を確認してください。', 'error');
        }
        
        return isValid;
    }

    async handleSubmit(saveMode = 'apply') {
        if (saveMode === 'apply') {
            if (!this.validateForm()) return;
        }

        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode);

        $('.money-input').each(function() {
            const name = $(this).attr('name');
            if (name) {
                const rawVal = $(this).val().replace(/,/g, '');
                formData.set(name, rawVal);
            }
        });

        const cat1 = formData.get('cat1') || '';
        const cat2 = formData.get('cat2') || '';
        const cat3 = formData.get('cat3') || '';
        if (cat1 && cat2 && cat3) {
            formData.append('s_industry_type', `${cat1}${cat2}${cat3}`);
        }

        try {
            ringiSystem.showNotification('送信中...', 'info');
            
            const response = await ringiSystem.apiRequest('POST', 'tax', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=tax`;
                }, 1500);
            } else {
                let errorMessage = response.error || '送信に失敗しました';
                if (response.errors) {
                     errorMessage = Object.values(response.errors).flat().join('\n');
                }
                ringiSystem.showNotification('エラー: ' + errorMessage, 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            ringiSystem.showNotification('システムエラーが発生しました。', 'error');
        }
    }
}

$(document).ready(function() {
    if (document.getElementById('contract-form')) {
        window.contractFormHandler = new ContractFormHandler();
    }
});