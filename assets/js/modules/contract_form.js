class ContractFormHandler {
    constructor() {
        this.form = $('#contract-form'); 
        if (this.form.length === 0) return;
        this.init();
    }

    init() {
        this.setDefaultValues();
        this.loadEmployees();
        this.bindEvents();
        this.setupAutoKana();
        
        // Trigger initial state
        $('input[name="n_type"]:checked').trigger('change');
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = $('#applied_date');
        if (dateInput.val() === '') {
            dateInput.val(today);
        }
    }

    setupAutoKana() {
        if ($.fn.autoKana) {
            // AutoKana untuk Nama Perusahaan
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
            
            // AutoKana untuk Nama Representatif (Sei dan Mei)
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }
    }

    async loadEmployees() {
        const select = $('select[name="s_incharge"]');
        if (!select.length) return;

        try {
            const response = await ringiSystem.apiRequest('GET', 'users/list'); 
            if (response.success && response.data.length > 0) {
                response.data.forEach(emp => {
                    select.append(`<option value="${emp.id_worker}">${emp.id_worker}: ${emp.s_name}</option>`);
                });
            }
        } catch (error) {
            const mock = [{ id_worker: '0001', s_name: 'Yamada Taro' }, { id_worker: '0036', s_name: 'Admin' }];
            mock.forEach(emp => {
                select.append(`<option value="${emp.id_worker}">${emp.id_worker}: ${emp.s_name}</option>`);
            });
        }
    }

    bindEvents() {
        const self = this;

        // --- Logika Show/Hide UI ---
        $('input[name="n_type"]').on('change', function() {
            if ($(this).val() == '1') {
                $('.corporate-only').show();
                $('.corporate-only input, .corporate-only select').prop('required', true);
            } else {
                $('.corporate-only').hide();
                $('.corporate-only input, .corporate-only select').prop('required', false);
            }
        });

        $('input[name="n_send_to"]').on('change', function() {
            if($(this).val() == '9') $('.send-to-others-group').show();
            else $('.send-to-others-group').hide();
        });

        $('input[name="s_rep_title"]').on('change', function() {
            if($(this).val() == '9') $('#rep_title_others_input').show();
            else $('#rep_title_others_input').hide().val('');
        });

        $('input[name="rep_email_exists"]').on('change', function() {
            if($(this).val() == '1') $('#rep_email_input').show();
            else $('#rep_email_input').hide().val('');
        });

        $('input[name="rep_tel_exists"]').on('change', function() {
            if($(this).val() == '1') $('#rep_tel_group').show();
            else $('#rep_tel_group').hide();
        });

        $('input[name="n_e_filing"]').on('change', function() {
            if($(this).val() == '1') $('.e-filing-reason-group').show();
            else $('.e-filing-reason-group').hide();
        });

        $('input[name="n_self_accounting"]').on('change', function() {
            if($(this).val() == '9') $('#self_accounting_others').show();
            else $('#self_accounting_others').hide().val('');
        });

        $('input[name="n_accounting_apps"]').on('change', function() {
            if($(this).val() == '9') $('#accounting_soft_others').show();
            else $('#accounting_soft_others').hide().val('');
        });

        $('input[name="pre_accountant_status"]').on('change', function() {
            if($(this).val() == '1') $('.pre-accountant-group').show();
            else $('.pre-accountant-group').hide();
        });

        $('select[name="n_introducer_type"]').on('change', function() {
            if($(this).val() == '9') $('#introducer_type_others').show();
            else $('#introducer_type_others').hide().val('');
        });

        $('#book_other_check').on('change', function() {
            if($(this).is(':checked')) $('#books_others_input').prop('disabled', false);
            else $('#books_others_input').prop('disabled', true).val('');
        });


        // --- Event Lainnya ---
        $('input[type="file"]').on('change', function(e) {
            self.handleFileUpload(this);
        });

        $('.btn-address-search').on('click', function() {
            const target = $(this).data('target');
            if (target === 'office') {
                AjaxZip3.zip2addr('zip1', 'zip2', 's_office_address', 's_office_address');
            } else if (target === 'rep') {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 's_rep_address', 's_rep_address');
            }
        });

        $('.money-input').on('blur', function() {
            const val = $(this).val().replace(/[^0-9]/g, '');
            if(val) $(this).val(new Intl.NumberFormat('ja-JP').format(val));
        });

        this.form.on('submit', function(e) {
            e.preventDefault();
            self.handleSubmit('apply');
        });

        $('#btn-save-draft').on('click', function(e) {
            e.preventDefault();
            self.handleSubmit('draft');
        });
    }

    handleFileUpload(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            inputElement.value = ''; return;
        }

        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            inputElement.value = ''; return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\n選択されたファイルは請求書ではありませんか？";
        if (!window.confirm(confirmMsg)) {
            inputElement.value = ''; 
            $(inputElement).next('.file-name-display').text('');
            return;
        }
        $(inputElement).next('.file-name-display').text(file.name);
    }

    async handleSubmit(saveMode) {
        if (saveMode === 'apply' && !$('#company_name').val()) {
            ringiSystem.showNotification('商号（会社名）は必須です。', 'error');
            return;
        }

        const formData = new FormData(this.form[0]);
        formData.append('save_mode', saveMode);

        // --- PENANGANAN CHECKBOX s_books[] (Buku Akuntansi) ---
        let selectedBooks = [];
        $('input[name="s_books[]"]:checked').each(function() {
            selectedBooks.push($(this).val());
        });
        // Hapus format array bawaan HTML form
        formData.delete('s_books[]');
        // Set ke string gabungan (contoh: "1,4,99") agar sesuai varchar(30) di DB
        formData.set('s_books', selectedBooks.join(','));
        // --------------------------------------------------------

        // Bersihkan koma pada format uang sebelum kirim
        $('.money-input').each(function() {
            const name = $(this).attr('name');
            if(name) {
                const rawVal = $(this).val().replace(/,/g, '');
                formData.set(name, rawVal);
            }
        });
        
        // Gabungkan field yang terpisah menjadi satu sesuai standard schema DB
        formData.set('s_office_tel', `${$('input[name="tel1"]').val()}-${$('input[name="tel2"]').val()}-${$('input[name="tel3"]').val()}`);
        formData.set('s_office_pcode', `${$('input[name="zip1"]').val()}${$('input[name="zip2"]').val()}`);
        
        formData.set('s_rep_tel', `${$('input[name="rep_tel1"]').val()}-${$('input[name="rep_tel2"]').val()}-${$('input[name="rep_tel3"]').val()}`);
        formData.set('s_rep_pcode', `${$('input[name="rep_zip1"]').val()}${$('input[name="rep_zip2"]').val()}`);
        
        formData.set('s_rep_name', `${$('input[name="rep_name_sei"]').val()} ${$('input[name="rep_name_mei"]').val()}`.trim());
        formData.set('s_rep_kana', `${$('input[name="rep_kana_sei"]').val()} ${$('input[name="rep_kana_mei"]').val()}`.trim());
        
        formData.set('s_industry_type', `${$('select[name="cat1"]').val()}${$('input[name="cat2"]').val()}${$('input[name="cat3"]').val()}`);

        try {
            const response = await ringiSystem.apiRequest('POST', 'tax', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=tax`;
                }, 1500);
            } else {
                ringiSystem.showNotification(response.errors || response.error, 'error');
            }
        } catch (error) {
            ringiSystem.showNotification('System Error: ' + error.message, 'error');
        }
    }
}

$(document).ready(function() {
    new ContractFormHandler();
});