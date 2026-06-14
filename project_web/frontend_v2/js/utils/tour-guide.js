// File: js/utils/tour-guide.js

/**
 * Hàm khởi tạo Guided Tour dùng chung cho mọi trang
 * @param {string} buttonId - ID của nút bấm để bật Tour
 * @param {Array} tourSteps - Mảng chứa các bước hướng dẫn cụ thể của trang đó
 */
function setupGuidedTour(buttonId, tourSteps, onEndCallback) {
  // Thêm tham số onEndCallback
  const initTour = () => {
    const btnTour = document.getElementById(buttonId);
    if (!btnTour) return;

    const driverFn =
      (window.driver && window.driver.js && window.driver.js.driver) ||
      (window.driver && window.driver.driver) ||
      window.driver;

    if (typeof driverFn !== "function") {
      console.warn("Tour Guide: Đang đợi thư viện tải...");
      btnTour.onclick = () =>
        alert(
          "⚠️ Thư viện hướng dẫn chưa tải xong, vui lòng chờ 1s hoặc nhấn Ctrl+F5!",
        );
      return;
    }

    const driverObj = driverFn({
      showProgress: true,
      animate: true,
      allowClose: true,
      popoverClass: "driverjs-premium-theme",
      nextBtnText: "Tiếp tục &rarr;",
      prevBtnText: "&larr; Quay lại",
      doneBtnText: "Hoàn tất",

      // 🔥 THÊM ĐÚNG DÒNG NÀY ĐỂ CẤM DRIVER.JS TỰ Ý CUỘN BẬY BẠ 🔥
      scrollIntoViewOptions: { behavior: "instant", block: "nearest" },

      steps: tourSteps,
      // SỰ KIỆN QUAN TRỌNG: Khi tắt tour thì gọi hàm dọn dẹp
      onDestroyed: () => {
        if (typeof onEndCallback === "function") onEndCallback();
      },
    });

    btnTour.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      driverObj.drive();
    };

    btnTour.style.transition = "transform 0.2s ease";
    btnTour.onmouseenter = () => (btnTour.style.transform = "scale(1.2)");
    btnTour.onmouseleave = () => (btnTour.style.transform = "scale(1)");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTour);
  } else {
    initTour();
  }
}
