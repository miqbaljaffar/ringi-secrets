class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        // 修正: ドキュメント番号生成関数を呼び出す
        this.generateDocumentNumber();
        this.setDefaultValues();
        this.bindEvents();
        
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
        }
    }

    // 修正: ドキュメントID番号生成関数（プレフィックスCV）を追加
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
        
        if (ringiSystem.user) {
            document.getElementById('applicant-name').value = ringiSystem.user.name;
        }
    }

    bindEvents() {
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

    async handleSubmit(saveMode) {
        if (saveMode === 'apply') {
            if (!this.form.checkValidity()) {
                this.form.reportValidity();
                return;
            }
        }

        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode); 

        const repName = `${formData.get('s_rep_name_1')} ${formData.get('s_rep_name_2')}`;
        formData.set('s_rep_name', repName);
        
        const tel = `${formData.get('tel1')}-${formData.get('tel2')}-${formData.get('tel3')}`;
        formData.set('s_office_tel', tel);

        try {
            const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg + ' ID: ' + response.doc_id, 'success');
                
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=vendor`;
                }, 1500);
            } else {
                if (response.errors) {
                    ringiSystem.showNotification(response.errors, 'error');
                } else {
                    ringiSystem.showNotification(response.error || '保存に失敗しました。', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            ringiSystem.showNotification('データ送信に失敗しました。', 'error');
        }
    }
}

new VendorFormHandler();