// ===================== js/app/logic/vector_controller.js (FINAL DETAILED VERSION) =====================
(function () {
  window.App = window.App || {};
  App._pickUniqueHue = function () {
    // Thuật toán Góc Vàng: Màu rải đều, không bao giờ trùng, siêu nhanh
    const i = App.vectorList ? App.vectorList.length : 0;
    return (i * 137.508) % 360;
  };
  App.useAnimation = true;
  App.formatVectorShort = function (vec) {
    if (!Array.isArray(vec)) return "[]";

    const clean = (x) => {
      let n = Number(x);
      // Nếu sai số < 0.0001 thì ép về số nguyên luôn (3.00000012 -> 3)
      if (Math.abs(n - Math.round(n)) < 1e-4) return Math.round(n);
      return n;
    };

    return (
      "[" +
      vec
        .map((x) => {
          let v = clean(x);
          // Nếu có hàm formatScalar xịn thì dùng, không thì dùng string
          return typeof App.formatScalar === "function"
            ? App.formatScalar(v)
            : String(v);
        })
        .join(", ") +
      "]"
    );
  };

  // Hàm làm đẹp Nhãn Tọa độ (Ép tối đa 2 chữ số thập phân, tự cắt số 0 thừa)
  App.formatTip = function (vec) {
    if (!Array.isArray(vec)) return "[]";
    return "[" + vec.map(v => {
      let num = Number(v);
      if (isNaN(num)) return "0";
      // ToFixed(2) đảm bảo tối đa 2 số. Regex dọn dẹp số 0 vô dụng ở đuôi.
      return num.toFixed(2).replace(/\.?0+$/, "");
    }).join(", ") + "]";
  };

  // Biến đếm ID toàn cục (Reset được)
  let nextVectorId = 1;
  function smartFormat(num) {
    const val = Number(num);
    if (isNaN(val)) return "0";
    if (Math.abs(val) < 1e-9) return "0"; // Xử lý số 0

    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";

    // 1. Số nguyên (Nới lỏng sai số lên 1e-4 để bắt được cả số đã bị làm tròn)
    if (Math.abs(val - Math.round(val)) < 1e-4) return String(Math.round(val));

    // 2. Phân số
    for (let d = 2; d <= 50; d++) {
      let n = val * d;
      if (Math.abs(n - Math.round(n)) < 1e-4) {
        return `\\frac{${Math.round(n)}}{${d}}`;
      }
    }

    // --- TRUY NGƯỢC CĂN THỨC (Nới lỏng sai số và tăng phạm vi) ---
    // Sai số cho phép: 0.0005 (để bắt được 1.4953 so với 1.49534...)
    const TOLERANCE = 5e-4;

    // 3. Căn bậc 2: k * sqrt(n)
    for (let k = 1; k <= 10; k++) {
      const base = (absVal / k) ** 2;
      const roundBase = Math.round(base);
      if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
        const latexK = k === 1 ? "" : String(k);
        return `${sign}${latexK}\\sqrt{${roundBase}}`;
      }
    }

    // 4. Căn bậc 4: sqrt[4](n) (Ưu tiên kiểm tra trước căn bậc 3 vì dễ trùng)
    // Ví dụ: 1.4953 -> mũ 4 lên = 4.999... -> 5
    const pow4 = Math.pow(absVal, 4);
    if (Math.abs(pow4 - Math.round(pow4)) < TOLERANCE * 10) {
      // Nới lỏng hơn cho bậc cao
      return `${sign}\\sqrt[4]{${Math.round(pow4)}}`;
    }

    // 5. Căn bậc 3: k * cbrt(n)
    for (let k = 1; k <= 5; k++) {
      const base = (absVal / k) ** 3;
      const roundBase = Math.round(base);
      if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
        const latexK = k === 1 ? "" : String(k);
        return `${sign}${latexK}\\sqrt[3]{${roundBase}}`;
      }
    }

    // 6. Số Pi (k*pi)
    const divPi = absVal / Math.PI;
    if (Math.abs(divPi - Math.round(divPi)) < TOLERANCE) {
      const k = Math.round(divPi);
      return (k === 1 ? "" : String(k)) + "\\pi";
    }

    // 7. Chịu thua -> In số thập phân
    return Number(val)
      .toFixed(4)
      .replace(/\.?0+$/, "");
  }
  // Helper: Chuyển vector bất kỳ thành mảng [x, y, z] an toàn
  const toVec3 = function (v) {
    return [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];
  };

  /* =======================================================================
       PHẦN 1: TIỆN ÍCH & GIAO DIỆN
       ======================================================================= */

  // Hiển thị thông báo Toast (Đồng bộ cây đỏ/vàng/xanh + Hiệu ứng trượt ngang)
  App.showToast = function (message, type = "error") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const removeToastSmoothly = (t) => {
      if (t.isRemoving) return;
      t.isRemoving = true;
      t.style.opacity = "0";
      t.style.transform = "translateX(120%)";
      setTimeout(() => {
        t.style.marginTop = "0";
        t.style.marginBottom = "0";
        t.style.paddingTop = "0";
        t.style.paddingBottom = "0";
        t.style.height = "0";
      }, 150);
      setTimeout(() => {
        if (t.parentNode) t.remove();
      }, 400);
    };

    let activeToasts = Array.from(container.children).filter(
      (t) => !t.isRemoving,
    );
    while (activeToasts.length >= 3) {
      let oldest = activeToasts.shift();
      removeToastSmoothly(oldest);
    }

    const toast = document.createElement("div");
    toast.className = "toast-item";

    // Ghi đè CSS cứng để đảm bảo không bị dính màu đỏ mặc định của class
    toast.style.cssText = `
        opacity: 0; transform: translateY(20px); overflow: hidden;
        transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        cursor: pointer; display: flex; align-items: center;
    `;

    let iconSVG = "",
      colorHex = "";
    if (type === "error") {
      colorHex = "#f44336"; // Đỏ
      iconSVG =
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    } else if (type === "warning") {
      colorHex = "#ff9800"; // Vàng cam chuẩn
      iconSVG =
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
    } else {
      colorHex = "#4caf50"; // Xanh
      iconSVG =
        '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    }

    toast.style.borderLeft = `4px solid ${colorHex}`;

    toast.innerHTML = `
            <div class="toast-content" style="display: flex; align-items: center; gap: 10px;">
                <span class="toast-icon" style="color: ${colorHex}; display: flex;">${iconSVG}</span>
                <span style="color: var(--text); font-weight: 500;">${message}</span>
            </div>
            <div class="toast-progress" style="background: ${colorHex};"></div>
        `;

    toast.onclick = function () {
      removeToastSmoothly(toast);
    };
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0) translateX(0)";
    });

    setTimeout(function () {
      removeToastSmoothly(toast);
    }, 5000);
  };

  // =======================================================================
  // CHUẨN HIỂN THỊ KẾT QUẢ THỐNG NHẤT (UNIFIED RESULT UI)
  // =======================================================================
  App.renderUnifiedResult = function (label, contentHtml) {
    if (!document.getElementById("unified-result-style")) {
      const style = document.createElement("style");
      style.id = "unified-result-style";
      style.innerHTML = `
            .unified-result-box {
                background: rgba(33, 150, 243, 0.08); border-left: 4px solid #2196F3;
                border-radius: 6px; padding: 12px 16px; margin-top: 15px;
                font-family: system-ui, sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04); 
                display: flex; flex-direction: column; gap: 8px;
            }
            body.dark .unified-result-box { background: rgba(79, 133, 255, 0.1); border-left-color: #4f85ff; }
            .unified-result-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #555; letter-spacing: 0.5px; }
            body.dark .unified-result-label { color: #aaa; }
            .unified-result-content { font-size: 16px; font-weight: 600; color: #1565C0; overflow-x: auto; -webkit-overflow-scrolling: touch; }
            body.dark .unified-result-content { color: #90caf9; }
            .unified-result-content math-field { background: transparent; border: none; outline: none; font-size: 16px; color: inherit; width: max-content; }
        `;
      document.head.appendChild(style);
    }
    return `
        <div class="unified-result-box">
            <div class="unified-result-label">${label}</div>
            <div class="unified-result-content">${contentHtml}</div>
        </div>
    `;
  };

  // Xử lý khi danh sách vector trống (FIX LỖI KẸT VIỀN ĐỎ)
  App.handleEmptyListAction = function () {
    if (App.vectorList.length === 0) {
      App.showToast("Danh sách trống! Hãy tạo vector ở đây trước 👇");
      const createCard = document.getElementById("card-create");
      if (createCard) {
        createCard.scrollIntoView({ behavior: "smooth", block: "center" });
        const inp = document.getElementById("vectorInput");
        if (inp) {
          inp.focus();
          // Dùng CSS class thay vì ép cứng style để không bao giờ bị kẹt màu
          inp.classList.remove("input-error-flash");
          void inp.offsetWidth; // Kích hoạt chạy lại animation
          inp.classList.add("input-error-flash");
          setTimeout(() => inp.classList.remove("input-error-flash"), 1000);
        }
      }
      return true;
    }
    return false;
  };

  // Áp dụng Theme (Dark/Light)
  App.applyTheme = function () {
    document.body.classList.toggle("dark", App.theme === "dark");
    const themeBadge = document.getElementById("themeBadge");
    if (themeBadge) {
      themeBadge.textContent = `Theme: ${App.theme === "dark" ? "Dark" : "Light"}`;
    }

    if (typeof App.refreshHaloColors === "function") App.refreshHaloColors();

    if (App.mode === "2D" && window.Vec2D) {
      Vec2D.draw2DAllVectors();
    }

    if (window.Vec3D && Vec3D._scene) {
      Vec3D._scene.background = new THREE.Color(App.getCSS("--bg"));
      Vec3D.update3DHelpersBase();
      Vec3D.hardRefresh3D(false);
      if (App.currentAngleVisual3D) Vec3D.refreshAngleTheme();
    }

    if (App.mode === "2D" && App.currentAngleVisual2D && window.Vec2D) {
      const g2 = App.currentAngleVisual2D;
      Vec2D.drawAngleArc2D(g2.a, g2.b, g2.deg);
    }
  };

  function triggerThemeAnim(isDark) {
    const s = document.getElementById("sunIcon");
    const m = document.getElementById("moonIcon");
    if (!s || !m) return;

    // Reset animation cũ để có thể chạy lại
    s.classList.remove("animate-rise-fade");
    m.classList.remove("animate-rise-fade");

    // Hack: Buộc trình duyệt vẽ lại (reflow) để nhận diện reset
    void s.offsetWidth;

    // Thêm class để chạy animation
    if (isDark) m.classList.add("animate-rise-fade");
    else s.classList.add("animate-rise-fade");
  }

  // [SỬA] Cập nhật hàm toggleTheme để gọi hiệu ứng
  App.toggleTheme = function () {
    App.theme = App.theme === "light" ? "dark" : "light";
    App.applyTheme();

    // Gọi hiệu ứng bay lên
    triggerThemeAnim(App.theme === "dark");

    localStorage.setItem("vec_theme", App.theme);
  };

  App.toggleAuto = function () {
    const btn = document.getElementById("btnAuto");
    App.autoMode = !App.autoMode;
    if (btn) {
      btn.textContent = App.autoMode
        ? "Tự động chuyển chiều không gian: BẬT"
        : "Tự động chuyển chiều không gian: TẮT";
    }
  };

  // Xử lý vẽ đè góc (Angle Overlay) khi chuyển chế độ
  App._portAngleOverlay = function (toMode) {
    if (toMode === "3D") {
      if (!window.Vec3D) return;
      if (App.currentAngleVisual3D) {
        Vec3D.refreshAngleTheme();
        return;
      }
      const g2 = App.currentAngleVisual2D;
      if (g2) {
        const deg = parseFloat(String(g2.deg));
        if (isFinite(deg)) {
          const rad = (deg * Math.PI) / 180;
          Vec3D.drawAngleArc3D(
            [g2.a[0], g2.a[1], 0],
            [g2.b[0], g2.b[1], 0],
            rad,
            deg,
          );
        }
      }
    } else if (toMode === "2D") {
      if (!window.Vec2D) return;
      if (App.currentAngleVisual2D) {
        Vec2D.drawAngleArc2D(
          App.currentAngleVisual2D.a,
          App.currentAngleVisual2D.b,
          App.currentAngleVisual2D.deg,
        );
        return;
      }
      const g3 = App.currentAngleVisual3D;
      const src = g3?.userData?.angleMeta?.src;
      if (src?.a && src?.b) {
        const ax = src.a[0],
          ay = src.a[1],
          bx = src.b[0],
          by = src.b[1];
        const la = Math.hypot(ax, ay),
          lb = Math.hypot(bx, by);
        if (la > 1e-9 && lb > 1e-9) {
          let c = (ax * bx + ay * by) / (la * lb);
          c = Math.max(-1, Math.min(1, c));
          const rad = Math.acos(c);
          Vec2D.drawAngleArc2D([ax, ay], [bx, by], (rad * 180) / Math.PI);
        }
      }
    }
  };

  App.toggleMode = function () {
    const to3D = App.mode === "2D";
    App.mode = to3D ? "3D" : "2D";

    const modeBadge = document.getElementById("modeBadge");
    if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;

    const axisPanel = document.getElementById("axisControls");
    if (axisPanel) axisPanel.style.display = to3D ? "flex" : "none";
    
    if (to3D) {
      if (window.Vec3D) {
        if (!Vec3D._scene) Vec3D.init3D();
        Vec3D.show3D();
        Vec3D.resetView();
        App._portAngleOverlay("3D");
      }
    } else {
      if (window.Vec2D) {
        Vec2D.show2D();
        Vec2D.resetView();
        App._portAngleOverlay("2D");
      }
    }
    if (typeof App.refreshProjectionOverlay === "function") {
      App.refreshProjectionOverlay();
    }
  };

  App.clearAngleOverlay = function () {
    App.currentAngleVisual2D = null;
    const angEl = document.getElementById("result_angle");
    if (angEl) angEl.innerText = "—";
    if (window.Vec3D) {
      Vec3D.clearAngle();
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    }
  };

  // Vẽ lại toàn bộ (Gọi cả 2D và 3D)
  App.redrawAll = function (opts) {
    opts = opts || { frame: true };
    if (App.mode === "2D") {
      if (window.Vec2D) {
        Vec2D.show2D();
        // Vẽ các vector thường
        Vec2D.draw2DAllVectors();

        // [CẤU HÌNH ĐẶC BIỆT]: Nếu là phép chiếu 3D đang xem ở 2D,
        // ta phải tính lại hình chiếu 2D của vector 3D đó dựa trên tọa độ thực.
        if (App.currentProjVisual) {
          // Tự tính lại vector hình chiếu dựa trên công thức toán học
          // để hình ảnh hiển thị không bị "lừa mắt"
          App._drawCorrectedProjection2D();
        }
      }
    } else {
      if (window.Vec3D) {
        Vec3D.show3D();
        Vec3D.draw3DAllVectors({ frame: opts.frame });
      }
    }
    if (typeof App.refreshProjectionOverlay === "function") {
      App.refreshProjectionOverlay();
    }
  };

  // --- PHẦN TẠO VECTOR ---

  // Helper tạo Object Vector mới
  App._attachVectorItem = function (vec, hue) {
    const lightness = nextVectorId % 2 === 0 ? 50 : 65;
    return {
      id: nextVectorId++, // ID tăng dần
      vec: vec,
      colorHex:
        typeof App.hslToHex === "function"
          ? App.hslToHex((hue % 360) / 360, 0.85, 0.6)
          : `hsl(${hue}, 85%, 60%)`,
      colorCss: `hsl(${hue}, 85%, ${lightness}%)`,
      haloCss: `hsl(${hue}, 85%, ${lightness + 20}%)`,
      visible: true,
      focus: false,
      highlighted: false,
      alpha: 1,
    };
  };

  // Hàm xử lý sự kiện nút "Thêm Vector"
  App.onAddVector = function () {
    const inp = document.getElementById("vectorInput");
    if (!inp) return;

    // 1. Lấy dữ liệu thô và dọn dẹp khoảng trắng
    const raw = inp.value.trim();

    // --- CHỐT CHẶN 1: BẮT BUỘC PHẢI CÓ NGOẶC VUÔNG ---
    if (!raw.startsWith("[") || !raw.endsWith("]")) {
      App.showToast(
        "Sai cú pháp! Vui lòng nhập tọa độ trong ngoặc vuông (VD: [1, 2])",
      );
      inp.style.animation = "none";
      inp.offsetHeight;
      inp.style.animation = "shakeError 0.4s ease-in-out";
      return;
    }

    // Lấy ruột bên trong ngoặc vuông
    const innerContent = raw.slice(1, -1).trim();

    // --- CHỐT CHẶN 2: KHÔNG CHO PHÉP RỖNG HOẶC DẤU PHẨY BẬY BẠ ---
    if (
      innerContent === "" ||
      innerContent.startsWith(",") ||
      innerContent.endsWith(",") ||
      innerContent.includes(",,")
    ) {
      App.showToast("Tọa độ không hợp lệ (Dư hoặc thiếu dấu phẩy)");
      inp.style.animation = "none";
      inp.offsetHeight;
      inp.style.animation = "shakeError 0.4s ease-in-out";
      return;
    }

    // 3. Tiến hành parse vector như bình thường
    let v;
    try {
      v = App.parseVectorExpr(raw);
      if (!Array.isArray(v) || v.length < 2)
        throw new Error("Vector phải có ít nhất 2 toạ độ");

      // --- CHỐT CHẶN 3: BẮT LỖI TỌA ĐỘ VÔ LÝ ---
      if (
        v.some((val) => val === null || val === undefined || isNaN(Number(val)))
      ) {
        throw new Error("Có chứa giá trị không phải là số hợp lệ.");
      }
    } catch (err) {
      App.showToast("Lỗi nhập liệu: " + err.message);
      inp.style.animation = "none";
      inp.offsetHeight;
      inp.style.animation = "shakeError 0.4s ease-in-out";
      return;
    }

    App.currentVector = v.slice();
    App.firstDrawForVector = true;
    const hue = App._pickUniqueHue ? App._pickUniqueHue() : Math.random() * 360;
    const item = App._attachVectorItem(v, hue);

    // --- KIỂM TRA HÀM TOÁN HỌC & FORMAT LATEX ---
    const needsCalc = /(sin|cos|tan|cot|log|ln|pi|e\^|e\s|e$)/i.test(raw);

    if (needsCalc) {
      const latexArr = v.map((val) => smartFormat(val));
      item.latex = `[${latexArr.join(", ")}]`;
    } else {
      // Lắp ráp lại mảng sạch sẽ, loại bỏ khoảng trắng/số dư thừa
      const cleanArray = v.map((val) => Number(val).toString());
      item.latex = `[${cleanArray.join(", ")}]`;
    }

    App.vectorList.push(item);

    if (App.renderVectorList) App.renderVectorList();
    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

    if (App.autoMode) {
      App.mode = v.length >= 3 ? "3D" : "2D";
      const mb = document.getElementById("modeBadge");
      if (mb) mb.textContent = `Mode: ${App.mode}`;
      
      const axisPanel = document.getElementById("axisControls");
      if (axisPanel) axisPanel.style.display = App.mode === "3D" ? "flex" : "none";
    }
    if (App.redrawAll) App.redrawAll({ frame: false });
    if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
  };

  // Hàm xóa hết vector (FIX LỖI DANH SÁCH VECTOR KHÔNG BIẾN MẤT)
  App.clearAllVectors = function () {
    App.vectorList.length = 0;
    nextVectorId = 1;
    if (App.usedHues) App.usedHues.clear();

    const toastContainer = document.getElementById("toast-container");
    if (toastContainer) toastContainer.innerHTML = "";

    App.clearAngleOverlay();

    // --- CHỖ NÀY QUAN TRỌNG: Cập nhật TẤT CẢ giao diện ---
    if (App.renderVectorList) App.renderVectorList();
    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions(); // Lệnh này giúp dọn dẹp mấy cái Checklist cũ!

    // Xóa luôn text kết quả cũ đang hiển thị
    ["result_indep", "result_rank", "result_basis", "result_coord"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.innerText = "—";
      },
    );

    App.redrawAll({ frame: true });
  };

  /* =======================================================================
       PHẦN 2: LOGIC TÍNH TOÁN & KÍCH HOẠT ANIMATION
       ======================================================================= */

  function vectorById(id) {
    const item = App.vectorList.find(function (v) {
      return v.id === id;
    });
    return item ? item.vec : null;
  }

  App.refreshCalcUI = function () {
    const opEl = document.getElementById("opSelect");
    if (!opEl) return;

    const op = opEl.value;
    const v2Box = document.getElementById("v2Box");
    const scalarBox = document.getElementById("scalarBox");
    const btnCompute = document.getElementById("btnCompute");

    if (!v2Box || !scalarBox) return;

    if (op === "scale") {
      v2Box.style.display = "none";
      scalarBox.style.display = "block";
    } else if (op === "normalize" || op === "vector_norm") {
      v2Box.style.display = "none";
      scalarBox.style.display = "none";
    } else {
      v2Box.style.display = "block";
      scalarBox.style.display = "none";
    }

    if (btnCompute) {
      const measureOps = ["dot", "vector_norm", "angle_between"];
      btnCompute.textContent = measureOps.includes(op)
        ? "Tính toán"
        : "Thực hiện";
    }

    const s = document.getElementById("calcSteps");
    if (s) {
      s.innerHTML = "Kết quả phép tính sẽ hiển thị ở đây.";
      s.style.color = "";
    }
  };

  // --- MAIN FUNCTION: CHẠY TÍNH TOÁN ---
  App.runCalc = async function (addToList) {
    if (App.handleEmptyListAction()) return;

    const op = document.getElementById("opSelect").value;
    const id1 = Number(document.getElementById("v1Select").value);
    const id2 = Number(document.getElementById("v2Select").value);
    const scalarInp = document.getElementById("scalarInp");
    const calcSteps = document.getElementById("calcSteps");

    const v1 = vectorById(id1);
    const needsV2 = !["scale", "normalize", "vector_norm"].includes(op);
    const v2 = needsV2 ? vectorById(id2) : null;

    let payload = null;
    try {
      if (!v1) throw "Chưa chọn Vector 1.";
      if (needsV2 && !v2) throw "Chưa chọn Vector 2.";

      if (op === "add") payload = { v1, v2 };
      else if (op === "scale") {
        const k = parseFloat(scalarInp.value);
        if (!isFinite(k)) throw "Hệ số k không hợp lệ.";
        payload = { v: v1, scalar: k };
      } else if (op === "cross") payload = { v1, v2 };
      else if (op === "normalize") payload = { v: v1 };
      else if (op === "projection") payload = { v: v1, u: v2 };
      else if (op === "dot") payload = { v1, v2 };
      else if (op === "vector_norm") payload = { v: v1 };
      else if (op === "angle_between") payload = { v1, v2 };
    } catch (err) {
      App.showToast(String(err));
      return;
    }

    const mapOpToApi = {
      add: "add_vectors",
      scale: "scale_vector",
      cross: "cross_product",
      normalize: "normalize",
      projection: "projection",
      dot: "dot_product",
      vector_norm: "vector_norm",
      angle_between: "angle_between",
    };

    calcSteps.innerHTML = "Đang tính...";
    try {
      let data = await App.callAPI(mapOpToApi[op], payload);
      if (data.error) throw data.error;

      // 1. Xử lý kết quả vô hướng
      if (["dot", "vector_norm", "angle_between"].includes(op)) {
        let val = data.result;
        if (op === "angle_between") {
          const deg = (val * 180) / Math.PI;
          if (App.mode === "2D" && window.Vec2D)
            Vec2D.drawAngleArc2D(v1, v2, deg);
          else if (window.Vec3D) Vec3D.drawAngleArc3D(v1, v2, val, deg);
          calcSteps.innerHTML = App.renderUnifiedResult(
            "GÓC GIỮA 2 VECTOR",
            `${deg.toFixed(2)}°`,
          );
          if (App.useAnimation && typeof App.animateOperation === "function") {
              App.animateOperation("angle_between", [id1, id2], val);
          }
        } else {
          calcSteps.innerHTML = App.renderUnifiedResult(
            "KẾT QUẢ VÔ HƯỚNG",
            App.formatScalar ? App.formatScalar(val) : val,
          );
        }

        if (
          op === "dot" &&
          App.useAnimation &&
          typeof App.animateOperation === "function"
        ) {
          App.animateOperation("dot", [id1, id2], val);
        }
        if (
          op === "vector_norm" &&
          App.useAnimation &&
          typeof App.animateOperation === "function"
        ) {
          App.animateOperation("vector_norm", [id1], val);
        }
        return;
      }

      // 2. Xử lý kết quả Vector (Đã fix hiển thị MathLive + Fix lỗi 2 viền)
      const rawRes = data.result !== undefined ? data.result : data.result_vec;

      // Hàm làm tròn số
      const fmtVal = (n) => {
        let x = Number(n);
        if (isNaN(x)) return "0";
        if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
        return String(parseFloat(x.toFixed(4)));
      };

      // Tạo chuỗi Latex: Vector (x, y) hoặc số
      let latex = "";
      if (Array.isArray(rawRes)) {
        latex = `\\left( ${rawRes.map(fmtVal).join(",\\; ")} \\right)`;
      } else {
        latex = fmtVal(rawRes);
      }

      // [FIX QUAN TRỌNG] Reset sạch style thẻ cha để không bị 2 viền chồng nhau
      calcSteps.className = "";
      calcSteps.style.padding = "0";
      calcSteps.style.border = "none";
      calcSteps.style.background = "transparent";

      calcSteps.className = "";
      calcSteps.style.padding = "0";
      calcSteps.style.border = "none";
      calcSteps.style.background = "transparent";
      // Bọc kết quả vào khung Thống nhất
      calcSteps.innerHTML = App.renderUnifiedResult(
        "VECTOR KẾT QUẢ",
        `<math-field read-only>${latex}</math-field>`,
      );
      if (addToList) {
        // [FIX LỖI] Định nghĩa vecRes lấy từ kết quả rawRes ở trên
        const vecRes = Array.isArray(rawRes) ? rawRes : [rawRes];

        const hue = App._pickUniqueHue ? App._pickUniqueHue() : 0;

        // Giờ vecRes đã có giá trị, không bị lỗi nữa
        const newItem = App._attachVectorItem(vecRes, hue);

        // [FIX] Đưa vào danh sách NGAY LẬP TỨC để đồng bộ ID
        App.vectorList.push(newItem);
        App.renderVectorList();
        App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
        if (
          op === "cross" &&
          App.useAnimation &&
          typeof App.animateOperation === "function"
        ) {
          App.animateOperation("cross", [id1, id2], newItem.id);
        }
        if (!App.useAnimation) {
          newItem.alpha = 1; // Hiện ngay
          newItem.vec = vecRes; // Gán giá trị cuối
          App.tempGhosts = []; // Xóa bóng ma (nếu có)
          App.redrawAll({ frame: false });
          return; // Dừng hàm, không chạy xuống phần animation dưới nữa
        }
        // --- 3. XỬ LÝ ANIMATION CO DÃN & CHUẨN HÓA ---
        // --- 1. KỊCH BẢN "PHÉP VỊ TỰ" CHO PHÉP NHÂN VÔ HƯỚNG ---
        if (op === "scale") {
          const startVec = [...v1]; // Tọa độ vector ban đầu
          const targetVec = [...vecRes]; // Tọa độ sau khi nhân k

          const originalItem = App.vectorList.find((v) => v.id === id1);
          if (originalItem) originalItem.alpha = 0.2; // Lưu lại cái bóng mờ để làm hệ quy chiếu

          newItem.alpha = 1;
          App.tempGhosts = [];

          const dur = 1000; // Cho chạy 1s để thấy rõ quá trình đi xuyên qua gốc O
          const t0 = performance.now();

          // Hàm Easing (Nhanh ở giữa, chậm hai đầu) để mô phỏng lực kéo/đẩy
          const easeInOutQuad = (t) =>
            t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          function animScale(now) {
            const timeRatio = Math.min((now - t0) / dur, 1);
            const p = easeInOutQuad(timeRatio);

            // CỐT LÕI TOÁN HỌC: Bắt đầu từ ngọn vector cũ, kéo/đẩy đến ngọn vector mới
            const currentVec = startVec.map(
              (val, i) => val + (targetVec[i] - val) * p,
            );

            newItem.vec = currentVec; // Cập nhật tọa độ real-time
            App.redrawAll({ frame: false });

            if (timeRatio < 1) {
              requestAnimationFrame(animScale);
            } else {
              // Chốt sổ
              if (originalItem) originalItem.alpha = 1;
              newItem.vec = targetVec;
              App.redrawAll({ frame: false });
            }
          }
          requestAnimationFrame(animScale);
        } else if (op === "normalize") {
          // =========================================================
          // KỊCH BẢN CHUẨN HÓA: HOLOGRAM NĂNG LƯỢNG (ĐÃ DIỆT LỖI LƯỚI TÀNG HÌNH)
          // =========================================================
          const startVec = [...v1];
          const targetVec = [...vecRes];
          const originalItem = App.vectorList.find((v) => v.id === id1);

          // Màu Hologram Sci-fi siêu ngầu
          const isDark = document.body.classList.contains("dark");
          const refColorHex = isDark ? 0x00d4ff : 0x0055ff;
          const refColorCss = isDark ? "#00d4ff" : "#0088cc";

          // 1. CHUẨN BỊ GHOST VECTOR
          const stretchGhost = {
            // [CHÌA KHÓA DIỆT MẠNG NHỆN]:
            // Chỉ báo cho hệ thống vẽ "Đây là Chuẩn hóa" khi ở 2D.
            // Ở 3D, ta ngắt cờ này để file viewer3D.js KHÔNG tự động đẻ ra mặt cầu lưới mặc định nữa!
            isNormalize: App.mode === "2D",
            isGhost: true,
            vec: [...startVec],
            colorCss: refColorCss,
            alpha: 1,
            unitCircleAlpha: 0,
          };
          App.tempGhosts = [stretchGhost];
          newItem.alpha = 1;

          // 2. TẠO MẶT CẦU HOLOGRAM BẰNG SHADER (TỰ PHÁT SÁNG, XUYÊN THẤU 100%)
          let sphereMesh = null;
          if (App.mode === "3D" && window.Vec3D && Vec3D._mathGroup) {
            const u = Vec3D.S3D.unitsPerWorld || 1;
            const sphereGeo = new THREE.SphereGeometry(1, 64, 64); // Phân giải cao cho mịn

            // Tự viết thuật toán Ánh sáng Fresnel (Viền sáng, tâm trong suốt)
            const vertexShader = `
                  varying vec3 vNormal;
                  void main() {
                      vNormal = normalize(normalMatrix * normal);
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
              `;
            const fragmentShader = `
                  uniform vec3 glowColor;
                  uniform float opacityAnim;
                  varying vec3 vNormal;
                  void main() {
                      // Tính độ chói ở viền (Hiệu ứng bong bóng/hologram)
                      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                      gl_FragColor = vec4(glowColor, fresnel * opacityAnim);
                  }
              `;

            const sphereMat = new THREE.ShaderMaterial({
              uniforms: {
                glowColor: { value: new THREE.Color(refColorHex) },
                opacityAnim: { value: 0.0 },
              },

              vertexShader: `
        varying vec3 vNormal;

        void main() {
            vNormal = normalize(normalMatrix * normal);

            gl_Position =
                projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
        }
    `,

              fragmentShader: `
        uniform vec3 glowColor;
        uniform float opacityAnim;

        varying vec3 vNormal;

        void main() {

            float fresnel =
                pow(
                    1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))),
                    3.0
                );

            float alpha =
                fresnel *
                opacityAnim *
                0.5;

            gl_FragColor =
                vec4(glowColor, alpha);
        }
    `,

              transparent: true,

              depthWrite: false,

              side: THREE.FrontSide,

              blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
            });

            sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
            sphereMesh.onBeforeRender = () => {
              const dynamicU = Vec3D.S3D.unitsPerWorld || 1;
              sphereMesh.scale.setScalar(dynamicU);
            };
            Vec3D._mathGroup.add(sphereMesh);
          }

          if (originalItem) {
            originalItem.alpha = 0.2;
          }

          const durFade = 300;
          const durScale = 800;
          const t0 = performance.now();

          function animNormalize(now) {
            const t = now - t0;

            // NHỊP 1: Tỏa sáng Hologram
            let p1 = Math.min(t / durFade, 1);
            stretchGhost.unitCircleAlpha = p1 * 0.5;
            if (sphereMesh) {
              sphereMesh.material.uniforms.opacityAnim.value = p1 * 2.0; // Đẩy sáng lên
            }

            // NHỊP 2: Co giãn mũi tên
            let p2 = 0;
            if (t > durFade) {
              p2 = Math.min((t - durFade) / durScale, 1);
            }
            const easeInOutCubic =
              p2 < 0.5 ? 4 * p2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 3) / 2;

            const currentVec = startVec.map(
              (s, i) => s + (targetVec[i] - s) * easeInOutCubic,
            );
            stretchGhost.vec = currentVec;
            newItem.vec = currentVec;

            App.redrawAll({ frame: false });

            if (t < durFade + durScale) {
              requestAnimationFrame(animNormalize);
            } else {
              setTimeout(() => {
                newItem.alpha = 1;
                newItem.vec = targetVec;
                App.tempGhosts = [];
                if (originalItem) originalItem.alpha = 1;
                if (sphereMesh && sphereMesh.parent)
                  sphereMesh.parent.remove(sphereMesh);
                App.redrawAll({ frame: false });
              }, 800);
            }
          }
          requestAnimationFrame(animNormalize);
        }
        // PHÉP CỘNG & CHIẾU
        else {
          const hasAnim =
            (op === "add" || op === "projection") &&
            typeof App.animateOperation === "function";
          newItem.alpha = hasAnim ? 0 : 1;
          App.redrawAll({ frame: false });
          if (hasAnim) App.animateOperation(op, [id1, id2], newItem.id);
        }
      } else {
        App.previewVector(vecRes);
      }
    } catch (e) {
      App.showToast("Lỗi: " + e);
    }
  };

  App.previewVector = function (vec) {
    App.currentVector = vec.slice();
    if (App.mode === "2D" && window.Vec2D) {
      App.firstDrawForVector = false;
      Vec2D.draw2DAllVectors();
    } else if (window.Vec3D) {
      if (App._previewTemp) {
        Vec3D._scene.remove(App._previewTemp);
        App._previewTemp = null;
      }
      const v3 = toVec3(vec);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      const tipWorld = new THREE.Vector3(v3[0] * u, v3[1] * u, v3[2] * u);
      const grp = Vec3D.buildVectorGroup3D(
        [tipWorld.x, tipWorld.y, tipWorld.z],
        "#bdbdbd",
      );
      const proj = Vec3D.buildProjectionGroupZUp(
        [tipWorld.x, tipWorld.y, tipWorld.z],
        "#555",
      );
      const g = new THREE.Group();
      g.add(grp, proj);
      Vec3D._scene.add(g);
      App._previewTemp = g;
      Vec3D.hardRefresh3D(false);
    }
    if (App.coordOut && App.formatTip) {
      App.coordOut(App.formatTip(vec));
    }
  };

  /* =======================================================================
       PHẦN 5: LOGIC GỌI API MENU 1 (EXTRA UTILS)
       ======================================================================= */

  App.refreshExtraUI = function () {
    const el = document.getElementById("opExtraSelect");
    if (!el) return;
    const val = el.value;
    document.querySelectorAll(".extra-form").forEach(function (f) {
      f.style.display = "none";
    });
    const active = document.getElementById("form-" + val);
    if (active) active.style.display = "block";
  };

  App.getCheckedVectors = function (container) {
    const arr = [];
    if (!container) return arr;
    container
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach(function (cb) {
        const id = Number(cb.value);
        const it = App.vectorList.find(function (v) {
          return v.id === id;
        });
        if (it) arr.push(it.vec.slice());
      });
    return arr;
  };

  App.selectIdToVector = function (selectEl) {
    if (!selectEl) return null;
    const id = Number(selectEl.value);
    const item = App.vectorList.find(function (v) {
      return v.id === id;
    });
    return item ? item.vec : null;
  };

  App.rankVectorsUI = async function () {
    const container = document.getElementById("rankChecklist");
    if (App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) {
      App.showToast("Hãy tick chọn ít nhất 1 vector!");
      return;
    }
    try {
      const res = await App.callAPI("rank", { vectors: vectors });
      document.getElementById("result_rank").innerText = `Hạng = ${res.rank}`;
    } catch (err) {
      document.getElementById("result_rank").innerText = "Lỗi: " + err.message;
      App.showToast(err.message);
    }
  };

  App.linearIndependenceUI = async function () {
    const container = document.getElementById("indepChecklist");
    if (App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) {
      App.showToast("Hãy tick chọn ít nhất 1 vector!");
      return;
    }

    try {
      const res = await App.callAPI("linear_independence", {
        vectors: vectors,
      });
      const n = vectors.length;
      const r = res.rank;
      let statusText = r === n ? "Độc lập tuyến tính" : "Phụ thuộc tuyến tính";
      document.getElementById("result_indep").innerText = statusText;
    } catch (err) {
      document.getElementById("result_indep").innerText = "Lỗi: " + err.message;
      App.showToast(err.message);
    }
  };

  App.coordinatesUI = async function () {
    if (App.handleEmptyListAction()) return;
    const v = App.selectIdToVector(document.getElementById("vCoordSelect"));
    const basis = App.getCheckedVectors(
      document.getElementById("basisCoordChecklist"),
    );

    if (!v) {
      App.showToast("Chưa chọn vector cần tìm tọa độ!");
      return;
    }
    if (!basis.length) {
      App.showToast("Chọn hệ cơ sở (tick ít nhất 1 vector)!");
      return;
    }

    try {
      const res = await App.callAPI("coordinates", { vector: v, basis: basis });

      // [FIX QUAN TRỌNG]: Ưu tiên lấy chuỗi đẹp từ Backend (pretty_coordinates)
      // Nếu backend chưa gửi pretty thì mới dùng bản thô (coordinates)
      const displayCoords = res.pretty_coordinates || res.coordinates;

      if (!displayCoords) throw new Error("Không tìm thấy tọa độ.");

      // Vì displayCoords đã là chuỗi đẹp ("4/3", "1") nên chỉ cần join lại
      const text = `[${displayCoords.join(", ")}]`;

      document.getElementById("result_coord").innerText =
        `${App.formatVectorShort ? App.formatVectorShort(v) : v} = ${text} (theo cơ sở)`;
    } catch (err) {
      document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
      App.showToast(err.message);
    }
  };

  // --- INIT ---
  // --- INIT ---
  window.addEventListener("load", () => {
    // [FIX LỆCH PHA] 1. Đồng bộ trạng thái App.theme từ LocalStorage ngay lập tức
    const savedTheme = localStorage.getItem("vec_theme");
    if (savedTheme === "dark") {
      App.theme = "dark";
    } else {
      App.theme = "light";
    }

    // 2. Đồng bộ giao diện (Icon & Màu sắc) theo App.theme vừa lấy
    App.applyTheme();

    // Các nút cơ bản cũ
    if (document.getElementById("btnAddVector"))
      document.getElementById("btnAddVector").onclick = App.onAddVector;
    if (document.getElementById("btnIndep"))
      document.getElementById("btnIndep").onclick = App.linearIndependenceUI;
    if (document.getElementById("btnRank"))
      document.getElementById("btnRank").onclick = App.rankVectorsUI;
    //if (document.getElementById("btnCoord")) document.getElementById("btnCoord").onclick = App.coordinatesUI;

    // --- XỬ LÝ MENU CÀI ĐẶT (BÁNH RĂNG) ---
    const btnSettings = document.getElementById("btnSettings");
    const dropdown = document.getElementById("settingsDropdown");

    // 1. Bật/Tắt Menu
    if (btnSettings && dropdown) {
      btnSettings.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      });
      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== btnSettings) {
          dropdown.classList.remove("show");
        }
      });
    }

    // 2. Toggle Animation
    const animToggle = document.getElementById("animToggle");
    if (animToggle) {
      animToggle.checked = App.useAnimation;
      animToggle.addEventListener("change", () => {
        App.useAnimation = animToggle.checked;
      });
    }

    // 3. Toggle Theme (Đã fix đồng bộ)
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      // [QUAN TRỌNG] Set trạng thái nút gạt theo App.theme đã đồng bộ ở trên
      themeToggle.checked = App.theme === "dark";

      // Xử lý sự kiện khi bấm
      themeToggle.addEventListener("change", () => {
        App.toggleTheme();
      });
    }

    const opSel = document.getElementById("opSelect");
    if (opSel) {
      opSel.onchange = function () {
        const v1 = document.getElementById("v1Select");
        const v2 = document.getElementById("v2Select");
        if (v1) v1.value = "";
        if (v2) v2.value = "";
        if (typeof App.clearAngleOverlay === "function")
          App.clearAngleOverlay();
        if (typeof App.updateVisibilityByCalc === "function")
          App.updateVisibilityByCalc();

        if (App.vectorList) {
          App.vectorList.forEach((v) => (v.visible = false));
        }

        if (typeof App.renderVectorList === "function") App.renderVectorList();
        if (typeof App.redrawAll === "function")
          App.redrawAll({ frame: false });
        if (typeof App.refreshCalcUI === "function") App.refreshCalcUI();
      };
    }
  });
  // =========================================================
  // PHẦN 3: LOGIC TƯƠNG TÁC HÌNH HỘP & GIZMO (ĐÃ FIX)
  // =========================================================

  let interactMode = false;
  let transformControl = null;
  let parallelepipedMesh = null;
  let interactVectors = []; // Lưu danh sách các object vector đang tham gia

  // 1. Khởi tạo hệ thống tương tác
  function initInteraction() {
    if (!window.App || !window.Vec3D || !Vec3D._scene) return;

    // Tạo Gizmo điều khiển
    transformControl = new THREE.TransformControls(
      Vec3D._camera,
      Vec3D._renderer.domElement,
    );

    // Khi đang kéo -> Tắt xoay camera
    transformControl.addEventListener("dragging-changed", function (event) {
      if (Vec3D._controls) Vec3D._controls.enabled = !event.value;
    });

    // Khi kéo xong -> Cập nhật lại hình hộp & Số liệu
    transformControl.addEventListener("change", function () {
      if (interactMode) {
        syncVectorData(); // Cập nhật số liệu trong object
        updateParallelepipedMesh(); // Vẽ lại hộp

        // [QUAN TRỌNG] Cập nhật lại giao diện & render lại
        if (App.renderVectorList) App.renderVectorList();
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions(); // Để số trên checklist nhảy theo
        // Lưu ý: Không gọi redrawAll() ở đây vì sẽ làm mất Gizmo, ta chỉ cập nhật mũi tên thôi
      }
    });

    Vec3D._scene.add(transformControl);

    // Gắn sự kiện nút
    const btnInt = document.getElementById("btnInteract");
    if (btnInt) btnInt.addEventListener("click", toggleInteraction);
  }

  // 2. Bật/Tắt chế độ tương tác
  function toggleInteraction() {
    // Lấy danh sách ID đang được tick trong phần "Độc lập tuyến tính" (hoặc checklist nào ông muốn)
    // Giả sử dùng 'indepChecklist' làm chuẩn để chọn 3 vector tạo hộp
    const container = document.getElementById("indepChecklist");
    if (!container) return;

    const checkedBoxes = container.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    const selectedIds = Array.from(checkedBoxes).map((cb) => Number(cb.value));

    if (!interactMode) {
      // --- BẮT ĐẦU ---
      if (selectedIds.length !== 3) {
        App.showToast(
          "⚠️ Vui lòng tick chọn ĐÚNG 3 vector trong danh sách 'Kiểm tra ĐLTT' để tạo hộp!",
          "error",
        );
        return;
      }

      interactMode = true;
      const btn = document.getElementById("btnInteract");
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Dừng';
        btn.classList.add("active");
      }

      // Lấy object vector từ ID
      interactVectors = selectedIds
        .map((id) => App.vectorList.find((v) => v.id === id))
        .filter((x) => x);

      // Vẽ hộp
      updateParallelepipedMesh();

      // Gắn Gizmo vào vector thứ 3 (vecto cuối cùng)
      attachGizmoToVector(interactVectors[2]);
    } else {
      // --- DỪNG ---
      interactMode = false;
      const btn = document.getElementById("btnInteract");
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-cube"></i> Tương tác Hộp';
        btn.classList.remove("active");
      }

      if (parallelepipedMesh) {
        Vec3D._scene.remove(parallelepipedMesh);
        parallelepipedMesh = null;
      }
      transformControl.detach();
      if (App.redrawAll) App.redrawAll({ frame: false }); // Vẽ lại sạch sẽ
    }
  }

  // 3. Vẽ hình hộp
  function updateParallelepipedMesh() {
    if (parallelepipedMesh) Vec3D._scene.remove(parallelepipedMesh);
    if (!interactMode || interactVectors.length < 3) return;

    // Chuyển mảng [x,y,z] thành THREE.Vector3
    // [FIX] Dùng v.vec thay vì v.components
    const v1 = new THREE.Vector3(...toVec3(interactVectors[0].vec));
    const v2 = new THREE.Vector3(...toVec3(interactVectors[1].vec));
    const v3 = new THREE.Vector3(...toVec3(interactVectors[2].vec));

    // Scale theo tỷ lệ khung nhìn (nếu có logic scale) - ở đây lấy thô
    const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
    v1.multiplyScalar(u);
    v2.multiplyScalar(u);
    v3.multiplyScalar(u);

    const O = new THREE.Vector3(0, 0, 0);
    const A = v1.clone(),
      B = v2.clone(),
      C = v3.clone();
    const D = v1.clone().add(v2);
    const E = v1.clone().add(v3);
    const F = v2.clone().add(v3);
    const G = v1.clone().add(v2).add(v3);

    // Thứ tự đỉnh để tạo các mặt tam giác (Counter-clockwise)
    const vertices = [
      O,
      B,
      D,
      O,
      D,
      A, // Đáy dưới (O-B-D-A)
      C,
      E,
      G,
      C,
      G,
      F, // Đáy trên (C-E-G-F)
      O,
      A,
      E,
      O,
      E,
      C, // Mặt bên trái
      B,
      F,
      G,
      B,
      G,
      D, // Mặt bên phải
      O,
      C,
      F,
      O,
      F,
      B, // Mặt sau
      A,
      D,
      G,
      A,
      G,
      E, // Mặt trước
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x90ee90,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 50,
      depthWrite: false,
    });

    parallelepipedMesh = new THREE.Mesh(geometry, material);

    // Wireframe viền đen cho đẹp
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x27ae60 }),
    );
    parallelepipedMesh.add(line);

    Vec3D._scene.add(parallelepipedMesh);
  }

  // 4. Đồng bộ dữ liệu: Gizmo -> Vector Object
  function syncVectorData() {
    const targetMesh = transformControl.object;
    if (!targetMesh) return;

    // Tìm xem Gizmo đang gắn vào vector nào
    // [FIX] So sánh qua thuộc tính tạm gizmoBall
    const targetVec = interactVectors.find((v) => v.gizmoBall === targetMesh);

    if (targetVec) {
      // Tọa độ thế giới thực của Gizmo
      const newPos = targetMesh.position;

      // Chuyển về tọa độ toán học (chia cho tỉ lệ vẽ)
      const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
      const x = parseFloat((newPos.x / u).toFixed(2));
      const y = parseFloat((newPos.y / u).toFixed(2));
      const z = parseFloat((newPos.z / u).toFixed(2));

      // Cập nhật dữ liệu gốc
      targetVec.vec = [x, y, z];

      // Cập nhật hình ảnh 3D (Gọi trực tiếp hàm của Vec3D để nhanh)
      if (window.Vec3D) {
        // Xóa arrow cũ vẽ lại arrow mới (hoặc update nếu Vec3D hỗ trợ update)
        // Cách đơn giản nhất: Vẽ lại toàn bộ mũi tên
        Vec3D.draw3DAllVectors({ frame: false });
        // Lưu ý: redrawAll sẽ xóa scene, làm mất GizmoBall -> Cần cẩn thận.
        // Tốt nhất chỉ update Mesh nếu có thể. Nhưng để đơn giản, ta chấp nhận redraw
        // nhưng phải add lại gizmoBall.

        // => CÁCH TỐT HƠN: Cập nhật object tham chiếu trong Scene (nếu ông lưu arrowMesh vào object vector)
        // Ở đây ta dùng cách đơn giản: Cập nhật text hiển thị thôi, hình vẽ chờ thả chuột mới update full.
      }
    }
  }

  // 5. Gắn Gizmo
  function attachGizmoToVector(vec) {
    if (!window.Vec3D) return;

    // Tạo 1 cục dummy tại đầu vector để gizmo bám vào
    if (vec.gizmoBall) Vec3D._scene.remove(vec.gizmoBall);

    const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
    const pos = new THREE.Vector3(
      vec.vec[0] * u,
      vec.vec[1] * u,
      (vec.vec[2] || 0) * u,
    );

    const geo = new THREE.BoxGeometry(u * 0.5, u * 0.5, u * 0.5);
    const mat = new THREE.MeshBasicMaterial({ visible: false }); // Ẩn đi
    vec.gizmoBall = new THREE.Mesh(geo, mat);
    vec.gizmoBall.position.copy(pos);

    Vec3D._scene.add(vec.gizmoBall);
    transformControl.attach(vec.gizmoBall);
  }

  // Tự động init
  window.addEventListener("load", () => {
    setTimeout(initInteraction, 1500);
  });

  // --- HÀM QUẢN LÝ ẨN/HIỆN & DỌN RÁC (ĐÃ GỘP CHUẨN) ---
  App.updateVisibilityByCalc = function () {
    const v1Sel = document.getElementById("v1Select");
    const v2Sel = document.getElementById("v2Select");

    const id1 = v1Sel ? Number(v1Sel.value) : 0;
    const id2 = v2Sel ? Number(v2Sel.value) : 0;

    App.currentProjVisual = null;
    // 1. DỌN SẠCH RÁC HÌNH CHIẾU
    App.tempGhosts = []; // Xóa vết 2D
    if (App._currentProjLine3D && App._currentProjLine3D.parent) {
      App._currentProjLine3D.parent.remove(App._currentProjLine3D); // Xóa vết 3D
      App._currentProjLine3D = null;
    }
    // [BỔ SUNG CHÍ MẠNG] TIÊU DIỆT TOÀN BỘ LABEL LƠ LỬNG
    if (App._activeAnimLabels && App._activeAnimLabels.length > 0) {
        App._activeAnimLabels.forEach(lbl => { if(lbl && lbl.parentNode) lbl.remove(); });
        App._activeAnimLabels = [];
    }

    // 2. ẨN/HIỆN VECTOR
    const hasSelection = id1 > 0 || id2 > 0;
    App.vectorList.forEach((v) => {
      if (!hasSelection) {
        v.visible = true;
      } else {
        v.visible = v.id === id1 || v.id === id2;
      }
    });

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    if (typeof App.redrawAll === "function") App.redrawAll({ frame: false });
  };

  // =========================================================
  // HÀM DUY TRÌ HIỆN TRƯỜNG TĨNH CHO 2D (ĐÃ THÊM GIÁ & MÀU THẬT)
  // =========================================================
  App.refreshProjectionOverlay = function () {
    if (App.mode === "2D") {
      if (App.tempGhosts)
        App.tempGhosts = App.tempGhosts.filter(
          (g) => !g.isRightAngleOverlay && !g.isActionLineOverlay,
        );
      if (!App.currentProjVisual) return;
      const v1 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v1Id,
      );
      const res = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.resId,
      );
      const v2 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v2Id,
      );

      if (v1 && res) {
        if (!App.tempGhosts) App.tempGhosts = [];

        const isDark = document.body.classList.contains("dark");
        const actionColor = isDark ? "#888888" : "#aaaaaa";

        // 1. Vẽ Giá vector (Action Line - Màu xám nhạt)
        const endPx = res.vec[0],
          endPy = res.vec[1];
        let actionTarget = [endPx * 1.15, endPy * 1.15];
        if (actionTarget[0] === 0 && actionTarget[1] === 0 && v2)
          actionTarget = [v2.vec[0] * 1.15, v2.vec[1] * 1.15];

        App.tempGhosts.push({
          isActionLineOverlay: true,
          vec: actionTarget,
          offset: [0, 0],
          colorCss: actionColor,
          alpha: 0.5,
          isGhost: true,
          isDashed: false,
          noArrow: true,
          isRightAngle: false,
        });

        // 2. Vẽ Đường gióng nét đứt (MÀU THẬT CỦA VECTOR V1)
        App.tempGhosts.push({
          isRightAngleOverlay: true,
          vec: [res.vec[0] - v1.vec[0], res.vec[1] - v1.vec[1]],
          offset: [...v1.vec],
          colorCss: v1.colorCss, // LẤY MÀU THẬT CỦA V1
          alpha: 0.6,
          isGhost: true,
          isDashed: true,
          noArrow: true,
          isRightAngle: true,
        });
      }
    }
  };

  // [TRÁI TIM TOÁN HỌC 3D V2]: Khóa dính tọa độ, Chống xóa Theme, Texture nét đứt
  if (!App._projSyncLoopRunning) {
    App._projSyncLoopRunning = true;

    App._initProjMeshes3D = function (hue = 200) {
      if (App._projGroup3D)
        App._projGroup3D.clear(); // Xóa sạch rác cũ
      else App._projGroup3D = new THREE.Group();

      const color = new THREE.Color(`hsl(${hue}, 85%, 60%)`);

      // ==========================================================
      // [FIX LỖI CỤC TRẮNG]: Đã phẫu thuật cắt bỏ "Mặt cầu Hologram" rác ở đây!
      // CHỈ GIỮ LẠI CÁC THÀNH PHẦN GIÓNG (Ống nét đứt và Góc vuông)
      // ==========================================================
      const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
      geo.rotateX(Math.PI / 2);

      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 16, 64);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapT = THREE.RepeatWrapping;

      App._projMeshes = {
        tube: new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ color: color, alphaMap: tex, transparent: true })
        ),
        edge1: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color })),
        edge2: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color })),
        sqGroup: new THREE.Group() // Tui tạo nhóm riêng để góc vuông 3D hiển thị chuẩn
      };

      App._projMeshes.sqGroup.add(App._projMeshes.edge1);
      App._projMeshes.sqGroup.add(App._projMeshes.edge2);

      App._projGroup3D.add(App._projMeshes.tube);
      App._projGroup3D.add(App._projMeshes.sqGroup);

      if (window.Vec3D && Vec3D._mathGroup) {
        Vec3D._mathGroup.add(App._projGroup3D);
      }
    };

    const sync3D = () => {
      requestAnimationFrame(sync3D);

      if (
        App.mode !== "3D" ||
        !App.currentProjVisual ||
        !window.Vec3D ||
        !Vec3D._mathGroup
      ) {
        if (App._projGroup3D) App._projGroup3D.visible = false;
        return;
      }

      if (!App._projGroup3D) App._initProjMeshes3D();

      // [FIX LỖI MẤT KHI ĐỔI THEME]: Tự động Hồi sinh nếu bị hàm refreshTheme xóa mất
      if (!App._projGroup3D.parent) {
        Vec3D._mathGroup.add(App._projGroup3D);
      }

      const v1 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v1Id,
      );
      const res = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.resId,
      );
      const v2 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v2Id,
      );

      if (!v1 || !res || !v1.visible || !res.visible) {
        App._projGroup3D.visible = false;
        return;
      }

      App._projGroup3D.visible = true;

      // [FIX DARK THEME 3D]: Tự động đổi màu tương phản
      const isDark = document.body.classList.contains("dark");
      const projColor = isDark ? 0xdddddd : 0x555555;
      App._projMeshes.tube.material.color.setHex(projColor);
      App._projMeshes.edge1.material.color.setHex(projColor);
      App._projMeshes.edge2.material.color.setHex(projColor);

      const u = Vec3D.S3D.unitsPerWorld || 1;

      const getTip = (id, vec) => {
        const g = Vec3D.threeVecMap ? Vec3D.threeVecMap.get(id) : null;
        if (g && g.userData && g.userData.tipLocal)
          return g.userData.tipLocal.clone();
        return new THREE.Vector3(vec[0] * u, vec[1] * u, (vec[2] || 0) * u);
      };

      const startP = getTip(v1.id, v1.vec);
      const endP = getTip(res.id, res.vec);
      const dist = startP.distanceTo(endP);

      // Độ dày tinh tế
      const camDist = Vec3D._camera
        ? Vec3D._camera.position.distanceTo(startP)
        : 10;
      const thick = Math.max(0.002 * camDist, 0.015 * u);

      // 1. Ép ống trụ đường gióng
      const tube = App._projMeshes.tube;
      tube.position.copy(startP).lerp(endP, 0.5);
      if (dist > 0.001) tube.lookAt(endP);
      tube.scale.set(thick, thick, dist);

      // Cập nhật số lần lặp nét đứt theo độ dài thực tế để nét đứt luôn đều nhau
      tube.material.alphaMap.repeat.set(1, dist / (0.15 * u));

      // 2. Ép Góc vuông (Sửa lỗi to bất chấp bối cảnh)
      const dir1 = new THREE.Vector3().subVectors(startP, endP).normalize();
      let dir2 = endP.clone().multiplyScalar(-1).normalize();
      if (dir2.lengthSq() < 0.001 && v2)
        dir2 = new THREE.Vector3(
          v2.vec[0] * u,
          v2.vec[1] * u,
          (v2.vec[2] || 0) * u,
        ).normalize();

      if (dir1.lengthSq() > 0.1 && dir2.lengthSq() > 0.1) {
        App._projMeshes.sqGroup.visible = true;

        // [FIX GÓC VUÔNG TO]: Chốt cứng kích thước bằng 0.15 lần lưới (như 2D)
        const sqSize = 0.15 * u;

        const pA = endP.clone().add(dir1.clone().multiplyScalar(sqSize));
        const pB = endP.clone().add(dir2.clone().multiplyScalar(sqSize));
        const corner = endP
          .clone()
          .add(dir1.clone().multiplyScalar(sqSize))
          .add(dir2.clone().multiplyScalar(sqSize));

        const e1 = App._projMeshes.edge1;
        e1.position.copy(pA).lerp(corner, 0.5);
        e1.lookAt(corner);
        e1.scale.set(thick * 0.6, thick * 0.6, pA.distanceTo(corner));

        const e2 = App._projMeshes.edge2;
        e2.position.copy(pB).lerp(corner, 0.5);
        e2.lookAt(corner);
        e2.scale.set(thick * 0.6, thick * 0.6, pB.distanceTo(corner));
      } else {
        App._projMeshes.sqGroup.visible = false;
      }
    };
    sync3D();
  }
})();
