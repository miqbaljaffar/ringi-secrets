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

        this.$header = $('#list-header'); // PERBAIKAN: Target Header
        this.$container = $('#list-container'); 
        this.$containerSP = $('#list-container-sp'); 

        this.$loading = $('#loading-indicator');
        this.$empty = $('#empty-state');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setInitialState(); 
    }

    setInitialState() {
        const today = new Date().toISOString().split('T')[0];
        $('input[name="date_start"]').val(today);
        
        this.updateFilters();

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
                this.renderHeader(); // PERBAIKAN: Render tabel header sesuai tipe (Dinamis)
                this.renderList(response.data);
            } else {
                this.$empty.show();
            }
        } catch (error) {
            console.error('List Error:', error);
            const errHtml = `<tr><td colspan="9" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            const errHtmlSp = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            
            this.$container.html(errHtml);
            this.$containerSP.html(errHtmlSp);
        } finally {
            this.$loading.hide();
        }
    }

    // PERBAIKAN: Header Tabel Dinamis Berdasarkan Spesifikasi Halaman 11-12
    renderHeader() {
        const type = this.filters.form_type;
        let html = '';
        
        if (type === 'common') {
            html = `
                <tr>
                    <th width="10%">文書No</th>
                    <th width="8%">申請書</th>
                    <th width="22%">件名</th>
                    <th width="12%">金額(総額)</th>
                    <th width="12%">決済期限</th>
                    <th width="10%">申請者</th>
                    <th width="10%">申請日</th>
                    <th width="10%">ステータス</th>
                    <th width="6%">Link</th>
                </tr>
            `;
        } else if (type === 'tax' || type === 'contract' || type === 'vendor') {
            html = `
                <tr>
                    <th width="12%">文書No</th>
                    <th width="8%">申請書</th>
                    <th width="25%">商号・屋号</th>
                    <th width="15%">代表者名</th>
                    <th width="10%">申請者</th>
                    <th width="12%">申請日</th>
                    <th width="12%">ステータス</th>
                    <th width="6%">Link</th>
                </tr>
            `;
        } else {
            // Default jika 'Semua (All)' dipilih
            html = `
                <tr>
                    <th width="12%">文書No</th>
                    <th width="10%">申請書</th>
                    <th width="30%">題名 / 商号</th>
                    <th width="15%">氏名</th>
                    <th width="12%">申請日</th>
                    <th width="10%">ステータス</th>
                    <th width="6%">Link</th>
                </tr>
            `;
        }
        this.$header.html(html);
    }

    getStatusCode(doc) {
        if (doc.status_code) return doc.status_code; 
        if (doc.dt_deleted) return 'withdrawn';
        if (doc.dt_rejected) return 'rejected';
        if (doc.dt_approved_2 || (doc.dt_approved_1 && !doc.s_approved_2)) return 'approved';
        if (doc.dt_approved_1) return 'pending_second';
        return 'pending';
    }

    formatDateDot(dateString) {
        if(!dateString) return '-';
        const d = new Date(dateString);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    fmtMoney(val) {
        return val ? new Intl.NumberFormat('ja-JP').format(val) : '0';
    }

    // PERBAIKAN: Konten Tabel Dinamis berdasarkan Form Type
    renderList(data) {
        const typeFilter = this.filters.form_type;

        const htmlPC = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusCode = this.getStatusCode(doc);
            const statusText = this.mapStatusText(statusCode);
            const dateStr = this.formatDateDot(doc.ts_applied);
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const badgeClass = this.getBadgeClass(statusCode);

            let trContent = '';

            if (typeFilter === 'common') {
                const amount = this.fmtMoney(doc.n_amount || doc.total_amount);
                const deadline = this.formatDateDot(doc.dt_deadline);
                trContent = `
                    <td><a href="${link}" class="text-primary font-weight-bold">${doc.id_doc}</a></td>
                    <td><span class="badge badge-light border">${formName}</span></td>
                    <td>${doc.title || doc.s_title || '-'}</td>
                    <td class="text-right">${amount} 円</td>
                    <td>${deadline}</td>
                    <td>${doc.applicant_name}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td><a href="${link}" class="btn btn-sm btn-outline-info">詳細</a></td>
                `;
            } else if (typeFilter === 'tax' || typeFilter === 'contract' || typeFilter === 'vendor') {
                trContent = `
                    <td><a href="${link}" class="text-primary font-weight-bold">${doc.id_doc}</a></td>
                    <td><span class="badge badge-light border">${formName}</span></td>
                    <td>${doc.s_name || doc.company_name || '-'}</td>
                    <td>${doc.s_rep_name || doc.rep_name || '-'}</td>
                    <td>${doc.applicant_name}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td><a href="${link}" class="btn btn-sm btn-outline-info">詳細</a></td>
                `;
            } else {
                trContent = `
                    <td><a href="${link}" class="text-primary font-weight-bold">${doc.id_doc}</a></td>
                    <td><span class="badge badge-light border">${formName}</span></td>
                    <td>${doc.title || doc.s_title || doc.s_name || '(無題)'}</td>
                    <td>${doc.applicant_name}</td>
                    <td>${dateStr}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td><a href="${link}" class="btn btn-sm btn-outline-info">詳細</a></td>
                `;
            }

            return `<tr>${trContent}</tr>`;
        }).join('');

        const htmlSP = data.map(doc => {
            const formName = this.mapTypeToName(doc.type);
            const statusCode = this.getStatusCode(doc);
            const statusText = this.mapStatusText(statusCode);
            const dateStr = this.formatDateDot(doc.ts_applied);
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const badgeClass = this.getBadgeClass(statusCode);
            const displayTitle = doc.title || doc.s_title || doc.s_name || '(無題)';

            return `
                <div class="card-item" onclick="window.location.href='${link}'" style="cursor: pointer;">
                    <div class="card-header" style="justify-content: flex-start; gap: 10px;">
                        <span class="badge badge-light border" style="font-size:11px;">${formName}</span>
                        <span style="font-size:13px; color:#333; font-weight:bold;">
                            <i class="fas fa-user" style="color:#888;"></i> ${doc.applicant_name}
                        </span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <div>
                            <span class="text-muted" style="font-size:12px; margin-right: 8px;">${dateStr}</span>
                            <span class="card-subject" style="font-size:14px; margin-bottom:0; display:inline-block; max-width: 150px;">${displayTitle}</span>
                        </div>
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');

        this.$container.html(htmlPC);
        this.$containerSP.html(htmlSP);
    }
    
    getBadgeClass(code) {
        if (code === 'approved') return 'badge-success';
        if (code === 'rejected') return 'badge-danger';
        if (code === 'withdrawn') return 'badge-secondary';
        if (code && code.includes('pending')) return 'badge-warning';
        return 'badge-secondary';
    }

    async fetchPendingCount() {
        try {
            const response = await ringiSystem.apiRequest('GET', `search?tab=to_approve`);
            if (response.success && response.data) {
                const count = response.data.length;
                const badge = $('#badge-to-approve');
                if (count > 0) {
                    badge.text(count).show();
                } else {
                    badge.hide();
                }
            }
        } catch(e) {
            console.warn("Could not fetch pending count");
        }
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

$(document).ready(function() {
    new ListHandler();
});