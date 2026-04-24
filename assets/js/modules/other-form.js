class OtherFormHandler {
    constructor() {
        this.form = document.getElementById('other-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.generateDocumentNumber();
        this.setDefaultValues();
        this.loadEmployees();
        this.bindEvents();
        
        // Inisialisasi AutoKana
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }

        this.initToggles();
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

    initToggles() {
        // Trigger default state toggle di awal render
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
}

$(document).ready(function() {
    if (document.getElementById('other-form')) {
        window.otherFormHandler = new OtherFormHandler();
    }
});