class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.setDefaultValues();
        this.bindEvents();
        
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
        }
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('apply-date').value = today;
        
        if (ringiSystem.user) {
            document.getElementById('applicant-name').value = ringiSystem.user.name;
        }
    }

    bindEvents() {
        // --- MODIFIKASI: Submit (Apply) ---
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.handleSubmit('apply');
        });

        // --- MODIFIKASI: Draft ---
        const draftBtn = document.getElementById('btn-save-draft');
        if(draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit('draft');
            });
        }
    }

    // --- MODIFIKASI: Reusable Handler ---
    async handleSubmit(saveMode) {
        // Validasi jika Apply
        if (saveMode === 'apply') {
            if (!this.form.checkValidity()) {
                this.form.reportValidity();
                return;
            }
        }

        const formData = new FormData(this.form);
        formData.append('save_mode', saveMode); // PENTING

        const repName = `${formData.get('s_rep_name_1')} ${formData.get('s_rep_name_2')}`;
        formData.set('s_rep_name', repName);
        
        const tel = `${formData.get('tel1')}-${formData.get('tel2')}-${formData.get('tel3')}`;
        formData.set('s_office_tel', tel);

        try {
            const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました (Draft Tersimpan)' : '申請が完了しました (Berhasil Diajukan)';
                ringiSystem.showNotification(msg + ' ID: ' + response.doc_id, 'success');
                
                setTimeout(() => {
                    window.location.href = `/pages/detail.html?id=${response.doc_id}&type=vendor`;
                }, 1500);
            } else {
                if (response.errors) {
                    ringiSystem.showNotification(response.errors, 'error');
                } else {
                    ringiSystem.showNotification(response.error || 'Gagal menyimpan.', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            ringiSystem.showNotification('Gagal mengirim data.', 'error');
        }
    }
}

new VendorFormHandler();