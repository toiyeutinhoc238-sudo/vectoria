// File: js/app/auth.js
window.AuthGuard = {
    isLoggedIn: function() {
        return localStorage.getItem('user_token') !== null; 
    },
    requireAuth: function(callback) {
        if (this.isLoggedIn()) {
            callback();
        } else {
            this.showLoginPrompt();
        }
    },
    showLoginPrompt: function() {
        // LƯU Ý: Tận dụng Custom Modal nếu trang hiện tại có (như user-dashboard.html)
        if (typeof window.Modal !== 'undefined') {
            window.Modal.show({
                title: '<i class="fa-solid fa-lock"></i> Yêu cầu Đăng nhập',
                message: 'Tính năng này yêu cầu tài khoản Vectoria.<br><br>Bạn có muốn chuyển đến trang Đăng nhập ngay bây giờ không?',
                confirmText: 'Đến Đăng nhập',
                confirmClass: 'btn-primary',
                onConfirm: () => {
                    sessionStorage.setItem('redirect_after_login', window.location.href);
                    window.location.href = 'login.html'; 
                }
            });
        } else {
            // Backup nếu trang đó chưa nhúng Custom Modal (ví dụ calculation.html)
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast("Cần tài khoản. Vui lòng đăng nhập!", "warning");
            }
            const isConfirmed = confirm("Tính năng này yêu cầu tài khoản Vectoria.\n\nBạn có muốn chuyển đến trang Đăng nhập ngay bây giờ không?");
            if (isConfirmed) {
                sessionStorage.setItem('redirect_after_login', window.location.href);
                window.location.href = 'login.html';
            }
        }
    }
};