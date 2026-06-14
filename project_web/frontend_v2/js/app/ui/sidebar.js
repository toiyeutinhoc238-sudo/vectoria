(function () {
  window.App = window.App || {};

  // =========================================================================
  // 1. CSS CHO TAB & QUY HOẠCH GIAO DIỆN
  // =========================================================================
  function injectSidebarStyles() {
    if (document.getElementById("sidebar-dynamic-styles")) return;

    const style = document.createElement("style");
    style.id = "sidebar-dynamic-styles";
    style.textContent = `
    /* --- KHUNG CHÍNH --- */
    /* Mặc định trên Desktop */
    #controls {
        display: flex !important; flex-direction: column !important;
        height: 100vh !important; overflow: hidden !important; padding: 0 !important;
    }

    /* ĐÂY LÀ ĐOẠN THÊM VÀO ĐỂ CỨU CÁI GIAO DIỆN MOBILE */
    @media (max-width: 768px) {
        #controls {
            display: flex !important; flex-direction: column !important;
            height: 100% !important; max-height: 100% !important;
            width: 100% !important; /* XÓA KHE HỞ THỪA BÊN PHẢI */
            box-sizing: border-box !important;
            overflow-y: hidden !important; /* Cuộn nằm bên trong tab-content */
            padding-bottom: 0 !important;
        }
    }

    /* --- THANH TAB --- */
    .sidebar-tabs {
        flex: 0 0 auto; display: flex; background: #fff;
        border-bottom: 1px solid #eee; z-index: 100; padding: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }
    .tab-btn {
        flex: 1; border: none; background: transparent; padding: 8px 2px;
        font-size: 11px; font-weight: 700; line-height: 1.2;
        color: #888; cursor: pointer; border-bottom: 3px solid transparent;
        transition: all 0.2s;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 4px; min-width: 0; text-align: center; text-transform: uppercase; white-space: normal;
    }
    .tab-btn i { font-size: 14px; margin-bottom: 2px; }
    .tab-btn.active { color: #2196F3; border-bottom-color: #2196F3; background: transparent; }

    /* --- NỘI DUNG TAB --- */
    .tab-content {
        display: none !important; flex: 1 1 auto; 
        overflow-y: auto !important; overflow-x: hidden;
        /* Thêm 120px đệm dưới đáy để không bị che bởi Taskbar/Thanh điều hướng đt */
        padding: 10px 0 120px 0 !important; 
        height: auto !important; -webkit-overflow-scrolling: touch;
    }
    .tab-content.active { display: block !important; animation: fadeIn 0.2s ease-out; }
    .tab-content .card { box-shadow: none !important; border: none !important; background: transparent !important; padding: 5px !important; margin-bottom: 15px !important; }
    .tab-content details > summary { display: none !important; }
    .tab-content details { border: none !important; padding: 0 !important; }

    /* --- [FIX QUAN TRỌNG] BORDER KHUNG VECTOR --- */
    /* Làm viền mờ đi (rgba) cho nó sang, không bị đậm đen */
    .vec-input-wrapper {
        position: relative; flex: 1; display: flex; align-items: center;
        background: #fff !important; 
        border: 1px solid rgba(0,0,0,0.1); /* Viền siêu nhẹ */
        border-radius: 6px; padding: 0; min-height: 36px; z-index: 2; overflow: visible !important;transition: margin-bottom 0.2s ease;
    }
    .vec-input-wrapper:focus-within { border-color: #2196F3; box-shadow: 0 0 0 2px rgba(33,150,243,0.1); }
    
    .vec-item { position: relative; z-index: 1; margin-bottom: 8px; }
    .vec-math-field { flex: 1; border: none !important; background: transparent !important; padding: 4px 10px; font-size: 1.1em; width: 100%; outline: none; z-index: 1; min-width: 0; }
    .vec-menu-btn { padding: 0 12px; cursor: pointer; color: #555; background: transparent; border: none; border-left: 1px solid rgba(0,0,0,0.05); font-size: 14px; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
    
    /* Dropdown */
    .vec-dropdown { display: none; position: absolute; top: 100%; right: 0; width: 240px; background: white; border: 1px solid #ddd; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 8px; z-index: 100; max-height: 300px; overflow-y: auto; padding: 5px 0; margin-top: 5px;}
    .vec-item.active-z { z-index: 1000 !important; }
    .vec-dropdown.show { display: block; animation: fadeIn 0.15s ease-out; }
    .vec-dropdown-item { padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f9f9f9; font-size: 0.95em; color: #333; }
    .vec-dropdown-item:hover { background: #f0f7ff; color: #2196F3; }
    .latex-preview { color: #aaa; font-style: italic; font-size: 0.9em; }

    /* --- CHECKLIST ITEMS --- */
    .checkitem { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-bottom: none !important; border-radius: 6px; margin-bottom: 2px; cursor: pointer !important; user-select: none; max-width: 100%; transition: background 0.15s; }
    .checkitem:hover { background: #f5f7fa; }
    .checkitem-left { display: flex; align-items: center; gap: 10px; font-size: 0.95em; color: #333; flex: 1; overflow: hidden; min-width: 0; cursor: pointer !important; pointer-events: auto !important; }
    .badge { font-size: 0.75em; font-weight: 700; color: #666; background: #eaeff5; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; pointer-events: none !important; }
    .checklist-math { display: block !important; width: 100%; min-width: 0; border: none !important; background: transparent !important; font-size: 1.1em; color: #333; outline: none; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; pointer-events: none !important; }
    .checklist-math::part(menu-toggle) { display: none; }
    
    /* [FIX] CHECKBOX TRONG LIST */
    .checkitem input[type="checkbox"] { 
        width: 16px !important; height: 16px !important; /* Size cố định */
        margin: 0 0 0 8px; cursor: pointer; accent-color: #2196F3; 
        pointer-events: auto; flex-shrink: 0; border-radius: 4px; 
    }

    /* --- CHECKLIST TOOLS (KHUNG TÌM KIẾM & CHỌN TẤT CẢ) --- */
    .checklist-tools { padding: 10px; border-bottom: 1px solid #eee; background: #fafafa; border-radius: 8px 8px 0 0; }
    .checklist-search { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px; font-size: 0.95em; box-sizing: border-box; }
    .checklist-actions { 
        display: flex !important; justify-content: space-between !important; align-items: center !important; 
        width: 100% !important; gap: 8px !important; font-size: 0.9em; color: #666; 
    }
    
    /* [FIX QUAN TRỌNG] Ô VUÔNG TRẮNG CHÀ BÁ LỬA Ở ĐÂY NÈ */
    /* Ép size cho cái nút Chọn tất cả */
    .checklist-actions input[type="checkbox"] {
        width: 16px !important; 
        height: 16px !important;
        margin: 0 !important;
        cursor: pointer;
        accent-color: #2196F3;
        flex-shrink: 0;
    }

    .checklist-scroll { max-height: 260px; overflow-y: auto; padding: 4px; }

    /* Result Box */
    .nice-result-box { display: block; margin-top: 15px; padding: 15px; background: #e8f5e9; border-left: 5px solid #4caf50; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 1.2em; color: #2e7d32; box-shadow: 0 2px 5px rgba(0,0,0,0.05); word-break: break-all; line-height: 1.5; }
    .nice-result-box strong { color: #1b5e20; text-transform: uppercase; font-size: 0.85em; display: block; margin-bottom: 5px; }

    .extra-form pre {
        font-family: inherit !important; /* Đè font hệ thống lên, bỏ font code xấu xí */
        font-size: 1.15rem !important; /* Chữ to rõ ràng hơn */
        font-weight: 700 !important; /* In đậm chữ */
        color: #1e293b; /* Màu chữ xanh đen sang trọng */
        background: #f8fafc; /* Nền xám xanh cực nhạt */
        border: 2px dashed #cbd5e1; /* Viền nét đứt hiện đại */
        border-radius: 8px; /* Bo góc mềm mại */
        padding: 12px 15px;
        text-align: center; /* Căn giữa chữ */
        margin-top: 12px;
        white-space: pre-wrap; /* Tự động xuống dòng nếu chữ quá dài */
        transition: all 0.3s ease;
    }

    /* Hiệu ứng khi có kết quả mới (cho nó nháy sáng nhẹ) */
    .extra-form pre:not(:empty) {
        animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes popIn {
        0% { transform: scale(0.95); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
    }
    /* DARK MODE */
    body.dark .sidebar-tabs { background: #111; border-color: #333; }
    body.dark .tab-btn { color: #888; }
    body.dark .tab-btn:hover { background: #1a1a1a; color: #ccc; }
    body.dark .tab-btn.active { color: #4f85ff; border-bottom-color: #4f85ff; }
    
    /* Viền dark mode mờ đi */
    body.dark .vec-input-wrapper { background: #1e1e1e !important; border-color: rgba(255,255,255,0.15); }
    body.dark .vec-input-wrapper:focus-within { border-color: #4f85ff; box-shadow: 0 0 0 2px rgba(79,133,255,0.2); }
    
    body.dark .vec-math-field { color: #fff; }
    body.dark .vec-menu-btn { color: #aaa; border-left-color: rgba(255,255,255,0.1); }
    body.dark .vec-menu-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
    body.dark .vec-dropdown { background: #1e1e1e; border-color: #444; }
    body.dark .vec-dropdown-item { color: #ddd; border-bottom-color: #333; }
    body.dark .vec-dropdown-item:hover { background: #333; color: #2196F3; }
    body.dark .checklist-tools { background: #2a2a2a; border-bottom-color: #444; }
    body.dark .checklist-search { background: #333; border-color: #555; color: #fff; }
    body.dark .checklist-actions { color: #aaa; }
    body.dark .checkitem:hover { background: #2a2a2a; }
    body.dark .checkitem-left { color: #ccc; }
    body.dark .badge { background: #444; color: #ccc; }
    body.dark .checklist-math { color: #ddd; }
    body.dark .nice-result-box { background: #1b2e1e; border-left-color: #66bb6a; color: #a5d6a7; }
    body.dark .nice-result-box strong { color: #81c784; }
    
    /* Scrollbar đẹp */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    
    @keyframes shakeError {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); border-color: #ff4444; box-shadow: 0 0 0 2px rgba(255,0,0,0.1); }
        75% { transform: translateX(5px); border-color: #ff4444; box-shadow: 0 0 0 2px rgba(255,0,0,0.1); }
    }
    .input-error-flash {
        animation: shakeError 0.4s ease-in-out;
        border-color: #ff4444 !important;
        background: #fff5f5 !important;
    }
        /* --- DARK MODE CHO Ô KẾT QUẢ --- */
    body.dark .extra-form pre {
        background: #0f172a; /* Nền tối sâu */
        color: #60a5fa; /* Chữ xanh dương sáng */
        border-color: #334155;
    }
    `;
    document.head.appendChild(style);
  }

  function initSidebarLayout() {
    const sidebar = document.getElementById("controls");
    if (!sidebar) return;

    // Nếu đã có tab rồi thì thôi (tránh chạy 2 lần)
    if (sidebar.querySelector(".sidebar-tabs")) return;

    // 1. Tìm các thành phần cũ (Cards)
    // Lưu ý: Các class này phải khớp với HTML hiện tại của ông
    const cardCreate = sidebar.querySelector(".section-create");
    const cardList = sidebar.querySelector(".section-list");
    const cardSpace = sidebar.querySelector(".section-calc-info"); // Không gian
    const cardCalc = sidebar.querySelector(".section-calc-new"); // Phép tính

    // 2. Tạo cấu trúc Tab mới
    const tabNav = document.createElement("div");
    tabNav.className = "sidebar-tabs";

    // [SỬA ĐOẠN NÀY] Tạo nút với Icon + Tên dài gốc
    const btnList = document.createElement("button");
    btnList.className = "tab-btn active";
    // Mẹo: Thêm icon để người dùng dễ nhận biết hơn khi chữ bị nhỏ
    btnList.innerHTML =
      '<i class="fa-solid fa-pen-to-square"></i> KHỞI TẠO VECTOR';

    const btnSpace = document.createElement("button");
    btnSpace.className = "tab-btn";
    btnSpace.innerHTML = '<i class="fa-solid fa-cube"></i> KHÔNG GIAN VECTOR';

    const btnCalc = document.createElement("button");
    btnCalc.className = "tab-btn";
    btnCalc.innerHTML = '<i class="fa-solid fa-calculator"></i> PHÉP TÍNH';

    tabNav.appendChild(btnList);
    tabNav.appendChild(btnSpace);
    tabNav.appendChild(btnCalc);

    // 3. Tạo các Container chứa nội dung
    const tabContentList = document.createElement("div");
    tabContentList.className = "tab-content active";
    const tabContentSpace = document.createElement("div");
    tabContentSpace.className = "tab-content";
    const tabContentCalc = document.createElement("div");
    tabContentCalc.className = "tab-content";

    // 4. "Gắp" các Card cũ bỏ vào Tab mới (Move DOM)
    // Việc này giữ nguyên toàn bộ sự kiện click/input đã gán trước đó
    if (cardCreate) tabContentList.appendChild(cardCreate);
    if (cardList) tabContentList.appendChild(cardList);

    if (cardSpace) {
      // Mở sẵn cái details để luôn hiện nội dung
      const details = cardSpace.querySelector("details");
      if (details) details.open = true;
      tabContentSpace.appendChild(cardSpace);
    }

    if (cardCalc) {
      const details = cardCalc.querySelector("details");
      if (details) details.open = true;
      tabContentCalc.appendChild(cardCalc);
    }

    // 5. Xóa sạch Sidebar cũ và thêm cấu trúc mới vào
    // (Vì ta đã appendChild các card sang biến nhớ rồi, nên innerHTML="" chỉ xóa vỏ bọc cũ)
    sidebar.innerHTML = "";
    sidebar.appendChild(tabNav);
    sidebar.appendChild(tabContentList);
    sidebar.appendChild(tabContentSpace);
    sidebar.appendChild(tabContentCalc);

    // 6. Logic chuyển Tab
    const tabs = [btnList, btnSpace, btnCalc];
    const panels = [tabContentList, tabContentSpace, tabContentCalc];

    tabs.forEach((btn, index) => {
      btn.onclick = () => {
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        panels[index].classList.add("active");
      };
    });
  }

  // Chạy ngay và luôn
  injectSidebarStyles();

  // Đợi DOM load xong để chắc chắn tìm thấy element
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarLayout);
  } else {
    initSidebarLayout();
  }
  // =========================================================================
  // 2. HELPER FUNCTIONS (MÀU SẮC & XỬ LÝ)
  // =========================================================================

  function nearAxisHue(h) {
    const anchors = [0, 120, 240];
    return anchors.some((a) => Math.abs(((h - a + 540) % 360) - 180) < 14);
  }

  function pickUniqueHue() {
    const golden = 137.508;
    let h = (App.vectorList.length * golden) % 360;
    while (
      [...App.usedHues].some((uh) => Math.abs(uh - h) < 8) ||
      nearAxisHue(h)
    ) {
      h = (h + 23) % 360;
    }
    App.usedHues.add(h);
    return h;
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) =>
      Math.round(255 * x)
        .toString(16)
        .padStart(2, "0");
    return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  function computeVectorColorHex(hue) {
    return hslToHex(hue, 75, 52);
  }

  function computeHaloHex(hue, theme) {
    return theme === "dark" ? hslToHex(hue, 95, 80) : hslToHex(hue, 80, 30);
  }

  function attachVectorItem(vec, hue) {
    return {
      id: App.nextId++,
      vec: vec.slice(),
      hue,
      colorCss: `hsl(${hue} 75% 52%)`,
      colorHex: computeVectorColorHex(hue),
      haloCss:
        App.theme === "dark" ? `hsl(${hue} 95% 80%)` : `hsl(${hue} 80% 30%)`,
      haloHex: computeHaloHex(hue, App.theme),
      focus: false,
      visible: true,
      highlighted: false,
    };
  }

  // Export helpers vào App scope
  App._pickUniqueHue = pickUniqueHue;
  App._attachVectorItem = attachVectorItem;

  App.refreshHaloColors = function () {
    App.vectorList.forEach((v) => {
      v.haloHex = computeHaloHex(v.hue, App.theme);
      v.haloCss =
        App.theme === "dark"
          ? `hsl(${v.hue} 95% 80%)`
          : `hsl(${v.hue} 80% 30%)`;
    });
  };
  App.smartFormat = function (num) {
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    for (let d = 2; d <= 100; d++) {
      let n = num * d;
      if (Math.abs(n - Math.round(n)) < 1e-5)
        return `\\frac{${Math.round(n)}}{${d}}`;
    }
    return Number(num)
      .toFixed(4)
      .replace(/\.?0+$/, "");
  };
  App.displayIndexOf = (item) => App.vectorList.indexOf(item) + 1;
  App.optionLabelFor = (it) =>
    `#${App.displayIndexOf(it)} ${App.formatVectorShort(it.vec)}`;

  // =========================================================================
  // 3. MAIN RENDER FUNCTION: App.renderVectorList
  // (Đã tích hợp Search + Cơi nới khung + Sự kiện đóng mở)
  // =========================================================================
  App.renderVectorList = function () {
    const el = document.getElementById("vectorList");
    if (!el) return;
    el.innerHTML = "";

    // Tự tìm ô input search
    let searchInp =
      document.getElementById("vecSearch") ||
      document.querySelector('input[placeholder*="Tìm vector"]');

    // Nếu chưa gắn sự kiện thì gắn 1 lần thôi
    if (searchInp && !searchInp._searchAttached) {
      searchInp.addEventListener("input", () => App.renderVectorList());
      searchInp._searchAttached = true;
    }
    // Lấy từ khóa đang gõ
    const searchTerm = searchInp ? searchInp.value.trim().toLowerCase() : "";

    // --- B. SỰ KIỆN CLICK RA NGOÀI & SCROLL (RESET KHUNG) ---
    if (!window._sidebarEventsAttached) {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".vec-input-wrapper")) {
          // Đóng menu
          document
            .querySelectorAll(".vec-dropdown")
            .forEach((d) => d.classList.remove("show"));
          document
            .querySelectorAll(".vec-item")
            .forEach((it) => it.classList.remove("active-z"));

          // [QUAN TRỌNG] Thu hồi margin (khung co lại như cũ)
          document
            .querySelectorAll(".vec-input-wrapper")
            .forEach((w) => (w.style.marginBottom = "0px"));
        }
      });
      window._sidebarEventsAttached = true;
    }

    // --- C. VÒNG LẶP RENDER (CÓ LỌC TÌM KIẾM) ---
    for (const item of App.vectorList) {
      // [QUAN TRỌNG] Logic Lọc: Tạo chuỗi hiển thị để so sánh
      // Ví dụ: "#1 [1, 2]"
      const displayLabel = `#${App.displayIndexOf(item)} ${App.formatVectorShort(item.vec)}`;

      // Nếu có từ khóa mà không khớp -> Bỏ qua vòng lặp này (không vẽ)
      if (searchTerm && !displayLabel.toLowerCase().includes(searchTerm)) {
        continue;
      }

      // --- TỪ ĐÂY TRỞ XUỐNG LÀ CODE RENDER GIAO DIỆN (GIỮ NGUYÊN) ---
      const li = document.createElement("li");
      li.className =
        "vec-item hover-gradient" + (item.highlighted ? " active" : "");

      const sw = document.createElement("div");
      sw.className = "sw";
      sw.style.background = item.colorCss;

      const main = document.createElement("div");
      main.className = "vec-main";

      const header = document.createElement("div");
      header.className = "vec-header";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `#${App.displayIndexOf(item)}`;
      tag.style.whiteSpace = "nowrap";

      const wrapper = document.createElement("div");
      wrapper.className = "vec-input-wrapper";

      const mf = document.createElement("math-field");
      mf.className = "vec-math-field";
      mf.value = App.formatVectorShort(item.vec);
      mf.setAttribute("smart-fence", "false");
      mf.setAttribute("smart-mode", "false");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");

      // Sự kiện Edit Vector
      // [FIX LỖI TOÁN] Sửa lại đoạn sự kiện input của math-field
      mf.addEventListener("input", () => {
        try {
          // 1. Hàm làm sạch LaTeX thành toán thường (cho backend hiểu)
          const cleanLatex = (latex) => {
            let s = latex;
            // Xóa lệnh latex cơ bản
            s = s.replace(/\\left/g, "").replace(/\\right/g, "");
            // Chuyển căn: \sqrt{x} -> sqrt(x)
            s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
            // Chuyển phân số: \frac{a}{b} -> (a/b)
            s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
            // Chuyển các hàm lượng giác/log
            s = s.replace(/\\(sin|cos|tan|cot|ln|log)/g, "$1");
            s = s.replace(/\\pi/g, "pi");
            // Xử lý nhân tắt: số dính liền chữ (2x, 2sqrt) -> thêm dấu *
            s = s.replace(/(\d)([a-zA-Z\(])/g, "$1*$2");
            // Xử lý dấu ngoặc dính liền: )( -> )*(
            s = s.replace(/\)\(/g, ")*(");
            return s;
          };

          // 2. Lấy giá trị đã làm sạch để parse
          const rawValue = mf.value;
          const cleanValue = cleanLatex(rawValue);

          // Gọi hàm parse cũ của ông với giá trị đã làm sạch
          const v = App.parseVectorExpr(cleanValue);

          if (v && v.length > 0 && !v.some(isNaN)) {
            item.vec = v;

            // Giữ nguyên logic hiển thị LaTeX đẹp
            const needsCalc = /(sin|cos|tan|cot|log|ln|pi|e\^|e\s|e$)/i.test(
              rawValue,
            );
            if (needsCalc) {
              const latexArr = v.map((val) => App.smartFormat(val));
              item.latex = `[${latexArr.join(", ")}]`;
            } else {
              item.latex = rawValue;
            }

            // Update App state...
            App.currentVector = v.slice();
            if (App.updateCalcSelectLabels) App.updateCalcSelectLabels();
            if (App.clearAngleOverlay) App.clearAngleOverlay();
            if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
            if (App.redrawAll) App.redrawAll({ frame: true });
            if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
            else if (window.Vec2D) Vec2D.draw2DAllVectors();
          }
        } catch (err) {
          // console.log("Lỗi nhập liệu:", err);
        }
      });

      const btn = document.createElement("button");
      btn.className = "vec-menu-btn";
      btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      btn.title = "Chèn công thức";

      const dropdown = document.createElement("div");
      dropdown.className = "vec-dropdown";

      const menuItems = [
        { label: "Căn bậc 2", latex: "\\sqrt{#0}", preview: "√x" },
        { label: "Căn bậc n", latex: "\\sqrt[#?]{#0}", preview: "ⁿ√x" },
        { separator: true },
        { label: "Sin", latex: "\\sin(#0)", preview: "sin" },
        { label: "Cos", latex: "\\cos(#0)", preview: "cos" },
        { label: "Tan", latex: "\\tan(#0)", preview: "tan" },
        { label: "Cot", latex: "\\cot(#0)", preview: "cot" },
        { separator: true },
        { label: "Logarit cơ số a", latex: "\\log_{#?}(#0)", preview: "logₐ" },
        { label: "Logarit tự nhiên", latex: "\\ln(#0)", preview: "ln" },
        { separator: true },
        { label: "Số Pi", latex: "\\pi", preview: "π" },
        { label: "Số e", latex: "e", preview: "e" },
      ];

      menuItems.forEach((m) => {
        if (m.separator) {
          const hr = document.createElement("div");
          hr.style.borderTop = "1px solid #eee";
          hr.style.margin = "4px 0";
          dropdown.appendChild(hr);
        } else {
          const row = document.createElement("div");
          row.className = "vec-dropdown-item";
          row.innerHTML = `<span>${m.label}</span><span class="latex-preview">${m.preview}</span>`;
          row.onclick = (e) => {
            e.stopPropagation();
            mf.executeCommand(["insert", m.latex]);
            mf.focus();
            dropdown.classList.remove("show");
          };
          dropdown.appendChild(row);
        }
      });

      // --- SỰ KIỆN MENU (ĐÃ FIX LỖI KẸT) ---
      btn.onclick = (e) => {
        e.stopPropagation();
        const topMenu = document.getElementById("myCustomMenu");
        if (topMenu) topMenu.style.display = "none";

        // Tìm wrapper chứa input và nút này
        const currentWrapper = btn.closest(".vec-input-wrapper");
        const isClosed = !dropdown.classList.contains("show");

        // 1. Reset toàn bộ (Đóng tất cả menu khác và thu hồi khoảng trống)
        document
          .querySelectorAll(".vec-dropdown")
          .forEach((d) => d.classList.remove("show"));
        document
          .querySelectorAll(".vec-input-wrapper")
          .forEach((w) => (w.style.marginBottom = "0px")); // Reset margin
        document
          .querySelectorAll(".vec-item")
          .forEach((it) => it.classList.remove("active-z"));

        if (isClosed) {
          // 2. Mở menu
          dropdown.classList.add("show");
          li.classList.add("active-z"); // Đẩy z-index lên cao nhất

          // 3. Tính chiều cao menu để đẩy khung ra
          // Phải chờ 1 tick để trình duyệt render menu xong mới lấy được chiều cao
          requestAnimationFrame(() => {
            const menuHeight = dropdown.offsetHeight;
            // Cộng thêm margin-bottom cho wrapper bằng đúng chiều cao menu + chút khoảng hở
            currentWrapper.style.marginBottom = menuHeight + 10 + "px";

            // Nếu menu bị khuất dưới đáy màn hình -> Cuộn xuống cho thấy
            const rect = dropdown.getBoundingClientRect();
            const listEl = document.getElementById("vectorList");
            const viewHeight = listEl.closest(".tab-content").offsetHeight; // Hoặc window.innerHeight

            // Logic cuộn thông minh (nếu cần)
            dropdown.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
      };

      wrapper.appendChild(mf);
      wrapper.appendChild(btn);
      wrapper.appendChild(dropdown);
      header.appendChild(tag);
      header.appendChild(wrapper);

      const actions = document.createElement("div");
      actions.className = "vec-actions";

      const focusBtn = document.createElement("button");
      focusBtn.className = "btn";
      focusBtn.textContent = item.focus ? "Chú ý: BẬT" : "Chú ý: TẮT";
      focusBtn.onclick = (e) => {
        e.stopPropagation();
        if (!item.focus) App.vectorList.forEach((v) => (v.focus = false));
        item.focus = !item.focus;
        App.renderVectorList();
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn";
      toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Xóa";

      // SỰ KIỆN XÓA (Đã có đủ hàm đồng bộ)
      del.onclick = (e) => {
        e.stopPropagation();
        const idx = App.vectorList.findIndex((v) => v.id === item.id);
        if (idx >= 0) App.vectorList.splice(idx, 1);
        App.usedHues.delete(item.hue);
        if (App.clearAngleOverlay) App.clearAngleOverlay();

        App.renderVectorList();
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      actions.appendChild(focusBtn);
      actions.appendChild(toggleBtn);
      actions.appendChild(del);

      main.appendChild(header);
      main.appendChild(actions);
      li.appendChild(sw);
      li.appendChild(main);
      el.appendChild(li);
    }
  };

  // =========================================================================
  // 4. OTHER HELPERS (Cập nhật Select box và Checklist)
  // =========================================================================

  App.refreshCalcVectorOptions = function () {
    const ids = ["v1Select", "v2Select"]; // Chỉ áp dụng cho 2 ô chọn phép tính chính

    ids.forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;

      // Lưu lại giá trị cũ đang chọn (để không bị reset khi thêm vector mới)
      const oldValue = sel.value;

      sel.innerHTML = "";

      // 1. Tạo dòng Placeholder mặc định
      const placeholder = document.createElement("option");
      placeholder.text = "Chọn vector";
      placeholder.value = "";
      placeholder.disabled = true; // Không cho chọn lại dòng này
      placeholder.selected = true; // Mặc định chọn
      sel.appendChild(placeholder);

      // 2. Đổ danh sách vector vào
      App.vectorList.forEach((it) => {
        const o = document.createElement("option");
        o.value = it.id;
        o.textContent = App.optionLabelFor(it);
        sel.appendChild(o);
      });

      // 3. Nếu giá trị cũ vẫn còn trong danh sách thì giữ nguyên, không thì về rỗng
      if (oldValue && App.vectorList.some((v) => v.id == oldValue)) {
        sel.value = oldValue;
      } else {
        sel.value = "";
      }

      // 4. Gắn sự kiện: Hễ chọn là chạy hàm ẩn/hiện
      sel.onchange = function () {
        if (App.updateVisibilityByCalc) App.updateVisibilityByCalc();
      };
    });
  };

  function addOptionsToSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    for (const it of App.vectorList) {
      const o = document.createElement("option");
      o.value = it.id;
      o.textContent = App.optionLabelFor(it);
      selectEl.appendChild(o);
    }
  }

  // --- [ĐÃ FIX] CHECKLIST: CÓ SEARCH + CHỌN TẤT CẢ + CÔNG THỨC ĐẸP ---
  function makeChecklist(container, name) {
    if (!container) return;
    container.innerHTML = "";

    // 1. Báo trống
    if (App.vectorList.length === 0) {
      container.innerHTML =
        '<div style="padding:15px; text-align:center; color:#999; font-style:italic;">(Chưa có vector nào)</div>';
      return;
    }

    // 2. Tools (Search + Select All) - Giữ nguyên như cũ
    const tools = document.createElement("div");
    tools.className = "checklist-tools";
    const searchInp = document.createElement("input");
    searchInp.type = "text";
    searchInp.className = "checklist-search";
    searchInp.placeholder = "🔍 Tìm vector theo tọa độ";

    const actions = document.createElement("div");
    actions.className = "checklist-actions";
    const lbl = document.createElement("label");
    lbl.textContent = "Chọn tất cả";
    const cbAll = document.createElement("input");
    cbAll.type = "checkbox";

    // Logic Select All
    const toggleAll = () => {
      const inputs = listDiv.querySelectorAll(
        '.checkitem:not([style*="display: none"]) input[type="checkbox"]',
      );
      const isChecked = cbAll.checked;
      inputs.forEach((input) => (input.checked = isChecked));
    };
    cbAll.onchange = toggleAll;
    lbl.onclick = (e) => {
      e.preventDefault(); // Ngăn label tự kích hoạt input (tránh double)
      cbAll.checked = !cbAll.checked;
      toggleAll();
    };

    actions.appendChild(lbl);
    actions.appendChild(cbAll);
    tools.appendChild(searchInp);
    tools.appendChild(actions);
    container.appendChild(tools);

    // 3. List
    const listDiv = document.createElement("div");
    listDiv.className = "checklist-scroll";

    const items = [];
    App.vectorList.forEach((it) => {
      const id = `chk_${name}_${it.id}`;

      const row = document.createElement("div");
      row.className = "checkitem";

      const left = document.createElement("div");
      left.className = "checkitem-left";

      const fullTooltip = `Vector #${App.displayIndexOf(it)}: [${it.vec.join(", ")}]`;
      left.setAttribute("title", fullTooltip);
      left.oncontextmenu = (e) => {
        e.preventDefault(); // Chặn menu chuột phải mặc định của trình duyệt
        e.stopPropagation(); // Không cho kích hoạt checkbox

        // Hiện thông báo tọa độ
        if (window.App && App.showToast) {
          App.showToast(fullCoords);
        } else {
          alert(fullCoords);
        }
        return false;
      };
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `#${App.displayIndexOf(it)}`;

      const mf = document.createElement("math-field");
      mf.className = "checklist-math";
      mf.value = it.latex || App.formatVectorShort(it.vec);
      mf.setAttribute("read-only", "true");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");

      left.appendChild(badge);
      left.appendChild(mf);

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.value = it.id;

      // [QUAN TRỌNG] Logic Click Dòng
      row.onclick = (e) => {
        // Nếu click trực tiếp vào checkbox -> Kệ nó tự xử lý (để tránh đảo 2 lần)
        if (e.target === cb) return;

        // Nếu click vào vùng khác -> Đảo trạng thái checkbox thủ công
        cb.checked = !cb.checked;

        // Dispatch event để báo hiệu thay đổi (nếu có logic lắng nghe change)
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      };

      row.appendChild(left);
      row.appendChild(cb);
      listDiv.appendChild(row);

      items.push({
        row: row,
        text: mf.value.toLowerCase(),
        idStr: badge.textContent.toLowerCase(),
      });
    });

    container.appendChild(listDiv);

    // 5. Search Logic
    searchInp.addEventListener("input", () => {
      const term = searchInp.value.trim().toLowerCase();
      items.forEach((item) => {
        const match = item.text.includes(term) || item.idStr.includes(term);
        item.row.style.display = match ? "flex" : "none";
      });
    });
  }

  App.renderExtraCalcOptions = function () {
    const v1AngleSelect = document.getElementById("v1AngleSelect");
    const v2AngleSelect = document.getElementById("v2AngleSelect");
    const vNormSelect = document.getElementById("vNormSelect");
    const vCoordSelect = document.getElementById("vCoordSelect");
    const basisCoordChecklist = document.getElementById("basisCoordChecklist");
    const basisChecklist = document.getElementById("basisChecklist");
    const indepChecklist = document.getElementById("indepChecklist");
    const rankChecklist = document.getElementById("rankChecklist");
    const v1DotSelect = document.getElementById("v1DotSelect");
    const v2DotSelect = document.getElementById("v2DotSelect");

    addOptionsToSelect(v1AngleSelect);
    addOptionsToSelect(v2AngleSelect);
    addOptionsToSelect(vNormSelect);
    addOptionsToSelect(vCoordSelect);
    addOptionsToSelect(v1DotSelect);
    addOptionsToSelect(v2DotSelect);

    if (App.vectorList.length) {
      if (v1AngleSelect) v1AngleSelect.value = App.vectorList[0].id;
      if (v2AngleSelect)
        v2AngleSelect.value = App.vectorList[1]?.id ?? App.vectorList[0].id;
      if (vNormSelect) vNormSelect.value = App.vectorList[0].id;
      if (vCoordSelect) vCoordSelect.value = App.vectorList[0].id;
      if (v1DotSelect) v1DotSelect.value = App.vectorList[0].id;
      if (v2DotSelect)
        v2DotSelect.value = App.vectorList[1]?.id ?? App.vectorList[0].id;
    }

    makeChecklist(basisCoordChecklist, "coord");
    makeChecklist(basisChecklist, "basis");
    makeChecklist(indepChecklist, "indep");
    makeChecklist(rankChecklist, "rank");
  };

  App.updateCalcSelectLabels = function () {
    // 1. Cập nhật các Menu xổ xuống (Select Box) - Giữ nguyên logic cũ
    const selectIds = [
      "v1Select",
      "v2Select",
      "v1AngleSelect",
      "v2AngleSelect",
      "vNormSelect",
      "vCoordSelect",
      "v1DotSelect",
      "v2DotSelect",
    ];

    selectIds.forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      Array.from(sel.options).forEach((opt) => {
        const it = App.vectorList.find((v) => v.id === Number(opt.value));
        if (it) opt.textContent = App.optionLabelFor(it);
      });
    });

    // 2. [MỚI] Cập nhật các Checklist (Độc lập tuyến tính, Cơ sở, Hạng...)
    // Hàm con để tìm và sửa chữ trong checklist mà không làm mất dấu tích chọn
    const syncChecklistText = (prefix) => {
      App.vectorList.forEach((it) => {
        const checkbox = document.getElementById(`chk_${prefix}_${it.id}`);
        if (checkbox) {
          const row = checkbox.closest(".checkitem");
          if (row) {
            // [SỬA LẠI ĐOẠN NÀY] Tìm thẻ math-field thay vì .vec-text
            const mf = row.querySelector("math-field");
            if (mf) {
              // Cập nhật giá trị mới (ưu tiên latex)
              mf.value = it.latex || App.formatVectorShort(it.vec);
            }
          }
        }
      });
    };

    // Chạy đồng bộ cho tất cả các loại checklist đang có
    syncChecklistText("indep"); // Độc lập tuyến tính
    syncChecklistText("basis"); // Hệ cơ sở
    syncChecklistText("rank"); // Tìm hạng
    syncChecklistText("coord"); // Tìm tọa độ
  };

  App.showExtraForm = function (op) {
    const extraForms = document.getElementById("extraForms");
    if (!extraForms) return;
    const forms = extraForms.querySelectorAll(".extra-form");
    forms.forEach((f) => f.classList.remove("active"));
    const active = document.getElementById(`form-${op}`);
    if (active) active.classList.add("active");
  };
  // Hàm kiểm tra vector & Chuyển hướng
  App.requireVectors = function () {
    // If vectors exist, allow action
    if (App.vectorList && App.vectorList.length > 0) return true;

    // --- IF EMPTY: ---

    // 1. Show Toast Message (Missing part)
    if (window.App && typeof App.showToast === "function") {
      App.showToast(
        "Danh sách trống! Hãy tạo vector ở đây trước 👇",
        "warning",
      );
    } else {
      // Fallback if toast system isn't ready
      alert("Danh sách trống! Hãy tạo vector trước.");
    }

    // 2. Switch to "Create" Tab
    const firstTab = document.querySelector(".sidebar-tabs .tab-btn");
    if (firstTab) {
      firstTab.click();
    }

    // 3. Focus and Shake Input
    setTimeout(() => {
      const input =
        document.querySelector("#card-create math-field") ||
        document.querySelector("#vectorInput");
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });

        // Reset animation
        input.style.animation = "none";
        input.offsetHeight; /* trigger reflow */
        input.style.animation = "shakeError 0.4s ease-in-out";

        // Add red border/shadow
        input.style.borderColor = "#ff4444";
        input.style.boxShadow = "0 0 0 4px rgba(255, 68, 68, 0.1)";

        input.focus();

        // Clear red styles after 2s
        setTimeout(() => {
          input.style.borderColor = "";
          input.style.boxShadow = "";
          input.style.animation = "";
        }, 2000);
      }
    }, 150);

    return false; // Stop the original action
  };

  // Vòng lặp quét để gắn sự kiện chặn (Fix lại logic tìm nút)
  setInterval(() => {
    // 1. Dọn dẹp nút thừa
    const buttons = document.querySelectorAll("button");
    for (let btn of buttons) {
      if (btn.textContent.trim() === "Xem trước") btn.remove();

      // 2. Gắn chốt chặn cho các nút tính toán
      // Danh sách các từ khóa trên nút cần chặn
      const keywords = [
        "Thực hiện",
        "Kiểm tra",
        "Tính hạng",
        "Tính cơ sở",
        "Xuất tọa độ",
        "Tính toán",
      ];
      const btnText = btn.textContent.trim();

      if (keywords.some((k) => btnText.includes(k))) {
        if (!btn.dataset.hasCheck) {
          btn.dataset.hasCheck = "true";
          // Dùng capture phase (true) để chặn sự kiện trước khi nó chạy vào logic cũ
          btn.addEventListener(
            "click",
            (e) => {
              if (!App.requireVectors()) {
                e.stopImmediatePropagation();
                e.preventDefault();
              }
            },
            true,
          );
        }
      }
    }

    // 3. Làm đẹp kết quả (như cũ)
    const divs = document.querySelectorAll("div");
    for (let div of divs) {
      if (
        div.textContent.trim().startsWith("Kết quả:") &&
        !div.classList.contains("nice-result-box")
      ) {
        div.classList.add("nice-result-box");
        div.innerHTML = div.innerHTML.replace(
          "Kết quả:",
          "<strong>KẾT QUẢ:</strong>",
        );
        // Fix số xấu
        if (/\d+\.\d{5,}/.test(div.innerHTML)) {
          div.innerHTML = div.innerHTML.replace(/(\d+\.\d+)/g, (m) => {
            const v = parseFloat(m);
            return !isNaN(v) && window.App.smartFormat ? App.smartFormat(v) : m;
          });
        }
      }
    }
  }, 500);
})();
