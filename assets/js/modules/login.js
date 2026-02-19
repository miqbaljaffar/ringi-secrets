document.addEventListener('DOMContentLoaded', () => {
    // Bersihkan sesi sebelumnya saat berada di halaman login
    sessionStorage.removeItem('user');
    localStorage.removeItem('auth_token');

    const loginForm = document.getElementById('login-form');
    const btn = document.getElementById('btn-submit');
    const btnText = document.querySelector('.btn-text');
    const btnIcon = btn.querySelector('.fa-arrow-right');
    const spinner = document.getElementById('loading-spinner');
    const errorMsg = document.getElementById('error-msg');
    const errorText = document.getElementById('error-text');
    const usernameInput = document.getElementById('username');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Reset state error dan tampilkan loading
            errorMsg.style.display = 'none';
            btn.disabled = true;
            btnText.textContent = '処理中...';
            if (btnIcon) btnIcon.style.display = 'none';
            spinner.style.display = 'block';

            const username = usernameInput.value.trim();

            try {
                // Memanggil API login via fungsi global ringiSystem dari main.js
                const response = await ringiSystem.apiRequest('POST', 'auth/login', {
                    username: username
                });

                if (response.success) {
                    // Simpan token dan data user
                    if (response.token) localStorage.setItem('auth_token', response.token);
                    sessionStorage.setItem('user', JSON.stringify(response.user));
                    
                    // Update UI untuk success
                    btn.style.background = '#10b981';
                    btnText.textContent = '成功しました。リダイレクト中...';
                    spinner.style.display = 'none';
                    
                    // Redirect ke halaman list
                    setTimeout(() => {
                        window.location.href = 'list.html';
                    }, 800);
                } else {
                    throw new Error(response.error || '社員IDが見つかりません。');
                }

            } catch (error) {
                console.error(error);
                errorText.textContent = error.message;
                errorMsg.style.display = 'flex';
                
                // Kembalikan state tombol
                btn.disabled = false;
                btn.style.background = '';
                btnText.textContent = 'ログイン';
                if (btnIcon) btnIcon.style.display = 'inline-block';
                spinner.style.display = 'none';
                
                usernameInput.focus();
            }
        });
    }
});