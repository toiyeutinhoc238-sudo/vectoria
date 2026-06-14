// ===================== basis_controller.js (FULL - USER VERSION PRESERVED) =====================
(function () {
  window.App = window.App || {};
  let cachedConfig = null;

  function $(id) {
    return document.getElementById(id);
  }

  // [LOGIC] Lấy ID theo thứ tự DOM (thứ tự người dùng nhìn thấy trên màn hình)
  // Khi người dùng kéo thả, DOM thay đổi, hàm này sẽ lấy đúng thứ tự mới.
  function getCheckedIds(container) {
    if (!container) return [];
    // querySelectorAll trả về NodeList theo thứ tự từ trên xuống dưới trong HTML
    const checkboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]:checked'),
    );
    return checkboxes
      .map((cb) => {
        const raw =
          cb.value !== undefined && cb.value !== ""
            ? cb.value
            : cb.getAttribute("data-id");
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
      })
      .filter((id) => id !== null);
  }

  // =========================
  // A) SNAPSHOT / RESTORE
  // =========================
  function snapshotVectorList(list) {
    return (list || []).map((v) => ({
      id: v.id,
      visible: v.visible !== false,
      focus: !!v.focus,
      alpha: typeof v.alpha === "number" ? v.alpha : 1,
      colorCss: v.colorCss,
      colorHex: v.colorHex,
      haloCss: v.haloCss,
      highlighted: !!v.highlighted,
    }));
  }

  function restoreSnapshot(list, snap) {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._basisTemp) list.splice(i, 1);
    }
    const byId = new Map((snap || []).map((s) => [s.id, s]));
    for (const it of list) {
      const s = byId.get(it.id);
      if (!s) continue;
      it.visible = s.visible;
      it.focus = s.focus;
      it.alpha = s.alpha;
      it.colorCss = s.colorCss;
      it.colorHex = s.colorHex;
      it.haloCss = s.haloCss;
      it.highlighted = s.highlighted;
    }
    if (typeof App.renderVectorList === "function") App.renderVectorList();
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  App._basisBaselineSnapshot = null;
  App._basisModeActive = false;

  App.restoreBasisPreState = function () {
    if (typeof App.stopBasisAnimation === "function") {
      try {
        App.stopBasisAnimation();
      } catch (_) {}
    }
    App._basisAnimActive = false;
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      delete it._basisIsBasis;
    });
    if (App._basisBaselineSnapshot) {
      restoreSnapshot(App.vectorList, App._basisBaselineSnapshot);
    }
    if (
      App._basisTempByKey &&
      typeof App._basisTempByKey.clear === "function"
    ) {
      App._basisTempByKey.clear();
    }
    App._basisTempByKey = null;
    App._basisModeActive = false;
    App._basisBaselineSnapshot = null;
  };

  // =========================
  // B) ANIMATION CONTROLS
  // =========================
  App.BASIS_PHASE_MS_MIN = 100;
  App.BASIS_PHASE_MS_MAX = 5000;
  App.BASIS_PHASE_MS_STEP = 50;
  App.basisAnimPhaseMs = 1000;

  App.setBasisAnimPhaseMs = function (ms) {
    let x = Math.round(Number(ms));
    if (!isFinite(x)) x = App.basisAnimPhaseMs;
    x = Math.max(App.BASIS_PHASE_MS_MIN, Math.min(App.BASIS_PHASE_MS_MAX, x));
    const step = Math.max(1, App.BASIS_PHASE_MS_STEP || 100);
    x = Math.round(x / step) * step;
    App.basisAnimPhaseMs = x;
    return x;
  };

  App.ensureBasisAnimControls = function () {
    const checklist = $("basisChecklist");
    const out = $("result_basis");
    if (!checklist || !out) return;
    if ($("basisAnimControls")) return;

    const host = out.parentElement || checklist.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "basisAnimControls";
    wrap.className = "basis-anim-controls";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "10px";
    wrap.style.margin = "10px 0 8px";
    wrap.style.padding = "12px";
    wrap.style.borderRadius = "8px";
    wrap.style.background = "var(--card)";
    wrap.style.border = "1px solid var(--border)";

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.alignItems = "baseline";
    row1.style.justifyContent = "space-between";
    row1.style.gap = "10px";

    const lbl = document.createElement("div");
    lbl.style.fontSize = "13px";
    lbl.style.fontWeight = "700";
    lbl.textContent = "Tốc độ Animation:";

    const val = document.createElement("div");
    val.id = "basisSpeedVal";
    val.style.fontSize = "13px";
    val.style.fontWeight = "800";
    val.textContent = `${App.basisAnimPhaseMs} ms`;

    row1.appendChild(lbl);
    row1.appendChild(val);

    const range = document.createElement("input");
    range.type = "range";
    range.id = "basisSpeedRange";
    range.min = String(App.BASIS_PHASE_MS_MIN);
    range.max = String(App.BASIS_PHASE_MS_MAX);
    range.step = String(App.BASIS_PHASE_MS_STEP);
    range.value = String(App.basisAnimPhaseMs);
    range.style.width = "100%";

    const help = document.createElement("div");
    help.id = "basisSpeedHelp";
    help.style.fontSize = "12px";
    help.style.opacity = "0.85";
    help.innerHTML = `<span style="color:salmon">●</span> Vector phụ thuộc &nbsp; <span style="color:lightgreen">●</span> Vector cơ sở`;

    const btn = document.createElement("button");
    btn.id = "btnStopBasisAnim";
    btn.type = "button";
    btn.textContent = "Dừng & Hủy Animation";
    btn.className = "btn";
    btn.style.padding = "6px 12px";
    btn.style.borderRadius = "6px";
    btn.style.fontSize = "0.9em";
    btn.style.cursor = "pointer";
    btn.style.width = "fit-content";
    btn.style.marginTop = "5px";

    range.addEventListener("input", () => {
      const ms = App.setBasisAnimPhaseMs(range.value);
      if (val) val.textContent = `${ms} ms`;
    });

    btn.addEventListener("click", () => {
      App.restoreBasisPreState();
      if (typeof App.clearAutoVectors === "function")
        App.clearAutoVectors("basis");
    });

    wrap.appendChild(row1);
    wrap.appendChild(range);
    wrap.appendChild(help);
    wrap.appendChild(btn);

    host.insertBefore(wrap, out);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      App.ensureBasisAnimControls(),
    );
  } else {
    App.ensureBasisAnimControls();
  }

  // =========================
  // C) MAIN LOGIC: TÍNH CƠ SỞ & SỐ CHIỀU
  // =========================
  App.basisAndDimUI = async function () {
    if (typeof App.handleEmptyListAction === "function") {
      if (App.handleEmptyListAction()) return;
    }

    App.ensureBasisAnimControls();

    const checklist = $("basisChecklist");
    if (!checklist) return;

    // 1. Lấy danh sách ID đã tick (theo đúng thứ tự trên màn hình)
    // Lưu ý: Nếu có Drag & Drop, DOM phải được cập nhật thì hàm này mới đúng.
    const checkedIds = getCheckedIds(checklist);

    // 2. Map ID sang Object Vector (Giữ nguyên thứ tự của checkedIds)
    // Code cũ của bạn đã đúng ở chỗ này, nó sẽ tạo mảng selectedItems theo thứ tự của checkedIds
    const selectedItems = checkedIds
      .map((id) => (App.vectorList || []).find((v) => v.id === id))
      .filter(Boolean);

    if (!selectedItems.length) {
      if (typeof App.showToast === "function")
        App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
      else alert("Tick ít nhất 1 vector.");
      return;
    }

    if (App._basisModeActive || App._basisBaselineSnapshot) {
      App.restoreBasisPreState();
    }
    if (typeof App.clearAutoVectors === "function") {
      App.clearAutoVectors("basis");
    }

    const out = $("result_basis");
    if (out) out.innerText = "Đang tính toán...";

    App._basisBaselineSnapshot = snapshotVectorList(App.vectorList);

    if (typeof App.stopBasisAnimation === "function") {
      try {
        App.stopBasisAnimation();
      } catch (_) {}
    }

    // Lấy dữ liệu vector thô để gửi đi
    const vecs = selectedItems.map((it) => (it.vec || []).slice());

    try {
      // [FIX] Thêm tham số pivot_strategy='basic' để báo cho backend biết:
      // "Đừng có tự ý đổi chỗ vector của tao!"
      const data = await App.callAPI("basis", {
        vectors: vecs,
        pivot_strategy: "basic",
      });

      // Gọi hàm sinh lời giải
      const gen = App.TasksGen && App.TasksGen.Basis;

      const packMat =
        gen && gen.buildBasisByMatrix
          ? gen.buildBasisByMatrix(selectedItems, data)
          : null;

      const packEqGeneral =
        gen && gen.buildBasisByEquationsGeneral
          ? gen.buildBasisByEquationsGeneral(selectedItems, data)
          : null;

      const packEqStep =
        gen && gen.buildBasisByEquationsStepwise
          ? gen.buildBasisByEquationsStepwise(selectedItems, data)
          : null;

      const basis = Array.isArray(packMat?.basisVectors)
        ? packMat.basisVectors
        : Array.isArray(data?.basis)
          ? data.basis
          : [];

      const dim =
        typeof packMat?.dimension === "number"
          ? packMat.dimension
          : typeof data?.dimension === "number"
            ? data.dimension
            : null;

      // --- [MỚI] 1. TẠO HTML HIỂN THỊ ĐẸP (MATHLIVE READ-ONLY) ---

      // Hàm chuyển vector [1, 2] thành Latex (1, 2) để hiển thị trong Mathfield
      // [FIX FINAL] Logic hiển thị: Căn -> Phân số (nghiêm ngặt) -> Thập phân
      const fmtVecForMathLive = (v) => {
        // Helper: Rút gọn căn
        const simplifySqrtStr = (n) => {
          let coef = 1;
          for (let i = Math.floor(Math.sqrt(n)); i > 1; i--) {
            if (n % (i * i) === 0) {
              coef = i;
              n /= i * i;
              break;
            }
          }
          let r = n === 1 ? "" : `\\sqrt{${n}}`;
          return coef === 1 ? r || "1" : `${coef}${r}`;
        };

        // Helper: Tìm phân số (SIẾT CHẶT)
        const getFrac = (val, maxD = 100) => {
          let h1 = 1,
            h2 = 0,
            k1 = 0,
            k2 = 1,
            b = val;
          do {
            let a = Math.floor(b);
            let aux = h1;
            h1 = a * h1 + h2;
            h2 = aux;
            aux = k1;
            k1 = a * k1 + k2;
            k2 = aux;
            b = 1 / (b - a);
          } while (Math.abs(val - h1 / k1) > 1e-9 && k1 < maxD); // Lặp đến khi sai số cực nhỏ

          // [QUAN TRỌNG] Chỉ trả về nếu sai số < 1e-9
          if (Math.abs(val - h1 / k1) < 1e-9) return { n: h1, d: k1 };
          return null;
        };

        const nums = v.map((x) => {
          // Nếu backend gửi chuỗi LaTeX (căn, phân số) -> giữ nguyên
          if (typeof x === "string" && (x.includes("\\") || x.includes("sqrt")))
            return x;

          let val = 0;
          if (typeof x === "object" && x !== null) {
            const n = Number(x.n);
            const d = Number(x.d);
            const s = x.s || 1;
            if (d !== 0 && !isNaN(n)) val = s * (n / d);
          } else {
            val = Number(x);
          }

          if (isNaN(val)) return typeof x === "string" ? x : "0";
          if (Math.abs(val) < 1e-9) return "0";

          let sign = val < 0 ? "-" : "";
          let abs = Math.abs(val);

          // 1. Số nguyên
          if (Number.isInteger(abs)) return String(val);

          // 2. Căn thức (Ưu tiên)
          let sq = abs * abs;
          if (Math.abs(sq - Math.round(sq)) < 1e-5 && Math.round(sq) < 1000) {
            return sign + simplifySqrtStr(Math.round(sq));
          }

          // 3. Phân số (NGHIÊM NGẶT)
          // ln(5) sẽ fail ở bước này vì sai số > 1e-9
          let frac = getFrac(abs, 100);
          if (frac) {
            if (frac.d === 1) return sign + frac.n;
            return `${sign}\\frac{${frac.n}}{${frac.d}}`;
          }

          // 4. Số thập phân (cho Loga, Pi...)
          return parseFloat(val.toFixed(4)).toString();
        });

        return `\\left(${nums.join(", ")}\\right)`;
      };
      // Tạo danh sách các thẻ <math-field>
      const basisMathFields = basis.length
        ? basis
            .map(
              (v) => `
            <math-field read-only style="
                display: block;
                width: 100%;
                background: var(--bg-paper, #fff); /* Ăn theo nền sáng/tối */
                border: 1px solid var(--border, #ccc);
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 8px;
                font-size: 1.3em; /* [QUAN TRỌNG] Chữ to rõ */
                color: var(--text-main, #333);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                pointer-events: none; /* Chặn click chỉnh sửa */
            ">
                ${fmtVecForMathLive(v)}
            </math-field>
          `,
            )
            .join("")
        : `<div style="font-style:italic; color:#888; padding: 5px;">(Không có vector cơ sở)</div>`;

      // HTML Khung kết quả (Hoàn toàn dùng DIV, không dùng LI/UL)
      const resultHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; padding: 5px 0 40px 0;">
            
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; width:100%;">
                
                <div style="display:flex; align-items:center; white-space:nowrap;">
                    <span style="font-weight:600; font-size:1.1em; color:var(--text-main, #333); margin-right:6px;">Số chiều:</span>
                    <span style="font-family:'Times New Roman', serif; font-style:italic; font-size:1.2em; color:var(--text-main, #333);">dim(V) = </span>
                    <span style="font-weight:bold; font-size:1.4em; color:#2196F3; margin-left:6px;">${dim ?? "?"}</span>
                </div>

                <div style="flex-grow:1;"></div>

                <div style="font-weight:600; font-size:1.1em; color:var(--text-sec, #555); white-space:nowrap;">
                    Cơ sở gồm:
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; width:100%;">
                ${basisMathFields}
            </div>

            
            <div style="margin-top:5px; font-size:1.2em; color:#888; font-style:italic; border-top:1px dashed #ccc; padding-top:8px; text-align: left; width: 100%;">
                    👉 Bấm nút <b>"Lời giải"</b> để xem chi tiết.
                </div>
        </div>
      `;

      // 2. Text thô dùng cho animation (giữ nguyên để không lỗi logic khác)
      const basisStr = basis.length
        ? basis.map((v) => `(${v.join(", ")})`).join("\n")
        : "(rỗng)";
      const explanationText = `Số chiều dim(V) = ${dim}\nCơ sở gồm:\n${basisStr}`;

      let dependentIds = [];
      if (Array.isArray(data?.dependents) && data.dependents.length) {
        dependentIds = data.dependents
          .map((idx) => selectedItems[idx])
          .filter(Boolean)
          .map((it) => it.id);
      }

      if (typeof App.playBasisSolution === "function") {
        await App.playBasisSolution(explanationText);
      }

      // [FIX] Gán HTML đẹp vào ô kết quả
      if (out) {
        out.innerHTML = resultHTML;
      }

      // [ĐÚNG] Phải gọi là .htmlContent (cho khớp với file basis_generator.js)
      cachedConfig = {
        title: "Cơ sở & số chiều",
        math: `\\( \\mathbb{R}^${selectedItems[0].vec.length} \\)`,
        tab1Label: "Cách 1: Ma trận",
        tab2Label: "Cách 2: Hệ phương trình",
        showSubTabs: true,

        // Sửa .html thành .htmlContent (hoặc fallback object gốc nếu lỡ tay)
        content1: packMat?.htmlContent || packMat?.html || "",
        content2: packEqGeneral?.htmlContent || packEqGeneral?.html || "",
        content2Sub: packEqStep?.htmlContent || packEqStep?.html || "",

        autoOpen: false,
      };

      // Truyền dữ liệu HTML sang Panel
      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(cachedConfig);

        const btnSol = $("btnOpenSolution");
        if (btnSol) btnSol.style.display = "inline-block";
      }

      if (
        typeof App.addAutoVector === "function" &&
        Array.isArray(basis) &&
        basis.length
      ) {
        basis.forEach((v) => App.addAutoVector(v, "basis"));
      }

      App._basisModeActive = true;

      if (typeof App.startBasisAnimation === "function") {
        App.startBasisAnimation({
          selectedIds: checkedIds,
          dependentIds: dependentIds,
          basisVectors: basis,
          phaseMs: App.basisAnimPhaseMs,
        });
      }
    } catch (err) {
      if (out) out.innerText = "Lỗi: " + err.message;
      if (typeof App.showToast === "function") App.showToast(err.message);
    }
  };

  // --- INIT ---
  document.addEventListener("DOMContentLoaded", () => {
    // 1. XỬ LÝ NÚT TÍNH CƠ SỞ
    const btnCalc = $("btnBasis") || $("btnCalcBasis");
    if (btnCalc) {
      const newBtn = btnCalc.cloneNode(true);
      if (btnCalc.parentNode) btnCalc.parentNode.replaceChild(newBtn, btnCalc);
      newBtn.addEventListener("click", App.basisAndDimUI);
    }

    // 2. XỬ LÝ NÚT LỜI GIẢI (Logic thông minh)
    const btnShow = $("btnOpenSolution");
    if (btnShow) {
      // [SỬA] Luôn hiện nút này ngay từ đầu (để giống bên Tọa độ)
      btnShow.style.display = "inline-block";

      const newBtnShow = btnShow.cloneNode(true);
      if (btnShow.parentNode)
        btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", () => {
        if (typeof App.openSolutionPanel !== "function") {
          console.error("Thiếu module solution_panel.js");
          return;
        }

        // Kiểm tra xem đã có kết quả trong bộ nhớ đệm chưa
        if (cachedConfig) {
          // CÓ: Nạp lại lời giải Cơ sở vào Panel và mở lên
          // (Tránh trường hợp Panel đang chứa nội dung của bài Tọa độ)
          App.openSolutionPanel({ ...cachedConfig, autoOpen: true });
        } else {
          // CHƯA: Hiện thông báo nhắc nhở
          App.openSolutionPanel({
            title: "Cơ sở & Số chiều",
            math: "",
            tab1Label: "Cách 1",
            showSubTabs: false,
            content1: `<div class="sol-empty">
                          Chưa có dữ liệu tính toán.<br>
                          Vui lòng chọn vector và bấm nút <b>"Tính cơ sở"</b> trước.
                      </div>`,
            autoOpen: true,
          });
        }
      });
    }
  });
})();
