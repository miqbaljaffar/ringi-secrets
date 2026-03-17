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
        this.toggleCorporateFields(); 
        this.initToggles();
    }

    bindEvents() {
        const self = this;

        // 1. Submit & Draft Actions
        $(this.form).on('submit', function(e) {
            e.preventDefault();
            self.handleSubmit('apply');
        });

        $('#btn-save-draft').on('click', function(e) {
            e.preventDefault();
            self.handleSubmit('draft');
        });

        // 2. Format Input Uang (Comma Separator)
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

        // 3. Toggles Radio/Checkbox
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
                $('#rep_email_input').prop('disabled', true).val('');
            } else {
                $('#rep_email_input').prop('disabled', false);
            }
        });

        $('input[name="rep_tel_exists"]').on('change', function() {
            if ($(this).val() === '0') {
                $('#rep_tel_group input').prop('disabled', true).val('');
            } else {
                $('#rep_tel_group input').prop('disabled', false);
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

        // Logika Auto-fill sesuai Dokumen Spesifikasi Hal 17
        // "紹介者区分「なし」の場合「なし」と自動表示"
        $('select[name="n_introducer_type"]').on('change', function() {
            const val = $(this).val();
            if (val === '0') {
                $('input[name="s_introducer"]').val('なし');
            }
            
            // Tampilkan input tambahan jika memilih 'その他' (9)
            if (val === '9') {
                $('#introducer_type_others').show().prop('required', true);
            } else {
                $('#introducer_type_others').hide().prop('required', false).val('');
            }
        });

        // 4. Address Search (AjaxZip3)
        $('.btn-address-search').on('click', function() {
            const target = $(this).data('target');
            if (target === 'office') {
                AjaxZip3.zip2addr('zip1', 'zip2', 's_office_address', 's_office_address');
            } else if (target === 'rep') {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 's_rep_address', 's_rep_address');
            }
        });

        // 5. Validasi Upload File Peringatan Invoice
        $('input[type="file"]').on('change', function(e) {
            self.handleFileUpload(e);
        });

        // Hitung/Ubah otomatis dari Seireki ke Wareki (Opsional/Sederhana)
        $('#dt_est_seireki').on('change', function() {
            $('#dt_est_wareki').val(self.convertToWareki($(this).val()));
        });
        $('#dt_birth_seireki').on('change', function() {
            $('#dt_birth_wareki').val(self.convertToWareki($(this).val()));
        });
        $('#dt_start_seireki').on('change', function() {
            $('#dt_start_wareki').val(self.convertToWareki($(this).val()));
        });
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
        
        // Mock data PIC untuk select dropdown
        const $picSelect = $('select[name="s_incharge"]');
        if ($picSelect.length && $picSelect.find('option').length <= 1) {
            $picSelect.append('<option value="1">システム管理者</option>');
            $picSelect.append('<option value="2">テストユーザー1</option>');
        }
    }

    initToggles() {
        $('input[name="s_rep_title"]:checked').trigger('change');
        $('input[name="rep_email_exists"]:checked').trigger('change');
        $('input[name="rep_tel_exists"]:checked').trigger('change');
        $('input[name="n_send_to"]:checked').trigger('change');
        $('select[name="n_introducer_type"]').trigger('change');
    }

    toggleCorporateFields() {
        const isCorporate = $('input[name="n_type"]:checked').val() === '1';
        if (isCorporate) {
            $('.corporate-only').slideDown();
            // Buat wajib isi lagi jika corporate
            $('#dt_est_seireki').prop('required', true);
            $('select[name="n_closing_month"]').prop('required', true);
        } else {
            $('.corporate-only').slideUp();
            // Hapus wajib isi jika individu
            $('#dt_est_seireki').prop('required', false).val('');
            $('select[name="n_closing_month"]').prop('required', false).val('');
            $('input[name="n_capital"]').val('');
            $('input[name="n_before"]').val('');
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

        // Peringatan Tegas (Spesifikasi: 請求書は添付しない)
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

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim() && !field.disabled && field.type !== 'radio') {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                field.style.borderColor = '#ccc';
            }
        });

        // Validasi Pola Regex HTML5 manual trigger (jika submit di-intercept)
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

        // Kumpulkan data form
        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode);

        // Membersihkan koma pada input uang sebelum dikirim ke server
        $('.money-input').each(function() {
            const name = $(this).attr('name');
            if (name) {
                const rawVal = $(this).val().replace(/,/g, '');
                formData.set(name, rawVal);
            }
        });

        // Gabungkan nilai kode industri (cat1, cat2, cat3 -> s_industry_code) jika ada
        const cat1 = formData.get('cat1') || '';
        const cat2 = formData.get('cat2') || '';
        const cat3 = formData.get('cat3') || '';
        if (cat1 && cat2 && cat3) {
            formData.append('s_industry_code', `${cat1}${cat2}${cat3}`);
        }

        try {
            ringiSystem.showNotification('送信中...', 'info');
            
            // Endpoint menyesuaikan spesifikasi (misalnya 'tax' untuk Contract/Tax form)
            const response = await ringiSystem.apiRequest('POST', 'tax', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    // Redirect ke halaman detail untuk melihat hasilnya
                    window.location.href = `detail.html?id=${response.doc_id}&type=tax`;
                }, 1500);
            } else {
                ringiSystem.showNotification('エラー: ' + (response.error || '送信に失敗しました'), 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            ringiSystem.showNotification('システムエラーが発生しました。', 'error');
        }
    }
}

// Inisialisasi
$(document).ready(function() {
    if (document.getElementById('contract-form')) {
        window.contractFormHandler = new ContractFormHandler();
    }
});