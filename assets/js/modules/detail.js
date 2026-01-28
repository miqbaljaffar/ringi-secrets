document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard Clause: Pastikan elemen mount point ada
    if (!document.getElementById('app')) return;

    // 2. Dependency Check: Pastikan Core System sudah dimuat
    if (!window.ringiSystem) {
        console.error("CRITICAL ERROR: RingiSystem core not loaded. Check script order in HTML.");
        alert("Sistem gagal dimuat. Silakan refresh halaman.");
        return;
    }

    new Vue({
        el: '#app',
        data: {
            id: '',
            docType: '', 
            form: {}, 
            loading: true,
            error: null,
            currentUser: null,
            canApprove: false, 
            isOwner: false,
        },
        filters: {
            currency(value) {
                if (!value) return '0';
                return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
            }
        },
        computed: {
            approvalRoute() {
                if (!this.form || Object.keys(this.form).length === 0) return [];
                
                const route = [];
                // Helper internal untuk akses method
                const fmtDate = this.formatDate; 

                // Logic Approval Route (Sama seperti sebelumnya, disederhanakan untuk contoh best practice)
                let applicantName = this.form.applicant_info ? this.form.applicant_info.s_name : (this.form.applicant_name || this.form.s_applied);
                
                route.push({
                    role: '申請者',
                    name: applicantName,
                    statusText: '申請済',
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
            // Ambil ID dari URL
            const urlParams = new URLSearchParams(window.location.search);
            this.id = urlParams.get('id');

            if (!this.id) {
                this.error = 'Document ID is missing.';
                this.loading = false;
                return;
            }

            // AKSES GLOBAL VARIABEL DENGAN AMAN
            this.currentUser = window.ringiSystem.user;

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
                    case 'CO': return 'others';
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

                    // Panggil API menggunakan Global Helper
                    const response = await window.ringiSystem.apiRequest('GET', `${this.docType}/${this.id}`);
                    
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
                // Pastikan perbandingan string vs string / int vs int
                this.isOwner = (String(this.currentUser.id) === String(creatorId));

                // Cek Approver
                let isApprover1 = (String(this.form.s_approved_1) === String(this.currentUser.id) && !this.form.dt_approved_1);
                let isApprover2 = (String(this.form.s_approved_2) === String(this.currentUser.id) && !this.form.dt_approved_2);
                
                if(isApprover2 && !this.form.dt_approved_1) isApprover2 = false;

                // Role > 0 dianggap admin/manager yang bisa override (Business Logic)
                if ((this.currentUser.role && parseInt(this.currentUser.role) > 0) || isApprover1 || isApprover2) { 
                    this.canApprove = true; 
                } else {
                    this.canApprove = false;
                }
            },

            formatDate(dateStr) {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                // Validasi date object
                if (isNaN(d.getTime())) return '-';
                return d.toLocaleDateString('ja-JP');
            },

            async doApprove() {
                if (!confirm('承認しますか？ (Approve?)')) return;
                
                try {
                    const response = await window.ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, {
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
                    alert('System Error: ' + e.message);
                }
            },

            async doReject() {
                if (!confirm('否認しますか？ (Reject?)')) return;
                 try {
                    const response = await window.ringiSystem.apiRequest('POST', `${this.docType}/${this.id}/approve`, {
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
                    alert('System Error: ' + e.message);
                }
            }
        }
    });
});