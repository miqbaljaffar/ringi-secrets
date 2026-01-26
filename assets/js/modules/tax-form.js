class TaxFormHandler {
    constructor() {
        this.form = document.getElementById('tax-form');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.bindEvents();
        this.setupAutoAddress(); // Setup AjaxZip3
        this.setDefaultValues();
    }
    
    bindEvents() {
        // 1. Handle Form Submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // 2. Toggle Perusahaan vs Perorangan (n_type)
        const typeRadios = document.querySelectorAll('input[name="n_type"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleCompanyFields(e.target.value);
            });
        });

        // 3. Auto Kana (Nama Perusahaan -> Kana)
        // Memerlukan jquery.autoKana.js
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', {
                katakana: true
            });
            $.fn.autoKana('#s_rep_name', '#s_rep_kana', {
                katakana: true
            });
        }
    }

    // Setup library AjaxZip3 untuk alamat otomatis
    setupAutoAddress() {
        // Event listener untuk input kode pos
        const pcodeInputs = document.querySelectorAll('.pcode-input');
        pcodeInputs.forEach(input => {
            input.addEventListener('keyup', (e) => {
                // Contoh implementasi sederhana memanggil library global
                if(window.AjaxZip3 && e.target.value.length >= 7) {
                    AjaxZip3.zip2addr(e.target, '', 's_office_address', 's_office_address');
                }
            });
        });
    }

    toggleCompanyFields(type) {
        // Tampilkan/Sembunyikan field khusus korporasi (n_type = 1)
        const companyOnlyFields = document.querySelectorAll('.company-only');
        companyOnlyFields.forEach(field => {
            if (type == 1) {
                field.style.display = 'block';
                // Tambahkan required attribute kembali jika diperlukan
            } else {
                field.style.display = 'none';
                // Hapus required attribute agar validasi HTML5 tidak memblokir
            }
        });
    }

    setDefaultValues() {
        // Set tanggal hari ini
        const dateFields = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateFields.forEach(field => {
            if (!field.value) field.value = today;
        });
    }

    async handleSubmit() {
        // Validasi frontend sederhana
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        const formData = new FormData(this.form);
        
        try {
            // Gunakan metode helper dari main.js (ringiSystem)
            const response = await ringiSystem.apiRequest('POST', 'tax', formData, true);
            
            if (response.success) {
                ringiSystem.showNotification('Aplikasi berhasil dikirim!', 'success');
                setTimeout(() => {
                    window.location.href = `/pages/view-document.html?id=${response.doc_id}`;
                }, 1500);
            }
        } catch (error) {
            console.error('Error submitting tax form:', error);
            ringiSystem.showNotification('Gagal mengirim aplikasi.', 'error');
        }
    }
}

// Global exposure agar bisa dipanggil main.js
window.TaxFormHandler = TaxFormHandler;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tax-form')) {
        new TaxFormHandler();
    }
});