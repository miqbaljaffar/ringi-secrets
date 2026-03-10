class DetailHandler {
    constructor() {
        this.id = this.getUrlParameter('id');
        this.docType = this.getUrlParameter('type') || this.getDocTypeFromId(this.id);
        
        this.data = null;
        
        const sessionUser = sessionStorage.getItem('user');
        this.currentUser = sessionUser ? JSON.parse(sessionUser) : { role: 0, id: '0000', id_worker: '0000' };

        this.$container = $('#detail-content');
        this.$loading = $('#detail-loading');
        
        this.init();
    }

    init() {
        if (!this.id) {
            alert('文書IDが見つかりません');
            return;
        }
        this.loadDocument();
        this.bindGlobalEvents();
    }

    getUrlParameter(name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? results[1] : null;
    }

    getDocTypeFromId(id) {
        if (!id || id.length < 2) return 'common';
        const prefix = id.substring(0, 2).toUpperCase();
        const map = { 'AR': 'common', 'CT': 'tax', 'CV': 'vendor', 'CO': 'others' };
        return map[prefix] || 'common';
    }

    async loadDocument() {
        this.$loading.show();
        this.$container.hide();

        try {
            const response = await ringiSystem.apiRequest('GET', `${this.docType}/${this.id}`);
            
            if (response.success) {
                this.data = response.data;
                this.renderData();
                this.renderMemo(); 
                this.renderApprovalRoute();
                this.setupPermissions();
                this.$container.fadeIn();
            } else {
                throw new Error(response.error || 'データの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('詳細エラー:', error);
            $('body').html(`<div class="alert alert-danger m-4 text-center">データを読み込めません: ${error.message}</div>`);
        } finally {
            this.$loading.hide();
        }
    }

    // Fungsi utilitas memformat uang
    fmtMoney(val) {
        return val ? new Intl.NumberFormat('ja-JP').format(val) : '0';
    }

    renderData() {
        const d = this.data;
        
        $('#lbl_id').text(d.id_doc);
        $('#lbl_applicant').text(d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied || '-'));
        $('#lbl_date').text(d.ts_applied ? new Date(d.ts_applied).toLocaleDateString('ja-JP') : '-');
        
        if (this.docType === 'tax') {
            $('#tax-section').show();
            
            // Basic Info
            $('#tax_n_type').text(d.n_type == '1' ? '法人 (Corporate)' : '個人 (Individual)');
            if(d.n_type == '2') $('.tax-corp-only').hide();
            
            $('#tax_s_name').text(d.s_name || '-');
            $('#tax_s_kana').text(d.s_kana || '-');
            $('#tax_dt_establishment').text(d.dt_establishment || '-');
            $('#tax_n_capital').text(this.fmtMoney(d.n_capital));
            $('#tax_n_before').text(d.n_before || '-');
            
            $('#tax_s_industry').text(d.s_industry || '-');
            $('#tax_s_industry_type').text(d.s_industry_type || '-');
            $('#tax_s_industry_oms').text(d.s_industry_oms || '-');
            
            // Rep Info
            $('#tax_s_rep_name').text(d.s_rep_name || '-');
            $('#tax_s_rep_kana').text(d.s_rep_kana || '-');
            const titles = {'1':'代表取締役', '2':'取締役', '3':'理事長', '4':'代表社員', '9': d.s_rep_title_others || 'その他'};
            $('#tax_s_rep_title').text(titles[d.s_rep_title] || '-');
            $('#tax_dt_rep_birth').text(d.dt_rep_birth || '-');
            $('#tax_s_rep_email').text(d.s_rep_email || 'なし');
            
            $('#tax_s_rep_pcode').text(d.s_rep_pcode || '-');
            $('#tax_s_rep_address').text(d.s_rep_address || '-');
            $('#tax_s_rep_address2').text(d.s_rep_address2 || '');
            $('#tax_s_rep_tel').text(d.s_rep_tel || 'なし');
            
            // Office Info
            $('#tax_s_office_pcode').text(d.s_office_pcode || '-');
            $('#tax_s_office_address').text(d.s_office_address || '-');
            $('#tax_s_office_address2').text(d.s_office_address2 || '');
            $('#tax_s_office_tel').text(d.s_office_tel || '-');
            
            // Tax Info
            $('#tax_s_tax_office').text(d.s_tax_office || '-');
            $('#tax_n_closing_month').text(d.n_closing_month ? d.n_closing_month + '月' : '-');
            $('#tax_s_declaration_type').text(d.s_declaration_type === 'A' ? '青色' : '白色');
            $('#tax_n_tax_place').text(d.n_tax_place == '1' ? '事業所' : '自宅');
            $('#tax_s_tax_num').text(d.s_tax_num || '-');
            
            $('#tax_n_e_filing').text(d.n_e_filing == '1' ? '要' : '不要');
            $('#tax_s_e_filing_reason').text(d.s_e_filing_reason || '-');
            $('#tax_s_national_tax_id').text(d.s_national_tax_id || '-');
            $('#tax_s_local_tax_id').text(d.s_local_tax_id || '-');
            
            // Financials
            $('#tax_n_pre_total').text(this.fmtMoney(d.n_pre_total));
            $('#tax_n_pre_sales').text(this.fmtMoney(d.n_pre_sales));
            $('#tax_n_pre_debt').text(this.fmtMoney(d.n_pre_debt));
            $('#tax_n_pre_income').text(this.fmtMoney(d.n_pre_income));
            $('#tax_n_pre_workers').text(d.n_pre_workers || '0');
            
            const cTax = {'1':'本則', '2':'簡易', '3':'免税'};
            $('#tax_n_comsumption_tax').text(cTax[d.n_comsumption_tax] || '-');
            
            const trades = {'1':'輸入', '2':'輸出', '3':'輸出入', '0':'なし'};
            $('#tax_n_trade').text(trades[d.n_trade] || '-');
            $('#tax_n_affiliated_company').text(d.n_affiliated_company == '1' ? 'あり' : 'なし');
            
            // Accounting Info
            const selfAcc = {'1':'自計化', '2':'半自計化', '3':'伝票作成', '4':'原始記録(整理)', '5':'原始記録(未整理)', '9': d.s_self_accounting_others || 'その他'};
            $('#tax_n_self_accounting').text(selfAcc[d.n_self_accounting] || '-');
            
            const accApps = {'1':'TKC', '2':'弥生会計', '3':'勘定奉行', '4':'MF', '8':'未利用', '9': d.s_accounting_apps_others || 'その他'};
            $('#tax_n_accounting_apps').text(accApps[d.n_accounting_apps] || '-');
            
            // Pemetaan Checkbox Buku Akuntansi
            const bookMap = {
                '1':'現金出納帳', '2':'預金出納帳', '3':'売掛金元帳', '4':'買掛金元帳', '5':'手形記入帳', 
                '6':'固定資産台帳', '7':'賃金台帳', '8':'在庫表', '9':'現金収支日報', '10':'会計日記帳', '11':'入出金伝票'
            };
            let booksLabel = [];
            if(d.s_books) {
                d.s_books.split(',').forEach(b => {
                    if(b === '99') booksLabel.push(d.s_books_others || 'その他');
                    else if(bookMap[b]) booksLabel.push(bookMap[b]);
                });
            }
            $('#tax_s_books').text(booksLabel.join(', ') || '-');
            
            $('#tax_n_slip_count').text(d.n_slip_count || '0');
            $('#tax_n_accounting_staff').text(d.n_accounting_staff == '1' ? 'あり' : 'なし');
            
            // Contract Info
            let preAcc = d.s_pre_accountant || '-';
            if (d.n_rewards_yearly) preAcc += ` (前年間報酬: ${this.fmtMoney(d.n_rewards_yearly)}円)`;
            $('#tax_pre_accountant').text(preAcc);
            
            const accType = {'1':'毎月', '2':'隔月(2)', '3':'隔月(3)', '4':'年一'};
            $('#tax_n_account_type').text(accType[d.n_account_type] || '-');
            
            $('#tax_s_contract_overview').text(d.s_contract_overview || '-');
            $('#tax_s_incharge_bigin').text(d.s_incharge_bigin || '-');
            $('#tax_s_incharge_close').text(d.s_incharge_close || '-');
            $('#tax_s_incharge').text(d.s_incharge || '-');
            
            const introType = {'0':'なし', '1':'顧問先', '2':'金融機関', '3':'税理士', '4':'紹介会社', '9': d.s_introducer_type_others || 'その他'};
            $('#tax_s_introducer').text(d.s_introducer || '-');
            $('#tax_n_introducer_type').text(introType[d.n_introducer_type] || '-');
            
            $('#tax_s_situation').text(d.s_situation || '-');
            $('#tax_dt_contract_start').text(d.dt_contract_start || '-');
            
        } else if (this.docType === 'common') {
            $('#common-section').show();
            $('#common_s_title').text(d.s_title || d.subject || '-');
            $('#common_s_overview').text(d.s_overview || '-');
            
            if (d.details && Array.isArray(d.details)) {
                const rows = d.details.map(item => `
                    <tr>
                        <td>${item.s_category || item.category_name || '-'}</td>
                        <td>${item.s_payer || item.payer || '-'}</td>
                        <td class="text-right">${this.fmtMoney(item.n_amount || item.amount || 0)} 円</td>
                    </tr>
                `).join('');
                $('#details-tbody').html(rows);
            } else {
                $('#details-tbody').html('<tr><td colspan="3" class="text-center">詳細データがありません</td></tr>');
            }
        }
        
        if (d.dt_deleted) {
            $('#stamp-withdrawn').show();
        } else if (d.dt_rejected) {
            $('#stamp-rejected').show();
        } else if (d.dt_approved_2 || (d.dt_approved_1 && !d.s_approved_2)) { 
            $('#stamp-approved').show();
        }
    }

    renderMemo() {
        const memoText = this.data.s_memo || '';
        let $memoSection = $('#memo-section');
        if ($memoSection.length === 0) {
            $memoSection = $('<div id="memo-section" class="mt-4 mb-4 p-3 border rounded bg-light" style="border-left: 4px solid #17a2b8 !important;"></div>');
            if ($('.approval-route-container').length) {
                $('.approval-route-container').before($memoSection);
            } else {
                $('#detail-content').append($memoSection);
            }
        }

        const html = `
            <h6 class="font-weight-bold" style="color: #17a2b8;">備考</h6>
            <div id="memo-display-mode">
                <p id="memo-text" class="mb-0 text-dark" style="white-space: pre-wrap;">${memoText ? memoText : 'なし'}</p>
            </div>
            <div id="memo-edit-mode" style="display:none;">
                <textarea id="input-memo" class="form-control" rows="3" placeholder="備考を入力してください...">${memoText}</textarea>
                <div class="mt-2 text-right">
                    <button id="btn-update-memo" class="btn btn-sm btn-info text-white">備考を更新</button>
                </div>
            </div>
        `;
        $memoSection.html(html);
    }

    renderApprovalRoute() {
        const d = this.data;
        const route = [];

        const getStatusObj = (approvedDate, rejectedDate, isNextInLine) => {
            if (d.dt_deleted) return { text: '取下げ', color: '#666', date: d.dt_deleted };
            if (rejectedDate && !approvedDate) return { text: '否認', color: '#dc3545', date: rejectedDate };
            if (approvedDate) return { text: '承認', color: '#0088cc', date: approvedDate };
            if (!isNextInLine) return { text: '未定', color: '#ccc', date: null }; 
            return { text: '承認待ち', color: '#ff9900', date: null }; 
        };

        const fmtDate = (date) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';

        route.push({
            role: '申請者',
            name: d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied),
            status: d.dt_deleted ? '取下げ' : '申請済',
            color: '#333',
            date: fmtDate(d.ts_applied)
        });

        if (d.s_approved_1) {
            const st1 = getStatusObj(d.dt_approved_1, d.dt_rejected, true);
            route.push({
                role: '第1承認者',
                name: d.approver1_info ? d.approver1_info.s_name : (d.approver1_name || d.s_approved_1),
                status: st1.text,
                color: st1.color,
                date: fmtDate(st1.date)
            });
        }

        if (d.s_approved_2) {
            const st2 = getStatusObj(d.dt_approved_2, d.dt_rejected, !!d.dt_approved_1);
            route.push({
                role: '第2承認者',
                name: d.approver2_info ? d.approver2_info.s_name : (d.approver2_name || d.s_approved_2),
                status: st2.text,
                color: st2.color,
                date: fmtDate(st2.date)
            });
        }

        const html = route.map(step => `
            <tr>
                <td style="font-size: 13px;">${step.role}</td>
                <td style="color:${step.color}; font-weight:bold">${step.status}</td>
                <td style="font-weight:bold">${step.name}</td>
                <td>${step.date}</td>
            </tr>
        `).join('');

        $('#approval-route-tbody').html(html);
    }

    setupPermissions() {
        const d = this.data;
        const uid = String(this.currentUser.id || this.currentUser.id_worker); 

        let canApprove = false;
        const isApp1Turn = (String(d.s_approved_1) === uid && !d.dt_approved_1);
        const isApp2Turn = (String(d.s_approved_2) === uid && d.dt_approved_1 && !d.dt_approved_2); 
        
        if (isApp1Turn || isApp2Turn) {
            if (!d.dt_rejected && !d.dt_deleted) {
                canApprove = true;
            }
        }
        if (canApprove) $('.action-approval').show(); 
        else $('.action-approval').hide();

        const isAdmin = (this.currentUser.role >= 2 || uid === '0036');
        
        if (isAdmin) {
            $('#memo-edit-mode').show();
            $('#memo-display-mode').hide();
        } else {
            $('#memo-edit-mode').hide();
            $('#memo-display-mode').show();
        }
    }

    bindGlobalEvents() {
        const self = this;
        $('#btn-approve').on('click', function() {
            self.processAction('approve', 'この稟議を承認しますか？');
        });
        $('#btn-reject').on('click', function() {
            self.processAction('reject', 'この稟議を否認しますか？');
        });
        $(document).on('click', '#btn-update-memo', function() {
            self.updateMemoAction();
        });
    }

    async processAction(action, confirmMsg) {
        if (!confirm(confirmMsg)) return;

        try {
            const payload = { doc_id: this.id, action: action, comment: '' };
            const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, payload);

            if (response.success) {
                ringiSystem.showNotification('承認処理が完了しました。', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                ringiSystem.showNotification('エラー: ' + response.error, 'error');
            }
        } catch (error) {
            ringiSystem.showNotification('システムエラー: ' + error.message, 'error');
        }
    }

    async updateMemoAction() {
        const newMemo = $('#input-memo').val();
        if (!confirm('備考を更新しますか？')) return;

        try {
            const payload = { memo: newMemo };
            const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/memo`, payload);

            if (response.success) {
                ringiSystem.showNotification('備考が更新されました', 'success');
                this.data.s_memo = newMemo;
                
                $('#btn-update-memo').text('保存完了').removeClass('btn-info').addClass('btn-success');
                setTimeout(() => {
                    $('#btn-update-memo').text('備考を更新').removeClass('btn-success').addClass('btn-info');
                }, 2000);

            } else {
                ringiSystem.showNotification('エラー: ' + response.error, 'error');
            }
        } catch (error) {
            ringiSystem.showNotification('システムエラー: ' + error.message, 'error');
        }
    }
}

$(document).ready(function() {
    new DetailHandler();
});