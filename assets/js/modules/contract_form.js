var app = new Vue({
    el: '#app',
    data: {
        form: {
            // Default Values
            applied_date: new Date().toISOString().slice(0, 10),
            doc_type: 'contract', 
            corp_type: '1',
            company_name: '',
            company_kana: '',
            establishment_date: '',
            capital: '',
            n_before: '', 

            industry_name: '',
            industry_cat_1: '', 
            industry_cat_2: '', 
            industry_cat_3: '', 
            industry_oms: '',

            closing_month: 3,
            declaration_type: 'A',
            tax_place: '1',
            tax_office_name: '',
            tax_number: '',

            zip1: '', zip2: '',
            address: '', address2: '',
            tel1: '', tel2: '', tel3: '',
            send_to: '1',
            send_to_others: '',

            rep_name_sei: '', rep_name_mei: '',
            rep_kana_sei: '', rep_kana_mei: '',
            rep_title: '1',
            rep_title_others: '',
            rep_email_exists: '1',
            rep_email: '',
            rep_birth: '',
            
            rep_zip1: '', rep_zip2: '',
            rep_address: '', rep_address2: '',
            rep_tel_exists: '1',
            rep_tel1: '', rep_tel2: '', rep_tel3: '',

            e_filing: '2',
            e_filing_reason: '',
            national_tax_id: '',
            national_tax_pw: '',
            local_tax_id: '', 
            local_tax_pw: '', 

            fin_assets: '',
            fin_sales: '',
            fin_debt: '',
            fin_income: '',
            fin_workers: '',
            consumption_tax: '1', 
            trade_type: '0', 
            affiliated_company: '0', 
            
            self_accounting: '1',
            self_accounting_others: '',
            accounting_soft: '1',
            accounting_soft_others: '',
            books: [], 
            books_others: '',
            slip_count: '',
            accounting_staff: '0',

            pre_accountant_status: '3', 
            pre_accountant_name: '',
            pre_account_type: '1',
            pre_reward_account: '',
            pre_reward_tax: '',
            pre_reward_yearly: '',

            contract_type: '1',
            contract_overview: '',
            start_date: '',
            incharge_begin: '',    
            incharge_close: '',    
            incharge_id: '',
            introducer_name: '',
            introducer_type: '0',
            introducer_type_others: '',
            background: '',

            file_estimate: null,
            file_others: null
        },
        bookOptions: [
            "現金出納帳", "預金出納帳", "売掛金元帳", "買掛金元帳", "手形記入帳",
            "固定資産台帳", "賃金台帳", "在庫表", "現金収支日報", "会計日記帳", "入出金・振替伝票"
        ],
        users: [], 
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
        },
        // Display Only (Tidak dikirim ke DB)
        generatedDocNo: function() {
            const prefix = 'CT';
            const date = new Date();
            const yymmdd = date.getFullYear().toString().slice(-2) +
                         ('0' + (date.getMonth() + 1)).slice(-2) +
                         ('0' + date.getDate()).slice(-2);
            return `${prefix}${yymmdd}..`; 
        }
    },

    mounted: function() {
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
        }
        // Mock Data User (Nantinya ambil dari API)
        this.users = [
            { id: '0001', name: '山田 太郎' },
            { id: '0036', name: '管理者 固定' }
        ];
    },

    methods: {
        searchAddress: function(target) {
            if (target === 'office') {
                AjaxZip3.zip2addr('zip1', 'zip2', 'address', 'address');
            } else {
                AjaxZip3.zip2addr('rep_zip1', 'rep_zip2', 'rep_address', 'rep_address');
            }
        },
        updateNumber: function(event, field) {
            // Hapus karakter non-digit untuk simpanan
            let val = event.target.value.replace(/[^0-9]/g, '');
            this.form[field] = val;
            this.$forceUpdate();
        },
        handleFileUpload: function(event, fieldName) {
            this.form[fieldName] = event.target.files[0];
        },
        
        // Helper untuk membersihkan data angka (mencegah error DB integer kosong)
        getInt(val) {
            if (val === '' || val === null || val === undefined) return '0';
            return val;
        },

        validateForm: function() {
            const f = this.form;
            const errors = [];
            const isReq = (val) => val && val.toString().trim() !== '';

            // 1. Basic Info (Red)
            if(!isReq(f.company_name)) errors.push("商号・屋号は必須です。");
            if(!isReq(f.company_kana)) errors.push("フリガナは必須です。");

            // 2. Corporate Specific (Purple)
            if (this.isCorporate) {
                if(!isReq(f.establishment_date)) errors.push("設立年月日は必須です（法人）。");
            }

            // 3. Industry & Tax (Red)
            if(!isReq(f.industry_name)) errors.push("業種名は必須です。");
            // Industry Codes
            if(!/^[A-T]$/.test(f.industry_cat_1)) errors.push("業種コード(大)はA~Tで入力してください。");
            if(!/^\d{2}$/.test(f.industry_cat_2)) errors.push("業種コード(中)は2桁の数値で入力してください。");
            if(!/^\d{1}$/.test(f.industry_cat_3)) errors.push("業種コード(小)は1桁の数値で入力してください。");
            if(!/^\d{4}$/.test(f.industry_oms)) errors.push("業種コード(OMS)は4桁の数値で入力してください。");

            if(!isReq(f.tax_office_name)) errors.push("管轄税務署は必須です。");
            if(!/^\d{8}$/.test(f.tax_number)) errors.push("納税Noは数値8桁で入力してください。");

            // 4. Address (Red)
            if(!/^\d{3}$/.test(f.zip1) || !/^\d{4}$/.test(f.zip2)) errors.push("事業所郵便番号は3桁-4桁で入力してください。");
            if(!isReq(f.address)) errors.push("事業所住所は必須です。");
            if(!isReq(f.tel1) || !isReq(f.tel2) || !isReq(f.tel3)) errors.push("事業所電話番号は必須です。");
            
            // Conditional: Send To Others
            if(f.send_to === '9' && !isReq(f.send_to_others)) errors.push("郵送先（その他）を入力してください。");

            // 5. Representative (Red)
            if(!isReq(f.rep_name_sei) || !isReq(f.rep_name_mei)) errors.push("代表者氏名は必須です。");
            if(!isReq(f.rep_kana_sei) || !isReq(f.rep_kana_mei)) errors.push("代表者フリガナは必須です。");
            if(f.rep_title === '9' && !isReq(f.rep_title_others)) errors.push("代表者肩書き（その他）を入力してください。");
            if(!isReq(f.rep_birth)) errors.push("代表者生年月日は必須です。");
            
            if(!/^\d{3}$/.test(f.rep_zip1) || !/^\d{4}$/.test(f.rep_zip2)) errors.push("代表者自宅郵便番号は3桁-4桁で入力してください。");
            if(!isReq(f.rep_address)) errors.push("代表者自宅住所は必須です。");

            if(!/^\d{16}$/.test(f.national_tax_id)) errors.push("国税利用者識別番号は数値16桁で入力してください。");
            if(!isReq(f.national_tax_pw)) errors.push("国税暗証番号は必須です。");

            // 7. Others (Conditional)
            if(f.self_accounting === '9' && !isReq(f.self_accounting_others)) errors.push("自計化状況（その他）を入力してください。");
            if(f.accounting_soft === '9' && !isReq(f.accounting_soft_others)) errors.push("会計ソフト（その他）を入力してください。");
            if(f.books.includes('99') && !isReq(f.books_others)) errors.push("帳簿（その他）を入力してください。");

            // 8. Contract (Red)
            if(!isReq(f.start_date)) errors.push("関与開始日は必須です。");
            if(!isReq(f.incharge_begin)) errors.push("開拓担当者は必須です。");
            if(!isReq(f.incharge_id)) errors.push("顧客担当者を選択してください。");
            if(f.introducer_type === '9' && !isReq(f.introducer_type_others)) errors.push("紹介者区分（その他）を入力してください。");
            if(!isReq(f.background)) errors.push("きっかけ（経緯）は必須です。");

            if (errors.length > 0) {
                // Tampilkan semua error dalam satu notifikasi (dipisah baris baru)
                ringiSystem.showNotification(errors.join("<br>"), 'error');
                return false;
            }
            return true;
        },

        submitForm: function() {
            if (!this.validateForm()) return;

            this.isSubmitting = true;
            const formData = new FormData();
            const f = this.form;
            const getInt = this.getInt; // Shortcut helper
            
            // --- Mapping Data ---
            formData.append('n_type', f.corp_type);
            formData.append('s_name', f.company_name);
            formData.append('s_kana', f.company_kana);
            formData.append('dt_establishment', f.establishment_date || ''); 
            formData.append('n_capital', getInt(f.capital));
            formData.append('n_before', getInt(f.n_before)); 
            
            formData.append('s_industry', f.industry_name);
            formData.append('s_industry_type', (f.industry_cat_1 || '') + (f.industry_cat_2 || '') + (f.industry_cat_3 || ''));
            formData.append('s_industry_oms', f.industry_oms);
            formData.append('s_declaration_type', f.declaration_type);
            formData.append('n_closing_month', getInt(f.closing_month));
            formData.append('n_tax_place', getInt(f.tax_place));
            formData.append('s_tax_office', f.tax_office_name);
            formData.append('s_tax_num', f.tax_number);
            formData.append('s_office_pcode', (f.zip1 || '') + (f.zip2 || ''));
            formData.append('s_office_address', f.address);
            formData.append('s_office_address2', f.address2 || '');
            formData.append('s_office_tel', `${f.tel1}-${f.tel2}-${f.tel3}`);
            
            formData.append('n_send_to', getInt(f.send_to));
            formData.append('s_send_to_others', f.send_to_others || '');
            
            formData.append('s_rep_name', (f.rep_name_sei || '') + ' ' + (f.rep_name_mei || ''));
            formData.append('s_rep_kana', (f.rep_kana_sei || '') + ' ' + (f.rep_kana_mei || ''));
            formData.append('s_rep_title', getInt(f.rep_title));
            formData.append('s_rep_title_others', f.rep_title_others || '');
            formData.append('dt_rep_birth', f.rep_birth || '');
            formData.append('s_rep_pcode', (f.rep_zip1 || '') + (f.rep_zip2 || ''));
            formData.append('s_rep_address', f.rep_address);
            formData.append('s_rep_address2', f.rep_address2 || '');
            formData.append('s_rep_tel', f.rep_tel_exists == '1' ? `${f.rep_tel1}-${f.rep_tel2}-${f.rep_tel3}` : 'なし');
            formData.append('s_rep_email', f.rep_email_exists == '1' ? f.rep_email : 'なし');

            formData.append('n_e_filing', getInt(f.e_filing));
            formData.append('s_e_filing_reason', f.e_filing_reason || '');
            formData.append('s_national_tax_id', f.national_tax_id || '');
            formData.append('s_national_tax_pw', f.national_tax_pw || '');
            formData.append('s_local_tax_id', f.local_tax_id || '');
            formData.append('s_local_tax_pw', f.local_tax_pw || '');

            formData.append('n_pre_total', getInt(f.fin_assets));
            formData.append('n_pre_sales', getInt(f.fin_sales));
            formData.append('n_pre_debt', getInt(f.fin_debt));
            formData.append('n_pre_income', getInt(f.fin_income));
            formData.append('n_pre_workers', getInt(f.fin_workers));
            formData.append('n_comsumption_tax', getInt(f.consumption_tax)); // Typo sesuai PDF
            formData.append('n_trade', getInt(f.trade_type));
            formData.append('n_affiliated_company', getInt(f.affiliated_company));

            formData.append('n_self_accounting', getInt(f.self_accounting));
            formData.append('s_self_accounting_others', f.self_accounting_others || '');
            formData.append('n_accounting_apps', getInt(f.accounting_soft));
            formData.append('s_accounting_apps_others', f.accounting_soft_others || '');
            formData.append('s_books', f.books.join(','));
            formData.append('s_books_others', f.books_others || '');
            formData.append('n_slip_count', getInt(f.slip_count));
            formData.append('n_accounting_staff', getInt(f.accounting_staff));

            formData.append('s_pre_accountant', f.pre_accountant_status == '1' ? f.pre_accountant_name : (f.pre_accountant_status == '2' ? '税理士関与なし' : '新規開業'));
            formData.append('n_pre_account_type', getInt(f.pre_account_type));
            formData.append('n_rewards_account', getInt(f.pre_reward_account));
            formData.append('n_rewards_tax', getInt(f.pre_reward_tax));
            formData.append('n_rewards_yearly', getInt(f.pre_reward_yearly));

            formData.append('n_account_type', getInt(f.contract_type));
            formData.append('s_contract_overview', f.contract_overview || '');
            formData.append('dt_contract_start', f.start_date || '');
            formData.append('s_incharge_bigin', f.incharge_begin || ''); 
            formData.append('s_incharge_close', f.incharge_close || '');
            formData.append('s_incharge', f.incharge_id);
            formData.append('s_introducer', f.introducer_name || 'なし');
            formData.append('n_introducer_type', getInt(f.introducer_type));
            formData.append('s_introducer_type_others', f.introducer_type_others || '');
            formData.append('s_situation', f.background);

            if (f.file_estimate) formData.append('estimate_file', f.file_estimate);
            if (f.file_others) formData.append('others_file', f.file_others);

            ringiSystem.apiRequest('POST', 'tax', formData, true)
                .then(res => {
                    if (res.success) {
                        ringiSystem.showNotification("申請が完了しました", 'success');
                        setTimeout(() => {
                            window.location.href = 'detail.html?id=' + res.doc_id + '&type=tax';
                        }, 1500);
                    }
                })
                .catch(err => {
                    console.error("Submission Error:", err);
                    ringiSystem.showNotification("エラーが発生しました: " + err.message, 'error');
                })
                .finally(() => this.isSubmitting = false);
        }
    }
});