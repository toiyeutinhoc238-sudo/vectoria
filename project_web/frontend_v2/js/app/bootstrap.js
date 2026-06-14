// ================== bootstrap.js ==================
(function () {
  window.App = window.App || {};

  App.init = function () {
    if (App.log) App.log(`Frontend origin: ${location.origin}`);
    if (App.pingBackend) App.pingBackend();

    // Keypad top (ĐÃ XÓA btnInsertSlash, btnInsertSqrt)
    const vectorInput = document.getElementById("vectorInput");
    if (vectorInput) {
      vectorInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          App.onAddVector();
        }
      });
    }

    // Gắn sự kiện an toàn (kiểm tra tồn tại trước khi addEventListener)
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el && fn) el.addEventListener("click", fn);
    };

    const bindChange = (id, fn) => {
      const el = document.getElementById(id);
      if (el && fn) el.addEventListener("change", fn);
    };

    bindClick("btnDraw", App.onAddVector);
    bindClick("btnAuto", App.toggleAuto);
    bindClick("btnClearAll", App.clearAllVectors);
    bindClick("btnSaveCloud", App.saveToCloudUI);
    bindClick("themeBadge", App.toggleTheme);
    bindClick("modeBadge", App.toggleMode);

    bindChange("opSelect", App.refreshCalcUI);

    // Nút tính toán & xem trước
    const btnCompute = document.getElementById("btnCompute");
    if (btnCompute)
      btnCompute.addEventListener("click", () => App.runCalc(true));

    // Select phép tính phụ
    const opExtraSelect = document.getElementById("opExtraSelect");
    if (opExtraSelect) {
      opExtraSelect.addEventListener("change", () => {
        App.showExtraForm(opExtraSelect.value);
      });
    }

    // Các nút phép tính phụ
    bindClick("btnAngle", App.angleBetweenUI);
    bindClick("btnNorm", App.vectorNormUI);
    bindClick("btnCoord", App.coordinatesUI);
    bindClick("btnBasis", App.basisAndDimUI);
    bindClick("btnIndep", App.checkIndependenceUI);
    bindClick("btnRank", App.rankVecUI);
    bindClick("btnDot", App.dotProductUI);
    bindClick("btnProj", App.projectionUI);

    // --- (ĐÃ XÓA HOÀN TOÀN ĐOẠN MINI KEYPAD CŨ GÂY LỖI) ---

    // Init 2D/3D layers
    if (window.Vec2D && Vec2D.init2D) Vec2D.init2D();
    if (window.Vec3D && Vec3D.init3D) Vec3D.init3D();

    // prevent wheel scroll in viewer wrap
    const viewerWrap = document.getElementById("viewerWrap");
    if (viewerWrap)
      viewerWrap.addEventListener("wheel", (e) => e.preventDefault(), {
        passive: false,
      });

    // First show 2D by default
    if (App.applyTheme) App.applyTheme();
    if (window.Vec2D && Vec2D.show2D) Vec2D.show2D();
    if (App.redrawAll) App.redrawAll();

    if (App.log) App.log("Ready Z-up.");

    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
    if (opExtraSelect && App.showExtraForm)
      App.showExtraForm(opExtraSelect.value);

    // =========================
    // GẮN GUARD CHO CÁC <select>
    // =========================
    function attachEmptyVectorGuards() {
      if (typeof App.guardEmptyVectorSelect !== "function") return;

      const ids = [
        "v1Select",
        "v2Select",
        "v1DotSelect",
        "v2DotSelect",
        "v1AngleSelect",
        "v2AngleSelect",
        "vNormSelect",
        "vCoordSelect",
        "vProjSelect",
      ];

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) App.guardEmptyVectorSelect(el);
      });
    }

    attachEmptyVectorGuards();

    // =========================
    // Hamburger toggle
    // =========================
    const burger = document.getElementById("hamburger");
    const controls = document.getElementById("controls");
    const overlay = document.getElementById("overlay");

    function syncOverlay() {
      if (!overlay || !controls) return;
      if (controls.classList.contains("open")) overlay.classList.add("show");
      else overlay.classList.remove("show");
    }

    if (burger && controls) {
      burger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        controls.classList.toggle("open");
        syncOverlay();
      });
      // Thêm sự kiện click overlay để đóng menu
      if (overlay) {
        overlay.addEventListener("click", () => {
          controls.classList.remove("open");
          syncOverlay();
        });
      }
    } else {
      syncOverlay();
    }

    // Init Solution Panel
    if (
      window.App &&
      App.SolutionPanel &&
      typeof App.SolutionPanel.init === "function"
    ) {
      App.SolutionPanel.init();
    }
    // --- XỬ LÝ NÚT RESET VIEW (QUAY VỀ GỐC) ---
    const btnResetView = document.getElementById("btnResetView");
    if (btnResetView) {
      btnResetView.addEventListener("click", function () {
        // Hiệu ứng xoay icon cho ngầu
        const icon = this.querySelector("svg");
        if (icon) {
          icon.style.transition = "transform 0.5s";
          icon.style.transform = "rotate(360deg)";
          setTimeout(() => (icon.style.transform = "none"), 500);
        }

        // Gọi hàm reset tùy theo chế độ 2D hay 3D
        if (App.mode === "3D") {
          if (window.Vec3D && Vec3D.resetView) Vec3D.resetView();
        } else {
          if (window.Vec2D && Vec2D.resetView) Vec2D.resetView();
        }
      });
    }
  };

  // Chạy init khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      App.init();
      if (App.log) {
        App.log("three typeof: " + typeof THREE);
        App.log("OrbitControls " + typeof THREE?.OrbitControls);
      }
    });
  } else {
    App.init();
  }
})();



