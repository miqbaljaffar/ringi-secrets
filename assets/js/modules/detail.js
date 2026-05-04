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
                this.renderAttachments(); 
                this.renderMemo(); 
                this.renderApprovalRoute();
                this.setupPermissions();
                this.$container.fadeIn();
            } else {
                throw new Error(response.error || 'データの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('詳細エラー:', error);
            $('body').html(`<div class="alert alert-danger m-4 text-center" style="color:red; font-weight:bold;">データを読み込めません: ${error.message}</div>`);
        } finally {
            this.$loading.hide();
        }
    }

    // Helper Functions
    fmtMoney(val) {
        return val ? new Intl.NumberFormat('ja-JP').format(val) : '0';
    }

    fmtDate(val) {
        return val ? new Date(val).toLocaleDateString('ja-JP') : '-';
    }

    getSendToText(val, others) {
        if (val == 1) return '事業所';
        if (val == 2) return '代表者自宅';
        if (val == 9) return `その他 (${others || '-'})`;
        return '-';
    }

    getRepTitleText(val, others) {
        const map = { 1: '代表取締役', 2: '取締役', 3: '理事長', 4: '代表社員' };
        if (val == 9) return `その他 (${others || '-'})`;
        return map[val] || '-';
    }

    getIntroducerText(val, others) {
        if (val == 0) return 'なし';
        const map = { 1: '顧問先', 2: '金融機関', 3: '税理士事務所', 4: '紹介会社' };
        if (val == 9) return `その他 (${others || '-'})`;
        return map[val] || '-';
    }

    renderData() {
        const d = this.data;
        
        $('#lbl_id').text(d.id_doc);
        $('#lbl_applicant').text(d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied || '-'));
        $('#lbl_date').text(this.fmtDate(d.ts_applied));
        
        if (this.docType === 'common') {
            $('#common-section').show();
            $('#common_s_title').text(d.s_title || d.subject || '-');
            $('#common_dt_deadline').text(this.fmtDate(d.dt_deadline));
            $('#common_s_overview').text(d.s_overview || '-');
            
            let totalAmount = 0;
            if (d.details && Array.isArray(d.details)) {
                const rows = d.details.map(item => {
                    totalAmount += parseInt(item.n_amount || item.amount || 0);
                    return `
                    <tr>
                        <td>${item.s_category || item.category_name || '-'}</td>
                        <td>${item.s_payer || item.payer || '-'}</td>
                        <td class="text-right">${this.fmtMoney(item.n_amount || item.amount || 0)} 円</td>
                    </tr>
                `}).join('');
                $('#details-tbody').html(rows);
            }
            $('#common_total_amount').text(this.fmtMoney(totalAmount) + ' 円');
        }
        else if (this.docType === 'tax') {
            $('#tax-section').show();
            $('#tax_n_type').text(d.n_type == '1' ? '法人 (Corporate)' : '個人 (Individual)');
            $('#tax_s_name').text(d.s_name || '-');
            $('#tax_s_kana').text(d.s_kana || '-');
            
            if(d.n_type == '1') {
                $('.tax-corp-only').show();
                $('#tax_dt_establishment').text(this.fmtDate(d.dt_establishment));
                $('#tax_n_capital').text(this.fmtMoney(d.n_capital));
                $('#tax_n_before').text(d.n_before || '0');
                $('#tax_n_closing_month').text((d.n_closing_month || '-') + '月');
            } else {
                $('.tax-corp-only').hide();
            }

            $('#tax_s_industry').text(d.s_industry || '-');
            $('#tax_s_industry_type').text(d.s_industry_type || '-');
            $('#tax_s_industry_oms').text(d.s_industry_oms || '-');
            
            $('#tax_s_rep_name').text(d.s_rep_name || '-');
            $('#tax_s_rep_kana').text(d.s_rep_kana || '-');
            $('#tax_s_rep_title').text(this.getRepTitleText(d.s_rep_title, d.s_rep_title_others));
            $('#tax_dt_rep_birth').text(this.fmtDate(d.dt_rep_birth));
            $('#tax_s_rep_email').text(d.s_rep_email || 'なし');
            $('#tax_s_rep_pcode').text(d.s_rep_pcode || '-');
            $('#tax_s_rep_address').text(d.s_rep_address || '-');
            $('#tax_s_rep_address2').text(d.s_rep_address2 || '');
            $('#tax_s_rep_tel').text(d.s_rep_tel || '-');

            $('#tax_s_office_pcode').text(d.s_office_pcode || '-');
            $('#tax_s_office_address').text(d.s_office_address || '-');
            $('#tax_s_office_address2').text(d.s_office_address2 || '');
            $('#tax_n_send_to').text(this.getSendToText(d.n_send_to, d.s_send_to_others));
            $('#tax_s_office_tel').text(d.s_office_tel || '-');

            $('#tax_s_tax_office').text(d.s_tax_office || '-');
            $('#tax_s_declaration_type').text(d.s_declaration_type == '1' ? '青色' : '白色');
            $('#tax_n_tax_place').text(d.n_tax_place == '1' ? '事業所' : '自宅');
            $('#tax_s_tax_num').text(d.s_tax_num || '-');

            $('#tax_n_e_filing').text(d.n_e_filing == '1' ? '要' : '不要');
            $('#tax_s_e_filing_reason').text(d.s_e_filing_reason || '-');
            $('#tax_s_national_tax_id').text(d.s_national_tax_id || '-');
            $('#tax_s_local_tax_id').text(d.s_local_tax_id || '-');

            $('#tax_n_pre_total').text(this.fmtMoney(d.n_pre_total));
            $('#tax_n_pre_sales').text(this.fmtMoney(d.n_pre_sales));
            $('#tax_n_pre_debt').text(this.fmtMoney(d.n_pre_debt));
            $('#tax_n_pre_income').text(this.fmtMoney(d.n_pre_income));
            $('#tax_n_pre_workers').text(this.fmtMoney(d.n_pre_workers));

            const consTaxMap = {1: '本則', 2: '簡易', 3: '免税'};
            $('#tax_n_comsumption_tax').text(consTaxMap[d.n_comsumption_tax] || '-');
            const tradeMap = {0: 'なし', 1: '輸入', 2: '輸出', 3: '輸出入'};
            $('#tax_n_trade').text(tradeMap[d.n_trade] || 'なし');
            $('#tax_n_affiliated_company').text(d.n_affiliated_company == '1' ? 'あり' : 'なし');

            const selfAccMap = {1: '自計化', 2: '半自計化', 3: '伝票・帳簿等作成', 4: '原始記録のみ(整理済み)', 5: '原始記録のみ(未整理)'};
            $('#tax_n_self_accounting').text(d.n_self_accounting == '9' ? `その他 (${d.s_self_accounting_others})` : (selfAccMap[d.n_self_accounting] || '-'));
            
            const accAppsMap = {1: 'TKC', 2: '弥生会計', 3: '勘定奉行', 4: 'MoneyForward', 8: '未利用'};
            $('#tax_n_accounting_apps').text(d.n_accounting_apps == '9' ? `その他 (${d.s_accounting_apps_others})` : (accAppsMap[d.n_accounting_apps] || '-'));
            
            // Books parser
            let booksStr = d.s_books || '';
            const booksMap = {1:'現金出納帳', 2:'預金出納帳', 3:'売掛金元帳', 4:'買掛金元帳', 5:'手形記入帳', 6:'固定資産台帳', 7:'賃金台帳', 8:'在庫表', 9:'現金収支日報', 10:'会計日記帳', 11:'入出金伝票'};
            let parsedBooks = booksStr.split(',').map(b => b == '99' ? `その他 (${d.s_books_others})` : booksMap[b]).filter(Boolean).join(', ');
            $('#tax_s_books').text(parsedBooks || '-');

            $('#tax_n_slip_count').text(this.fmtMoney(d.n_slip_count));
            $('#tax_n_accounting_staff').text(d.n_accounting_staff == '1' ? 'あり' : 'なし');

            let preAccountantText = d.s_pre_accountant ? `${d.s_pre_accountant} (会計: ${this.fmtMoney(d.n_rewards_account)}円, 税務: ${this.fmtMoney(d.n_rewards_tax)}円)` : '税理士関与なし/新規開業';
            $('#tax_pre_accountant').text(preAccountantText);

            const accTypeMap = {1: '毎月', 2: '隔月(2)', 3: '隔月(3)', 4: '年一'};
            $('#tax_n_account_type').text(accTypeMap[d.n_account_type] || '-');
            $('#tax_s_contract_overview').text(d.s_contract_overview || '-');
            $('#tax_s_incharge_bigin').text(d.s_incharge_bigin || '-');
            $('#tax_s_incharge_close').text(d.s_incharge_close || '-');
            $('#tax_s_incharge').text(d.s_incharge || '-');
            
            $('#tax_s_introducer').text(d.s_introducer || '-');
            $('#tax_n_introducer_type').text(this.getIntroducerText(d.n_introducer_type, d.s_introducer_type_others));
            $('#tax_s_situation').text(d.s_situation || '-');
            $('#tax_dt_contract_start').text(this.fmtDate(d.dt_contract_start));
        } 
        else if (this.docType === 'others') {
            $('#others-section').show();
            $('#oth_s_name').text(d.s_name || '-');
            $('#oth_s_kana').text(d.s_kana || '-');
            $('#oth_s_industry').text(d.s_industry || '-');
            $('#oth_s_industry_type').text(d.s_industry_type || '-');
            
            $('#oth_s_office_pcode').text(d.s_office_pcode || '-');
            $('#oth_s_office_address').text(d.s_office_address || '-');
            $('#oth_s_office_address2').text(d.s_office_address2 || '');
            $('#oth_n_send_to').text(this.getSendToText(d.n_send_to, d.s_send_to_others));
            $('#oth_s_office_tel').text(d.s_office_tel || '-');

            $('#oth_s_rep_name').text(d.s_rep_name || '-');
            $('#oth_s_rep_kana').text(d.s_rep_kana || '-');
            $('#oth_s_rep_title').text(this.getRepTitleText(d.s_rep_title, d.s_rep_title_others));
            $('#oth_s_rep_email').text(d.s_rep_email || '-');

            $('#oth_n_pre_total').text(this.fmtMoney(d.n_pre_total));
            $('#oth_n_pre_sales').text(this.fmtMoney(d.n_pre_sales));
            $('#oth_n_pre_debt').text(this.fmtMoney(d.n_pre_debt));
            $('#oth_n_pre_income').text(this.fmtMoney(d.n_pre_income));
            $('#oth_n_pre_workers').text(this.fmtMoney(d.n_pre_workers));

            const consTaxMap = {1: '本則', 2: '簡易', 3: '免税'};
            $('#oth_n_comsumption_tax').text(consTaxMap[d.n_comsumption_tax] || '-');
            const tradeMap = {0: 'なし', 1: '輸入', 2: '輸出', 3: '輸出入'};
            $('#oth_n_trade').text(tradeMap[d.n_trade] || 'なし');
            $('#oth_n_affiliated_company').text(d.n_affiliated_company == '1' ? 'あり' : 'なし');

            $('#oth_s_contract_overview').text(d.s_contract_overview || '-');
            $('#oth_dt_contract_start').text(this.fmtDate(d.dt_contract_start));
            $('#oth_s_incharge').text(d.s_incharge || '-');
            $('#oth_s_introducer').text(d.s_introducer || '-');
            $('#oth_n_introducer_type').text(this.getIntroducerText(d.n_introducer_type, d.s_introducer_type_others));
            $('#oth_s_situation').text(d.s_situation || '-');
        }
        else if (this.docType === 'vendor') {
            $('#vendor-section').show();
            $('#vnd_s_name').text(d.s_name || '-');
            $('#vnd_s_kana').text(d.s_kana || '-');
            
            $('#vnd_s_office_pcode').text(d.s_office_pcode || '-');
            $('#vnd_s_office_address').text(d.s_office_address || '-');
            $('#vnd_s_office_address2').text(d.s_office_address2 || '');
            $('#vnd_n_send_to').text(this.getSendToText(d.n_send_to, d.s_send_to_others));
            $('#vnd_s_office_tel').text(d.s_office_tel || '-');

            $('#vnd_s_rep_name').text(d.s_rep_name || '-');
            $('#vnd_s_rep_kana').text(d.s_rep_kana || '-');
            $('#vnd_s_rep_title').text(this.getRepTitleText(d.s_rep_title, d.s_rep_title_others));

            $('#vnd_s_contract_overview').text(d.s_contract_overview || '-');
            $('#vnd_s_situation').text(d.s_situation || '-');
        }
        
        // Show Stamps Logic
        if (d.dt_deleted) {
            $('#stamp-withdrawn').show();
        } else if (d.dt_rejected) {
            $('#stamp-rejected').show();
        } else if (d.dt_approved_2 || (d.dt_approved_1 && !d.s_approved_2)) { 
            $('#stamp-approved').show();
        }
    }

    renderAttachments() {
        const d = this.data;
        const files = [];

        if (d.s_file_path) files.push({ name: d.s_file || '添付書類 (通常)', path: d.s_file_path });
        if (d.s_file_estimate_path) files.push({ name: '見積書', path: d.s_file_estimate_path });
        if (d.s_file_others_path) files.push({ name: 'その他資料', path: d.s_file_others_path });

        if (files.length > 0) {
            let fileHtml = '<div class="mt-4 mb-4 p-3 border rounded bg-light"><h5><i class="fas fa-paperclip"></i> 添付書類</h5><ul class="list-unstyled mt-2" style="list-style-type: none; padding-left: 0;">';
            files.forEach(f => {
                fileHtml += `<li style="margin-bottom: 8px;"><a href="${ringiSystem.baseUrl || ''}/../${f.path}" target="_blank" class="btn btn-sm btn-secondary" style="text-decoration:none;"><i class="fas fa-file-pdf text-danger"></i> ${f.name} を表示</a></li>`;
            });
            fileHtml += '</ul></div>';
            
            $('.approval-route-container').before(fileHtml);
        }
    }

    renderMemo() {
        const memoText = this.data.s_memo || '';
        let $memoSection = $('#memo-section');
        if ($memoSection.length === 0) {
            $memoSection = $('<div id="memo-section" class="mt-4 mb-4 p-3 border rounded bg-light" style="border-left: 4px solid #17a2b8 !important;"></div>');
            $('.approval-route-container').before($memoSection);
        }

        const html = `
            <h6 class="font-weight-bold" style="color: #17a2b8;">備考 (Memo)</h6>
            <div id="memo-display-mode">
                <p id="memo-text" class="mb-0 text-dark" style="white-space: pre-wrap; margin-top: 5px;">${memoText ? memoText : 'なし'}</p>
            </div>
            <div id="memo-edit-mode" style="display:none; margin-top: 10px;">
                <textarea id="input-memo" class="form-control" style="width: 100%; max-width: 100%; height: 80px;" placeholder="備考を入力してください...">${memoText}</textarea>
                <div style="margin-top: 10px; text-align: right;">
                    <button id="btn-update-memo" class="btn btn-sm btn-primary">備考を更新 (Update Memo)</button>
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
            if (approvedDate) return { text: '承認', color: '#28a745', date: approvedDate }; // Changed to green for approved
            if (!isNextInLine) return { text: '未定', color: '#ccc', date: null }; 
            return { text: '承認待ち', color: '#ff9900', date: null }; 
        };

        const fmtDate = (date) => date ? new Date(date).toLocaleString('ja-JP') : '-';

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

        if (this.docType !== 'common') {
            const isFullyApproved = d.dt_approved_1 && (!d.s_approved_2 || d.dt_approved_2);
            let confirmStatusColor = d.dt_confirmed ? '#28a745' : (isFullyApproved && !d.dt_rejected ? '#ff9900' : '#ccc');
            let confirmStatusText = d.dt_confirmed ? '受付済' : (isFullyApproved && !d.dt_rejected ? '受付待ち' : '未定');

            route.push({
                role: '契約受付者',
                name: 'システム管理者 (0036)',
                status: confirmStatusText,
                color: confirmStatusColor,
                date: d.dt_confirmed ? fmtDate(d.dt_confirmed) : '-'
            });
        }

        const html = route.map(step => `
            <tr>
                <td style="font-size: 13px;">${step.role}</td>
                <td style="color:${step.color}; font-weight:bold">${step.status}</td>
                <td style="font-weight:bold">${step.name}</td>
                <td style="font-size: 13px;">${step.date}</td>
            </tr>
        `).join('');

        $('#approval-route-tbody').html(html);
    }

    setupPermissions() {
        const d = this.data;
        const uid = String(this.currentUser.id || this.currentUser.id_worker); 

        // 1. Approver Logic
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

        // 2. Applicant Logic (Withdraw & Tehai Kanryou)
        const isApplicant = (String(d.s_applied) === uid);
        const canWithdraw = isApplicant && !d.dt_approved_1 && !d.dt_rejected && !d.dt_deleted;
        const isFullyApproved = d.dt_approved_1 && (!d.s_approved_2 || d.dt_approved_2);
        
        // Withdraw Button
        if (canWithdraw) {
            if ($('#btn-withdraw').length === 0) {
                $('.btn-area').prepend(`<button id="btn-withdraw" class="btn btn-secondary mr-2"><i class="fas fa-undo"></i> 申請を取下げる (Withdraw)</button>`);
            }
            $('#btn-withdraw').show();
        } else {
            $('#btn-withdraw').hide();
        }

        // Tehai Kanryou (Arrangement Complete) Button untuk Common
        if (this.docType === 'common' && isApplicant && isFullyApproved && !d.dt_confirmed && !d.dt_rejected && !d.dt_deleted) {
            if ($('#btn-tehai').length === 0) {
                $('.btn-area').prepend(`<button type="button" id="btn-tehai" class="btn btn-success mr-2"><i class="fas fa-check-circle"></i> 手配完了</button>`);
            }
            $('#btn-tehai').show();
        } else {
            $('#btn-tehai').hide();
        }

        // Contract Receiver (Admin 0036) Confirm/Remand Buttons
        const isContractReceiver = (uid === '0036');
        const isReadyForConfirm = (this.docType !== 'common' && isFullyApproved && !d.dt_confirmed && !d.dt_rejected && !d.dt_deleted);

        if (isContractReceiver && isReadyForConfirm) {
            if ($('#btn-confirm').length === 0) {
                $('.btn-area').prepend(`
                    <button type="button" id="btn-remand" class="btn btn-danger mr-2" style="background-color: #ffc107; color: #000;"><i class="fas fa-undo"></i> 差戻し (Remand)</button>
                    <button type="button" id="btn-confirm" class="btn btn-primary mr-2" style="background-color: #17a2b8;"><i class="fas fa-check-double"></i> 確認 (Confirm)</button>
                `);
            }
            $('#btn-confirm, #btn-remand').show();
        } else {
            $('#btn-confirm, #btn-remand').hide();
        }

        // 3. Admin (Memo) Logic
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
        
        $(document).on('click', '#btn-withdraw', function() {
            self.processAction('withdraw', '本当にこの申請を取り下げますか？（この操作は取り消せません）');
        });

        $(document).on('click', '#btn-tehai', function() {
            self.processAction('complete', '手配完了として登録しますか？');
        });

        $(document).on('click', '#btn-confirm', function() {
            self.processAction('complete', 'この契約を受付確認しますか？');
        });

        $(document).on('click', '#btn-remand', function() {
            self.processAction('reject', 'この申請を差戻しますか？');
        });

        $(document).on('click', '#btn-update-memo', function() {
            self.updateMemoAction();
        });
    }

    async processAction(action, confirmMsg) {
        if (!confirm(confirmMsg)) return;

        try {
            let response;
            
            if (action === 'withdraw') {
                response = await ringiSystem.apiRequest('DELETE', `${this.docType}/${this.id}`);
            } else {
                const payload = { doc_id: this.id, action: action, comment: '' };
                response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, payload);
            }

            if (response.success) {
                let successMsg = '処理が完了しました。';
                if (action === 'withdraw') successMsg = '申請を取り下げました。';
                if (action === 'complete') successMsg = '手配・確認処理が完了しました。';
                
                ringiSystem.showNotification(successMsg, 'success');
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
            const payload = { s_memo: newMemo };
            const response = await ringiSystem.apiRequest('PUT', `${this.docType}/${this.id}`, payload);

            if (response.success) {
                ringiSystem.showNotification('備考が更新されました', 'success');
                this.data.s_memo = newMemo;
                
                const btn = $('#btn-update-memo');
                const origText = btn.text();
                btn.text('保存完了').css('background-color', '#28a745');
                setTimeout(() => {
                    btn.text(origText).css('background-color', '');
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