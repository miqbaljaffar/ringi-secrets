/**
 * Main Javascript untuk UI & Helper General
 */

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
        // PERBAIKAN: Menggunakan relative path '../api' 
        // Karena script ini dipanggil dari file di dalam folder /pages/
        const BASE_URL = '../api/index.php'; 
        const url = `${BASE_URL}/${endpoint}`;
        
        const options = {
            method: method,
            // SANGAT PENTING: credentials 'same-origin' memastikan cookie PHPSESSID 
            // dikirim ke backend, sehingga AuthMiddleware PHP bisa membaca $_SESSION
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
                    window.location.href = 'login.html?error=session_expired';
                    return { success: false, error: 'Sesi berakhir. Silakan login kembali.' };
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Terjadi kesalahan pada server');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Properti global untuk menyimpan data user yang sedang login
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
        window.location.href = '../pages/login.html'; // Perbaikan path redirect
    });
});