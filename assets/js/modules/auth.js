class AuthModule {
    constructor() {
        this.initAuth();
    }
    
    initAuth() {
        this.checkLoginStatus();
        this.setupLoginForm();
        this.setupLogout();
    }
    
    async checkLoginStatus() {
        const token = localStorage.getItem('auth_token');
        const uid = this.getUrlParameter('UID');
        
        if (uid) {
            // シングルサインオン
            await this.handleSSO(uid);
        } else if (token) {
            // トークン認証
            await this.validateToken(token);
        } else {
            // 未認証
            this.redirectToLogin();
        }
    }
    
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    async handleSSO(uid) {
        try {
            const response = await fetch(`/api/auth/login?UID=${uid}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // トークン保存
                if (result.token) {
                    localStorage.setItem('auth_token', result.token);
                }
                
                // ユーザー情報をセッションに保存
                sessionStorage.setItem('user', JSON.stringify(result.user));
                
                // リダイレクトパラメータを削除
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // ダッシュボードへ
                window.location.href = '/pages/dashboard.html';
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('SSO認証エラー:', error);
            this.redirectToLogin();
        }
    }
    
    async validateToken(token) {
        try {
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('トークンが無効です');
            }
        } catch (error) {
            localStorage.removeItem('auth_token');
            this.redirectToLogin();
        }
    }
    
    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    localStorage.setItem('auth_token', result.token);
                    sessionStorage.setItem('user', JSON.stringify(result.user));
                    
                    // ダッシュボードへリダイレクト
                    window.location.href = '/pages/dashboard.html';
                } else {
                    this.showLoginError(result.error);
                }
            } catch (error) {
                this.showLoginError('ログインに失敗しました');
            }
        });
    }
    
    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('ログアウトエラー:', error);
        } finally {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('user');
            window.location.href = '/login.html';
        }
    }
    
    redirectToLogin() {
        // ログインページ以外にいる場合のみリダイレクト
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
        }
    }
    
    getCurrentUser() {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
    
    hasPermission(requiredRole) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        return user.role >= requiredRole;
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.authModule = new AuthModule();
});