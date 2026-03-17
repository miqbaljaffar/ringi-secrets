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
        
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit('apply');
        });

        const draftBtn = document.getElementById('btn-save-draft');
        if (draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit('draft');
            });
        }
        
        document.querySelectorAll('input[name="n_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateApprovalRoute(e.target.value);
            });
        });

        // PERBAIKAN 4: Event listener untuk Radio Button tipe Lampiran (Munculkan input text "Lainnya")
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
            const response = await ringiSystem.apiRequest('GET', 'categories');
            if (response.success) {
                this.categories = response.data;
                this.populateCategorySelects();
            }
        } catch (error) {
            console.error('Error category:', error);
            // Mockup Category for development
            this.categories = [
                {id_category: 1, s_category: '書籍購入'},
                {id_category: 2, s_category: '物品購入'},
                {id_category: 3, s_category: '役務の提供'}
            ];
            this.populateCategorySelects();
        }
    }
    
    populateCategorySelects() {
        document.querySelectorAll('.category-select').forEach(select => {
            while (select.options.length > 1) {
                select.remove(1);
            }
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_category;
                option.textContent = category.s_category;
                select.appendChild(option);
            });
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
        const applicantName = document.getElementById('applicant-name');
        if (applicantName && ringiSystem.user) {
            applicantName.value = ringiSystem.user.name;
        }
        
        const today = new Date().toISOString().split('T')[0];
        if(document.getElementById('application-date'))
            document.getElementById('application-date').value = today;
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        if(document.getElementById('deadline'))
            document.getElementById('deadline').value = nextWeek.toISOString().split('T')[0];
    }
    
    addFirstDetailRow() {
        this.addDetailRow();
    }
    
    addDetailRow() {
        const detailId = this.detailCounter++;
        const rowHtml = `
            <div class="detail-row" data-detail-id="${detailId}" style="display:flex; gap:10px; margin-bottom: 10px; align-items: center;">
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <select name="details[${detailId}][category]" class="category-select" style="width:100%; padding:8px;" required>
                        <option value="">分類を選択</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0; flex:2;">
                    <input type="text" name="details[${detailId}][payer]" class="payer-input" 
                           placeholder="支払先" required maxlength="255" style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom:0; flex:1;">
                    <input type="number" name="details[${detailId}][amount]" class="amount-input" 
                           placeholder="金額" required min="0" step="1" style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <button type="button" class="remove-detail-btn btn btn-danger btn-sm" style="height:35px;">削除</button>
                </div>
            </div>
        `;
        
        const rowElement = this.createRowElement(rowHtml);
        this.detailsContainer.appendChild(rowElement);
        
        rowElement.querySelector('.remove-detail-btn').addEventListener('click', () => {
            this.removeDetailRow(detailId);
        });
        
        this.populateCategorySelect(rowElement);
        this.detailsContainer.scrollTop = this.detailsContainer.scrollHeight;
    }
    
    createRowElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }
    
    populateCategorySelect(rowElement) {
        const select = rowElement.querySelector('.category-select');
        if (select && this.categories) {
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_category;
                option.textContent = category.s_category;
                select.appendChild(option);
            });
        }
    }
    
    removeDetailRow(detailId) {
        const row = document.querySelector(`[data-detail-id="${detailId}"]`);
        if (row) {
            row.remove();
            this.calculateTotal();
        }
    }
    
    calculateTotal() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        
        if (this.totalAmountElement) {
            this.totalAmountElement.textContent = this.formatCurrency(total);
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP').format(amount) + '円';
    }
    
    async updateApprovalRoute(type) {
        try {
            const routeElement = document.getElementById('approval-route');
            if (!routeElement) return;
            
            const response = await ringiSystem.apiRequest('GET', `approval-route?type=${type}`);
            if (response.success) {
                this.renderApprovalRoute(routeElement, response.data);
            }
        } catch (error) {
            console.error('Error route:', error);
        }
    }
    
    renderApprovalRoute(container, routeData) {
        container.innerHTML = routeData.map((approver, index) => `
            <div class="approver-item">
                <span class="approver-order">第${index + 1}承認者</span>
                <span class="approver-name">${approver.name}</span>
                <span class="approver-role">${approver.role}</span>
            </div>
        `).join('');
    }
    
    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.markFieldError(field, '必須項目です');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });
        
        const detailRows = this.detailsContainer.querySelectorAll('.detail-row');
        if (detailRows.length === 0) {
            ringiSystem.showNotification('少なくとも1行の詳細を追加してください', 'warning');
            isValid = false;
        }
        
        const total = this.getTotalAmount();
        if (total === 0) {
            ringiSystem.showNotification('金額を入力してください', 'warning');
            isValid = false;
        }
        
        if(!isValid) {
            ringiSystem.showNotification('入力エラーを確認してください', 'error');
        }
        
        return isValid;
    }
    
    markFieldError(field, message) {
        field.style.borderColor = 'red';
    }
    
    clearFieldError(field) {
        field.style.borderColor = '#aaa';
    }
    
    getTotalAmount() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        return total;
    }
    
    async handleSubmit(saveMode = 'apply') {
        if (saveMode === 'apply') {
            if (!this.validateForm()) {
                return;
            }
        }
        
        const formData = new FormData(this.form);
        const details = this.collectDetails();
        formData.append('details', JSON.stringify(details));
        formData.append('total_amount', this.getTotalAmount());
        formData.append('save_mode', saveMode);

        // PERBAIKAN 4: Menangani nilai dari Radio Button File
        const fileTypeRadio = this.form.querySelector('input[name="s_file_type"]:checked');
        let sFileValue = fileTypeRadio ? fileTypeRadio.value : '';
        if (sFileValue === 'その他') {
            sFileValue = document.getElementById('file-type-others')?.value || 'その他';
        }
        formData.append('s_file', sFileValue);
        
        try {
            const response = await ringiSystem.apiRequest('POST', 'common', formData, true);
            
            if (response.success) {
                const msg = saveMode === 'draft' ? '下書き保存しました' : '申請が完了しました';
                ringiSystem.showNotification(msg, 'success');
                setTimeout(() => {
                    window.location.href = `detail.html?id=${response.doc_id}&type=common`;
                }, 1500);
            } else {
                 if(response.errors) {
                     ringiSystem.showNotification(response.errors, 'error');
                 } else {
                     ringiSystem.showNotification(response.error, 'error');
                 }
            }
        } catch (error) {
            console.error('Submit error:', error);
            ringiSystem.showNotification('Gagal mengirim data.', 'error');
        }
    }
    
    collectDetails() {
        const details = [];
        document.querySelectorAll('.detail-row').forEach(row => {
            const categorySelect = row.querySelector('.category-select');
            const payerInput = row.querySelector('.payer-input');
            const amountInput = row.querySelector('.amount-input');
            
            if (categorySelect && payerInput && amountInput) {
                 const categoryVal = categorySelect.value;
                 const amountVal = amountInput.value;
                 
                 if (categoryVal || payerInput.value || amountVal) {
                    details.push({
                        category: parseInt(categoryVal) || 0,
                        payer: payerInput.value,
                        amount: parseInt(amountVal) || 0
                    });
                 }
            }
        });
        return details;
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            return;
        }

        const confirmMsg = "【注意事項】\n請求書（インボイス）の添付は禁止されています。\n\nアップロードするファイルは請求書ではありませんか？";
        
        if (!window.confirm(confirmMsg)) {
            event.target.value = ''; 
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) fileNameDisplay.textContent = '';
            return;
        }
        
        const fileNameDisplay = document.getElementById('file-name-display');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = file.name;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('common-form')) {
        window.commonFormHandler = new CommonFormHandler();
    }
});