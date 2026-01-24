/* ringi/assets/js/modules/list.js - FIX VERSION */
var app = new Vue({
  el: "#app",
  data: {
    currentTab: "all", // all, waiting, approved, rejected, action_needed
    filters: {
      date_start: "",
      date_end: "",
      form_type: "",
      keyword: "",
    },
    items: [], // Data akan diisi dari API
    isLoading: false,
    errorMessage: null
  },
  computed: {
    pendingCount: function () {
      // Hitung dari items yang statusnya pending
      return this.items.filter((i) => i.status_code === 'pending_second' || i.status_code === 'pending').length;
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    // Fungsi Utama: Ambil data dari API SearchController
    async fetchData() {
      this.isLoading = true;
      this.errorMessage = null;
      
      try {
        // Gunakan helper global ringiSystem yang ada di main.js
        const params = new URLSearchParams({
            tab: this.currentTab,
            keyword: this.filters.keyword,
            type: this.filters.form_type,
        });

        const response = await ringiSystem.apiRequest('GET', `search?${params.toString()}`);
        
        if (response.success) {
            // Mapping data dari format Backend ke format Frontend
            this.items = response.data.map(doc => ({
                id: doc.id_doc,
                form_name: this.mapTypeToName(doc.type),
                applicant: doc.applicant_name,
                date: new Date(doc.ts_applied).toLocaleDateString('ja-JP'),
                subject: doc.title || '(Tanpa Judul)',
                statusText: this.mapStatusText(doc.status_code),
                status_code: doc.status_code,
                
                // [PERBAIKAN UTAMA] Menambahkan typeRaw agar link di HTML tidak undefined
                typeRaw: doc.type 
            }));
        } else {
            this.errorMessage = "Gagal memuat data.";
        }
      } catch (error) {
        console.error(error);
        this.errorMessage = "Terjadi kesalahan koneksi.";
      } finally {
        this.isLoading = false;
      }
    },

    doSearch: function () {
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
    },

    switchTab(tabName) {
        this.currentTab = tabName;
        this.fetchData(); 
    }
  },
});