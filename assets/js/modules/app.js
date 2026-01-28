var app = new Vue({
    el: '#app',
    data: {
        form: {
            // --- ヘッダー情報 ---
            doc_type: 'contract',
            contract_category: 'tax', // tax：税務 / customer：顧客 / vendor：仕入先
            subject: '',
            applied_date: new Date().toISOString().slice(0, 10), // 本日の日付を初期値として設定

            // --- 会社基本情報 ---
            corp_type: '1', // 1：法人 / 2：個人事業主
            company_name: '',
            company_kana: '',
            establishment_date: '',
            capital: '',
            
            // --- 税務・業種情報 ---
            industry_name: '',
            closing_month: 3, // 決算月（初期値：3月）
            declaration_type: 'blue',
            tax_office_name: '',
            tax_number: '',
            
            // --- 事業所住所 ---
            zip1: '',
            zip2: '',
            address: '',
            address2: '',
            tel1: '',
            tel2: '',
            tel3: '',

            // --- 代表者情報 ---
            rep_name: '',
            rep_kana: '',
            rep_title: '1', // 1：代表取締役
            rep_birth: '',
            rep_address: '',
            rep_tel: '',
            rep_tel_none: false,

            // --- 財務情報 ---
            fin_assets: '',
            fin_sales: '',
            fin_profit: '',
            fin_workers: '',
            consumption_tax: '1', // 1：原則課税
            accounting_soft: '1', // 1：TKC

            // --- 契約内容 ---
            contract_type: '1', // 1：月額契約
            fee_accounting: '',
            fee_tax: '',
            start_date: '',
            background: '',

            // --- 添付ファイル ---
            file_estimate: null
        },
        isSubmitting: false
    },

    computed: {
        // 法人かどうかを判定するためのヘルパー
        isCorporate: function() {
            return this.form.corp_type === '1';
        }
    },

    mounted: function() {
        // 会社名からカナを自動生成
        if ($.fn.autoKana) {
            $.fn.autoKana('#company_name', '#company_kana', { katakana: true });
        }
    },

    methods: {
        // 郵便番号から住所を自動取得（AjaxZip3）
        searchAddress: function() {
            AjaxZip3.zip2addr('zip1', 'zip2', 'address', 'address');
        },

        // 金額入力をカンマ区切りでフォーマット
        formatFee: function(field, event) {
            let val = event.target.value.replace(/[^0-9]/g, '');
            if (val) {
                this.form[field] = new Intl.NumberFormat('ja-JP').format(val);
            } else {
                this.form[field] = '';
            }
            // Vueの再描画を明示的に実行
            this.$forceUpdate();
        },

        // ファイル選択時の処理
        handleFileUpload: function(event, fieldName) {
            this.form[fieldName] = event.target.files[0];
        },

        submitForm: function() {
            // 最低限の入力チェック
            if (!this.form.subject) {
                return alert('件名を入力してください。');
            }
            if (!this.form.company_name) {
                return alert('商号（会社名）を入力してください。');
            }
            if (!this.form.tax_office_name) {
                return alert('管轄税務署を入力してください。');
            }

            this.isSubmitting = true;
            
            // 送信データ確認用（仮）
            console.log("SENDING DATA:", JSON.parse(JSON.stringify(this.form)));
            alert("入力内容に問題はありません。送信準備が完了しました。");
            
            this.isSubmitting = false;
        }
    }
});
