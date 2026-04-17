const ringiSystem = {
    // --- Helper Notifikasi ---
    showNotification: function(message, type = 'success') {
        $('.notification').remove();
        
        const notif = $('<div class="notification"></div>')
            .addClass(`notif-${type}`)
            .text(message)
            .appendTo('body');
            
        setTimeout(() => notif.addClass('show'), 100);
        
        setTimeout(() => {
            notif.removeClass('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },

    // --- Helper Fetch API ---
    apiRequest: async function(method, endpoint, data = null, isFormData = false) {
        const BASE_URL = '../api/index.php'; 
        const url = `${BASE_URL}/${endpoint}`;
        
        const options = {
            method: method,
            credentials: 'same-origin', 
            headers: {}
        };

        // Jika pakai Token Bearer opsional (meski backend pakai Session)
        const token = sessionStorage.getItem('token');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            if (isFormData) {
                options.body = data;
                // Jangan set Content-Type untuk FormData
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('token');
                    
                    // Cek apakah saat ini sedang di halaman login. Jika iya, JANGAN redirect lagi.
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html?error=session_expired';
                    }
                    
                    return { success: false, error: 'Sesi berakhir. Silakan login kembali.' };
                }
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.errors && typeof errorData.errors === 'object') {
                    // Extract semua pesan error array dari object
                    const errorString = Object.values(errorData.errors).flat().join('\n');
                    throw new Error(errorString);
                }
                
                throw new Error(errorData.error || errorData.message || 'Terjadi kesalahan pada server');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    user: null 
};

$(document).ready(function() {
    $('.sidebar-toggle').on('click', function() {
        $('.sidebar').toggleClass('active');
    });
    
    $('.dropdown-toggle').on('click', function(e) {
        e.preventDefault();
        $(this).next('.dropdown-menu').slideToggle(200);
    });
    
    $('#btn-logout').on('click', async function(e) {
        e.preventDefault();
        // Panggil endpoint logout di backend untuk menghancurkan session PHP
        await ringiSystem.apiRequest('POST', 'auth/logout');
        
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        window.location.href = 'login.html'; // Perbaikan path redirect
    });
});