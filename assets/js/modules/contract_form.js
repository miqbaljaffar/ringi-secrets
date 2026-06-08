class ContractFormHandler {
    constructor() {
        this.form = document.getElementById('contract-form');
        this.init();
    }

    async init() {
        if (!this.form) return;

        this.bindEvents();
        this.setupAutoKana();
        await this.loadEmployees(); 
        await this.fetchApprovalRoute(); 
        
        this.id = this.getUrlParameter('id');
        if (this.id) {
            await this.loadDraftData(this.id);
        } else {
            this.generateDocumentNumber();
            this.setDefaultValues();
            this.toggleCorporateFields(); 
            this.initToggles();
        }
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

        // Mengubah selector dari select ke input[type="radio"] sesuai spesifikasi 
        $('input[name="n_introducer_type"]').on('change', function() {
            const val = $(this).val();
            const introInput = $('#s_introducer');
            
            if (val === '0') {
                introInput.val('なし').prop('readonly', true).css('background-color', '#e9ecef');
            } else {
                if (introInput.val() === 'なし') introInput.val('');
                introInput.prop('readonly', false).css('background-color', '#fff');
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
        
        // Menambahkan nama user otomatis dari session
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user) {
            $('#applicant-name').val(ringiSystem.user.name);
        }
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
        $('input[name="n_introducer_type"]:checked').trigger('change');
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
            
            if (!isHidden && !field.disabled && field.type !== 'radio' && field.type !== 'checkbox' && !field.value.trim()) {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                if(field.style) field.style.borderColor = '#ccc';
            }
        });

        // Validasi Khusus untuk Checkbox array (Buku Akuntansi)
        const checkedBooks = $('input[name="s_books[]"]:checked').length;
        if (checkedBooks === 0) {
            isValid = false;
            ringiSystem.showNotification('作成している帳簿を少なくとも1つ選択してください。', 'error');
            $('.checkbox-grid').css('border', '1px solid red').css('padding', '5px');
        } else {
            $('.checkbox-grid').css('border', 'none');
        }

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

        // Penggabungan Kode Industri
        const cat1 = formData.get('cat1') || '';
        const cat2 = formData.get('cat2') || '';
        const cat3 = formData.get('cat3') || '';
        if (cat1 && cat2 && cat3) {
            formData.append('s_industry_type', `${cat1}${cat2}${cat3}`);
        }

        // Penggabungan Kode Pos Rumah Representatif
        const repZip1 = formData.get('rep_zip1') || '';
        const repZip2 = formData.get('rep_zip2') || '';
        if (repZip1 && repZip2) {
            formData.set('s_rep_pcode', repZip1 + repZip2);
        }

        // Penanganan Telepon Representatif Jika 'なし'
        if (formData.get('rep_tel_exists') === '1') {
            const rt1 = formData.get('rep_tel1') || '';
            const rt2 = formData.get('rep_tel2') || '';
            const rt3 = formData.get('rep_tel3') || '';
            formData.set('s_rep_tel', `${rt1}-${rt2}-${rt3}`);
        } else {
            formData.set('s_rep_tel', 'なし');
        }

        // Penanganan Email Representatif Jika 'なし'
        if (formData.get('rep_email_exists') === '0') {
            formData.set('s_rep_email', 'なし');
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

    getUrlParameter(name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? results[1] : null;
    }

    async loadDraftData(id) {
        try {
            ringiSystem.showNotification('下書きデータを読み込み中...', 'info');
            const response = await ringiSystem.apiRequest('GET', `tax/${id}`);
            if (response.success) {
                const d = response.data;
                
                // 1. Document ID
                $('#id_doc').val(d.id_doc);
                
                // 2. Applicant Info
                if (d.applicant_info) {
                    $('#applicant-name').val(d.applicant_info.s_name);
                } else {
                    $('#applicant-name').val(d.applicant_name || d.s_applied || '');
                }
                
                // 3. Application Date
                const today = new Date().toISOString().split('T')[0];
                $('#applied_date').val(today);
                
                // 4. Corporation/Individual Type
                $('input[name="n_type"][value="' + d.n_type + '"]').prop('checked', true).trigger('change');
                
                // 5. Company Name & Kana
                $('input[name="s_name"]').val(d.s_name || '');
                $('input[name="s_kana"]').val(d.s_kana || '');
                
                // 6. Establishment Date (Corporation Only)
                if (d.n_type == '1') {
                    $('#dt_est_seireki').val(d.dt_establishment ? d.dt_establishment.split(' ')[0] : '');
                    $('#dt_est_wareki').val(this.convertToWareki(d.dt_establishment));
                    $('input[name="n_capital"]').val(d.n_capital ? Number(d.n_capital).toLocaleString('ja-JP') : '');
                    $('input[name="n_before"]').val(d.n_before || '');
                }
                
                // 7. Industry Info
                $('input[name="s_industry"]').val(d.s_industry || '');
                $('input[name="s_industry_oms"]').val(d.s_industry_oms || '');
                if (d.s_industry_type && d.s_industry_type.length >= 3) {
                    $('select[name="cat1"]').val(d.s_industry_type.charAt(0));
                    $('select[name="cat2"]').val(d.s_industry_type.charAt(1));
                    $('select[name="cat3"]').val(d.s_industry_type.charAt(2));
                }
                
                // 8. Representative Info
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
                    $('#rep_title_others_input').val(d.s_rep_title_others || '');
                }
                
                $('#dt_birth_seireki').val(d.dt_rep_birth ? d.dt_rep_birth.split(' ')[0] : '');
                $('#dt_birth_wareki').val(this.convertToWareki(d.dt_rep_birth));
                
                if (d.s_rep_email && d.s_rep_email !== 'なし') {
                    $('input[name="rep_email_exists"][value="1"]').prop('checked', true).trigger('change');
                    $('#rep_email_input').val(d.s_rep_email);
                } else {
                    $('input[name="rep_email_exists"][value="0"]').prop('checked', true).trigger('change');
                }
                
                if (d.s_rep_pcode && d.s_rep_pcode.length >= 7) {
                    $('input[name="rep_zip1"]').val(d.s_rep_pcode.substring(0, 3));
                    $('input[name="rep_zip2"]').val(d.s_rep_pcode.substring(3));
                }
                $('input[name="s_rep_address"]').val(d.s_rep_address || '');
                $('input[name="s_rep_address2"]').val(d.s_rep_address2 || '');
                
                if (d.s_rep_tel && d.s_rep_tel !== 'なし') {
                    $('input[name="rep_tel_exists"][value="1"]').prop('checked', true).trigger('change');
                    const telParts = d.s_rep_tel.split('-');
                    $('input[name="rep_tel1"]').val(telParts[0] || '');
                    $('input[name="rep_tel2"]').val(telParts[1] || '');
                    $('input[name="rep_tel3"]').val(telParts[2] || '');
                } else {
                    $('input[name="rep_tel_exists"][value="0"]').prop('checked', true).trigger('change');
                }
                
                // 9. Office Info
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
                $('input[name="s_office_tel"]').val(d.s_office_tel || '');
                
                // 10. Tax Info
                $('input[name="s_tax_office"]').val(d.s_tax_office || '');
                $('input[name="s_declaration_type"][value="' + d.s_declaration_type + '"]').prop('checked', true);
                $('input[name="n_tax_place"][value="' + d.n_tax_place + '"]').prop('checked', true);
                $('input[name="s_tax_num"]').val(d.s_tax_num || '');
                
                $('input[name="n_e_filing"][value="' + d.n_e_filing + '"]').prop('checked', true).trigger('change');
                if (d.n_e_filing === '1') {
                    $('textarea[name="s_e_filing_reason"]').val(d.s_e_filing_reason || '');
                }
                $('input[name="s_national_tax_id"]').val(d.s_national_tax_id || '');
                $('input[name="s_local_tax_id"]').val(d.s_local_tax_id || '');
                
                // 11. Financials
                $('input[name="n_pre_total"]').val(d.n_pre_total ? Number(d.n_pre_total).toLocaleString('ja-JP') : '');
                $('input[name="n_pre_sales"]').val(d.n_pre_sales ? Number(d.n_pre_sales).toLocaleString('ja-JP') : '');
                $('input[name="n_pre_debt"]').val(d.n_pre_debt ? Number(d.n_pre_debt).toLocaleString('ja-JP') : '');
                $('input[name="n_pre_income"]').val(d.n_pre_income ? Number(d.n_pre_income).toLocaleString('ja-JP') : '');
                $('input[name="n_pre_workers"]').val(d.n_pre_workers || '');
                
                $('input[name="n_comsumption_tax"][value="' + d.n_comsumption_tax + '"]').prop('checked', true);
                $('input[name="n_trade"][value="' + d.n_trade + '"]').prop('checked', true);
                $('input[name="n_affiliated_company"][value="' + d.n_affiliated_company + '"]').prop('checked', true);
                
                $('input[name="n_self_accounting"][value="' + d.n_self_accounting + '"]').prop('checked', true).trigger('change');
                if (d.n_self_accounting === '9') {
                    $('#self_accounting_others').val(d.s_self_accounting_others || '');
                }
                
                $('input[name="n_accounting_apps"][value="' + d.n_accounting_apps + '"]').prop('checked', true).trigger('change');
                if (d.n_accounting_apps === '9') {
                    $('#accounting_soft_others').val(d.s_accounting_apps_others || '');
                }
                
                // Reset checklist first
                $('input[name="s_books[]"]').prop('checked', false);
                if (d.s_books) {
                    const booksArr = d.s_books.split(',');
                    booksArr.forEach(val => {
                        const chk = $('input[name="s_books[]"][value="' + val.trim() + '"]');
                        chk.prop('checked', true);
                        if (val.trim() === '99') {
                            $('#book_other_check').prop('checked', true).trigger('change');
                            $('#books_others_input').val(d.s_books_others || '');
                        }
                    });
                }
                
                $('input[name="n_slip_count"]').val(d.n_slip_count ? Number(d.n_slip_count).toLocaleString('ja-JP') : '');
                $('input[name="n_accounting_staff"][value="' + d.n_accounting_staff + '"]').prop('checked', true);
                
                // 12. Pre accountant status & details
                if (d.s_pre_accountant) {
                    $('input[name="pre_accountant_status"][value="1"]').prop('checked', true).trigger('change');
                    $('#s_pre_accountant').val(d.s_pre_accountant);
                    $('#n_rewards_account').val(d.n_rewards_account ? Number(d.n_rewards_account).toLocaleString('ja-JP') : '');
                    $('#n_rewards_tax').val(d.n_rewards_tax ? Number(d.n_rewards_tax).toLocaleString('ja-JP') : '');
                    $('#n_rewards_yearly').val(d.n_rewards_yearly ? Number(d.n_rewards_yearly).toLocaleString('ja-JP') : '');
                } else {
                    $('input[name="pre_accountant_status"][value="0"]').prop('checked', true).trigger('change');
                }
                
                // 13. Contract
                $('input[name="n_account_type"][value="' + d.n_account_type + '"]').prop('checked', true);
                $('textarea[name="s_contract_overview"]').val(d.s_contract_overview || '');
                
                $('input[name="s_incharge_bigin"]').val(d.s_incharge_bigin || '');
                $('input[name="s_incharge_close"]').val(d.s_incharge_close || '');
                $('select[name="s_incharge"]').val(d.s_incharge || '');
                
                $('input[name="n_introducer_type"][value="' + d.n_introducer_type + '"]').prop('checked', true).trigger('change');
                $('#s_introducer').val(d.s_introducer || '');
                if (d.n_introducer_type === '9') {
                    $('#introducer_type_others').val(d.s_introducer_type_others || '');
                }
                
                $('textarea[name="s_situation"]').val(d.s_situation || '');
                
                $('#dt_start_seireki').val(d.dt_contract_start ? d.dt_contract_start.split(' ')[0] : '');
                $('#dt_start_wareki').val(this.convertToWareki(d.dt_contract_start));
                
                // 14. File display labels
                if (d.s_file_estimate_path) {
                    const parts = d.s_file_estimate_path.split('/');
                    const name = parts[parts.length - 1];
                    $('#estimate_file').siblings('.file-name-display').text('📄 ' + name + ' (アップロード済み)').css('color', '#28a745');
                    $('#estimate_file').prop('required', false);
                }
                if (d.s_file_others_path) {
                    const parts = d.s_file_others_path.split('/');
                    const name = parts[parts.length - 1];
                    $('input[name="attachment"]').siblings('.file-name-display').text('📄 ' + name + ' (アップロード済み)').css('color', '#28a745');
                }
                
                ringiSystem.showNotification('下書きデータを読み込みました', 'success');
            } else {
                ringiSystem.showNotification('下書きデータの取得に失敗しました', 'error');
            }
        } catch (error) {
            console.error('Load draft data error:', error);
            ringiSystem.showNotification('下書きの読み込み中にエラーが発生しました', 'error');
        }
    }
}

$(document).ready(function() {
    if (document.getElementById('contract-form')) {
        window.contractFormHandler = new ContractFormHandler();
    }
});