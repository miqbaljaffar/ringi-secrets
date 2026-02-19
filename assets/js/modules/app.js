class AppHandler {
    constructor() {
        // Menggunakan selector #app form atau ID form spesifik jika ada
        this.container = $('#app');
        this.form = this.container.find('form');
        
        // Jika tidak ada form di dalam #app, mungkin #app itu sendiri adalah form atau container utama
        if (this.form.length === 0) this.form = this.container;

        this.init();
    }

    init() {
        this.setDefaultValues();
        this.bindEvents();
        this.setupAutoKana();
        
        // Trigger kondisi awal untuk radio button (Corporate/Individual)
        $('input[name="corp_type"]:checked').trigger('change');
    }

    setDefaultValues() {
        // Set tanggal hari ini jika kosong
        const dateInput = $('input[name="applied_date"]');
        if (dateInput.length > 0 && !dateInput.val()) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.val(today);
        }
    }

    setupAutoKana() {
        // Integrasi jquery.autoKana.js
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
        }
    }

    bindEvents() {
        const self = this;

        // 1. Toggle Tampilan Perusahaan vs Perorangan
        $('input[name="corp_type"]').on('change', function() {
            const val = $(this).val();
            // Asumsi field khusus korporasi memiliki class 'corporate-only'
            // atau logika manual berdasarkan ID jika class belum diset di HTML
            if (val === '1') {
                // Tampilkan field khusus korporasi (contoh: establishment_date, capital)
                $('.corporate-only').show();
            } else {
                $('.corporate-only').hide();
            }
        });

        // 2. Auto Address (AjaxZip3)
        // Tombol search address harus memiliki class .btn-address-search
        $('.btn-address-search').on('click', function() {
            // Deteksi apakah ini untuk alamat kantor atau alamat representatif
            // Cek elemen zip mana yang terkait (zip1 atau rep_zip1)
            const parent = $(this).closest('.form-group-address'); // Asumsi struktur wrapper
            
            // Fallback sederhana jika struktur HTML tidak diketahui:
            // Cek nama input sebelumnya
            const prevInputName = $(this).prev().attr('name') || '';
            
            if (prevInputName.includes('rep_') || $(this).data('type') === 'rep') {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 'rep_address', 'rep_address');
            } else {
                AjaxZip3.zip2addr('zip1', 'zip2', 'address', 'address');
            }
        });

        // 3. Format Uang (Ribuan)
        // Input uang harus punya class .money-input atau dideteksi dari name
        $('input[name^="fee_"], input[name^="fin_"], input[name="capital"]').on('blur', function() {
            const val = $(this).val().replace(/[^0-9]/g, '');
            if (val) {
                $(this).val(new Intl.NumberFormat('ja-JP').format(val));
            }
        });

        // 4. File Upload Handler (Dengan Peringatan Invoice)
        $('input[type="file"]').on('change', function() {
            self.handleFileUpload(this);
        });

        // 5. Submit Form
        // Meng-handle tombol submit atau event submit form
        this.container.on('click', '#btn-submit, button[type="submit"]', function(e) {
            e.preventDefault();
            self.submitForm();
        });
    }

    handleFileUpload(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        // Pengecekan standar (Ukuran/Tipe) bisa ditambahkan di sini
        // ...

        // --- MODIFIKASI: Peringatan Invoice (Sesuai Request) ---
        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\n選択されたファイルは請求書ではありませんか？\n(Perhatian: Dilarang melampirkan invoice. Apakah Anda yakin file ini BUKAN invoice?)";
        
        if (!window.confirm(confirmMsg)) {
            // Jika user klik Cancel, reset input file
            inputElement.value = '';
            // Jika ada elemen penampung nama file, kosongkan juga
            $(inputElement).next('.file-name-display').text(''); 
            return;
        }

        // Jika OK, tampilkan nama file (opsional)
        console.log("File accepted:", file.name);
    }

    submitForm() {
        // Validasi Sederhana (Menggantikan Vue logic)
        const subject = $('input[name="subject"]').val();
        const companyName = $('input[name="company_name"]').val();
        const taxOffice = $('input[name="tax_office_name"]').val();

        if (!subject) {
            alert('件名を入力してください。');
            return;
        }
        if (!companyName) {
            alert('商号（会社名）を入力してください。');
            return;
        }
        if (!taxOffice) {
            alert('管轄税務署を入力してください。');
            return;
        }

        console.log("SENDING DATA (jQuery Version)...");
        alert("入力内容に問題はありません。送信準備が完了しました。");
    }
}

// Inisialisasi saat dokumen siap
$(document).ready(function() {
    new AppHandler();
});