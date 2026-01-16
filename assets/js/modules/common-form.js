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
        // 詳細行追加
        document.getElementById('add-detail-btn')?.addEventListener('click', () => {
            this.addDetailRow();
        });
        
        // ファイルアップロード
        document.getElementById('file-upload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // 金額自動計算
        this.form.addEventListener('input', (e) => {
            if (e.target.classList.contains('amount-input')) {
                this.calculateTotal();
            }
        });
        
        // フォーム送信
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // 業務区分変更
        document.querySelectorAll('input[name="n_type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateApprovalRoute(e.target.value);
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
            console.error('分類の読み込みに失敗しました:', error);
        }
    }
    
    populateCategorySelects() {
        document.querySelectorAll('.category-select').forEach(select => {
            // 既存のオプションをクリア（デフォルトオプションを除く）
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // カテゴリーオプションを追加
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
        
        document.getElementById('doc-number').value = `AR${yymmdd}00`;
    }
    
    setDefaultValues() {
        // 申請者名
        const applicantName = document.getElementById('applicant-name');
        if (applicantName && ringiSystem.user) {
            applicantName.value = ringiSystem.user.name;
        }
        
        // 申請日
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('application-date').value = today;
        
        // 実施期限（デフォルトで1週間後）
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('deadline').value = nextWeek.toISOString().split('T')[0];
    }
    
    addFirstDetailRow() {
        this.addDetailRow();
    }
    
    addDetailRow() {
        if (this.detailCounter >= 3) {
            ringiSystem.showNotification('最大3行まで追加できます', 'warning');
            return;
        }
        
        const detailId = this.detailCounter++;
        const rowHtml = `
            <div class="detail-row" data-detail-id="${detailId}">
                <div class="form-group">
                    <select name="details[${detailId}][category]" class="category-select form-control" required>
                        <option value="">分類を選択</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="text" name="details[${detailId}][payer]" class="payer-input form-control" 
                           placeholder="支払先" required maxlength="255">
                </div>
                <div class="form-group">
                    <input type="number" name="details[${detailId}][amount]" class="amount-input form-control" 
                           placeholder="金額（税込）" required min="0" step="1">
                </div>
                <div class="form-group">
                    <button type="button" class="remove-detail-btn btn btn-danger">削除</button>
                </div>
            </div>
        `;
        
        const rowElement = this.createRowElement(rowHtml);
        this.detailsContainer.appendChild(rowElement);
        
        // 削除ボタンのイベント
        rowElement.querySelector('.remove-detail-btn').addEventListener('click', () => {
            this.removeDetailRow(detailId);
        });
        
        // カテゴリー選択肢を追加
        this.populateCategorySelect(rowElement);
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
            this.detailCounter--;
            this.calculateTotal();
        }
    }
    
    calculateTotal() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            const amount = parseInt(input.value) || 0;
            total += amount;
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
            
            // 承認ルート情報を取得
            const response = await ringiSystem.apiRequest('GET', `approval-route?type=${type}`);
            if (response.success) {
                this.renderApprovalRoute(routeElement, response.data);
            }
        } catch (error) {
            console.error('承認ルートの取得に失敗しました:', error);
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
        // 必須項目チェック
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.markFieldError(field, 'この項目は必須です');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });
        
        // 詳細行チェック
        const detailRows = this.detailsContainer.querySelectorAll('.detail-row');
        if (detailRows.length === 0) {
            ringiSystem.showNotification('少なくとも1行の詳細を追加してください', 'error');
            isValid = false;
        }
        
        // 金額チェック
        const total = this.getTotalAmount();
        if (total === 0) {
            ringiSystem.showNotification('金額を入力してください', 'error');
            isValid = false;
        }
        
        return isValid;
    }
    
    markFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('has-error');
            
            // エラーメッセージを追加
            let errorDiv = formGroup.querySelector('.error-message');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                formGroup.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
        }
    }
    
    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('has-error');
            const errorDiv = formGroup.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }
    
    getTotalAmount() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        return total;
    }
    
    async handleSubmit() {
        if (!this.validateForm()) {
            return;
        }
        
        // フォームデータの準備
        const formData = new FormData(this.form);
        
        // 詳細データをJSON形式で追加
        const details = this.collectDetails();
        formData.append('details', JSON.stringify(details));
        
        // 追加データ
        formData.append('total_amount', this.getTotalAmount());
        
        try {
            const response = await ringiSystem.apiRequest('POST', 'common', formData, true);
            
            if (response.success) {
                ringiSystem.showNotification('申請が完了しました', 'success');
                
                // 確認画面へ遷移
                setTimeout(() => {
                    window.location.href = `/pages/view-document.html?id=${response.doc_id}`;
                }, 1500);
            }
        } catch (error) {
            console.error('申請エラー:', error);
        }
    }
    
    collectDetails() {
        const details = [];
        document.querySelectorAll('.detail-row').forEach(row => {
            const category = row.querySelector('.category-select').value;
            const payer = row.querySelector('.payer-input').value;
            const amount = row.querySelector('.amount-input').value;
            
            if (category && payer && amount) {
                details.push({
                    category: parseInt(category),
                    payer: payer,
                    amount: parseInt(amount)
                });
            }
        });
        return details;
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // ファイルサイズチェック（5MB）
        if (file.size > 5 * 1024 * 1024) {
            ringiSystem.showNotification('ファイルサイズは5MB以下にしてください', 'error');
            event.target.value = '';
            return;
        }
        
        // ファイルタイプチェック
        if (file.type !== 'application/pdf') {
            ringiSystem.showNotification('PDFファイルのみアップロード可能です', 'error');
            event.target.value = '';
            return;
        }
        
        // ファイル名表示
        const fileNameDisplay = document.getElementById('file-name-display');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = file.name;
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('common-form')) {
        window.commonFormHandler = new CommonFormHandler();
    }
});