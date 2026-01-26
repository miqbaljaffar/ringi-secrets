var app = new Vue({
    el: '#app',
    data: {
        form: {
            // Header
            doc_type: 'contract',
            subject: '', // Akan diisi dari nama perusahaan secara otomatis atau manual
            applied_date: new Date().toISOString().slice(0, 10),

            // Basic Info
            corp_type: '1',
            company_name: '',
            company_kana: '',
            establishment_date: '',
            capital: '',

            // Industry
            industry_name: '',
            industry_cat_1: '', 
            industry_cat_2: '', 
            industry_cat_3: '', 
            industry_oms: '',

            // Tax
            closing_month: 3,
            declaration_type: 'blue',
            tax_place: '1',
            tax_office_name: '',
            tax_number: '',

            // Address (Office)
            zip1: '',
            zip2: '',
            address: '',
            address2: '',
            tel1: '',
            tel2: '',
            tel3: '',
            send_to: '1',
            send_to_others: '',

            // Representative
            rep_name_sei: '',
            rep_name_mei: '',
            rep_kana_sei: '',
            rep_kana_mei: '',
            rep_title: '1',
            rep_title_others: '',
            rep_email: '',
            rep_birth: '',
            
            // Representative Home Address (SYARAT WAJIB DB: t_tax)
            // Memastikan data ini sinkron dengan input baru di HTML
            rep_zip1: '',
            rep_zip2: '',
            rep_address: '',
            rep_address2: '',
            rep_tel1: '',
            rep_tel2: '',
            rep_tel3: '',

            // E-Filing & IDs
            e_filing: '2',
            e_filing_reason: '',
            national_tax_id: '',
            national_tax_pw: '',
            local_tax_id: '', 
            local_tax_pw: '', 

            // FINANCIALS
            fin_assets: '',
            fin_sales: '',
            fin_debt: '',
            fin_income: '',
            fin_workers: '',
            
            consumption_tax: '1', 
            trade_type: '0', 
            affiliated_company: '0', 
            
            // ACCOUNTING
            self_accounting: '1',
            self_accounting_others: '',
            accounting_soft: '1',
            accounting_soft_others: '',
            books: [], 
            books_others: '',
            slip_count: '',
            accounting_staff: '0',

            // Previous Accountant
            pre_accountant_exist: '0',
            pre_accountant_name: '',
            pre_reward_tax: '',
            pre_reward_account: '',

            // Contract Detail
            contract_type: '1',
            start_date: '',
            incharge_name: '',     
            incharge_begin: '',    
            incharge_close: '',    
            introducer_name: '',
            introducer_type: '0',
            background: '',

            // Files
            file_estimate: null
        },
        isSubmitting: false
    },

    filters: {
        formatNumber(val) {
            if (!val) return '';
            return new Intl.NumberFormat('ja-JP').format(val);
        }
    },

    computed: {
        isCorporate: function() {
            return this.form.corp_type === '1';
        }
    },

    mounted: function() {
        // Integrasi AutoKana untuk nama perusahaan
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
        }
    },

    methods: {
        /**
         * Fungsi pencarian alamat otomatis yang diperbarui.
         * @param {string} target 'office' atau 'home'
         */
        searchAddress: function(target) {
            if (window.AjaxZip3) {
                if (target === 'office') {
                    // Cari alamat kantor
                    AjaxZip3.zip2addr('zip1', 'zip2', 'address', 'address');
                } else if (target === 'home') {
                    // Cari alamat rumah perwakilan (Target ID input harus rep_zip1, rep_zip2, rep_address)
                    // Karena AjaxZip3 bekerja berdasarkan name attribute jika dipanggil seperti ini,
                    // Pastikan id atau name sesuai.
                    AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 'rep_address', 'rep_address');
                }
            } else {
                ringiSystem.showNotification("Library AjaxZip3 belum dimuat.", 'error');
            }
        },

        updateNumber: function(event, field) {
            let val = event.target.value.replace(/[^0-9]/g, '');
            this.form[field] = val;
            this.$forceUpdate();
        },

        handleFileUpload: function(event, fieldName) {
            this.form[fieldName] = event.target.files[0];
        },

        submitForm: function() {
            // Validasi Sederhana
            if (!this.form.company_name) return ringiSystem.showNotification('商号 (Nama Perusahaan) Wajib diisi', 'warning');
            if (!this.form.tax_office_name) return ringiSystem.showNotification('管轄税務署 (Kantor Pajak) Wajib diisi', 'warning');
            
            // Validasi Alamat Rumah yang sebelumnya hilang
            if (!this.form.rep_address) return ringiSystem.showNotification('代表者自宅住所 (Alamat Rumah Perwakilan) Wajib diisi', 'warning');

            this.isSubmitting = true;

            const formData = new FormData();
            
            // --- Pemetaan ke Database (Sinkronisasi Model Tax.php) ---
            formData.append('n_type', this.form.corp_type);
            formData.append('s_name', this.form.company_name);
            formData.append('s_kana', this.form.company_kana);
            formData.append('n_capital', this.form.capital || 0);
            formData.append('dt_establishment', this.form.establishment_date || '');

            // Gabungkan Kode Industri
            const indCode = (this.form.industry_cat_1 || '') + (this.form.industry_cat_2 || '') + (this.form.industry_cat_3 || '');
            formData.append('s_industry_type', indCode); 
            formData.append('s_industry', this.form.industry_name);
            formData.append('s_industry_oms', this.form.industry_oms || '0000');

            // Nama & Gelar Perwakilan
            formData.append('s_rep_name', (this.form.rep_name_sei + ' ' + this.form.rep_name_mei).trim());
            formData.append('s_rep_kana', (this.form.rep_kana_sei + ' ' + this.form.rep_kana_mei).trim());
            formData.append('s_rep_title', this.form.rep_title);
            formData.append('s_rep_title_others', this.form.rep_title_others);
            formData.append('s_rep_email', this.form.rep_email);
            formData.append('dt_rep_birth', this.form.rep_birth || '');
            
            // ALAMAT KANTOR
            const officePcode = (this.form.zip1 || '') + (this.form.zip2 || '');
            const officeTel = (this.form.tel1 || '') + '-' + (this.form.tel2 || '') + '-' + (this.form.tel3 || '');
            formData.append('s_office_pcode', officePcode); 
            formData.append('s_office_address', this.form.address);
            formData.append('s_office_address2', this.form.address2);
            formData.append('s_office_tel', officeTel);     
            formData.append('n_send_to', this.form.send_to);
            formData.append('s_send_to_others', this.form.send_to_others);

            // ALAMAT RUMAH PERWAKILAN (DIPERBAIKI)
            const repPcode = (this.form.rep_zip1 || '') + (this.form.rep_zip2 || '');
            const repTel = (this.form.rep_tel1 || '') + '-' + (this.form.rep_tel2 || '') + '-' + (this.form.rep_tel3 || '');
            formData.append('s_rep_pcode', repPcode);
            formData.append('s_rep_address', this.form.rep_address || '');
            formData.append('s_rep_address2', this.form.rep_address2 || '');
            formData.append('s_rep_tel', repTel);

            // Informasi Pajak
            formData.append('n_closing_month', this.form.closing_month);
            formData.append('s_tax_office', this.form.tax_office_name);
            formData.append('s_tax_num', this.form.tax_number);
            formData.append('n_tax_place', this.form.tax_place);
            formData.append('s_declaration_type', this.form.declaration_type);

            // E-Filing
            formData.append('n_e_filing', this.form.e_filing);
            formData.append('s_e_filing_reason', this.form.e_filing_reason);
            formData.append('s_national_tax_id', this.form.national_tax_id);
            formData.append('s_national_tax_pw', this.form.national_tax_pw);
            formData.append('s_local_tax_id', this.form.local_tax_id);
            formData.append('s_local_tax_pw', this.form.local_tax_pw);

            // Finansial
            formData.append('n_pre_total', this.form.fin_assets || 0);
            formData.append('n_pre_sales', this.form.fin_sales || 0);
            formData.append('n_pre_debt', this.form.fin_debt || 0);
            formData.append('n_pre_income', this.form.fin_income || 0);
            formData.append('n_pre_workers', this.form.fin_workers || 0);
            formData.append('n_consumption_tax', this.form.consumption_tax);
            formData.append('n_trade', this.form.trade_type);
            formData.append('n_affiliated_company', this.form.affiliated_company);

            // Accounting
            formData.append('n_self_accounting', this.form.self_accounting);
            formData.append('s_self_accounting_others', this.form.self_accounting_others);
            formData.append('n_accounting_apps', this.form.accounting_soft);
            formData.append('s_accounting_apps_others', this.form.accounting_soft_others);
            formData.append('s_books', this.form.books.join(','));
            formData.append('s_books_others', this.form.books_others);
            formData.append('n_slip_count', this.form.slip_count || 0);
            formData.append('n_accounting_staff', this.form.accounting_staff);

            // Kontrak
            formData.append('dt_contract_start', this.form.start_date);
            formData.append('s_incharge', this.form.incharge_name); 
            // Perbaikan Typo dari Analisis: s_incharge_bigin -> s_incharge_begin (jika di DB juga diubah)
            // Namun di sini saya tetap pakai 's_incharge_bigin' sesuai code lama agar tidak merusak DB yang sudah ada
            formData.append('s_incharge_bigin', this.form.incharge_begin || this.form.start_date); 
            formData.append('s_situation', this.form.background); 
            formData.append('s_introducer', this.form.introducer_name); 
            formData.append('n_introducer_type', this.form.introducer_type);
            formData.append('n_account_type', this.form.contract_type);

            if (this.form.file_estimate) {
                formData.append('estimate_file', this.form.file_estimate);
            }

            // Kirim ke API
            ringiSystem.apiRequest('POST', 'tax', formData, true)
                .then(response => {
                    if (response.success) {
                        ringiSystem.showNotification("Pengajuan Berhasil!", 'success');
                        setTimeout(() => {
                            window.location.href = 'detail.html?id=' + response.doc_id + '&type=tax';
                        }, 1500);
                    } else {
                        ringiSystem.showNotification(response.error || "Gagal menyimpan data", 'error');
                    }
                })
                .catch(err => {
                    ringiSystem.showNotification("Terjadi kesalahan jaringan: " + err.message, 'error');
                })
                .finally(() => {
                    this.isSubmitting = false;
                });
        }
    }
});