class RingiSystem {
    constructor() {
        this.user = null;
        this.init();
        this.createNotificationContainer();
    }
    
    // PERBAIKAN: Deteksi Path API yang lebih robust untuk XAMPP
    get apiBaseUrl() {
        // Ambil path saat ini
        const path = window.location.pathname;
        
        // Cari posisi folder "pages" untuk menentukan root project
        const pagesIndex = path.indexOf('/pages/');
        
        if (pagesIndex !== -1) {
            // Jika kita ada di dalam folder /pages/, maka root project adalah string sebelum /pages/
            // Contoh: /project/New folder/pages/list.html -> Root: /project/New folder
            const rootPath = path.substring(0, pagesIndex);
            
            // Return full path ke index.php di folder api
            // Kita pakai index.php secara eksplisit untuk menghindari masalah rewrite rule di XAMPP
            return `${rootPath}/api/index.php`; 
        }
        
        // Fallback jika tidak di folder pages (misal di root)
        return 'api/index.php'; 
    }

    async init() {
        const userSession = sessionStorage.getItem('user');
        const token = localStorage.getItem('auth_token');
        
        if (token && userSession) {
            try {
                this.user = JSON.parse(userSession);
            } catch (e) {
                console.error("Session corrupted");
                this.logout();
            }
        } else {
            // Matikan redirect paksa saat debugging localhost agar tidak loop
            // if (!window.location.pathname.includes('login.html')) {
            //     console.warn("User belum login.");
            // }
        }
    }

    createNotificationContainer() {
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                display: flex; flex-direction: column; gap: 10px;
            `;
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notif = document.createElement('div');
        
        let bgColor = '#333';
        if (type === 'success') bgColor = '#28a745'; 
        if (type === 'error') bgColor = '#dc3545';   
        if (type === 'warning') bgColor = '#ffc107'; 

        notif.style.cssText = `
            background-color: ${bgColor}; color: white; padding: 15px 20px;
            border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            min-width: 300px; font-size: 14px; opacity: 0; transform: translateX(20px);
            transition: all 0.3s ease; display: flex; align-items: center; justify-content: space-between;
        `;
        
        let displayMessage = message;
        if (Array.isArray(message)) {
            displayMessage = message.join('<br>');
        } else if (typeof message === 'object') {
            displayMessage = Object.values(message).flat().join('<br>');
        }

        notif.innerHTML = `<span>${displayMessage}</span>`;
        container.appendChild(notif);

        requestAnimationFrame(() => {
            notif.style.opacity = '1';
            notif.style.transform = 'translateX(0)';
        });

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(20px)';
            setTimeout(() => notif.remove(), 300);
        }, 5000);
    }
    
    async apiRequest(method, endpoint, data = null, isFormData = false) {
        // PERBAIKAN: Cara menyusun URL
        // Endpoint yang dikirim biasanya "search?tab=all"
        // Kita harus mengubahnya menjadi format query string PHP: index.php?/search?tab=all
        // ATAU index.php/search?tab=all (tergantung konfigurasi server)
        
        // Cara paling aman untuk PHP Native tanpa .htaccess kompleks adalah PATH_INFO
        // URL: .../api/index.php/endpoint
        
        let url = `${this.apiBaseUrl}/${endpoint}`;
        
        // Hapus double slash jika ada (misal index.php//search)
        url = url.replace(/([^:]\/)\/+/g, "$1");

        const headers = {};
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
                this.showNotification("Sesi habis. Silakan login ulang.", 'error');
                // setTimeout(() => window.location.href = '../login.html', 1500);
                return { success: false, error: 'Unauthorized' };
            }

            if (!response.ok) {
                // Handle 404 secara spesifik untuk debugging path
                if (response.status === 404) {
                    console.error("API Path Not Found:", url);
                    throw new Error(`Endpoint tidak ditemukan (404). Cek URL: ${url}`);
                }
                
                const text = await response.text();
                try {
                    const jsonErr = JSON.parse(text);
                    throw new Error(jsonErr.error || jsonErr.message || text);
                } catch(e) {
                    throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
                }
            }

            return await response.json();
            
        } catch (error) {
            console.error('API Request Error:', error);
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');
        window.location.href = '../login.html';
    }
}

window.ringiSystem = new RingiSystem();