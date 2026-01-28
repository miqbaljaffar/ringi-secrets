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
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(this.form);
            
            const repName = `${formData.get('s_rep_name_1')} ${formData.get('s_rep_name_2')}`;
            formData.set('s_rep_name', repName);
            
            const tel = `${formData.get('tel1')}-${formData.get('tel2')}-${formData.get('tel3')}`;
            formData.set('s_office_tel', tel);

            try {
                const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
                
                if (response.success) {
                    ringiSystem.showNotification('Pengajuan berhasil! ID: ' + response.doc_id, 'success');
                    
                    setTimeout(() => {
                        window.location.href = `/pages/detail.html?id=${response.doc_id}&type=vendor`;
                    }, 1500);
                } else {
                    // PERBAIKAN: Handle validation error
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
        });
    }
}

new VendorFormHandler();