// ===================== solution_panel.js (HTML RENDER + TABS) =====================
(function () {
  window.App = window.App || {};

  function $(id) {
    return document.getElementById(id);
  }

  // DOM Elements
  const overlay = $("solutionOverlay");
  const body = $("solutionBody");
  const titleTextEl = $("solTitleText");
  const titleMathEl = $("solTitleMath");
  const btnOpen = $("btnOpenSolution");
  const btnClose = $("btnCloseSolution");
  const tabMat = $("solMethodMat");
  const tabEq = $("solMethodEq");
  const btnCopy = $("btnCopySolution");

  // Subtabs Logic
  let eqSubWrap = null;
  let eqBtnGeneral = null;
  let eqBtnStep = null;

  // State Management (Lưu HTML thay vì LaTeX)
  const state = {
    titleText: "Lời giải",
    titleMath: "",

    // Nội dung HTML
    htmlTab1: "",
    htmlTab2Main: "",
    htmlTab2Sub: "",

    active: "mat", // Tab đang chọn
    eqVariant: "general", // Subtab đang chọn

    // [MỚI] Cấu hình hiển thị (Mặc định)
    tab1Label: "Cách 1",
    tab2Label: "Cách 2",
    showSubTabs: true,
  };

  // Hàm render MathJax
  function typesetMath() {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      return window.MathJax.typesetPromise([overlay]);
    }
    return Promise.resolve();
  }

  // Toggle Panel
  function setOpen(open) {
    if (!overlay) return;
    if (open) {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      renderAll();
    } else {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  // Render Tabs Logic
  function renderTabs() {
    if (tabMat) {
      tabMat.textContent = state.tab1Label; // Lấy tên từ state
      tabMat.classList.toggle("is-active", state.active === "mat");
    }
    if (tabEq) {
      tabEq.textContent = state.tab2Label; // Lấy tên từ state
      tabEq.classList.toggle("is-active", state.active === "eq");
    }
  }

  function ensureEqSubtabs() {
    if (!tabEq || !tabEq.parentElement) return;
    if (eqSubWrap) return;

    eqSubWrap = document.createElement("span");
    eqSubWrap.className = "sol-subtabs";
    eqSubWrap.id = "solEqSubtabs";

    eqBtnGeneral = document.createElement("button");
    eqBtnGeneral.className = "sol-subtab is-active";
    eqBtnGeneral.textContent = "Tổng quát";
    eqBtnGeneral.onclick = () => {
      state.eqVariant = "general";
      renderEqSubtabs();
      renderBody();
    };

    eqBtnStep = document.createElement("button");
    eqBtnStep.className = "sol-subtab";
    eqBtnStep.textContent = "Xét từng vector";
    eqBtnStep.onclick = () => {
      state.eqVariant = "step";
      renderEqSubtabs();
      renderBody();
    };

    eqSubWrap.appendChild(eqBtnGeneral);
    eqSubWrap.appendChild(eqBtnStep);
    tabEq.parentElement.appendChild(eqSubWrap);
  }

  function renderEqSubtabs() {
    ensureEqSubtabs();
    if (!eqSubWrap) return;

    // Chỉ hiện nếu đang ở Tab 2 VÀ Config cho phép hiện
    const show = state.active === "eq" && state.showSubTabs;

    eqSubWrap.classList.toggle("is-visible", show);
    eqSubWrap.style.display = show ? "inline-flex" : "none";

    if (eqBtnGeneral)
      eqBtnGeneral.classList.toggle("is-active", state.eqVariant === "general");
    if (eqBtnStep)
      eqBtnStep.classList.toggle("is-active", state.eqVariant === "step");
  }

  // Render Nội dung chính (Thay innerHTML bằng HTML string)
  function renderBody() {
    if (!body) return;

    let content = "";

    // Logic mới: Dùng biến state.htmlTab... thay vì tên cũ
    if (state.active === "mat") {
      content = state.htmlTab1; // <--- SỬA: Dùng htmlTab1
    } else {
      // Tab 2: Chọn Main (Tổng quát) hay Sub (Từng bước)
      content =
        state.eqVariant === "step" ? state.htmlTab2Sub : state.htmlTab2Main;

      // Fallback: Nếu subtab chưa có, hiện cái kia
      if (!content && state.eqVariant === "step") content = state.htmlTab2Main;
      if (!content && state.eqVariant === "general")
        content = state.htmlTab2Sub;
    }

    // Hiển thị
    if (!content) {
      body.innerHTML = `
        <div class="sol-empty">
          Chưa có lời giải. Hãy bấm <b>"Tính toán"</b> để tạo lời giải mới.
        </div>
      `;
    } else {
      body.innerHTML = content;
    }

    renderEqSubtabs();
    typesetMath();
  }

  function renderTitle() {
    if (titleTextEl) titleTextEl.textContent = state.titleText;
    if (titleMathEl) titleMathEl.innerHTML = state.titleMath;
  }

  function renderAll() {
    renderTitle();
    renderTabs();
    renderEqSubtabs();
    renderBody();
  }

  // --- API Public ---

  // [THÊM MỚI] Hàm mở Panel đa năng
  App.openSolutionPanel = function (config) {
    // 1. Nạp dữ liệu
    state.titleText = config.title || "Lời giải";
    state.titleMath = config.math || "";
    state.htmlTab1 = config.content1 || "";
    state.htmlTab2Main = config.content2 || "";
    state.htmlTab2Sub = config.content2Sub || "";

    // 2. Nạp Config giao diện (Tên tab, Ẩn/Hiện subtab)
    state.tab1Label = config.tab1Label || "Cách 1";
    state.tab2Label = config.tab2Label || "Cách 2";
    state.showSubTabs = config.showSubTabs !== false; // Mặc định là hiện

    // 3. Reset trạng thái
    state.active = "mat";
    state.eqVariant = "general";

    // 4. Mở Panel (nếu autoOpen = true hoặc không truyền)
    if (config.autoOpen !== false) setOpen(true);
  };

  // [THÊM MỚI] Hàm chỉ mở Panel (cho nút "Lời giải")
  App.showSolutionPanel = function () {
    setOpen(true);
  };
  // Nhận dữ liệu từ Controller (basis_controller.js)
  App.setBasisSolutionForPanel = function (pack) {
    App.openSolutionPanel({
      title: pack.titleText,
      math: pack.titleMath,
      content1: pack.allSolutions ? pack.allSolutions.mat : pack.htmlContent,
      content2: pack.allSolutions ? pack.allSolutions.general : "",
      content2Sub: pack.allSolutions ? pack.allSolutions.step : "",
      tab1Label: "Cách 1: Ma trận",
      tab2Label: "Cách 2: Hệ phương trình",
      showSubTabs: true,
    });
  };

  // Hàm Copy thông minh (Lấy text thuần túy từ HTML đang hiển thị)
  function copyActiveContent() {
    const text = body.innerText; // Lấy text đã render (bao gồm công thức dạng text)
    if (!text || text.includes("Chưa có lời giải")) return;

    const ok = () => {
      if (!btnCopy) return;
      const old = btnCopy.textContent;
      btnCopy.textContent = "Đã copy!";
      setTimeout(() => {
        btnCopy.textContent = old || "Copy Text";
      }, 900);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(ok);
    } else {
      // Fallback cũ
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      ok();
    }
  }

  // Bind Events
  function bind() {
    ensureEqSubtabs();

    if (btnOpen) btnOpen.addEventListener("click", () => setOpen(true));
    if (btnClose) btnClose.addEventListener("click", () => setOpen(false));

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) setOpen(false);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    if (tabMat)
      tabMat.addEventListener("click", () => {
        state.active = "mat";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });

    if (tabEq)
      tabEq.addEventListener("click", () => {
        state.active = "eq";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });

    if (btnCopy) btnCopy.addEventListener("click", copyActiveContent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
