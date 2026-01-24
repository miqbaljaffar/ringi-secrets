class OtherFormHandler {
    constructor() {
        this.form = document.getElementById('other-form');
        this.init();
    }

    init() {
        if (!this.form) return;

        this.setDefaultValues();
        this.loadEmployees();
        this.bindEvents();
        
        if ($.fn.autoKana) {
            $.fn.autoKana('#s_name', '#s_kana', { katakana: true });
        }
    }

    setDefaultValues() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('apply-date');
        if (dateInput) dateInput.value = today;
        
        if (ringiSystem.user) {
            const applicantInput = document.getElementById('applicant-name');
            if (applicantInput) applicantInput.value = ringiSystem.user.name;
        }
    }

    async loadEmployees() {
        const select = document.querySelector('select[name="s_incharge"]');
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        try {
            const response = await ringiSystem.apiRequest('GET', 'users/list'); 
            if (response.success && response.data.length > 0) {
                this.renderEmployeeOptions(select, response.data);
                return;
            }
            throw new Error('Data karyawan kosong');
        } catch (error) {
            console.warn('Menggunakan data mock karyawan:', error);
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
            opt.value = emp.id_worker;
            opt.textContent = `${emp.id_worker}: ${emp.s_name}`;
            selectElement.appendChild(opt);
        });
    }

    bindEvents() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.combineFields();

            const formData = new FormData(this.form);
            
            try {
                const response = await ringiSystem.apiRequest('POST', 'others', formData, true);
                
                if (response.success) {
                    ringiSystem.showNotification('Pengajuan kontrak berhasil disimpan!', 'success');
                    
                    // PERBAIKAN: Redirect ke detail.html agar konsisten
                    setTimeout(() => {
                        window.location.href = `/pages/detail.html?id=${response.doc_id}&type=others`;
                    }, 1500);
                } else {
                    // PERBAIKAN: Tampilkan error validasi
                    if (response.errors) {
                        ringiSystem.showNotification(response.errors, 'error');
                    } else {
                        ringiSystem.showNotification(response.error, 'error');
                    }
                }
            } catch (error) {
                console.error('Error submit:', error);
                ringiSystem.showNotification(error.message || 'Gagal mengirim data.', 'error');
            }
        });
    }

    combineFields() {
        const t1 = this.form.querySelector('[name="s_industry_type_1"]')?.value || '';
        const t2 = this.form.querySelector('[name="s_industry_type_2"]')?.value || '';
        const t3 = this.form.querySelector('[name="s_industry_type_3"]')?.value || '';
        
        const combinedType = t1 + t2 + t3;

        let hiddenInput = this.form.querySelector('input[name="s_industry_type"]');
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 's_industry_type';
            this.form.appendChild(hiddenInput);
        }
        hiddenInput.value = combinedType;
    }
}

new OtherFormHandler();