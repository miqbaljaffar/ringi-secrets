/* ringi/assets/js/modules/list.js - UPDATED 5 TABS VERSION */
var app = new Vue({
  el: "#app",
  data: {
    // Default tab: 'all'
    // Opsi: 'all', 'waiting' (Tracking), 'approved', 'rejected', 'action_needed' (Tugas Approval)
    currentTab: "all", 
    
    filters: {
      date_start: "",
      date_end: "",
      form_type: "",
      keyword: "",
    },
    items: [],
    isLoading: false,
    errorMessage: null,
    
    // Counter khusus untuk Badge "要承認"
    pendingCount: 0 
  },
  
  mounted() {
    this.fetchData();
    this.fetchPendingCount(); // Hitung badge saat load
  },
  
  methods: {
    // Fungsi Utama: Ambil data tabel berdasarkan Tab
    async fetchData() {
      this.isLoading = true;
      this.items = []; // Clear dulu
      this.errorMessage = null;
      
      try {
        const params = new URLSearchParams({
            tab: this.currentTab, // Kirim parameter tab yang baru (waiting/action_needed)
            keyword: this.filters.keyword,
            type: this.filters.form_type,
            date_start: this.filters.date_start,
            date_end: this.filters.date_end
        });

        // Panggil API
        const response = await ringiSystem.apiRequest('GET', `search?${params.toString()}`);
        
        if (response.success) {
            this.items = response.data.map(doc => ({
                id: doc.id_doc,
                form_name: this.mapTypeToName(doc.type),
                applicant: doc.applicant_name,
                date: new Date(doc.ts_applied).toLocaleDateString('ja-JP'),
                subject: doc.title || '(Tanpa Judul)',
                statusText: this.mapStatusText(doc.status_code),
                status_code: doc.status_code,
                typeRaw: doc.type 
            }));
        } else {
            // Jika backend belum siap, kita tampilkan data dummy agar UI terlihat benar
            // console.warn("Backend belum support 5 tab, menggunakan dummy data.");
            // this.items = []; 
        }
      } catch (error) {
        console.error(error);
        this.errorMessage = "Terjadi kesalahan koneksi.";
      } finally {
        this.isLoading = false;
      }
    },

    // Fungsi Terpisah: Hitung jumlah approval yang tertunda untuk Badge
    // Ini harus dipanggil terpisah karena badge harus tetap muncul meskipun kita sedang di tab 'all'
    async fetchPendingCount() {
        try {
            // Contoh pemanggilan API khusus count (jika ada)
            // const res = await ringiSystem.apiRequest('GET', 'search/count?tab=action_needed');
            // if(res.success) this.pendingCount = res.count;
            
            // MOCKUP: Simulasi ada 3 tugas approval untuk demo
            // Nanti diganti dengan data real dari backend
            this.pendingCount = 3; 
            
        } catch (e) {
            console.error("Gagal load badge count", e);
        }
    },

    doSearch: function () {
      this.fetchData(); 
    },
    
    switchTab(tabName) {
        this.currentTab = tabName;
        this.fetchData(); 
    },
    
    // Helper Mapping
    mapTypeToName(type) {
        const types = {
            'common': '通常稟議',
            'tax': '税務契約',
            'contract': '契約稟議',
            'vendor': '取引開始',
            'others': 'その他'
        };
        return types[type] || type;
    },
    
    mapStatusText(code) {
        const statuses = {
            'pending': '承認待ち (1)',
            'pending_second': '承認待ち (2)',
            'approved': '承認済',
            'rejected': '否認',
            'withdrawn': '取下げ'
        };
        return statuses[code] || code;
    }
  },
});