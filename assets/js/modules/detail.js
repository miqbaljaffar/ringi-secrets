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
            $('body').html(`<div class="alert alert-danger m-4 text-center">データを読み込めません: ${error.message}</div>`);
        } finally {
            this.$loading.hide();
        }
    }

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
            $('#tax_n_type').text(d.n_type == '1' ? '法人 (Corporate)' : '個人 (Individual)');
            $('#tax_s_name').text(d.s_name || '-');
            $('#tax_s_kana').text(d.s_kana || '-');
            $('#tax_s_rep_name').text(d.s_rep_name || '-');
            $('#tax_s_office_address').text(d.s_office_address || '-');
        } 
        else if (this.docType === 'common') {
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
            }
        }
        else if (this.docType === 'vendor' || this.docType === 'others') {
            let html = `<div class="p-3 border rounded bg-light mb-4">
                            <h5 class="text-primary border-bottom pb-2">取引先・その他基本情報</h5>
                            <table class="table table-sm table-bordered mt-3">
                                <tbody>
                                    <tr><th width="30%" class="bg-light">名称 (Name)</th><td>${d.s_name || d.s_title || '-'}</td></tr>
                                    <tr><th class="bg-light">内容 (Overview)</th><td>${d.s_overview || d.s_situation || '-'}</td></tr>
                                    <tr><th class="bg-light">金額 (Amount)</th><td>${this.fmtMoney(d.n_amount || d.total_amount)} 円</td></tr>
                                </tbody>
                            </table>
                        </div>`;
            $('#detail-content').prepend(html);
        }
        
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
            let fileHtml = '<div class="mt-4 mb-4 p-3 border rounded"><h5><i class="fas fa-paperclip"></i> 添付書類</h5><ul class="list-unstyled mt-2">';
            files.forEach(f => {
                fileHtml += `<li class="mb-2"><a href="${ringiSystem.baseUrl}/../${f.path}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="fas fa-file-pdf text-danger"></i> ${f.name} を表示</a></li>`;
            });
            fileHtml += '</ul></div>';
            
            if ($('#memo-section').length) {
                $('#memo-section').before(fileHtml);
            } else {
                $('.approval-route-container').before(fileHtml);
            }
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

        if (this.docType !== 'common') {
            route.push({
                role: '契約受付者',
                name: 'システム管理者 (0036)',
                status: d.dt_confirmed ? '受付済' : '未定',
                color: d.dt_confirmed ? '#0088cc' : '#ccc',
                date: d.dt_confirmed ? fmtDate(d.dt_confirmed) : '-'
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

        // PERBAIKAN: Tehai Kanryou (Arrangement Complete) Button
        if (isApplicant && isFullyApproved && !d.dt_confirmed && !d.dt_rejected && !d.dt_deleted) {
            if ($('#btn-tehai').length === 0) {
                $('.btn-area').prepend(`<button type="button" id="btn-tehai" class="btn btn-success mr-2"><i class="fas fa-check-circle"></i> 手配完了</button>`);
            }
            $('#btn-tehai').show();
        } else {
            $('#btn-tehai').hide();
        }

        // PERBAIKAN: Contract Receiver (Admin 0036) Confirm/Remand Buttons
        const isContractReceiver = (uid === '0036');
        const isReadyForConfirm = (this.docType !== 'common' && isFullyApproved && !d.dt_confirmed && !d.dt_rejected && !d.dt_deleted);

        if (isContractReceiver && isReadyForConfirm) {
            if ($('#btn-confirm').length === 0) {
                $('.btn-area').prepend(`
                    <button type="button" id="btn-remand" class="btn btn-warning mr-2"><i class="fas fa-undo"></i> 差戻し (Remand)</button>
                    <button type="button" id="btn-confirm" class="btn btn-info mr-2"><i class="fas fa-check-double"></i> 確認 (Confirm)</button>
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

        // Event listener tambahan untuk Tehai, Confirm, dan Remand
        $(document).on('click', '#btn-tehai', function() {
            self.processAction('tehai', '手配完了として登録しますか？');
        });

        $(document).on('click', '#btn-confirm', function() {
            self.processAction('confirm', 'この契約を受付確認しますか？');
        });

        $(document).on('click', '#btn-remand', function() {
            self.processAction('remand', 'この申請を差戻しますか？');
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
                let successMsg = '処理が完了しました。';
                if (action === 'withdraw') successMsg = '申請を取り下げました。';
                if (action === 'tehai') successMsg = '手配完了として登録しました。';
                if (action === 'remand') successMsg = '差戻し処理が完了しました。';
                
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