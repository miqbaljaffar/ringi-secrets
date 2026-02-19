class ListHandler {
    constructor() {
        // State
        this.currentTab = 'all';
        this.filters = {
            keyword: '',
            date_start: '',
            date_end: '',
            form_type: '',
            n_category: '', 
            payer: ''       
        };

        // DOM Elements
        this.$container = $('#list-container'); // Container untuk Tabel PC (tbody)
        
        // PENAMBAHAN: Container untuk Mobile (div)
        // Pastikan di HTML ada <div id="list-container-sp" class="sp-only"></div>
        this.$containerSP = $('#list-container-sp'); 

        this.$loading = $('#loading-indicator');
        this.$empty = $('#empty-state');
        
        this.init();
    }

    init() {
        this.fetchData();
        this.fetchPendingCount();
        this.bindEvents();
    }

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

    async fetchData() {
        this.$loading.show();
        this.$container.empty();
        this.$containerSP.empty(); // Bersihkan mobile container juga
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

    renderList(data) {
        // 1. RENDER UNTUK PC (TABLE ROW)
        const htmlPC = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusText = this.mapStatusText(doc.status_code);
            const dateStr = new Date(doc.ts_applied).toLocaleDateString('ja-JP');
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            
            let badgeClass = this.getBadgeClass(doc.status_code);

            return `
                <tr>
                    <td><a href="${link}" class="text-primary font-weight-bold">${doc.id_doc}</a></td>
                    <td><span class="badge badge-light border">${formName}</span></td>
                    <td>${doc.subject || '(無題)'}</td>
                    <td>${doc.applicant_name}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td>
                        <a href="${link}" class="btn btn-sm btn-outline-info">詳細</a>
                    </td>
                </tr>
            `;
        }).join('');

        // 2. RENDER UNTUK MOBILE (CARD) - Sesuai Spec Hal. 23
        const htmlSP = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusText = this.mapStatusText(doc.status_code);
            const dateStr = new Date(doc.ts_applied).toLocaleDateString('ja-JP');
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const badgeClass = this.getBadgeClass(doc.status_code);

            // Layout Card Mobile sesuai List.css dan Spec Hal 23
            return `
                <div class="card-item" onclick="window.location.href='${link}'">
                    <div class="card-header">
                        <span class="badge badge-light border">${formName}</span>
                        <span class="text-muted" style="font-size:12px;">${dateStr}</span>
                    </div>
                    <div class="card-subject">${doc.subject || '(無題)'}</div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span style="font-size:13px; color:#555;">
                            <i class="icon-user"></i> ${doc.applicant_name}
                        </span>
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Inject ke DOM masing-masing
        this.$container.html(htmlPC);
        this.$containerSP.html(htmlSP);
    }

    getBadgeClass(code) {
        if (code === 'approved') return 'badge-success';
        if (code === 'rejected') return 'badge-danger';
        if (code === 'withdrawn') return 'badge-secondary'; // Abu-abu utk withdrawn
        if (code && code.includes('pending')) return 'badge-warning';
        return 'badge-secondary';
    }

    async fetchPendingCount() {
        // Implementasi badge counter opsional
    }

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

// Init
$(document).ready(function() {
    new ListHandler();
});