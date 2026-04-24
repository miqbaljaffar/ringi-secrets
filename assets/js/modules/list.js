class ListHandler {
    constructor() {
        this.currentTab = 'all';
        this.filters = {
            keyword: '',
            date_start: '',
            date_end: '',
            form_type: 'common', 
            n_category: '', 
            payer: '',
            applicant_name: '' 
        };

        this.$header = $('#list-header'); 
        this.$container = $('#list-container'); 
        this.$containerSP = $('#list-container-sp'); 
        this.$pageTitle = $('#dynamic-page-title');

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

        $('input[name="form_type"][value="common"]').prop('checked', true).trigger('change');
        
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

        $('.input-text, .input-date').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                $('#btn-search').click();
            }
        });

        $('input[name="form_type"]').on('change', function() {
            const type = $(this).val();
            
            const titles = {
                'common': '通常の承認一覧',
                'tax': '税務契約稟議一覧',
                'contract': 'その他契約稟議一覧',
                'vendor': '取引先契約稟議一覧'
            };
            self.$pageTitle.text(titles[type] || '承認一覧');

            if(type === 'common') {
                $('.common-only').css('display', 'flex');
            } else {
                $('.common-only').hide();
                $('select[name="n_category"]').val('');
                $('input[name="payer"]').val('');
            }

            let createLink = 'contract_form.html';
            if(type === 'common') createLink = 'common_form.html';
            if(type === 'vendor') createLink = 'vendor_form.html';
            if(type === 'contract') createLink = 'other_form.html';
            if(type === 'tax') createLink = 'contract_form.html';
            $('#btn-create-new').attr('href', createLink);

            self.updateFilters();
            self.fetchData();
        });
    }

    updateFilters() {
        this.filters.keyword = $('#search-keyword').val() || '';
        this.filters.date_start = $('input[name="date_start"]').val() || '';
        this.filters.date_end = $('input[name="date_end"]').val() || '';
        this.filters.form_type = $('input[name="form_type"]:checked').val() || '';
        this.filters.n_category = $('select[name="n_category"]').val() || '';
        this.filters.payer = $('input[name="payer"]').val() || '';
        this.filters.applicant_name = $('input[name="applicant_name"]').val() || '';
    }

    async fetchData() {
        this.$loading.show();
        this.$container.empty();
        this.$containerSP.empty();
        this.$empty.hide();
        this.$header.empty();

        try {
            let sortOrder = 'asc';
            if (this.currentTab === 'approved' || this.currentTab === 'rejected') {
                sortOrder = 'desc'; 
            }

            const params = new URLSearchParams({
                tab: this.currentTab,
                keyword: this.filters.keyword,
                type: this.filters.form_type,
                date_start: this.filters.date_start,
                date_end: this.filters.date_end,
                n_category: this.filters.n_category,
                payer: this.filters.payer,
                applicant_name: this.filters.applicant_name,
                sort: sortOrder 
            });

            const response = await ringiSystem.apiRequest('GET', `search?${params.toString()}`);

            if (response.success && response.data.length > 0) {
                this.renderHeader(); 
                this.renderList(response.data);
            } else {
                this.renderHeader(); 
                this.$empty.show();
            }
        } catch (error) {
            console.error('List Error:', error);
            const errHtml = `<tr><td colspan="8" class="text-center" style="color:red;">Error: ${error.message}</td></tr>`;
            this.$container.html(errHtml);
        } finally {
            this.$loading.hide();
        }
    }

    renderHeader() {
        const type = this.filters.form_type;
        let html = '';
        
        if (type === 'common') {
            html = `
                <tr>
                    <th width="12%">稟議書No</th>
                    <th width="10%">申請日</th>
                    <th width="26%">件名</th>
                    <th width="12%">実施（決済）期限</th>
                    <th width="12%">金額（総額）</th>
                    <th width="12%">申請者</th>
                    <th width="10%">ステータス</th>
                    <th width="6%" class="text-center">詳細</th>
                </tr>
            `;
        } else {
            html = `
                <tr>
                    <th width="15%">稟議書No</th>
                    <th width="12%">申請日</th>
                    <th width="30%">商号・屋号</th>
                    <th width="15%">代表者名</th>
                    <th width="12%">申請者</th>
                    <th width="10%">ステータス</th>
                    <th width="6%" class="text-center">詳細</th>
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
        if (!doc.ts_applied) return 'draft';
        return 'pending';
    }

    formatDateDot(dateString) {
        if(!dateString) return '';
        const d = new Date(dateString);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    fmtMoney(val) {
        return val ? new Intl.NumberFormat('ja-JP').format(val) : '0';
    }

    getStatusUI(code) {
        const uiMap = {
            'pending': { text: '承認待ち', class: 'status-pending', icon: 'fa-clock' },
            'pending_second': { text: '承認待ち', class: 'status-pending', icon: 'fa-clock' },
            'approved': { text: '承認済み', class: 'status-approved', icon: 'fa-check-circle' },
            'rejected': { text: '否認', class: 'status-rejected', icon: 'fa-times-circle' }, 
            'withdrawn': { text: '取下', class: 'status-withdrawn', icon: 'fa-undo' },
            'draft': { text: 'Draft', class: 'status-draft', icon: 'fa-file' },
            'done': { text: '完了', class: 'status-approved', icon: 'fa-check-double' } 
        };
        return uiMap[code] || { text: code, class: 'status-draft', icon: 'fa-file' };
    }

    renderList(data) {
        const typeFilter = this.filters.form_type;

        let htmlPC = '';
        let htmlSP = '';

        data.forEach(doc => {
            const statusCode = this.getStatusCode(doc);
            const statusObj = this.getStatusUI(statusCode);
            const dateStr = this.formatDateDot(doc.ts_applied);
            const link = `detail.html?id=${doc.id_doc}&type=${doc.type}`;
            const detailIcon = `<a href="${link}"><i class="far fa-file-alt icon-detail"></i></a>`;

            const companyName = doc.s_name || doc.company_name || '-';
            const repName = doc.s_rep_name || doc.rep_name || '-';
            const title = doc.title || doc.s_title || '-';
            const amount = this.fmtMoney(doc.n_amount || doc.total_amount);
            const deadline = this.formatDateDot(doc.sort_date);
            const applicant = doc.applicant_name || '-';
            const subTypeName = doc.sub_type_name || '一般稟議';

            if (typeFilter === 'common') {
                htmlPC += `
                    <tr>
                        <td>${doc.id_doc}</td>
                        <td>${dateStr}</td>
                        <td class="truncate-text" title="${title}">${title}</td>
                        <td>${deadline}</td>
                        <td>${amount} 円</td>
                        <td>${applicant}</td>
                        <td class="${statusObj.class}">${statusObj.text}</td>
                        <td class="text-center">${detailIcon}</td>
                    </tr>
                `;
            } else {
                htmlPC += `
                    <tr>
                        <td>${doc.id_doc}</td>
                        <td>${dateStr}</td>
                        <td class="truncate-text" title="${title}">${title}</td>
                        <td>${repName}</td>
                        <td>${applicant}</td>
                        <td class="${statusObj.class}">${statusObj.text}</td>
                        <td class="text-center">${detailIcon}</td>
                    </tr>
                `;
            }

            htmlSP += `
                <div class="card-item" onclick="window.location.href='${link}'" style="cursor:pointer; display: flex; flex-direction: column; gap: 8px;">
                    <!-- Baris 1: Sub Tipe / Kategori -->
                    <div style="font-size: 11px; font-weight: bold; color: #005580; background: #e6f3ff; padding: 2px 8px; border-radius: 10px; align-self: flex-start;">
                        ${subTypeName}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #555;">
                        <div>
                            <span style="font-weight:bold; color:#333; margin-right: 10px;">${applicant}</span>
                            <span>${dateStr}</span>
                        </div>
                        <div class="${statusObj.class}" style="font-size: 14px; font-weight:bold;">
                            <i class="fas ${statusObj.icon}"></i> ${statusObj.text}
                        </div>
                    </div>
                    
                    <div style="font-size: 15px; font-weight: bold; color: #000; word-break: break-all;">
                        ${title}
                    </div>
                </div>
            `;
        });

        this.$container.html(htmlPC);
        this.$containerSP.html(htmlSP); 
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
}

$(document).ready(function() {
    new ListHandler();
});