class LoginHandler {
    constructor() {
        this.$form = $('#login-form');
        this.$errorMsg = $('#login-error');
        this.$btnSubmit = $('#btn-login');
        this.$username = $('#username');
        
        this.init();
    }

    init() {
        if (this.$form.length === 0) return;

        // Cek jika user sudah login, arahkan ke list.html
        if (sessionStorage.getItem('user')) {
            window.location.replace('list.html');
            return;
        }

        this.bindEvents();
    }

    bindEvents() {
        const self = this;

        this.$form.on('submit', function(e) {
            e.preventDefault(); // Ini sangat penting agar halaman tidak refresh!
            self.handleLogin();
        });

        // Hapus pesan error saat user mulai mengetik lagi
        this.$username.on('input', () => this.hideError());
    }

    async handleLogin() {
        const username = this.$username.val().trim();

        if (!username) {
            this.showError('IDを入力してください。');
            return;
        }

        this.setLoading(true);

        try {
            // Memanggil fungsi login dari auth.js atau main.js
            // Pastikan Anda sudah membuat sistem API Request yang benar
            const response = await this.mockLoginApi(username);

            if (response.success) {
                // Simpan data user ke sessionStorage
                sessionStorage.setItem('user', JSON.stringify(response.user));
                
                // Redirect ke halaman list
                window.location.replace('list.html');
            } else {
                this.showError('IDが間違っています。');
            }
        } catch (error) {
            console.error('Login Error:', error);
            this.showError('システムエラーが発生しました。');
        } finally {
            this.setLoading(false);
        }
    }

    // Fungsi Mockup API untuk keperluan frontend (Ganti dengan AJAX sungguhan nanti)
    mockLoginApi(username) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Contoh validasi dummy
                if (username === 'admin' || username === '0036') {
                    resolve({
                        success: true,
                        user: { id: '0036', id_worker: '0036', name: 'Admin User', role: 2 }
                    });
                } else if (username === 'user' || username === '0001') {
                    resolve({
                        success: true,
                        user: { id: '0001', id_worker: '0001', name: 'General User', role: 1 }
                    });
                } else {
                    resolve({ success: false });
                }
            }, 500); // Simulasi delay jaringan
        });
    }

    showError(message) {
        this.$errorMsg.text(message).fadeIn(200);
    }

    hideError() {
        this.$errorMsg.fadeOut(200);
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.$btnSubmit.prop('disabled', true).text('ログイン中...');
            this.$username.prop('disabled', true);
        } else {
            this.$btnSubmit.prop('disabled', false).text('ログイン');
            this.$username.prop('disabled', false);
        }
    }
}

// Inisialisasi saat dokumen siap
$(document).ready(function() {
    new LoginHandler();
});