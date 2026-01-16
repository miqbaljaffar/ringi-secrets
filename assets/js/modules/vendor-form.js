class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.setDefaultValues();
        this.bindEvents();
        
        // AutoKana
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
            
            // Gabung field nama/telp jika backend minta string gabungan
            // Contoh sederhana:
            const formData = new FormData(this.form);
            
            // Gabung Nama Perwakilan
            const repName = `${formData.get('s_rep_name_1')} ${formData.get('s_rep_name_2')}`;
            formData.set('s_rep_name', repName);
            
            // Gabung Telp
            const tel = `${formData.get('tel1')}-${formData.get('tel2')}-${formData.get('tel3')}`;
            formData.set('s_office_tel', tel);

            try {
                const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
                
                if (response.success) {
                    alert('Pengajuan berhasil! ID: ' + response.doc_id);
                    window.location.href = `/pages/view-document.html?id=${response.doc_id}&type=vendor`;
                }
            } catch (error) {
                console.error(error);
                alert('Gagal mengirim data.');
            }
        });
    }
}

new VendorFormHandler();