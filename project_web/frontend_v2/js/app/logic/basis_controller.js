// ===================== basis_controller.js (FULL - USER VERSION PRESERVED) =====================
(function () {
  window.App = window.App || {};

  function $(id) { return document.getElementById(id); }

  // [LOGIC] Lấy ID theo thứ tự DOM (thứ tự người dùng nhìn thấy trên màn hình)
  // Khi người dùng kéo thả, DOM thay đổi, hàm này sẽ lấy đúng thứ tự mới.
  function getCheckedIds(container) {
    if (!container) return [];
    // querySelectorAll trả về NodeList theo thứ tự từ trên xuống dưới trong HTML
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    return checkboxes.map(cb => {
      const raw = (cb.value !== undefined && cb.value !== "") ? cb.value : cb.getAttribute("data-id");
      const id = Number(raw);
      return Number.isFinite(id) ? id : null;
    }).filter(id => id !== null);
  }

  // =========================
  // A) SNAPSHOT / RESTORE
  // =========================
  function snapshotVectorList(list) {
    return (list || []).map(v => ({
      id: v.id,
      visible: (v.visible !== false),
      focus: !!v.focus,
      alpha: (typeof v.alpha === "number") ? v.alpha : 1,
      colorCss: v.colorCss,
      colorHex: v.colorHex,
      haloCss: v.haloCss,
      highlighted: !!v.highlighted
    }));
  }

  function restoreSnapshot(list, snap) {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._basisTemp) list.splice(i, 1);
    }
    const byId = new Map((snap || []).map(s => [s.id, s]));
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
      try { App.stopBasisAnimation(); } catch (_) { }
    }
    App._basisAnimActive = false;
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      delete it._basisIsBasis;
    });
    if (App._basisBaselineSnapshot) {
      restoreSnapshot(App.vectorList, App._basisBaselineSnapshot);
    }
    if (App._basisTempByKey && typeof App._basisTempByKey.clear === "function") {
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
      if (typeof App.clearAutoVectors === "function") App.clearAutoVectors("basis");
    });

    wrap.appendChild(row1);
    wrap.appendChild(range);
    wrap.appendChild(help);
    wrap.appendChild(btn);

    host.insertBefore(wrap, out);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.ensureBasisAnimControls());
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
      if(typeof App.showToast === 'function') App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
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
      try { App.stopBasisAnimation(); } catch (_) { }
    }

    // Lấy dữ liệu vector thô để gửi đi
    const vecs = selectedItems.map((it) => (it.vec || []).slice());

    try {
      // [FIX] Thêm tham số pivot_strategy='basic' để báo cho backend biết:
      // "Đừng có tự ý đổi chỗ vector của tao!"
      const data = await App.callAPI("basis", { 
          vectors: vecs,
          pivot_strategy: "basic" 
      });

      // Gọi hàm sinh lời giải (Code cũ của bạn)
      const packMat = (App.SolutionGen && App.SolutionGen.buildBasisByMatrix) 
        ? App.SolutionGen.buildBasisByMatrix(selectedItems, data) : null;
      
      const packEqGeneral = (App.SolutionGen && App.SolutionGen.buildBasisByEquationsGeneral) 
        ? App.SolutionGen.buildBasisByEquationsGeneral(selectedItems, data) : null;
      
      const packEqStep = (App.SolutionGen && App.SolutionGen.buildBasisByEquationsStepwise) 
        ? App.SolutionGen.buildBasisByEquationsStepwise(selectedItems, data) : null;

      const basis = Array.isArray(packMat?.basisVectors) 
        ? packMat.basisVectors : (Array.isArray(data?.basis) ? data.basis : []);
      
      const dim = (typeof packMat?.dimension === "number") 
        ? packMat.dimension : ((typeof data?.dimension === "number") ? data.dimension : null);

      const basisStr = basis.length
        ? basis.map((v) => (typeof App.formatVectorShort === "function") ? App.formatVectorShort(v) : JSON.stringify(v)).join("\n")
        : "(rỗng)";

      const explanationText =
        `Số chiều dim(V) = ${dim ?? "?"}\n` +
        "Cơ sở gồm:\n" + basisStr + "\n\n" +
        '👉 Bấm "Lời giải" để xem chi tiết.';

      let dependentIds = [];
      if (Array.isArray(data?.dependents) && data.dependents.length) {
        // data.dependents trả về index trong mảng gửi đi -> map lại ID gốc
        dependentIds = data.dependents
          .map((idx) => selectedItems[idx])
          .filter(Boolean)
          .map((it) => it.id);
      }

      if (typeof App.playBasisSolution === "function") {
        await App.playBasisSolution(explanationText);
      } else if (out) {
        out.innerText = explanationText;
      }

      // Truyền dữ liệu HTML sang Panel
      if (typeof App.setBasisSolutionForPanel === "function") {
        App.setBasisSolutionForPanel({
          titleText: packMat?.titleText || "Cơ sở & số chiều",
          titleMath: packMat?.titleMath || "\\( \\mathbb{R}^n \\)",
          // Gói dữ liệu cấu trúc mới
          allSolutions: {
              mat: packMat?.htmlContent || "",
              general: packEqGeneral?.htmlContent || "",
              step: packEqStep?.htmlContent || ""
          }
        });
        
        const btnSol = $("btnOpenSolution");
        if(btnSol) btnSol.style.display = "inline-block";
      }

      if (typeof App.addAutoVector === "function" && Array.isArray(basis) && basis.length) {
        basis.forEach((v) => App.addAutoVector(v, "basis"));
      }

      App._basisModeActive = true;

      if (typeof App.startBasisAnimation === "function") {
        App.startBasisAnimation({
          selectedIds: checkedIds,
          dependentIds: dependentIds,
          basisVectors: basis,
          phaseMs: App.basisAnimPhaseMs
        });
      }

    } catch (err) {
      if (out) out.innerText = "Lỗi: " + err.message;
      if(typeof App.showToast === 'function') App.showToast(err.message);
    }
  };

  // --- INIT ---
  document.addEventListener("DOMContentLoaded", () => {
      const btn = $("btnBasis") || $("btnCalcBasis");
      if(btn) {
          const newBtn = btn.cloneNode(true);
          if(btn.parentNode) btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener("click", App.basisAndDimUI);
      }
  });

})();