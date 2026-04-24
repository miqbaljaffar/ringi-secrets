class OtherFormHandler {
    constructor() {
        this.form = document.getElementById('other-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        // 修正: ドキュメント番号生成関数を呼び出す
        this.generateDocumentNumber();
        this.setDefaultValues();
        this.loadEmployees();
        this.bindEvents();
        
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
        }
    }

    // 修正: ドキュメントID生成関数（プレフィックス CO）を追加
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
        
        if (ringiSystem.user) {
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
                { id_worker: '0001', s_name: 'Yamada Taro' },
                { id_worker: '0002', s_name: 'Suzuki Ichiro' },
                { id_worker: '0036', s_name: 'Admin Contract' }
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

    bindEvents() {
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

        // Toggle state untuk Email Rep
        $('input[name="rep_email_exists"]').on('change', function() {
            if ($(this).val() === '0') {
                $('input[name="s_rep_email"]').prop('disabled', true).val('');
            } else {
                $('input[name="s_rep_email"]').prop('disabled', false);
            }
        });

        // Toggle state untuk Introducer
        $('input[name="n_introducer_type"]').on('change', function() {
            if ($(this).val() === '0') {
                $('input[name="s_introducer"]').prop('disabled', true).val('');
            } else {
                $('input[name="s_introducer"]').prop('disabled', false);
            }
        });

        // Handler untuk tampilan nama file saat upload
        $('#file-upload').on('change', function() {
            var fileName = $(this).val().split('\\').pop();
            if (fileName) {
                $('#file-name-display').text('📄 ' + fileName);
            } else {
                $('#file-name-display').text('選択されていません');
            }
        });

        // Trigger kondisi default pada saat render pertama kali
        $('input[name="rep_email_exists"]:checked').trigger('change');
        $('input[name="n_introducer_type"]:checked').trigger('change');
    }

    async handleSubmit(saveMode) {
        if (saveMode === 'apply') {
             if (!this.form.checkValidity()) {
                this.form.reportValidity();
                return;
            }
        }

        this.combineFields();

        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode); 
        
        const zip1 = formData.get('zip1') || '';
        const zip2 = formData.get('zip2') || '';
        formData.set('s_office_pcode', zip1 + zip2);

        const tel1 = formData.get('tel1') || '';
        const tel2 = formData.get('tel2') || '';
        const tel3 = formData.get('tel3') || '';
        formData.set('s_office_tel', `${tel1}-${tel2}-${tel3}`);

        if(formData.get('rep_name_sei') && formData.get('rep_name_mei')) {
            const repName = `${formData.get('rep_name_sei')} ${formData.get('rep_name_mei')}`;
            formData.set('s_rep_name', repName.trim());
        }
        
        if(formData.get('rep_kana_sei') && formData.get('rep_kana_mei')) {
            const repKana = `${formData.get('rep_kana_sei')} ${formData.get('rep_kana_mei')}`;
            formData.set('s_rep_kana', repKana.trim());
        }

        try {
            const response = await ringiSystem.apiRequest('POST', 'others', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=others`;
                }, 1500);
            } else {
                if (response.errors) {
                    ringiSystem.showNotification(response.errors, 'error');
                } else {
                    ringiSystem.showNotification(response.error, 'error');
                }
            }
        } catch (error) {
            console.error('送信エラー:', error);
            ringiSystem.showNotification(error.message || 'データ送信に失敗しました。', 'error');
        }
    }

    combineFields() {
        const t1 = this.form.querySelector('[name="s_industry_type_1"]')?.value || '';
        const t2 = this.form.querySelector('[name="s_industry_type_2"]')?.value || '';
        const t3 = this.form.querySelector('[name="s_industry_type_3"]')?.value || '';
        
        const combinedType = t1 + t2 + t3;

        let hiddenInput = this.form.querySelector('input[name="s_industry_type"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 's_industry_type';
            this.form.appendChild(hiddenInput);
        }
        hiddenInput.value = combinedType;
    }
}

new OtherFormHandler();