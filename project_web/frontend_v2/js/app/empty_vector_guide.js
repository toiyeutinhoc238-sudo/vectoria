(function () {
  window.App = window.App || {};

  // ===== Helper: tìm vùng nhập vector để scroll tới =====
  function findCreateVectorTargets() {
    const controls = document.getElementById("controls"); // sidebar
    const input = document.getElementById("vectorInput");

    // "card" bao quanh phần nhập vector
    const card =
      input?.closest(".section-create") || input?.closest(".card") || null;

    return { controls, input, card };
  }

  // ===== Scroll + highlight =====
  App.nudgeToCreateVector = function () {
    const { controls, input, card } = findCreateVectorTargets();
    if (!input) return;

    // Đẩy qua frame sau để tránh giật do focus/select
    requestAnimationFrame(() => {
      // scroll đúng container sidebar
      if (controls) {
        const top = Math.max(0, input.offsetTop - 14);
        controls.scrollTo({ top, behavior: "smooth" });
      } else {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // highlight card + input
      if (card) {
        card.classList.remove("app-nudge-card");
        void card.offsetHeight;
        card.classList.add("app-nudge-card");
        setTimeout(() => card.classList.remove("app-nudge-card"), 1500);
      }

      input.classList.remove("app-nudge-input");
      void input.offsetHeight;
      input.classList.add("app-nudge-input");
      setTimeout(() => input.classList.remove("app-nudge-input"), 1500);

      // focus nhẹ cho user biết chỗ nhập
      setTimeout(() => {
        try {
          input.focus();
        } catch (_) {}
      }, 450);
    });
  };

  /**
   * Gắn guard cho 1 <select>:
   * - nếu chưa có vector: chặn dropdown, scroll xuống input + highlight
   * - dùng pointerdown CAPTURE để không bị giật
   */
  App.guardEmptyVectorSelect = function (selectEl) {
    if (!selectEl) return;
    if (selectEl.__emptyVecGuarded) return;
    selectEl.__emptyVecGuarded = true;

    selectEl.addEventListener(
      "pointerdown",
      (e) => {
        const empty =
          !Array.isArray(App.vectorList) || App.vectorList.length === 0;
        if (!empty) return;

        // chặn trước khi select kịp mở
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function")
          e.stopImmediatePropagation();

        // bỏ focus ngay để khỏi nháy/giật
        try {
          selectEl.blur();
        } catch (_) {}

        App.nudgeToCreateVector();
      },
      true, // CAPTURE
    );
  };
})();
