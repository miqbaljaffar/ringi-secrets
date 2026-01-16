class SearchModule {
    constructor() {
        this.searchForm = document.getElementById('search-form');
        this.resultsContainer = document.getElementById('search-results');
        this.currentTab = 'all';
        this.init();
    }
    
    init() {
        // Load data awal (misal tab: all atau to_approve tergantung role)
        this.loadInitialData();
        this.setupTabs();
        
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }
    }
    
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                // Add active class
                e.target.classList.add('active');
                
                this.currentTab = e.target.dataset.tab;
                this.performSearch();
            });
        });
    }
    
    async loadInitialData() {
        // Cek user role dari ringiSystem global
        const user = ringiSystem.user;
        // Jika approver, default tab mungkin 'to_approve'
        if (user && user.role >= 1) {
            this.currentTab = 'to_approve';
            const tabEl = document.querySelector('[data-tab="to_approve"]');
            if(tabEl) tabEl.click();
        } else {
            this.performSearch();
        }
    }
    
    async performSearch() {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.innerHTML = '<div class="text-center p-4"><div class="spinner"></div> Memuat data...</div>';
        
        const params = new URLSearchParams();
        params.append('tab', this.currentTab);
        
        // Ambil filter dari form jika ada
        if (this.searchForm) {
            const formData = new FormData(this.searchForm);
            for (let [key, value] of formData.entries()) {
                if(value) params.append(key, value);
            }
        }

        try {
            // Gunakan endpoint 'search' yang baru
            const response = await ringiSystem.apiRequest('GET', `search?${params.toString()}`);
            
            if (response.success) {
                this.renderResults(response.data);
                this.updateBadges(); // Update angka notifikasi
            } else {
                this.resultsContainer.innerHTML = '<div class="alert alert-danger">Gagal memuat data</div>';
            }
        } catch (error) {
            console.error('Search error:', error);
            this.resultsContainer.innerHTML = '<div class="alert alert-danger">Terjadi kesalahan sistem</div>';
        }
    }
    
    renderResults(documents) {
        if (documents.length === 0) {
            this.resultsContainer.innerHTML = '<div class="no-results p-4 text-center">Tidak ada dokumen ditemukan.</div>';
            return;
        }
        
        const html = documents.map(doc => {
            // Tentukan label tipe dokumen
            let typeLabel = '';
            let typeClass = '';
            switch(doc.type) {
                case 'common': typeLabel = 'Umum'; typeClass='badge-primary'; break;
                case 'tax': typeLabel = 'Pajak'; typeClass='badge-warning'; break;
                case 'others': typeLabel = 'Lainnya'; typeClass='badge-info'; break;
                case 'vendor': typeLabel = 'Vendor'; typeClass='badge-success'; break;
            }

            const status = this.getStatus(doc);
            const statusText = this.getStatusText(status);
            const statusClass = `status-${status}`;
            
            return `
                <div class="result-item" onclick="window.location.href='/pages/view-document.html?id=${doc.id_doc}&type=${doc.type}'">
                    <div class="result-header">
                        <div>
                            <span class="badge ${typeClass}">${typeLabel}</span>
                            <span class="doc-id ml-2">${doc.id_doc}</span>
                        </div>
                        <div class="${statusClass}">${statusText}</div>
                    </div>
                    <div class="result-body">
                        <h4 class="doc-title">${doc.title || '(Tanpa Judul)'}</h4>
                        <div class="doc-meta">
                            <span><i class="icon-user"></i> ${doc.applicant_name}</span>
                            <span><i class="icon-calendar"></i> ${new Date(doc.ts_applied).toLocaleDateString('ja-JP')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.resultsContainer.innerHTML = html;
    }

    getStatus(doc) {
        if (doc.dt_deleted) return 'withdrawn';
        if (doc.dt_rejected) return 'rejected';
        if (doc.dt_approved_2) return 'approved';
        if (doc.dt_approved_1) return 'pending_second';
        return 'pending';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'Menunggu Persetujuan 1',
            'pending_second': 'Menunggu Persetujuan 2',
            'approved': 'Disetujui',
            'rejected': 'Ditolak',
            'withdrawn': 'Ditarik',
            'completed': 'Selesai'
        };
        return texts[status] || status;
    }
    
    async updateBadges() {
        // Implementasi opsional: Hitung jumlah 'to_approve' untuk badge notifikasi
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah kita di halaman yang punya search container
    if (document.getElementById('search-results')) {
        window.searchModule = new SearchModule();
    }
});
