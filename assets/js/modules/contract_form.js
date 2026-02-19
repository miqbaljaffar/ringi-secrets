class ContractFormHandler {
    constructor() {
        this.form = $('#contract-form'); // Pastikan ID form di HTML adalah 'contract-form'
        // Jika form tidak ditemukan, hentikan
        if (this.form.length === 0) return;

        this.init();
    }

    init() {
        this.setDefaultValues();
        this.bindEvents();
        this.setupAutoKana();
    }

    setDefaultValues() {
        // Set tanggal hari ini jika kosong
        const today = new Date().toISOString().split('T')[0];
        const dateInput = $('#applied_date');
        if (dateInput.val() === '') {
            dateInput.val(today);
        }
        
        // Trigger perubahan awal untuk radio button (tampil/sembunyi field)
        $('input[name="corp_type"]:checked').trigger('change');
    }

    setupAutoKana() {
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
        }
    }

    bindEvents() {
        const self = this;

        // 1. Event Upload File dengan Peringatan Invoice
        $('input[type="file"]').on('change', function(e) {
            self.handleFileUpload(this);
        });

        // 2. Toggle Perusahaan vs Perorangan
        $('input[name="corp_type"]').on('change', function() {
            const val = $(this).val();
            self.toggleCorporateFields(val);
        });

        // 3. Auto Address (AjaxZip3)
        // Pastikan input zip memiliki class 'pcode-input' atau id spesifik
        $('.btn-address-search').on('click', function() {
            const target = $(this).data('target'); // office atau rep
            if (target === 'office') {
                AjaxZip3.zip2addr('zip1', 'zip2', 'address', 'address');
            } else if (target === 'rep') {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 'rep_address', 'rep_address');
            }
        });

        // 4. Format Angka (Ribuan) saat ketik
        $('.money-input').on('blur', function() {
            const val = $(this).val().replace(/[^0-9]/g, '');
            if(val) {
                $(this).val(new Intl.NumberFormat('ja-JP').format(val));
            }
        });

        // 5. Submit Handler (Apply)
        this.form.on('submit', function(e) {
            e.preventDefault();
            self.handleSubmit('apply');
        });

        // 6. Draft Handler
        $('#btn-save-draft').on('click', function(e) {
            e.preventDefault();
            self.handleSubmit('draft');
        });
    }

    toggleCorporateFields(type) {
        // type 1 = Corporate (Badan Hukum), 2 = Individual
        if (type == '1') {
            $('.corporate-only').show();
            $('.corporate-only input').prop('required', true);
        } else {
            $('.corporate-only').hide();
            $('.corporate-only input').prop('required', false);
        }
    }

    // --- LOGIC UTAMA PERMINTAAN ANDA ---
    handleFileUpload(inputElement) {
        const file = inputElement.files[0];
        if (!file) return;

        // 1. Validasi Ukuran (Max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            inputElement.value = ''; // Reset input
            return;
        }

        // 2. Validasi Tipe (PDF Only)
        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            inputElement.value = ''; // Reset input
            return;
        }

        // 3. Peringatan Keras (Invoice) - Window Confirm
        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\n選択されたファイルは請求書ではありませんか？\n(Perhatian: Dilarang melampirkan invoice. Apakah Anda yakin file ini BUKAN invoice?)";
        
        if (!window.confirm(confirmMsg)) {
            // Jika user klik Cancel (artinya mungkin itu invoice)
            inputElement.value = ''; // Hapus file
            return;
        }

        // Jika user klik OK
        // Tampilkan nama file di label sebelah tombol (opsional)
        $(inputElement).next('.file-name-display').text(file.name);
    }

    async handleSubmit(saveMode) {
        // Validasi HTML5 standar
        if (saveMode === 'apply') {
            // Validasi manual tambahan jika perlu
            if (!$('#company_name').val()) {
                ringiSystem.showNotification('商号（会社名）は必須です。', 'error');
                return;
            }
            
            // Cek file estimasi (Wajib)
            if ($('#file_estimate')[0].files.length === 0) {
                 ringiSystem.showNotification('見積書(PDF)の添付は必須です。', 'error');
                 return;
            }
        } else {
            // Draft: Minimal harus ada nama perusahaan
            if (!$('#company_name').val()) {
                ringiSystem.showNotification('下書き保存の場合も、商号（会社名）は必須です。', 'warning');
                return;
            }
        }

        const formData = new FormData(this.form[0]);
        formData.append('save_mode', saveMode);

        // Membersihkan format angka (hapus koma) sebelum kirim
        $('.money-input').each(function() {
            const name = $(this).attr('name');
            const rawVal = $(this).val().replace(/,/g, '');
            formData.set(name, rawVal);
        });
        
        // Gabung field telepon dll jika terpisah di HTML
        const tel = `${$('input[name="tel1"]').val()}-${$('input[name="tel2"]').val()}-${$('input[name="tel3"]').val()}`;
        formData.set('s_office_tel', tel);

        try {
            const response = await ringiSystem.apiRequest('POST', 'tax', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `/pages/detail.html?id=${response.doc_id}&type=tax`;
                }, 1500);
            } else {
                if(response.errors) {
                    ringiSystem.showNotification(response.errors, 'error');
                } else {
                    ringiSystem.showNotification(response.error, 'error');
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            ringiSystem.showNotification('Gagal mengirim data: ' + error.message, 'error');
        }
    }
}

// Inisialisasi saat dokumen siap
$(document).ready(function() {
    new ContractFormHandler();
});