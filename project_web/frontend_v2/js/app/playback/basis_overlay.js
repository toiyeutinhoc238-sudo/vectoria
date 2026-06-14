(function () {
  window.App = window.App || {};
  const App = window.App;

  // ========= CONFIG =========
  const RED = { css: "#ff3b30", hex: 0xff3b30 }; // đỏ
  const GREEN = { css: "#34c759", hex: 0x34c759 }; // xanh lá

  const DURATION_FADE_OUT = 260;
  const DURATION_FADE_IN_SUBSPACE = 260;
  const DURATION_FADE_IN_BASIS = 260;
  const DURATION_COLOR_SWAP = 220;

  // ========= INTERNAL STATE =========
  App.BasisOverlay = App.BasisOverlay || {};
  const BO = App.BasisOverlay;

  BO._active = false;
  BO._raf = null;
  BO._snapshot = null;
  BO._tempIds = new Set();

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function vecEqual(a, b, eps = 1e-9) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++)
      if (Math.abs((a[i] || 0) - (b[i] || 0)) > eps) return false;
    return true;
  }

  function findItemByVector(vec, eps = 1e-9) {
    return (
      (App.vectorList || []).find((it) => vecEqual(it.vec, vec, eps)) || null
    );
  }

  function deepSnapshotVectorList(list) {
    return list.map((v) => ({
      id: v.id,
      vec: Array.isArray(v.vec) ? v.vec.slice() : null,
      visible: v.visible !== false,
      focus: !!v.focus,
      alpha: typeof v.alpha === "number" ? v.alpha : 1,
      // giữ màu cũ để restore
      colorCss: v.colorCss,
      colorHex: v.colorHex,
      haloCss: v.haloCss,
      highlighted: !!v.highlighted,
      // nếu bạn có thêm field khác, add vào đây
    }));
  }

  function restoreSnapshot() {
    if (!BO._snapshot) return;

    // xóa temp vectors đã tạo
    if (BO._tempIds.size) {
      App.vectorList = (App.vectorList || []).filter(
        (it) => !BO._tempIds.has(it.id),
      );
      BO._tempIds.clear();
    }

    // restore các item cũ theo id
    const snap = BO._snapshot;
    const map = new Map(snap.vectorList.map((s) => [s.id, s]));
    for (const it of App.vectorList || []) {
      const s = map.get(it.id);
      if (!s) continue;
      it.visible = s.visible;
      it.focus = s.focus;
      it.alpha = s.alpha;
      it.colorCss = s.colorCss;
      it.colorHex = s.colorHex;
      it.haloCss = s.haloCss;
      it.highlighted = s.highlighted;
    }

    App.currentVector = snap.currentVector ? snap.currentVector.slice() : null;
    App.firstDrawForVector = false;

    // angle overlay: bạn có thể restore sâu hơn nếu muốn
    // tạm thời: clear overlay để tránh lệch
    App.clearAngleOverlay?.();

    App.redrawAll?.({ frame: false });
    if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  function cancelAnim() {
    if (BO._raf) cancelAnimationFrame(BO._raf);
    BO._raf = null;
  }

  function setAllAlpha(alpha) {
    alpha = clamp01(alpha);
    for (const it of App.vectorList || []) it.alpha = alpha;
  }

  function hideAllExcept(setIds) {
    for (const it of App.vectorList || []) {
      it.visible = setIds.has(it.id);
    }
  }

  function setColorForIds(setIds, css, hex) {
    for (const it of App.vectorList || []) {
      if (!setIds.has(it.id)) continue;
      it.colorCss = css;
      it.colorHex = hex;
      // haloCss nếu bạn muốn đổi theo màu, còn không giữ halo cũ
      // it.haloCss = css;
    }
  }

  function createTempVector(vec, css, hex) {
    // dùng attachVectorItem của bạn nếu có để đồng bộ màu/halo
    // nhưng ta cần màu "cứng" xanh lá, nên tự tạo tối giản
    const id = Date.now() + Math.floor(Math.random() * 1e6);
    const item = {
      id,
      vec: vec.slice(),
      visible: true,
      focus: false,
      alpha: 0,
      colorCss: css,
      colorHex: hex,
      haloCss: css,
      highlighted: false,
      _tempBasis: true,
    };
    App.vectorList.push(item);
    BO._tempIds.add(id);
    return item;
  }

  function redrawFast() {
    App.redrawAll?.({ frame: false });
    if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  function tween(duration, onUpdate) {
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        const t = performance.now();
        const p = clamp01((t - t0) / Math.max(1, duration));
        onUpdate(p);
        redrawFast();
        if (p >= 1) return resolve();
        BO._raf = requestAnimationFrame(step);
      };
      BO._raf = requestAnimationFrame(step);
    });
  }

  // ========= PUBLIC API =========
  // subspaceVecs: mảng vector được chọn để tạo không gian con
  // basisVecs: mảng vector cơ sở (theo UX modal, tức là basisRows từ lastMatrix)
  BO.start = async function ({ subspaceVecs, basisVecs }) {
    try {
      if (!Array.isArray(subspaceVecs) || !subspaceVecs.length) return;
      if (!Array.isArray(basisVecs) || !basisVecs.length) return;

      // nếu đang active → reset trước
      BO.stop();

      BO._active = true;

      // snapshot trước
      BO._snapshot = {
        vectorList: deepSnapshotVectorList(App.vectorList || []),
        currentVector: App.currentVector ? App.currentVector.slice() : null,
      };

      // ========== PHASE 1: fade out all ==========
      await tween(DURATION_FADE_OUT, (p) => {
        setAllAlpha(1 - p);
      });

      // ========== PHASE 2: show subspace in RED ==========
      // map subspace -> existing items (theo vector equality)
      const subIds = new Set();
      for (const v of subspaceVecs) {
        const it = findItemByVector(v);
        if (it) subIds.add(it.id);
      }

      // chỉ hiện subspace
      hideAllExcept(subIds);
      setColorForIds(subIds, RED.css, RED.hex);

      // alpha 0 trước rồi fade in
      for (const it of App.vectorList || []) {
        if (subIds.has(it.id)) it.alpha = 0;
      }
      await tween(DURATION_FADE_IN_SUBSPACE, (p) => {
        for (const it of App.vectorList || []) {
          if (subIds.has(it.id)) it.alpha = p;
        }
      });

      // ========== PHASE 3: basis ==========
      // basis có thể gồm: (a) đã có trong subspace => đổi màu đỏ->xanh
      // (b) chưa có => tạo temp vector xanh lá và fade in
      const basisInList = [];
      const basisTemp = [];

      for (const b of basisVecs) {
        const existing = findItemByVector(b);
        if (existing) {
          basisInList.push(existing);
        } else {
          const temp = createTempVector(b, GREEN.css, GREEN.hex);
          basisTemp.push(temp);
        }
      }

      // (a) đổi màu các basis đã có (đang đỏ) -> xanh
      if (basisInList.length) {
        await tween(DURATION_COLOR_SWAP, (p) => {
          // chuyển màu “nhảy” cho nhanh: tới 50% thì đổi luôn
          const sw = p >= 0.5;
          for (const it of basisInList) {
            it.colorCss = sw ? GREEN.css : RED.css;
            it.colorHex = sw ? GREEN.hex : RED.hex;
          }
        });
      }

      // (b) fade in các temp basis (xanh)
      if (basisTemp.length) {
        await tween(DURATION_FADE_IN_BASIS, (p) => {
          for (const it of basisTemp) it.alpha = p;
        });
      }

      // ensure: basis luôn xanh
      for (const it of basisInList) {
        it.colorCss = GREEN.css;
        it.colorHex = GREEN.hex;
      }

      // kết thúc: giữ trạng thái overlay (active)
      redrawFast();
    } catch (e) {
      console.error(e);
      BO.stop();
    }
  };

  BO.stop = function () {
    if (!BO._active) return;
    cancelAnim();
    restoreSnapshot();
    BO._snapshot = null;
    BO._active = false;
  };

  BO.isActive = function () {
    return !!BO._active;
  };
})();
