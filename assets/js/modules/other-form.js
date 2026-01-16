class OtherFormHandler {
    constructor() {
        this.form = document.getElementById('other-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.setDefaultValues();
        this.loadEmployees(); // Memuat data PIC (Penanggung Jawab)
        this.bindEvents();
        
        // AutoKana Setup (Library eksternal untuk konversi nama ke katakana otomatis)
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
        }
    }

    setDefaultValues() {
        // Set tanggal hari ini sebagai default
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('apply-date');
        if (dateInput) {
            dateInput.value = today;
        }
        
        // Set nama pemohon otomatis dari sesi login
        if (ringiSystem.user) {
            const applicantInput = document.getElementById('applicant-name');
            if (applicantInput) {
                applicantInput.value = ringiSystem.user.name;
            }
        }
    }

    async loadEmployees() {
        const select = document.querySelector('select[name="s_incharge"]');
        if (!select) return;

        // Bersihkan opsi lama (kecuali placeholder pertama)
        while (select.options.length > 1) {
            select.remove(1);
        }

        try {
            // PERBAIKAN: Mencoba mengambil data dari API (Sesuai Spec: v_worker)
            // Menggunakan endpoint 'users' (perlu dipastikan endpoint ini ada di routes.php)
            // Jika backend belum siap, akan jatuh ke catch (fallback mock data)
            const response = await ringiSystem.apiRequest('GET', 'users/list'); // Asumsi endpoint list user
            
            if (response.success && response.data.length > 0) {
                this.renderEmployeeOptions(select, response.data);
                return;
            }
            throw new Error('Data karyawan kosong atau API belum tersedia');

        } catch (error) {
            console.warn('Menggunakan data mock karyawan (API belum siap):', error);
            
            // Fallback: Data Mock Statis (Untuk keperluan demo UI)
            const mockEmployees = [
                { id_worker: '0001', s_name: 'Yamada Taro' },
                { id_worker: '0002', s_name: 'Suzuki Ichiro' },
                { id_worker: '0036', s_name: 'Admin Contract' }
            ];
            this.renderEmployeeOptions(select, mockEmployees);
        }
    }

    renderEmployeeOptions(selectElement, employees) {
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id_worker; // Menggunakan id_worker sesuai DB
            opt.textContent = `${emp.id_worker}: ${emp.s_name}`;
            selectElement.appendChild(opt);
        });
    }

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // PERBAIKAN: Jalankan penggabungan field sebelum mengambil FormData
            this.combineFields();

            const formData = new FormData(this.form);
            
            try {
                // Mengirim ke endpoint 'others' (OtherContractController)
                const response = await ringiSystem.apiRequest('POST', 'others', formData, true);
                
                if (response.success) {
                    ringiSystem.showNotification('Pengajuan kontrak berhasil disimpan!', 'success');
                    // Redirect ke halaman view detail
                    setTimeout(() => {
                        window.location.href = `/pages/view-document.html?id=${response.doc_id}&type=others`;
                    }, 1500);
                }
            } catch (error) {
                console.error('Error submit:', error);
                ringiSystem.showNotification(error.message || 'Gagal mengirim data.', 'error');
            }
        });
    }

    combineFields() {
        // PERBAIKAN LOGIKA: Menggabungkan Kode Industri sesuai Spec DB (char(4))
        // s_cat_1 (1 char) + s_cat_2 (2 char) + s_cat_3 (1 char)
        
        const t1 = this.form.querySelector('[name="s_industry_type_1"]')?.value || '';
        const t2 = this.form.querySelector('[name="s_industry_type_2"]')?.value || '';
        const t3 = this.form.querySelector('[name="s_industry_type_3"]')?.value || '';
        
        // Gabungkan string
        const combinedType = t1 + t2 + t3;

        // Cek apakah hidden input sudah ada, jika belum buat baru
        let hiddenInput = this.form.querySelector('input[name="s_industry_type"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 's_industry_type'; // Nama field yang diharapkan Controller/Model
            this.form.appendChild(hiddenInput);
        }
        
        // Set nilai gabungan ke hidden input agar terambil oleh FormData
        hiddenInput.value = combinedType;
    }
}

// Inisialisasi Handler
new OtherFormHandler();