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

    // 初期化関数 - 文書IDの検証、データの読み込み、イベントのバインドを行う
    init() {
        if (!this.id) {
            alert('文書IDが見つかりません');
            return;
        }
        this.loadDocument();
        this.bindGlobalEvents();
    }

    // URLパラメータから値を取得するユーティリティ関数 
    getUrlParameter(name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return results ? results[1] : null;
    }

    // 文書IDのプレフィックスからドキュメントタイプを推測するロジック
    getDocTypeFromId(id) {
        if (!id || id.length < 2) return 'common';
        const prefix = id.substring(0, 2).toUpperCase();
        const map = { 'AR': 'common', 'CT': 'tax', 'CV': 'vendor', 'CO': 'others' };
        return map[prefix] || 'common';
    }

    // ドキュメントデータをAPIから非同期に読み込む関数
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

    // 読み込んだデータをHTMLに反映する関数
    renderData() {
        const d = this.data;
        
        // 1. 基本情報
        $('#lbl_id').text(d.id_doc);
        $('#lbl_applicant').text(d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied || '-'));
        $('#lbl_date').text(d.ts_applied ? new Date(d.ts_applied).toLocaleDateString('ja-JP') : '-');
        
        // 2. フォームタイプ別表示
        if (this.docType === 'tax') {
            $('#tax-section').show();
            $('#tax_s_name').text(d.s_name || '-');
            $('#tax_s_kana').text(d.s_kana || '-');
            $('#tax_s_rep_name').text(d.s_rep_name || '-');
            $('#tax_s_rep_pcode').text(d.s_rep_pcode || '-');
            $('#tax_s_rep_address').text(d.s_rep_address || '-');
            $('#tax_s_rep_address2').text(d.s_rep_address2 || '');
            
            $('#tax_s_office_pcode').text(d.s_office_pcode || '-');
            $('#tax_s_office_address').text(d.s_office_address || '-');
            $('#tax_s_office_address2').text(d.s_office_address2 || '');
            $('#tax_s_office_tel').text(d.s_office_tel || '-');
            
            $('#tax_s_tax_office').text(d.s_tax_office || '-');
            $('#tax_n_closing_month').text(d.n_closing_month ? d.n_closing_month + '月' : '-');
            $('#tax_s_tax_num').text(d.s_tax_num || '-');
            $('#tax_s_national_tax_id').text(d.s_national_tax_id || '-');
            $('#tax_s_local_tax_id').text(d.s_local_tax_id || '-');
            
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
                        <td class="text-right">${new Intl.NumberFormat('ja-JP').format(item.n_amount || item.amount || 0)} 円</td>
                    </tr>
                `).join('');
                $('#details-tbody').html(rows);
            } else {
                $('#details-tbody').html('<tr><td colspan="3" class="text-center">詳細データがありません</td></tr>');
            }
        }
        
        // 3. 透明なステータススタンプ
        if (d.dt_deleted) {
            $('#stamp-withdrawn').show();
        } else if (d.dt_rejected) {
            $('#stamp-rejected').show();
        } else if (d.dt_approved_2 || (d.dt_approved_1 && !d.s_approved_2)) { 
            $('#stamp-approved').show();
        }
    }

    // 備考セクションを動的に生成して表示する関数
    renderMemo() {
        const memoText = this.data.s_memo || '';
        
        let $memoSection = $('#memo-section');
        if ($memoSection.length === 0) {
            $memoSection = $('<div id="memo-section" class="mt-4 mb-4 p-3 border rounded bg-light" style="border-left: 4px solid #17a2b8 !important;"></div>');
            
            // 承認ルートテーブルの前に挿入
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
                    <button id="btn-update-memo" class="btn btn-sm btn-info text-white">
                        備考を更新
                    </button>
                </div>
            </div>
        `;
        $memoSection.html(html);
    }

    // 承認ルートを動的に生成して表示する関数
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

        // 申請者
        route.push({
            role: '申請者',
            name: d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied),
            status: d.dt_deleted ? '取下げ' : '申請済',
            color: '#333',
            date: fmtDate(d.ts_applied)
        });

        // 第1承認者
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

        // 第2承認者
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

    // 現在のユーザーの権限に基づいて、承認ボタンやメモ編集機能の表示/非表示を制御する関数
    setupPermissions() {
        const d = this.data;
        const uid = String(this.currentUser.id || this.currentUser.id_worker); 

        // 1. 承認ボタンの表示ロジック
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

    // 承認/否認ボタンと管理者用メモ更新ボタンのイベントハンドラを設定する関数
    bindGlobalEvents() {
        const self = this;

        $('#btn-approve').on('click', function() {
            self.processAction('approve', 'この稟議を承認しますか？');
        });

        $('#btn-reject').on('click', function() {
            self.processAction('reject', 'この稟議を否認しますか？');
        });

        // 管理者用メモ更新ボタンの動的イベントハンドラ
        $(document).on('click', '#btn-update-memo', function() {
            self.updateMemoAction();
        });
    }

    // 承認/否認のアクションを処理する関数
    async processAction(action, confirmMsg) {
        if (!confirm(confirmMsg)) return;

        try {
            const payload = {
                doc_id: this.id,
                action: action,
                comment: '' 
            };

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

    // 管理者が備考を更新するためのイベントハンドラ関数
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