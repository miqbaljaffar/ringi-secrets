const ringiSystem = {
    // --- 通知ヘルパー ---
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

    apiRequest: async function(method, endpoint, data = null, isFormData = false) {
        const BASE_URL = '../api/index.php'; 
        const url = `${BASE_URL}/${endpoint}`;
        
        const options = {
            method: method,
            credentials: 'same-origin', 
            headers: {}
        };

        // Bearerトークン（任意、バックエンドはセッション使用）
        const token = sessionStorage.getItem('token');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            if (isFormData) {
                options.body = data;
                // FormDataの場合はContent-Typeを設定しない
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
                    
                    // 現在ログインページの場合はリダイレクトしない
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html?error=session_expired';
                    }
                    
                    return { success: false, error: 'セッションの有効期限が切れました。再度ログインしてください。' };
                }
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.errors && typeof errorData.errors === 'object') {
                    const errorString = Object.values(errorData.errors).flat().join('\n');
                    throw new Error(errorString);
                }
                
                throw new Error(errorData.error || errorData.message || 'サーバーでエラーが発生しました');
            }
            return await response.json();
        } catch (error) {
            console.error('API エラー:', error);
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

        // 1. Validasi Konfirmasi sebelum Logout
        const isConfirm = confirm('ログアウトしますか？\n(Apakah Anda yakin ingin logout?)');
        if (!isConfirm) {
            return; // Batalkan proses jika user klik "Cancel"
        }

        // 2. Ubah state tombol menjadi loading dan warnanya diubah
        const $btn = $(this);
        const originalText = $btn.html();
        $btn.css('background-color', '#b30000'); 
        $btn.html('<i class="fas fa-spinner fa-spin"></i> ログアウト中...'); // Teks loading
        $btn.prop('disabled', true);
        
        try {
            // バックエンドのログアウトエンドポイントを呼び出してPHPセッションを破棄
            await ringiSystem.apiRequest('POST', 'auth/logout');
        } catch(error) {
            console.error('Logout error:', error);
        } finally {
            // Hapus session storage dan arahkan ke halaman login
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            window.location.href = 'login.html'; 
        }
    });
});