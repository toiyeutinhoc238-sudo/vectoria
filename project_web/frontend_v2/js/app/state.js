(function () {
  window.App = window.App || {};

  /* ============== GLOBAL STATE ============== */
  App.mode = "2D";
  App.autoMode = true;
  App.currentVector = [1, 2];
  App.firstDrawForVector = true;
  App.theme = "light";

  // Angle visualization state
  App.currentAngleVisual2D = null; // { a:[x,y], b:[x,y], deg }
  App.currentAngleVisual3D = null; // THREE.Group
  App.currentListInput = null; // focused <input> in list

  // vectorList items: { id, vec, hue, colorCss, colorHex, haloCss, haloHex, focus, visible, highlighted }
  App.vectorList = [];
  App.nextId = 1;
  App.usedHues = new Set();

  App._previewTemp = null;
})();

// ===== Basis Overlay Animator (2D/3D) =====
(function () {
  const App = (window.App = window.App || {});

  // trạng thái overlay
  App._basisOverlay = {
    active: false,
    snapshot: null,
    raf: null,
  };

  function deepCloneVectorList(list) {
    return (list || []).map((v) => ({
      id: v.id,
      name: v.name,
      vec: Array.isArray(v.vec) ? v.vec.slice() : [0, 0, 0],
      visible: v.visible !== false,
      focus: !!v.focus,

      // style fields
      colorHex: v.colorHex,
      colorCss: v.colorCss,
      haloCss: v.haloCss,
      alpha: typeof v.alpha === "number" ? v.alpha : 1,
    }));
  }

  function vecEq(a, b, eps = 1e-9) {
    if (!a || !b) return false;
    const ax = a[0] || 0,
      ay = a[1] || 0,
      az = a[2] || 0;
    const bx = b[0] || 0,
      by = b[1] || 0,
      bz = b[2] || 0;
    return (
      Math.abs(ax - bx) < eps &&
      Math.abs(ay - by) < eps &&
      Math.abs(az - bz) < eps
    );
  }

  function ensureStyle(v) {
    // fallback cho viewer2D + viewer3D
    v.colorHex = v.colorHex || "#4f83ff";
    v.colorCss = v.colorCss || v.colorHex;
    v.haloCss = v.haloCss || v.colorCss;
    if (typeof v.alpha !== "number") v.alpha = 1;
    if (typeof v.visible !== "boolean") v.visible = true;
  }

  function renderNow() {
    if (App.mode === "2D" && window.Vec2D?.draw2DAllVectors)
      window.Vec2D.draw2DAllVectors();
    if (App.mode === "3D" && window.Vec3D?.hardRefresh3D)
      window.Vec3D.hardRefresh3D(false);
  }

  function animateAlpha(targetIdsOrAll, fromA, toA, ms = 250) {
    const start = performance.now();
    const list = App.vectorList || [];

    // set from
    for (const it of list) {
      ensureStyle(it);
      if (targetIdsOrAll === "ALL" || targetIdsOrAll.has(it.id))
        it.alpha = fromA;
    }
    renderNow();

    return new Promise((resolve) => {
      const step = (t) => {
        const k = Math.min(1, (t - start) / ms);
        const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
        const a = fromA + (toA - fromA) * ease;

        for (const it of list) {
          ensureStyle(it);
          if (targetIdsOrAll === "ALL" || targetIdsOrAll.has(it.id))
            it.alpha = a;
        }

        renderNow();

        if (k < 1) {
          App._basisOverlay.raf = requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      App._basisOverlay.raf = requestAnimationFrame(step);
    });
  }

  function animateColor(items, fromHex, toHex, ms = 220) {
    // đổi màu tuyến tính (đủ dùng cho đỏ->xanh)
    function hexToRgb(h) {
      const x = h.replace("#", "");
      const n = parseInt(
        x.length === 3
          ? x
              .split("")
              .map((c) => c + c)
              .join("")
          : x,
        16,
      );
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function rgbToHex(r, g, b) {
      const s = (n) => n.toString(16).padStart(2, "0");
      return "#" + s(r) + s(g) + s(b);
    }

    const a = hexToRgb(fromHex);
    const b = hexToRgb(toHex);
    const start = performance.now();

    return new Promise((resolve) => {
      const step = (t) => {
        const k = Math.min(1, (t - start) / ms);
        const r = Math.round(a.r + (b.r - a.r) * k);
        const g = Math.round(a.g + (b.g - a.g) * k);
        const bb = Math.round(a.b + (b.b - a.b) * k);
        const hex = rgbToHex(r, g, bb);

        for (const it of items) {
          ensureStyle(it);
          it.colorHex = hex;
          it.colorCss = hex;
          it.haloCss = hex;
        }

        renderNow();

        if (k < 1) {
          App._basisOverlay.raf = requestAnimationFrame(step);
        } else resolve();
      };

      App._basisOverlay.raf = requestAnimationFrame(step);
    });
  }

  // API: chạy overlay
  App.startBasisOverlay = async function ({
    subspaceVecs = [],
    basisVecs = [],
  }) {
    // tránh bấm liên tục
    if (App._basisOverlay.active) return;
    App._basisOverlay.active = true;

    // snapshot toàn bộ vectorList
    App._basisOverlay.snapshot = deepCloneVectorList(App.vectorList || []);

    // 1) fade out ALL
    await animateAlpha("ALL", 1, 0, 220);

    // 2) hiện subspace đỏ (fade in)
    const red = "#e53935";
    const green = "#2e7d32";

    // map subspace -> vector items có sẵn (nếu trùng)
    const subIds = new Set();

    for (const sv of subspaceVecs) {
      // tìm item sẵn có theo vec
      let found = (App.vectorList || []).find((it) => vecEq(it.vec, sv));
      if (!found) {
        // nếu subspace vector không có trong list thì tạo (tuỳ bạn muốn; ở mô tả bạn fade in các vector "được chọn làm không gian con"
        // thường là chính các vector nhập => nên đa số sẽ có. Nhưng vẫn tạo fallback cho chắc)
        found = {
          id: "sub:auto:" + Math.random().toString(16).slice(2),
          name: "sub",
          vec: sv.slice(),
          visible: true,
          focus: false,
          alpha: 0,
          colorHex: red,
          colorCss: red,
          haloCss: red,
        };
        App.vectorList.push(found);
      }

      ensureStyle(found);
      found.visible = true;
      found.focus = false;
      found.colorHex = red;
      found.colorCss = red;
      found.haloCss = red;
      found.alpha = 0;

      subIds.add(found.id);
    }

    await animateAlpha(subIds, 0, 1, 260);

    // 3) basis: tạo hoặc đổi đỏ->xanh + fade in xanh
    const basisIds = new Set();
    const basisItems = [];

    for (let i = 0; i < basisVecs.length; i++) {
      const bv = basisVecs[i];
      let found = (App.vectorList || []).find((it) => vecEq(it.vec, bv));

      if (!found) {
        found = {
          id:
            "basis:auto:" + (i + 1) + ":" + Math.random().toString(16).slice(2),
          name: "b" + (i + 1),
          vec: bv.slice(),
          visible: true,
          focus: false,
          alpha: 0,
          colorHex: green,
          colorCss: green,
          haloCss: green,
        };
        App.vectorList.push(found);
      } else {
        ensureStyle(found);
        found.visible = true;
        found.focus = false;
        // nếu nó đang đỏ (trong subspace) thì sẽ đổi sang xanh
        // màu chính mình sẽ animateColor sau cho mượt
      }

      basisIds.add(found.id);
      basisItems.push(found);
    }

    // đổi màu đỏ->xanh cho những vector basis đang nằm trong subspace
    const needColorAnim = basisItems.filter(
      (it) => (it.colorHex || "").toLowerCase() === red.toLowerCase(),
    );
    if (needColorAnim.length)
      await animateColor(needColorAnim, red, green, 220);

    // set hẳn xanh cho toàn bộ basis
    for (const it of basisItems) {
      ensureStyle(it);
      it.colorHex = green;
      it.colorCss = green;
      it.haloCss = green;
      it.alpha = 0; // để fade in đồng bộ
    }

    await animateAlpha(basisIds, 0, 1, 260);
  };

  // API: thoát overlay -> restore snapshot
  App.stopBasisOverlay = function () {
    if (!App._basisOverlay.active) return;

    if (App._basisOverlay.raf) cancelAnimationFrame(App._basisOverlay.raf);
    App._basisOverlay.raf = null;

    const snap = App._basisOverlay.snapshot;
    App.vectorList = deepCloneVectorList(snap || []);
    App._basisOverlay.snapshot = null;
    App._basisOverlay.active = false;

    renderNow();
  };
})();
