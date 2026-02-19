class DetailHandler {
    constructor() {
        this.id = this.getUrlParameter('id');
        this.docType = this.getUrlParameter('type') || this.getDocTypeFromId(this.id);
        
        this.data = null;
        this.currentUser = window.ringiSystem.user;

        // Cache DOM
        this.$container = $('#detail-content');
        this.$loading = $('#detail-loading');
        this.$actions = $('#action-buttons');
        this.$memoSection = $('#admin-memo-section');

        this.init();
    }

    init() {
        if (!this.id) {
            alert('Document ID not found');
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
                this.renderApprovalRoute();
                this.setupPermissions();
                this.$container.fadeIn();
            } else {
                throw new Error(response.error || 'Failed to load data');
            }
        } catch (error) {
            console.error('Detail Error:', error);
            $('body').html(`<div class="alert alert-danger m-4">Error: ${error.message}</div>`);
        } finally {
            this.$loading.hide();
        }
    }

    renderData() {
        const d = this.data;
        
        // Basic mapping (Text injection by ID)
        // Pastikan di HTML ada id="lbl_subject", id="lbl_id", dll.
        $('#lbl_id').text(d.id_doc);
        $('#lbl_subject').text(d.title || d.subject || '-');
        $('#lbl_applicant').text(d.applicant_name || (d.applicant_info ? d.applicant_info.s_name : '-'));
        $('#lbl_date').text(d.ts_applied ? new Date(d.ts_applied).toLocaleDateString('ja-JP') : '-');
        
        // Format Currency fields
        $('.currency-field').each(function() {
            const key = $(this).data('key'); // misal data-key="total_amount"
            if (d[key]) {
                const val = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(d[key]);
                $(this).text(val);
            }
        });

        // Render Dynamic Fields (Tergantung tipe dokumen)
        // Anda bisa menambahkan logika spesifik per tipe form di sini
        // Contoh: Mengisi tabel detail untuk common form
        if (d.details && Array.isArray(d.details)) {
            const rows = d.details.map(item => `
                <tr>
                    <td>${item.category_name || '-'}</td>
                    <td>${item.payer}</td>
                    <td class="text-right">${new Intl.NumberFormat('ja-JP').format(item.amount)} 円</td>
                </tr>
            `).join('');
            $('#details-tbody').html(rows);
        }

        // Render Memo
        this.renderMemo(d.s_memo);
    }

    renderMemo(memoContent) {
        const content = memoContent || 'なし (Tidak ada)';
        $('#memo-display-text').text(content);
        $('#memo-input').val(content);
    }

    renderApprovalRoute() {
        const d = this.data;
        const route = [];

        // Helper Status
        const getStatusObj = (approvedDate, rejectedDate, prevApproved) => {
            if (rejectedDate && !approvedDate) return { text: '否認', color: 'red', date: rejectedDate };
            if (approvedDate) return { text: '承認', color: '#0088cc', date: approvedDate };
            if (!prevApproved) return { text: '未定', color: '#999', date: null }; // Belum sampai tahap ini
            return { text: '承認待ち', color: '#ff9900', date: null }; // Menunggu giliran
        };

        const fmtDate = (date) => date ? new Date(date).toLocaleDateString('ja-JP') : '-';

        // 1. Applicant
        route.push({
            role: '申請者',
            name: d.applicant_name,
            status: '申請済',
            color: '#333',
            date: fmtDate(d.ts_applied)
        });

        // 2. Approver 1
        if (d.s_approved_1) {
            const st1 = getStatusObj(d.dt_approved_1, d.dt_rejected, true); // true karena applicant pasti sudah submit
            route.push({
                role: '第1承認者',
                name: d.approver1_name || d.s_approved_1, // Sesuaikan dengan response API
                status: st1.text,
                color: st1.color,
                date: fmtDate(st1.date)
            });
        }

        // 3. Approver 2
        if (d.s_approved_2) {
            const st2 = getStatusObj(d.dt_approved_2, d.dt_rejected, !!d.dt_approved_1); // Hanya aktif jika app1 approved
            route.push({
                role: '第2承認者',
                name: d.approver2_name || d.s_approved_2,
                status: st2.text,
                color: st2.color,
                date: fmtDate(st2.date)
            });
        }

        // Generate HTML
        const html = route.map(step => `
            <div class="approver-item p-2 mb-2 border-bottom">
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${step.role}</small>
                    <span style="color:${step.color}; font-weight:bold">${step.status}</span>
                </div>
                <div class="font-weight-bold">${step.name}</div>
                <small class="text-muted">${step.date}</small>
            </div>
        `).join('');

        $('#approval-route-container').html(html);
    }

    setupPermissions() {
        const d = this.data;
        const uid = String(this.currentUser.id_worker || this.currentUser.id); // Normalize ID
        const role = parseInt(this.currentUser.role || 0);

        let canApprove = false;
        let canWithdraw = false;
        let canEditMemo = false;

        // Logic Owner (Withdraw)
        const isOwner = (String(d.id_applicant) === uid || String(d.s_applied) === uid);
        if (isOwner && !d.dt_deleted && !d.dt_rejected && !d.dt_approved_2) {
            canWithdraw = true;
        }

        // Logic Approval (Approver or Admin)
        const isApp1 = (String(d.s_approved_1) === uid && !d.dt_approved_1);
        const isApp2 = (String(d.s_approved_2) === uid && !d.dt_approved_2 && d.dt_approved_1); // App2 butuh App1 selesai
        
        if ((role > 0) || isApp1 || isApp2) {
            // Jangan izinkan approve jika sudah rejected atau completed
            if (!d.dt_rejected && !d.dt_approved_2) {
                canApprove = true;
            }
        }

        // Logic Edit Memo (Admin Only)
        if (role > 0 && !d.dt_deleted) {
            canEditMemo = true;
        }

        // Toggle UI Elements
        if (canApprove) $('.action-approval').show(); else $('.action-approval').hide();
        if (canWithdraw) $('.action-withdraw').show(); else $('.action-withdraw').hide();
        
        if (canEditMemo) {
            $('#btn-edit-memo').show();
        } else {
            $('#btn-edit-memo').hide();
        }
    }

    bindGlobalEvents() {
        const self = this;

        // Approve Button
        $('#btn-approve').on('click', function() {
            self.processAction('approve', '承認しますか？');
        });

        // Reject Button
        $('#btn-reject').on('click', function() {
            self.processAction('reject', '否認しますか？');
        });

        // Withdraw Button
        $('#btn-withdraw').on('click', function() {
            self.processAction('withdraw', '申請を取り下げますか？');
        });

        // Memo UI Toggles
        $('#btn-edit-memo').on('click', function() {
            $('#memo-display').hide();
            $('#memo-edit-form').show();
        });

        $('#btn-cancel-memo').on('click', function() {
            $('#memo-edit-form').hide();
            $('#memo-display').show();
        });

        $('#btn-save-memo').on('click', function() {
            self.saveMemo();
        });
    }

    async processAction(action, confirmMsg) {
        if (!confirm(confirmMsg)) return;

        try {
            const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, {
                doc_id: this.id,
                action: action,
                comment: action === 'reject' ? 'Rejected via System' : ''
            });

            if (response.success) {
                alert('処理が完了しました (Proses Berhasil)');
                location.reload();
            } else {
                alert('Error: ' + response.error);
            }
        } catch (error) {
            alert('System Error: ' + error.message);
        }
    }

    async saveMemo() {
        const newVal = $('#memo-input').val();
        if (newVal.length > 255) {
            alert('255文字以内で入力してください');
            return;
        }

        try {
            const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/memo`, {
                memo: newVal
            });

            if (response.success) {
                this.data.s_memo = newVal; // Update local state
                this.renderMemo(newVal);
                $('#memo-edit-form').hide();
                $('#memo-display').show();
                ringiSystem.showNotification('備考を更新しました', 'success');
            } else {
                alert('Update Failed: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

// Start
$(document).ready(function() {
    new DetailHandler();
});