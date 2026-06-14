(function () {
  window.App = window.App || {};

  // Fade-out utility (mờ dần đến 0 rồi display:none)
  App.fadeOut = function (el, ms = 220) {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = "1";
      void el.offsetHeight;
      el.style.opacity = "0";

      const done = () => {
        el.removeEventListener("transitionend", done);
        el.style.display = "none";
        resolve();
      };

      el.addEventListener("transitionend", done);
      setTimeout(done, ms + 30);
    });
  };

  App.fadeIn = function (el, ms = 220, display = "block") {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      el.style.display = display;
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = "0";
      void el.offsetHeight;
      el.style.opacity = "1";

      const done = () => {
        el.removeEventListener("transitionend", done);
        resolve();
      };

      el.addEventListener("transitionend", done);
      setTimeout(done, ms + 30);
    });
  };

  // ===== Helper: tìm vùng nhập vector để scroll tới =====
  function _findCreateVectorTargets() {
    const controls = document.getElementById("controls"); // sidebar scroll container
    const input = document.getElementById("vectorInput");

    const card =
      input?.closest(".section-create") ||
      input?.closest("#card-create") ||
      input?.closest(".card") ||
      null;

    return { controls, input, card };
  }

  // ===== Scroll + highlight + focus input =====
  App.nudgeToCreateVector = function () {
    const { controls, input, card } = _findCreateVectorTargets();
    if (!input) return;

    // Đẩy qua frame sau để tránh “giật” do click/select focus
    requestAnimationFrame(() => {
      if (controls) {
        const top = Math.max(0, input.offsetTop - 14);
        controls.scrollTo({ top, behavior: "smooth" });
      } else {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // highlight card
      if (card) {
        card.classList.remove("app-nudge-card");
        void card.offsetHeight;
        card.classList.add("app-nudge-card");
        setTimeout(() => card.classList.remove("app-nudge-card"), 1500);
      }

      // highlight input
      input.classList.remove("app-nudge-input");
      void input.offsetHeight;
      input.classList.add("app-nudge-input");
      setTimeout(() => input.classList.remove("app-nudge-input"), 1500);

      // focus để user gõ luôn
      setTimeout(() => {
        try {
          input.focus();
        } catch (_) {}
      }, 250);
    });
  };

  /**
   * Gắn guard cho 1 <select>:
   * - nếu chưa có vector: chặn dropdown (không cho mở)
   * - scroll xuống input + highlight
   * - dùng pointerdown CAPTURE để không bị “giật”
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

        // chặn trước khi select kịp mở + kịp focus
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function")
          e.stopImmediatePropagation();

        // tránh browser nhảy focus về select rồi mới scroll
        try {
          selectEl.blur();
        } catch (_) {}

        App.nudgeToCreateVector();
      },
      true, // CAPTURE
    );
  };
})();
