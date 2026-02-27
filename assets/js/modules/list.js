class ListHandler {
    constructor() {
        this.currentTab = 'all';
        this.filters = {
            keyword: '',
            date_start: '',
            date_end: '',
            form_type: '',
            n_category: '', 
            payer: ''       
        };

        this.$container = $('#list-container'); 
        this.$containerSP = $('#list-container-sp'); 

        this.$loading = $('#loading-indicator');
        this.$empty = $('#empty-state');
        
        this.init();
    }

    // 初期化関数 - タブの初期状態設定、イベントのバインド、データの取得を行う
    init() {
        this.bindEvents();
        this.setInitialState(); 
    }

    // タブの初期状態を設定し、ユーザーの権限に応じて適切なタブを表示する関数
    setInitialState() {
        const sessionUser = sessionStorage.getItem('user');
        const user = sessionUser ? JSON.parse(sessionUser) : ringiSystem.user;
        
        if (user && user.role >= 1) {
            this.currentTab = 'to_approve';
            $('.tab-btn').removeClass('active');
            $('.tab-btn[data-tab="to_approve"]').addClass('active');
        } else {
            this.currentTab = $('.tab-btn.active').data('tab') || 'all';
        }

        this.fetchData();
        this.fetchPendingCount();
    }

    // タブのクリックイベントや検索ボタンのイベントをバインドする関数
    bindEvents() {
        const self = this;

        $('.tab-btn').on('click', function() {
            $('.tab-btn').removeClass('active');
            $(this).addClass('active');
            
            self.currentTab = $(this).data('tab');
            self.fetchData();
        });

        $('#btn-search').on('click', function(e) {
            e.preventDefault();
            self.updateFilters();
            self.fetchData();
        });

        $('#search-keyword').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                $('#btn-search').click();
            }
        });
    }

    // フィルタの値を更新する関数 - ユーザーが入力した検索キーワードや日付範囲、フォームタイプなどを取得してフィルタオブジェクトに保存する
    updateFilters() {
        this.filters.keyword = $('#search-keyword').val() || '';
        this.filters.date_start = $('input[name="date_start"]').val() || '';
        this.filters.date_end = $('input[name="date_end"]').val() || '';
        
        const typeSelect = $('select[name="form_type"]').val();
        const typeRadio = $('input[name="form_type"]:checked').val();
        this.filters.form_type = typeSelect || typeRadio || '';

        this.filters.n_category = $('select[name="n_category"]').val() || '';
        this.filters.payer = $('input[name="payer"]').val() || '';
    }

    // データをAPIから取得し、リストを更新する関数 - APIリクエストの前にローディングインジケーターを表示し、リクエストが完了したらデータをリストにレンダリングする。エラーが発生した場合はエラーメッセージを表示する。
    async fetchData() {
        this.$loading.show();
        this.$container.empty();
        this.$containerSP.empty();
        this.$empty.hide();

        try {
            const params = new URLSearchParams({
                tab: this.currentTab,
                keyword: this.filters.keyword,
                type: this.filters.form_type,
                date_start: this.filters.date_start,
                date_end: this.filters.date_end,
                n_category: this.filters.n_category,
                payer: this.filters.payer
            });

            const response = await ringiSystem.apiRequest('GET', `search?${params.toString()}`);

            if (response.success && response.data.length > 0) {
                this.renderList(response.data);
            } else {
                this.$empty.show();
            }
        } catch (error) {
            console.error('List Error:', error);
            const errHtml = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            const errHtmlSp = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            
            this.$container.html(errHtml);
            this.$containerSP.html(errHtmlSp);
        } finally {
            this.$loading.hide();
        }
    }

    // 文書のステータスコードを取得する関数 - 文書オブジェクトのプロパティをチェックして、適切なステータスコードを返す。ステータスコードは、文書の状態（承認待ち、承認済み、否認、取下げなど）を表す文字列で、リスト表示やバッジのスタイルに使用される。
    getStatusCode(doc) {
        if (doc.status_code) return doc.status_code; 
        
        if (doc.dt_deleted) return 'withdrawn';
        if (doc.dt_rejected) return 'rejected';
        if (doc.dt_approved_2 || (doc.dt_approved_1 && !doc.s_approved_2)) return 'approved';
        if (doc.dt_approved_1) return 'pending_second';
        return 'pending';
    }

    // データをリスト形式でレンダリングする関数 - APIから取得した文書データの配列をループして、PC版とスマホ版の両方のHTMLを生成する。各文書のタイプ、ステータス、申請日などに基づいて適切な表示形式やスタイルを適用する。生成されたHTMLは、それぞれのコンテナに挿入される。
    renderList(data) {
        const htmlPC = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusCode = this.getStatusCode(doc);
            const statusText = this.mapStatusText(statusCode);
            const dateStr = new Date(doc.ts_applied).toLocaleDateString('ja-JP');
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const badgeClass = this.getBadgeClass(statusCode);

            return `
                <tr>
                    <td><a href="${link}" class="text-primary font-weight-bold">${doc.id_doc}</a></td>
                    <td><span class="badge badge-light border">${formName}</span></td>
                    <td>${doc.title || '(無題)'}</td>
                    <td>${doc.applicant_name}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td>
                        <a href="${link}" class="btn btn-sm btn-outline-info">詳細</a>
                    </td>
                </tr>
            `;
        }).join('');

        const htmlSP = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusCode = this.getStatusCode(doc);
            const statusText = this.mapStatusText(statusCode);
            const dateStr = new Date(doc.ts_applied).toLocaleDateString('ja-JP');
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const badgeClass = this.getBadgeClass(statusCode);

            return `
                <div class="card-item" onclick="window.location.href='${link}'">
                    <div class="card-header">
                        <span class="badge badge-light border">${formName}</span>
                        <span class="text-muted" style="font-size:12px;">${dateStr}</span>
                    </div>
                    <div class="card-subject">${doc.title || '(無題)'}</div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span style="font-size:13px; color:#555;">
                            <i class="icon-user"></i> ${doc.applicant_name}
                        </span>
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.$container.html(htmlPC);
        this.$containerSP.html(htmlSP);
    }
    
    // ステータスコードに対応するバッジのクラスを取得する関数 - ステータスコードに基づいて、Bootstrapのバッジクラスを返す。例えば、承認済みは緑色のバッジ、否認は赤色のバッジ、承認待ちは黄色のバッジなど。これにより、リスト内で文書の状態が視覚的にわかりやすくなる。
    getBadgeClass(code) {
        if (code === 'approved') return 'badge-success';
        if (code === 'rejected') return 'badge-danger';
        if (code === 'withdrawn') return 'badge-secondary';
        if (code && code.includes('pending')) return 'badge-warning';
        return 'badge-secondary';
    }

    // 承認待ちの文書の数をAPIから取得し、タブにバッジで表示する関数 - APIリクエストを送信して、承認待ちの文書の数を取得する。取得した数を「承認待ち」タブの右側に赤いバッジで表示する。これにより、ユーザーは承認待ちの文書があるかどうかを一目で確認できる。
    async fetchPendingCount() {
    }

    // フォームタイプを人間が読みやすい名前に変換する関数 - フォームのタイプコードを日本語のテキストにマッピングする。例えば、'common'は「通常稟議」、'tax'は「税務契約」、'contract'は「契約稟議」、'vendor'は「取引開始」、'others'は「その他」など。これにより、リスト内でフォームの種類がわかりやすく表示される。
    mapTypeToName(type) {
        const types = {
            'common': '通常稟議',
            'tax': '税務契約',
            'contract': '契約稟議',
            'vendor': '取引開始',
            'others': 'その他'
        };
        return types[type] || type.toUpperCase();
    }

    // ステータスコードを人間が読みやすいテキストに変換する関数 - ステータスコードを日本語のテキストにマッピングする。例えば、'pending'は「承認待ち (1)」、'approved'は「承認済」、'rejected'は「否認」、'withdrawn'は「取下げ」など。これにより、リスト内で文書の状態がわかりやすく表示される。
    mapStatusText(code) {
        const statuses = {
            'pending': '承認待ち (1)',
            'pending_second': '承認待ち (2)',
            'approved': '承認済',
            'rejected': '否認',
            'withdrawn': '取下げ'
        };
        return statuses[code] || code;
    }
}

$(document).ready(function() {
    new ListHandler();
});