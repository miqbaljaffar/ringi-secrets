class AuthHandler {
    constructor() {
        this.init();
    }

    async init() {
        const isLoginPage = window.location.pathname.includes('login.html');

        // PHPバックエンドに直接セッションを確認する
        // ポータルのSSO（$_SESSION['UID']を設定）が正しく反映されているか確認するため
        await this.checkAuthGuard(isLoginPage);
        
        if (isLoginPage) {
            this.bindLoginEvent();
        }
    }

    async checkAuthGuard(isLoginPage) {
        try {
            // $_SESSION PHPからデータを取得するauth/userエンドポイントを呼び出す
            const response = await ringiSystem.apiRequest('GET', 'auth/user');
            
            if (response.success && response.user) {
                // PHPセッションが有効
                sessionStorage.setItem('user', JSON.stringify(response.user));
                ringiSystem.user = response.user;
                
                if (isLoginPage) {
                    // 既にログイン済みでログインページにアクセスした場合、リストページへリダイレクト
                    // 修正：サブフォルダでも安全なように相対パスを使用
                    window.location.href = 'list.html';
                } else {
                    this.updateUI();
                }
            } else {
                throw new Error('セッションが無効です');
            }
        } catch (error) {
            // PHPセッションが無効
            sessionStorage.removeItem('user');
            if (!isLoginPage) {
                console.warn('認証ガード：ユーザーはまだログインしていません。ログインページへリダイレクトします。');
                // 修正：'/pages/login.html'ではなく相対パス'login.html'を使用
                window.location.href = 'login.html';
            }
        }
    }

    bindLoginEvent() {
        $('#login-form').on('submit', async (e) => {
            e.preventDefault();
            const workerId = $('#username').val(); // 修正：HTMLのinput idは'id_worker'ではなく'username'

            if (!workerId) {
                alert('社員IDは必須入力です。');
                return;
            }

            try {
                // 開発モード用のログインエンドポイントを呼び出す
                const response = await ringiSystem.apiRequest('POST', 'auth/login', { 
                    username: workerId
                });
                
                if (response.success) {
                    sessionStorage.setItem('user', JSON.stringify(response.user));
                    if (response.token) {
                        sessionStorage.setItem('token', response.token);
                    }
                    window.location.href = 'list.html';
                } else {
                    alert(response.error || 'ログインに失敗しました。');
                }
            } catch (error) {
                alert('ログイン時にシステムエラーが発生しました: ' + error.message);
            }
        });
    }

    updateUI() {
        const userSession = sessionStorage.getItem('user');
        if (userSession) {
            try {
                const user = JSON.parse(userSession);
                $('.user-name-display').text(user.name || 'ユーザー');
            } catch(e) {}
        }
    }
}

const appAuth = new AuthHandler();