class AuthHandler {
    constructor() {
        this.init();
    }

    async init() {
        const isLoginPage = window.location.pathname.includes('/pages/login.html') || 
                            window.location.pathname.endsWith('login.html');

        // Pengecekan sesi langsung ke Backend PHP 
        // Ini memastikan SSO dari portal (yang men-set $_SESSION['UID']) terbaca dengan benar
        await this.checkAuthGuard(isLoginPage);
        
        if (isLoginPage) {
            this.bindLoginEvent();
        }
    }

    async checkAuthGuard(isLoginPage) {
        try {
            // Memanggil endpoint auth/user yang mengambil data dari $_SESSION PHP
            const response = await ringiSystem.apiRequest('GET', 'auth/user');
            
            if (response.success && response.user) {
                // Sesi PHP Aktif
                sessionStorage.setItem('user', JSON.stringify(response.user));
                ringiSystem.user = response.user;
                
                if (isLoginPage) {
                    // Jika sudah login tapi akses halaman login, lempar ke list
                    window.location.href = '/pages/list.html';
                } else {
                    this.updateUI();
                }
            } else {
                throw new Error('Sesi tidak valid');
            }
        } catch (error) {
            // Sesi PHP Tidak Aktif
            sessionStorage.removeItem('user');
            if (!isLoginPage) {
                console.warn('Auth Guard: User belum login. Redirecting ke login.');
                window.location.href = '/pages/login.html';
            }
        }
    }

    bindLoginEvent() {
        $('#login-form').on('submit', async (e) => {
            e.preventDefault();
            const workerId = $('#id_worker').val();
            const password = $('#password').val(); // Opsional jika backend meminta

            if (!workerId) {
                alert('ID karyawan wajib diisi.');
                return;
            }

            try {
                // Panggil endpoint login manual untuk Development Mode
                const response = await ringiSystem.apiRequest('POST', 'auth/login', { 
                    username: workerId, 
                    password: password 
                });
                
                if (response.success) {
                    sessionStorage.setItem('user', JSON.stringify(response.user));
                    sessionStorage.setItem('token', response.token);
                    window.location.href = '/pages/list.html';
                } else {
                    alert(response.error || 'Login gagal.');
                }
            } catch (error) {
                alert('Terjadi kesalahan sistem saat login: ' + error.message);
            }
        });
    }

    updateUI() {
        const userSession = sessionStorage.getItem('user');
        if (userSession) {
            try {
                const user = JSON.parse(userSession);
                $('.user-name-display').text(user.name || 'User');
            } catch(e) {}
        }
    }
}

const appAuth = new AuthHandler();