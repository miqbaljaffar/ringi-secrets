class CommonFormHandler {
    constructor() {
        this.form = document.getElementById('common-form');
        this.detailsContainer = document.getElementById('details-container');
        this.totalAmountElement = document.getElementById('total-amount');
        this.details = [];
        this.detailCounter = 0;
        
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.bindEvents();
        this.loadCategories();
        this.generateDocumentNumber();
        this.setDefaultValues();
        this.addFirstDetailRow();
        
        const initialType = document.querySelector('input[name="n_type"]:checked').value;
        this.updateApprovalRoute(initialType);
    }
    
    bindEvents() {
        document.getElementById('add-detail-btn')?.addEventListener('click', () => {
            this.addDetailRow();
        });
        
        document.getElementById('file-upload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        this.form.addEventListener('input', (e) => {
            if (e.target.classList.contains('amount-input')) {
                this.calculateTotal();
            }
        });
        
        // EVENT: Tombol Apply (Submit)
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit('apply');
        });

        // EVENT: Tombol Draft
        const draftBtn = document.getElementById('btn-save-draft');
        if (draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit('draft');
            });
        }

        // EVENT: Tombol Cancel
        const cancelBtn = document.getElementById('btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (confirm('入力内容が破棄されます。よろしいですか？ (Data yang diinput akan hilang. Lanjutkan?)')) {
                    window.location.href = 'list.html';
                }
            });
        }
        
        document.querySelectorAll('input[name="n_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateApprovalRoute(e.target.value);
            });
        });

        document.querySelectorAll('input[name="s_file_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const otherInput = document.getElementById('file-type-others');
                if (otherInput) {
                    if (e.target.value === 'その他') {
                        otherInput.style.display = 'inline-block';
                        otherInput.required = true;
                    } else {
                        otherInput.style.display = 'none';
                        otherInput.required = false;
                        otherInput.value = '';
                    }
                }
            });
        });
    }
    
    async loadCategories() {
        try {
            if (typeof ringiSystem !== 'undefined') {
                const response = await ringiSystem.apiRequest('GET', 'categories');
                if (response.success) {
                    this.categories = response.data;
                    this.populateCategorySelects();
                    return;
                }
            }
        } catch (error) {
            console.warn('Fallback loading categories due to api error.');
        }
        // Fallback jika API gagal
        this.categories = [
            {id_category: 1, s_category: '書籍購入'},
            {id_category: 2, s_category: '物品購入(1万円以上)'},
            {id_category: 3, s_category: '役務の提供'},
            {id_category: 4, s_category: '教育研修費'},
            {id_category: 5, s_category: '会場費'},
            {id_category: 6, s_category: '交際費'},
            {id_category: 7, s_category: '厚生費'},
            {id_category: 8, s_category: '広告協賛'},
            {id_category: 9, s_category: '外注'}
        ];
        this.populateCategorySelects();
    }
    
    populateCategorySelects() {
        document.querySelectorAll('.category-select').forEach(select => {
            const oldVal = select.value;
            while (select.options.length > 1) { select.remove(1); }
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_category;
                option.textContent = category.s_category;
                select.appendChild(option);
            });
            if (oldVal) select.value = oldVal;
        });
    }
    
    generateDocumentNumber() {
        const now = new Date();
        const yymmdd = now.getFullYear().toString().slice(-2) +
                     ('0' + (now.getMonth() + 1)).slice(-2) +
                     ('0' + now.getDate()).slice(-2);
        
        if(document.getElementById('doc-number'))
             document.getElementById('doc-number').value = `AR${yymmdd}..`; 
    }
    
    setDefaultValues() {
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user) {
            const applicantName = document.getElementById('applicant-name');
            if (applicantName) applicantName.value = ringiSystem.user.name || '';

            const deptName = document.getElementById('department-name');
            if (deptName) deptName.value = ringiSystem.user.department || '';
        }
        
        const today = new Date().toISOString().split('T')[0];
        if(document.getElementById('application-date'))
            document.getElementById('application-date').value = today;
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        if(document.getElementById('deadline'))
            document.getElementById('deadline').value = nextWeek.toISOString().split('T')[0];

        document.querySelector('input[name="s_file_type"]:checked')?.dispatchEvent(new Event('change'));
    }
    
    addFirstDetailRow() {
        this.addDetailRow();
    }
    
    addDetailRow() {
        const detailId = this.detailCounter++;
        const rowHtml = `
            <div class="detail-row" data-detail-id="${detailId}" style="display:flex; gap:10px; margin-bottom: 10px; align-items: center; padding-right: 5px;">
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <select class="category-select" style="width:100%; padding:8px;" required>
                        <option value="">分類を選択</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0; flex:2;">
                    <input type="text" class="payer-input" placeholder="支払先" required maxlength="255" style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <input type="number" class="amount-input" placeholder="金額" required min="0" step="1" style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <button type="button" class="remove-detail-btn btn btn-red btn-sm" style="height:35px; width:40px; padding:0; min-width:unset;">✕</button>
                </div>
            </div>
        `;
        
        const template = document.createElement('template');
        template.innerHTML = rowHtml.trim();
        const rowElement = template.content.firstChild;

        this.detailsContainer.appendChild(rowElement);
        
        rowElement.querySelector('.remove-detail-btn').addEventListener('click', () => {
            rowElement.remove();
            this.calculateTotal();
        });
        
        const select = rowElement.querySelector('.category-select');
        if (select && this.categories) {
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_category;
                option.textContent = category.s_category;
                select.appendChild(option);
            });
        }
        
        this.detailsContainer.scrollTop = this.detailsContainer.scrollHeight;
    }
    
    calculateTotal() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        
        if (this.totalAmountElement) {
            this.totalAmountElement.textContent = new Intl.NumberFormat('ja-JP').format(total) + ' 円';
        }
    }
    
    async updateApprovalRoute(type) {
        try {
            const routeElement = document.getElementById('approval-route');
            if (!routeElement) return;
            
            routeElement.innerHTML = '読み込み中...';
            
            if (typeof ringiSystem !== 'undefined') {
                const response = await ringiSystem.apiRequest('GET', `approval-route?type=${type}`);
                if (response.success && response.data.length > 0) {
                    this.renderApprovalRoute(routeElement, response.data);
                    return;
                }
            }
            routeElement.innerHTML = '<span style="color:red">ルートが見つかりません</span>';
        } catch (error) {
            document.getElementById('approval-route').innerHTML = '<span style="color:red">ルートの取得に失敗しました</span>';
        }
    }
    
    renderApprovalRoute(container, routeData) {
        let html = '<div style="display:flex; gap:15px; flex-wrap:wrap;">';
        routeData.forEach((approver, index) => {
            html += `
                <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; min-width: 150px;">
                    <div style="font-size:12px; color:#666;">第${index + 1}承認</div>
                    <div style="font-weight:bold; margin-top:5px;">${approver.name}</div>
                    <div style="font-size:11px; color:#888;">${approver.role}</div>
                </div>
            `;
            if (index < routeData.length - 1) {
                html += `<div style="display:flex; align-items:center; color:#999;">▶</div>`;
            }
        });
        html += '</div>';
        container.innerHTML = html;
    }
    
    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (field.id === 'file-type-others' && field.style.display === 'none') return;
            
            if (!field.value.trim()) {
                field.style.borderColor = 'red';
                isValid = false;
            } else {
                field.style.borderColor = '#ccc';
            }
        });
        
        const detailRows = this.detailsContainer.querySelectorAll('.detail-row');
        if (detailRows.length === 0) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('少なくとも1行の詳細を追加してください', 'warning');
            isValid = false;
        }
        
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => { total += parseInt(input.value) || 0; });
        if (total <= 0) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('金額を入力してください', 'warning');
            isValid = false;
        }
        
        if(!isValid && typeof ringiSystem !== 'undefined') {
            ringiSystem.showNotification('必須項目を入力してください', 'error');
        }
        
        return isValid;
    }
    
    async handleSubmit(saveMode = 'apply') {
        if (saveMode === 'apply') {
            if (!this.validateForm()) return;
        }
        
        const formData = new FormData(this.form);
        
        // Kumpulkan data array details
        const details = [];
        document.querySelectorAll('.detail-row').forEach(row => {
            const categorySelect = row.querySelector('.category-select');
            const payerInput = row.querySelector('.payer-input');
            const amountInput = row.querySelector('.amount-input');
            
            if (categorySelect && payerInput && amountInput) {
                details.push({
                    n_category: parseInt(categorySelect.value) || 0,
                    s_payer: payerInput.value,
                    n_amount: parseInt(amountInput.value) || 0
                });
            }
        });
        
        formData.append('details', JSON.stringify(details));
        
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => { total += parseInt(input.value) || 0; });
        formData.append('total_amount', total);
        
        formData.append('save_mode', saveMode);

        const fileTypeRadio = this.form.querySelector('input[name="s_file_type"]:checked');
        let sFileValue = fileTypeRadio ? fileTypeRadio.value : '';
        if (sFileValue === 'その他') {
            sFileValue = document.getElementById('file-type-others')?.value || 'その他';
        }
        formData.append('s_file', sFileValue);

        // Tambahkan Session User ID secara eksplisit ke backend
        if (typeof ringiSystem !== 'undefined' && ringiSystem.user && ringiSystem.user.id) {
            formData.append('id_user', ringiSystem.user.id);
        }
        
        try {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('送信中...', 'info');
            
            // PERBAIKAN UTAMA: Menggunakan native fetch untuk bypass `application/json` limiter
            // Hal ini karena backend kita butuh tipe `multipart/form-data`
            const token = localStorage.getItem('token') || '';
            const responseStream = await fetch('../api/common', {
                method: 'POST',
                headers: {
                    // PENTING: Jangan set Content-Type secara manual, biarkan browser menentukannya agar file bisa di-upload
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });
            
            const response = await responseStream.json();
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました (Tersimpan sebagai Draft)' : '申請が完了しました (Berhasil di-Apply)';
                if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(msg, 'success');
                
                setTimeout(() => {
                    window.location.href = `list.html`; // Redirect kembali ke list
                }, 1500);
            } else {
                 if(response.errors) {
                     const errMsgs = Object.values(response.errors).flat().join('\n');
                     if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(errMsgs, 'error');
                     else alert(errMsgs);
                 } else {
                     if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification(response.error || 'Error terjadi', 'error');
                     else alert(response.error);
                 }
            }
        } catch (error) {
            console.error('Submit error:', error);
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('サーバーとの通信に失敗しました', 'error');
            else alert('Gagal terhubung ke server Backend.');
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        const fileNameDisplay = document.getElementById('file-name-display');
        
        if (!file) {
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            if(typeof ringiSystem !== 'undefined') ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？\n(Pastikan yang diupload bukan invoice/tagihan)";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            return;
        }
        
        if (fileNameDisplay) {
            fileNameDisplay.textContent = '📄 ' + file.name;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('common-form')) {
        window.commonFormHandler = new CommonFormHandler();
    }
});