// Main Application Class
class RingiSystem {
    constructor() {
        this.user = null;
        // Deteksi apakah sedang di subfolder /pages/
        this.isInPagesDir = window.location.pathname.includes('/pages/');
        // Set Base URL API
        this.apiBaseUrl = this.isInPagesDir ? '../api' : 'api';
        
        this.init();
    }
    
    async init() {
        // Cek Login
        const token = localStorage.getItem('auth_token');
        const isLoginPage = window.location.href.includes('login.html');
        
        // Logika redirect jika tidak ada token
        if (!token && !isLoginPage) {
            // Cek apakah ini kembalian dari SSO (parameter UID di URL)
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.has('UID')) {
                const loginPath = this.isInPagesDir ? '../login.html' : 'login.html';
                window.location.href = loginPath; 
                return;
            }
        }

        // Load data user jika ada token
        if (token) {
            await this.loadUserInfo();
        }
        
        this.setupGlobalEvents();
        this.initPageSpecific();
    }
    
    async loadUserInfo() {
        try {
            const response = await this.apiRequest('GET', 'auth/user');
            if (response.success) {
                this.user = response.user;
                this.updateUIWithUserInfo();
            } else {
                // Token expired atau invalid
                this.handleAuthError();
            }
        } catch (error) {
            console.error('Gagal memuat info user:', error);
        }
    }
    
    updateUIWithUserInfo() {
        const els = document.querySelectorAll('#user-name, .user-name');
        if (this.user) {
            els.forEach(el => el.textContent = `${this.user.name} (${this.user.department})`);
            
            // Sembunyikan elemen khusus approver jika user biasa
            if (this.user.role < 1) { 
                document.querySelectorAll('.approver-only').forEach(e => e.style.display = 'none');
            }
        }
    }
    
    setupGlobalEvents() {
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }
    
    initPageSpecific() {
        const path = window.location.pathname;
        // Inisialisasi modul berdasarkan halaman
        if (path.includes('dashboard') || document.body.dataset.page === 'dashboard') {
            this.initDashboard();
        }
    }
    
    // --- API Helper ---
    async apiRequest(method, endpoint, data = null, isFormData = false) {
        // Bersihkan slash di depan endpoint
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const url = `${this.apiBaseUrl}/${cleanEndpoint}`;
        
        const headers = {};
        
        // Kirim Token via Header Authorization
        const token = localStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const options = { method, headers };
        
        if (data) {
            if (isFormData) {
                options.body = data;
            } else {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }
        
        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                this.handleAuthError();
                return { success: false, error: 'Unauthorized' };
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error("Server Error: Respon bukan JSON");
            }
            
        } catch (error) {
            console.error('API Request Error:', error);
            this.showNotification('Terjadi kesalahan koneksi', 'error');
            throw error;
        }
    }
    
    handleAuthError() {
        localStorage.removeItem('auth_token');
        if (!window.location.href.includes('login.html')) {
            const loginPath = this.isInPagesDir ? '../login.html' : 'login.html';
            window.location.href = loginPath;
        }
    }
    
    async logout() {
        try {
            await this.apiRequest('POST', 'auth/logout');
        } catch(e) { /* ignore */ }
        
        this.handleAuthError();
    }
    
    showNotification(message, type = 'info') {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999;`;
            document.body.appendChild(container);
        }

        const notif = document.createElement('div');
        notif.textContent = message;
        // Styling sederhana
        notif.style.padding = '15px';
        notif.style.marginBottom = '10px';
        notif.style.borderRadius = '5px';
        notif.style.color = '#fff';
        notif.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';
        notif.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        container.appendChild(notif);
        
        setTimeout(() => notif.remove(), 3000);
    }

    async initDashboard() {
        if (window.searchModule) {
            window.searchModule.loadInitialData();
        }
    }
}

// Start System
window.ringiSystem = new RingiSystem();