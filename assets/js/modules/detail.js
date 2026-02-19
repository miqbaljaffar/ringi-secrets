class DetailHandler {
    constructor() {
        this.id = this.getUrlParameter('id');
        this.docType = this.getUrlParameter('type') || this.getDocTypeFromId(this.id);
        
        this.data = null;
        
        // Ambil dari global state yang diset oleh auth.js
        const sessionUser = sessionStorage.getItem('user');
        this.currentUser = sessionUser ? JSON.parse(sessionUser) : { role: 0, id: '0000', id_worker: '0000' };

        this.$container = $('#detail-content');
        this.$loading = $('#detail-loading');
        
        this.init();
    }

    init() {
        if (!this.id) {
            alert('ID Dokumen tidak ditemukan');
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
                throw new Error(response.error || 'Gagal memuat data');
            }
        } catch (error) {
            console.error('Detail Error:', error);
            $('body').html(`<div class="alert alert-danger m-4 text-center">Data tidak dapat dimuat: ${error.message}</div>`);
        } finally {
            this.$loading.hide();
        }
    }

    renderData() {
        const d = this.data;
        
        // 1. Data Umum
        $('#lbl_id').text(d.id_doc);
        // Tampilkan nama pelamar, ambil dari relasi jika ada, atau s_applied jika tidak ada
        $('#lbl_applicant').text(d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied || '-'));
        $('#lbl_date').text(d.ts_applied ? new Date(d.ts_applied).toLocaleDateString('ja-JP') : '-');
        
        // 2. Tampilkan Berdasarkan Tipe Form
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
        
        // 3. Stempel Status Transparan
        if (d.dt_deleted) {
            $('#stamp-withdrawn').show();
        } else if (d.dt_rejected) {
            $('#stamp-rejected').show();
        } else if (d.dt_approved_2 || (d.dt_approved_1 && !d.s_approved_2)) { // App 2 bisa nullable menurut spec
            $('#stamp-approved').show();
        }
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

        // Applicant
        route.push({
            role: '申請者',
            name: d.applicant_info ? d.applicant_info.s_name : (d.applicant_name || d.s_applied),
            status: d.dt_deleted ? '取下げ' : '申請済',
            color: '#333',
            date: fmtDate(d.ts_applied)
        });

        // App 1
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

        // App 2
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

        // Render pure html table row
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
        // Pastikan kompatibel dengan id_worker yang lama maupun id dari sistem auth baru
        const uid = String(this.currentUser.id || this.currentUser.id_worker); 

        let canApprove = false;

        // Cek giliran approval
        const isApp1Turn = (String(d.s_approved_1) === uid && !d.dt_approved_1);
        const isApp2Turn = (String(d.s_approved_2) === uid && d.dt_approved_1 && !d.dt_approved_2); 
        
        if (isApp1Turn || isApp2Turn) {
            if (!d.dt_rejected && !d.dt_deleted) {
                canApprove = true;
            }
        }

        if (canApprove) $('.action-approval').show(); 
        else $('.action-approval').hide();
    }

    bindGlobalEvents() {
        const self = this;

        $('#btn-approve').on('click', function() {
            self.processAction('approve', 'この稟議を承認しますか？ (Apakah Anda ingin menyetujui dokumen ini?)');
        });

        $('#btn-reject').on('click', function() {
            self.processAction('reject', 'この稟議を否認しますか？ (Apakah Anda ingin menolak dokumen ini?)');
        });
    }

    async processAction(action, confirmMsg) {
        if (!confirm(confirmMsg)) return;

        try {
            // PERBAIKAN FATAL: Backend CommonController@approve mengharapkan parameter doc_id di body.
            const payload = {
                doc_id: this.id, // Wajib ada sesuai logika PHP
                action: action,
                comment: '' // Bisa ditambahkan textarea komentar pada UI jika diperlukan
            };

            const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, payload);

            if (response.success) {
                ringiSystem.showNotification('Proses persetujuan berhasil.', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                ringiSystem.showNotification('Error: ' + response.error, 'error');
            }
        } catch (error) {
            ringiSystem.showNotification('System Error: ' + error.message, 'error');
        }
    }
}

$(document).ready(function() {
    new DetailHandler();
});