/**
 * Detail Document Module - FIX VERSION
 * Handles displaying details of a specific Ringi document
 */

document.addEventListener('DOMContentLoaded', () => {
    // [PERBAIKAN 1] Sesuaikan ID dengan yang ada di detail.html (<div id="app">)
    if (!document.getElementById('app')) return;

    new Vue({
        el: '#app',
        data: {
            id: '',
            docType: '', // 'common', 'tax', 'vendor', 'others'
            
            // [PERBAIKAN 2] Gunakan 'form' agar sesuai dengan HTML {{ form.xxx }}
            form: {}, 
            
            loading: true,
            error: null,
            currentUser: null,
            
            canApprove: false, 
            isOwner: false,
            
            // UI States
            showRejectModal: false,
            rejectReason: ''
        },
        // [PERBAIKAN 3] Tambahkan Filter untuk {{ x | currency }}
        filters: {
            currency(value) {
                if (!value) return '0';
                // Format Yen Jepang
                return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
            }
        },
        // [PERBAIKAN 4] Tambahkan Computed Property 'approvalRoute' untuk menghilangkan warning Vue
        // dan merender tabel approval secara dinamis berdasarkan data form
        computed: {
            approvalRoute() {
                if (!this.form || Object.keys(this.form).length === 0) return [];
                
                const route = [];
                const fmtDate = this.formatDate; // Gunakan method helper

                // 1. Applicant (Pemohon)
                let applicantName = this.form.applicant_info ? this.form.applicant_info.s_name : (this.form.applicant_name || this.form.s_applied);
                
                route.push({
                    role: '申請者', // Applicant
                    name: applicantName,
                    statusText: '申請済', // Applied
                    statusColor: '#333',
                    date: fmtDate(this.form.ts_applied)
                });

                // 2. Approver 1
                let status1 = '未定'; // Belum ditentukan
                let color1 = '#999';
                let date1 = '-';
                
                if (this.form.dt_rejected && !this.form.dt_approved_1) {
                    status1 = '否認'; // Rejected
                    color1 = 'red';
                    date1 = fmtDate(this.form.dt_rejected);
                } else if (this.form.dt_approved_1) {
                    status1 = '承認'; // Approved
                    color1 = '#0088cc';
                    date1 = fmtDate(this.form.dt_approved_1);
                } else {
                    status1 = '承認待ち'; // Waiting
                    color1 = '#ff9900';
                }

                if (this.form.s_approved_1) {
                     let name1 = this.form.approver1_info ? this.form.approver1_info.s_name : this.form.s_approved_1;
                     route.push({
                        role: '第1承認者',
                        name: name1,
                        statusText: status1,
                        statusColor: color1,
                        date: date1
                    });
                }

                // 3. Approver 2
                if (this.form.s_approved_2) {
                    let status2 = '未定';
                    let color2 = '#999';
                    let date2 = '-';

                    if (this.form.dt_rejected && this.form.dt_approved_1) {
                        status2 = '否認';
                        color2 = 'red';
                        date2 = fmtDate(this.form.dt_rejected);
                    } else if (this.form.dt_approved_2) {
                        status2 = '承認';
                        color2 = '#0088cc';
                        date2 = fmtDate(this.form.dt_approved_2);
                    } else if (this.form.dt_approved_1) {
                        status2 = '承認待ち';
                        color2 = '#ff9900';
                    }

                    let name2 = this.form.approver2_info ? this.form.approver2_info.s_name : this.form.s_approved_2;
                    route.push({
                        role: '第2承認者',
                        name: name2,
                        statusText: status2,
                        statusColor: color2,
                        date: date2
                    });
                }
                
                return route;
            }
        },
        async mounted() {
            // 1. Get ID from URL Query Parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.id = urlParams.get('id');

            console.log("Loading Doc ID:", this.id);

            if (!this.id) {
                this.error = 'Document ID is missing.';
                this.loading = false;
                return;
            }

            // [PERBAIKAN 5] Akses user dari instance global 'ringiSystem' (bukan class static)
            // ringiSystem didefinisikan di main.js sebagai: window.ringiSystem = new RingiSystem();
            if (window.ringiSystem) {
                this.currentUser = window.ringiSystem.user;
            } else {
                console.error("RingiSystem core not loaded");
            }

            // 3. Load Document Data
            await this.loadDocument();
        },
        methods: {
            getDocTypeFromId(id) {
                if (!id || id.length < 2) return null;
                const prefix = id.substring(0, 2).toUpperCase();
                
                switch (prefix) {
                    case 'AR': return 'common';
                    case 'CT': return 'tax';
                    case 'CV': return 'vendor';
                    case 'CO': return 'others'; // CO maps to 'others' route
                    default: return 'common';
                }
            },

            async loadDocument() {
                this.loading = true;
                this.error = null;

                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    let typeParam = urlParams.get('type');
                    
                    if (!typeParam || typeParam === 'undefined') {
                        this.docType = this.getDocTypeFromId(this.id);
                    } else {
                        this.docType = typeParam;
                    }
                    
                    if (!this.docType) {
                        throw new Error("Invalid Document ID or Type.");
                    }

                    console.log(`Fetching: /${this.docType}/${this.id}`);

                    // [PERBAIKAN 6] Gunakan instance 'ringiSystem' (huruf kecil)
                    const response = await ringiSystem.apiRequest('GET', `${this.docType}/${this.id}`);
                    
                    if (response.success) {
                        this.form = response.data;
                        this.calculatePermissions();
                    } else {
                        this.error = response.error || 'Failed to load document.';
                    }

                } catch (err) {
                    console.error("Load Error:", err);
                    this.error = err.message || 'An error occurred while loading data.';
                } finally {
                    this.loading = false;
                }
            },

            calculatePermissions() {
                if (!this.currentUser || !this.form) return;

                const creatorId = this.form.id_draft_writer || this.form.id_applicant || this.form.s_applied;
                this.isOwner = (String(this.currentUser.id) === String(creatorId));

                // Logika Approval Sederhana
                // Cek apakah user adalah approver 1 atau 2 dan belum melakukan approval
                let isApprover1 = (String(this.form.s_approved_1) === String(this.currentUser.id) && !this.form.dt_approved_1);
                let isApprover2 = (String(this.form.s_approved_2) === String(this.currentUser.id) && !this.form.dt_approved_2);
                
                // Approver 2 biasanya menunggu Approver 1
                if(isApprover2 && !this.form.dt_approved_1) isApprover2 = false;

                if (this.currentUser.role > 0 || isApprover1 || isApprover2) { 
                    this.canApprove = true; 
                } else {
                    this.canApprove = false;
                }
            },

            // [PERBAIKAN 7] Implementasi Helper lokal untuk mencegah error jika RingiSystem static method tidak ada
            formatDate(dateStr) {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                return d.toLocaleDateString('ja-JP');
            },

            formatCurrency(amount) {
                if (!amount) return '0';
                return new Intl.NumberFormat('ja-JP').format(amount);
            },
            
            async doApprove() {
                if (!confirm('承認しますか？ (Approve?)')) return;
                
                try {
                    const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, {
                        doc_id: this.id,
                        action: 'approve',
                        comment: ''
                    });

                    if (response.success) {
                        alert('承認しました (Approved)');
                        location.reload();
                    } else {
                        alert('Error: ' + response.error);
                    }
                } catch (e) {
                    alert('System Error');
                }
            },

            async doReject() {
                if (!confirm('否認しますか？ (Reject?)')) return;
                 try {
                    const response = await ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, {
                        doc_id: this.id,
                        action: 'reject',
                        comment: 'Rejected by User'
                    });

                    if (response.success) {
                        alert('否認しました (Rejected)');
                        location.reload();
                    } else {
                        alert('Error: ' + response.error);
                    }
                } catch (e) {
                    alert('System Error');
                }
            }
        }
    });
});