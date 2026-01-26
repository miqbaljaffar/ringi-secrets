// Best Practice: Namespace Pattern
// Menggunakan window.ringiSystem memastikan objek ini bisa diakses dari file JS manapun
// tanpa terhalang oleh block-scope dari 'const' atau 'let'.

window.ringiSystem = {
    // 1. Centralized Config
    // Logic penentuan URL API yang cerdas
    apiBaseUrl: (function() {
        // Mendapatkan path root aplikasi secara dinamis
        // Jika sedang di folder /pages/, mundur satu langkah
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            return '../api/index.php';
        }
        return 'api/index.php';
    })(),

    // 2. State Management Sederhana
    // Mengambil data user sekali saja saat inisialisasi
    user: JSON.parse(sessionStorage.getItem('user') || 'null'),

    // 3. Helper Functions (Reusable Code)
    // --- GENERIC API REQUESTER ---
    apiRequest: async function(method, endpoint, data = null, isMultipart = false) {
        const url = `${this.apiBaseUrl}/${endpoint}`;
        
        const headers = {};
        
        // Content-Type otomatis kecuali Multipart (karena boundary dihandle browser)
        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        // Token Injection (Centralized Auth Header)
        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method,
            headers: headers
        };

        if (data) {
            config.body = isMultipart ? data : JSON.stringify(data);
        }

        try {
            // Debugging yang rapi (Opsional: bisa dimatikan di production)
            // console.log(`[API] ${method} ${url}`, data); 
            
            const response = await fetch(url, config);
            
            // Handle response text sebelum parse JSON untuk error handling yang lebih baik
            const text = await response.text();
            let json;
            
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("Invalid JSON Response:", text);
                throw new Error(`Server Error (${response.status}): Invalid JSON response`);
            }

            if (!response.ok) {
                throw new Error(json.error || `Server Error (${response.status})`);
            }

            return json;

        } catch (error) {
            console.error("API Request Error:", error);
            throw error; // Re-throw agar bisa di-catch di UI level
        }
    },

    // UI Helper: Notifikasi Global
    showNotification: function(message, type = 'info') {
        // Mencegah duplikasi notifikasi (Opsional best practice)
        const existing = document.querySelector('.notification');
        if(existing) existing.remove();

        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.textContent = message;
        
        // Inline styles untuk memastikan tampilan konsisten
        Object.assign(div.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            backgroundColor: type === 'success' ? '#4CAF50' : (type === 'error' ? '#f44336' : '#2196F3'),
            color: 'white',
            borderRadius: '4px',
            zIndex: '9999',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s'
        });

        document.body.appendChild(div);

        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 300); // Wait for fade out
        }, 3000);
    },
    
    logout: function() {
        sessionStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        // Gunakan absolute path agar aman dipanggil dari mana saja
        window.location.href = '../pages/login.html'; 
    }
};

// --- GLOBAL INIT & AUTH GUARD ---
// Menjalankan logic umum segera setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
    // 1. Skip check untuk halaman login
    if (window.location.pathname.endsWith('login.html')) {
        return;
    }

    // 2. Auth Guard
    if (!window.ringiSystem.user) {
        console.warn("Unauthorized access. Redirecting to login.");
        // Sesuaikan redirect path
        window.location.href = 'login.html';
        return;
    }

    // 3. Global UI Updates (misal: Menampilkan nama user di Navbar)
    const userNameEl = document.getElementById('user-name-display');
    if (userNameEl) {
        userNameEl.textContent = `Login: ${window.ringiSystem.user.name}`;
    }
});