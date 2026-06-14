// ===================== basis_animation.js (FIX: GREEDY SUBSET) =====================
(function () {
  window.App = window.App || {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function redraw() {
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  // --------- Helpers ---------
  function setColor(item, css) {
    if (!item) return;
    item.colorCss = css;
    item.colorHex = css;
    item.haloCss = css;
  }

  function ensureAlpha(item) {
    if (!item) return;
    if (typeof item.alpha !== "number") item.alpha = 1;
  }

  // --- [MỚI] THUẬT TOÁN GAUSS ĐỂ TÌM CƠ SỞ TỪ HỆ SINH ---
  // Hàm này trả về danh sách ID của các vector độc lập tuyến tính (giữ nguyên thứ tự)
  function getGreedyBasisIds(items) {
    const basisIds = new Set();
    const basisRows = []; // Lưu các vector đã được rút gọn (Row Echelon)
    const EPSILON = 1e-9;

    for (const item of items) {
      if (!item.vec || item.vec.length === 0) continue;

      // Copy vector để tính toán (không làm hỏng vector gốc)
      let v = [...item.vec];

      // Thử khử vector v bằng các vector cơ sở đã tìm thấy trước đó
      for (const basisRow of basisRows) {
        // Tìm phần tử khác 0 đầu tiên (pivot) của basisRow
        let pivotIdx = basisRow.findIndex((val) => Math.abs(val) > EPSILON);
        if (pivotIdx === -1) continue; // Không nên xảy ra

        const factor = v[pivotIdx] / basisRow[pivotIdx];

        // Nếu v có thành phần tại pivot, khử nó đi
        if (Math.abs(factor) > EPSILON) {
          for (let k = 0; k < v.length; k++) {
            v[k] -= factor * basisRow[k];
          }
        }
      }

      // Kiểm tra xem sau khi khử, v có biến thành vector 0 không?
      const isZero = v.every((val) => Math.abs(val) < EPSILON);

      if (!isZero) {
        // Nếu KHÔNG phải vector 0 -> Nó độc lập -> Thêm vào cơ sở
        basisIds.add(item.id);
        basisRows.push(v); // Lưu bản rút gọn để khử thằng sau
      }
    }
    return basisIds;
  }

  // --- HÀM ANIMATION ---
  function pulse(filterFn, from, to, ms) {
    ms = Math.max(60, Number(ms) || 600);
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (t) => {
        if (App._basisAnimTokenCanceled) return resolve();

        const p = Math.min(1, (t - start) / ms);
        const a = from + (to - from) * p;

        (App.vectorList || []).forEach((it) => {
          if (!it) return;
          if (filterFn(it)) {
            ensureAlpha(it);
            it.alpha = a;
          }
        });

        redraw();
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  // Public: Stop
  App.stopBasisAnimation = function () {
    App._basisAnimTokenCanceled = true;
  };

  // Public: Start
  App.startBasisAnimation = async function (opts) {
    App._basisAnimActive = true;

    // Reset token
    App._basisAnimTokenCanceled = true;
    await sleep(0);
    App._basisAnimTokenCanceled = false;

    const phaseMs = Math.max(120, Number(opts?.phaseMs) || 900);

    // 1. Xác định danh sách đầu vào
    const selectedIds = new Set(
      Array.isArray(opts?.selectedIds) ? opts.selectedIds.map(Number) : [],
    );

    // Lấy các object vector thật từ list (theo đúng thứ tự hiển thị)
    const candidateItems = (App.vectorList || []).filter((it) =>
      selectedIds.has(it.id),
    );

    // 2. [QUAN TRỌNG] Tự tính toán lại cơ sở (Subset) ngay tại đây
    // Bỏ qua opts.basisVectors vì nó có thể là cơ sở chuẩn (sai ý đồ)
    const correctBasisIds = getGreedyBasisIds(candidateItems);

    const RED = "#ef4444";
    const GREEN = "#22c55e";

    // ==========================================================
    // PHASE 1: KHỞI TẠO (Tô đỏ hết để "dọa")
    // ==========================================================
    (App.vectorList || []).forEach((it) => {
      if (!it) return;

      if (selectedIds.has(it.id)) {
        ensureAlpha(it);
        it.alpha = 1;
        setColor(it, RED); // Mặc định là đỏ (Phụ thuộc)
      } else {
        it.alpha = 0.2; // Mấy thằng không chọn thì làm mờ
        it.colorCss = "#ccc";
      }
    });

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    redraw();

    // Nhấp nháy đỏ suy nghĩ
    await pulse((it) => selectedIds.has(it.id), 1, 0.6, phaseMs * 0.6);
    if (App._basisAnimTokenCanceled) return;
    await pulse((it) => selectedIds.has(it.id), 0.6, 1, phaseMs * 0.6);
    if (App._basisAnimTokenCanceled) return;

    // ==========================================================
    // PHASE 2: HIỆN NGUYÊN HÌNH (Xanh cho Cơ sở, Đỏ cho Phụ thuộc)
    // ==========================================================
    (App.vectorList || []).forEach((it) => {
      if (!it) return;

      if (correctBasisIds.has(it.id)) {
        // ==> ĐÂY LÀ CƠ SỞ (Độc lập)
        setColor(it, GREEN);
        it._basisIsBasis = true; // Vẽ đè lên trên
        it.alpha = 1;
      } else if (selectedIds.has(it.id)) {
        // ==> ĐÂY LÀ PHỤ THUỘC (Dư thừa)
        setColor(it, RED); // Vẫn đỏ
        delete it._basisIsBasis;
        it.alpha = 0.3; // Làm mờ đi cho người ta biết là bị loại
      }
    });

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    redraw();

    // Nhấp nháy tôn vinh vector cơ sở
    const basisFilter = (it) => !!it && it._basisIsBasis;
    await pulse(basisFilter, 1, 1.3, phaseMs * 0.5);
    if (App._basisAnimTokenCanceled) return;
    await pulse(basisFilter, 1.3, 1, phaseMs * 0.5);

    redraw();
  };
})();
