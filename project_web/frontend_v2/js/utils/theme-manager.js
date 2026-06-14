/**
 * Theme Manager - Quản lý theme chung cho tất cả trang
 * Sử dụng localStorage để lưu và đồng bộ hóa theme giữa các tab/trang
 */

const ThemeManager = (() => {
  const STORAGE_KEY = "vec_theme";
  const DARK_CLASS = "dark";

  /**
   * Khởi tạo theme manager
   */
  function init() {
    // 1. Lấy theme từ localStorage
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const isDark = savedTheme === "dark";

    console.debug("[ThemeManager] init, savedTheme=", savedTheme);
    // 2. Áp dụng theme ngay lập tức (chống chớp trắng)
    applyTheme(isDark);

    // 3. Hiển thị body khi theme đã được set
    showBody();

    // 4. Lắng nghe sự thay đổi từ storage event (khi có trang khác thay đổi theme)
    window.addEventListener("storage", onStorageChange);

    return isDark;
  }

  /**
   * Áp dụng theme vào trang
   */
  function applyTheme(isDark) {
    const html = document.documentElement;
    const body = document.body;
    console.debug("[ThemeManager] applyTheme isDark=", isDark);
    if (isDark) {
      html.classList.add(DARK_CLASS);
      body.classList.add(DARK_CLASS);
    } else {
      html.classList.remove(DARK_CLASS);
      body.classList.remove(DARK_CLASS);
    }
  }

  /**
   * Hiển thị body sau khi theme được set
   */
  function showBody() {
    // Cho phép body hiển thị
    if (document.body) {
      document.body.style.opacity = "1";
    }
  }

  /**
   * Nhận sự kiện thay đổi từ localStorage (từ trang khác)
   */
  function onStorageChange(e) {
    if (e.key === STORAGE_KEY) {
      const isDark = e.newValue === "dark";
      applyTheme(isDark);
    }
  }

  /**
   * Bật/Tắt dark mode
   */
  function toggle() {
    const currentTheme = localStorage.getItem(STORAGE_KEY);
    const isDark = currentTheme === "dark";
    const newTheme = isDark ? "light" : "dark";

    console.debug(
      "[ThemeManager] toggle, current=",
      currentTheme,
      "new=",
      newTheme,
    );
    // Lưu vào localStorage (sẽ kích hoạt storage event trên các trang khác)
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Áp dụng theme ngay trên trang hiện tại
    applyTheme(newTheme === "dark");

    return newTheme === "dark";
  }

  /**
   * Lấy theme hiện tại
   */
  function getCurrent() {
    return localStorage.getItem(STORAGE_KEY) || "light";
  }

  /**
   * Kiểm tra xem có phải dark mode hay không
   */
  function isDarkMode() {
    return getCurrent() === "dark";
  }

  /**
   * Thiết lập theme
   */
  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") {
      console.warn("Invalid theme:", theme);
      return;
    }
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme === "dark");
  }

  // Public API
  return {
    init,
    toggle,
    getCurrent,
    isDarkMode,
    setTheme,
    applyTheme,
    STORAGE_KEY,
    DARK_CLASS,
  };
})();

// Kiểm tra xem có phải trong environment mà có DOM không
if (typeof document !== "undefined") {
  // Tự động khởi tạo khi file này được load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (ThemeManager.init) {
        ThemeManager.init();
      }
    });
  } else {
    // Nếu DOM đã sẵn sàng, khởi tạo ngay
    ThemeManager.init();
  }
}
