class VendorFormHandler {
    constructor() {
        this.form = document.getElementById('vendor-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.generateDocumentNumber();
        this.setDefaultValues();
        this.bindEvents();
        this.initToggles();
        
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
            // Tambahan autoKana untuk Nama Representative
            $.fn.autoKana('#rep_name_sei', '#rep_kana_sei', { katakana: true });
            $.fn.autoKana('#rep_name_mei', '#rep_kana_mei', { katakana: true });
        }
    }

    generateDocumentNumber() {
        const now = new Date();
        const yymmdd = now.getFullYear().toString().slice(-2) +
                     ('0' + (now.getMonth() + 1)).slice(-2) +
                     ('0' + now.getDate()).slice(-2);
        
        const docIdEl = document.getElementById('id_doc'); 
        if (docIdEl) docIdEl.value = `CV${yymmdd}..`; // Hanya placeholder visual, diurus backend.
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('apply-date').value = today;
        
        if (ringiSystem.user) {
            document.getElementById('applicant-name').value = ringiSystem.user.name;
        }
    }

    initToggles() {
        // Trigger kondisi awal radio button
        $('input[name="n_send_to"]:checked').trigger('change');
        $('input[name="s_rep_title"]:checked').trigger('change');
    }

    bindEvents() {
        const self = this;

        // Toggle "Lainnya" untuk Pengiriman
        $('input[name="n_send_to"]').on('change', function() {
            if ($(this).val() === '9') {
                $('.send-to-others-group').slideDown();
                $('input[name="s_send_to_others"]').prop('required', true);
            } else {
                $('.send-to-others-group').slideUp();
                $('input[name="s_send_to_others"]').prop('required', false).val('');
            }
        });

        // Toggle "Lainnya" untuk Jabatan
        $('input[name="s_rep_title"]').on('change', function() {
            if ($(this).val() === '9') {
                $('.rep-title-others-group').slideDown();
                $('input[name="s_rep_title_others"]').prop('required', true);
            } else {
                $('.rep-title-others-group').slideUp();
                $('input[name="s_rep_title_others"]').prop('required', false).val('');
            }
        });

        // Handler Upload File dengan Peringatan Invoice
        $('#estimate_file').on('change', function(e) {
            self.handleFileUpload(e);
        });

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

    handleFileUpload(event) {
        const file = event.target.files[0];
        const displaySpan = document.getElementById('file-name-display');

        if (!file) {
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            displaySpan.textContent = '選択されていません';
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            displaySpan.textContent = '選択されていません';
            return;
        }
        
        displaySpan.textContent = file.name;
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

        // Gabungkan Marga (Sei) dan Nama Depan (Mei) agar sesuai validasi backend
        const repName = `${formData.get('rep_name_sei')} ${formData.get('rep_name_mei')}`.trim();
        formData.set('s_rep_name', repName);
        
        // Gabungkan Kana Marga (Sei) dan Kana Nama Depan (Mei) agar sesuai validasi backend
        const repKana = `${formData.get('rep_kana_sei')} ${formData.get('rep_kana_mei')}`.trim();
        formData.set('s_rep_kana', repKana);

        // Nomor telepon dikirim sebagai gabungan
        const tel = `${formData.get('tel1')}-${formData.get('tel2')}-${formData.get('tel3')}`;
        formData.set('s_office_tel', tel);

        // --- TAMBAHAN BARU: Gabungkan Kode Pos (Zip Code) ---
        if (formData.has('zip1') && formData.has('zip2')) {
            const zipCode = `${formData.get('zip1')}-${formData.get('zip2')}`;
            formData.set('s_office_zip', zipCode); // Sesuaikan key 's_office_zip' dengan nama kolom di database jika berbeda
        }

        // Hapus property sementara agar payload lebih bersih
        formData.delete('rep_name_sei');
        formData.delete('rep_name_mei');
        formData.delete('rep_kana_sei');
        formData.delete('rep_kana_mei');
        formData.delete('tel1');
        formData.delete('tel2');
        formData.delete('tel3');
        formData.delete('zip1');
        formData.delete('zip2');

        try {
            const response = await ringiSystem.apiRequest('POST', 'vendor', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書きを保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=vendor`;
                }, 1500);
            } else {
                if (response.errors) {
                    // Jika error validasi dari Validator.php
                    const errorMsgs = Object.values(response.errors).flat().join('\n');
                    ringiSystem.showNotification(errorMsgs, 'error');
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

$(document).ready(function() {
    new VendorFormHandler();
});