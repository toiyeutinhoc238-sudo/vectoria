// ===================== viewer2D.js (FULL + NEON PULSE FOCUS) =====================
(function () {
  window.Vec2D = window.Vec2D || {};

  const canvas2d = document.getElementById("canvas2d");
  if (!canvas2d) return;

  const ctx2d = canvas2d.getContext("2d", { alpha: false });

  // ----- State (Giữ nguyên toàn bộ) -----
  Vec2D.S2D = {
    pxPerUnit: 80,
    offsetX: 0,
    offsetY: 0,
    isPanningOne: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    lastTime: 0,
    momentumId: null,
    pointers: new Map(),
    lastCentroidX: null,
    lastCentroidY: null,
    lastDist: null,
    zoomVel: 0,
    pinchCooldown: 0,
  };

  Vec2D.gridInfo2D = null;
  Vec2D._animLoopId = null;

  const VEC_STROKE_W = 3.2;
  const ARROW_HEAD = 14;

  // [FUNKY PULSE CONFIG]
  const PULSE_SPEED = 0.005; // Tốc độ nhịp
  const PULSE_MIN_W = 6; // Độ rộng min
  const PULSE_MAX_W = 20; // Độ rộng max
  const PULSE_COLOR = "#00ffff"; // Màu cyan neon

  const toVec2 = (v) => [Number(v?.[0]) || 0, Number(v?.[1]) || 0];

  function getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas2d.width / dpr || 1;
    const h = canvas2d.height / dpr || 1;
    return { w, h };
  }

  // --- INIT ---
  Vec2D.init2D = function () {
    const App = window.App || {};
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    if (canvas2d) canvas2d.style.touchAction = "none";
    if (App.applyTheme) App.applyTheme();

    const viewerDiv = document.getElementById("viewer");
    if (viewerDiv) {
      const ro = new ResizeObserver(() => {
        if (App.mode === "2D") {
          Vec2D.resize2D();
          Vec2D.draw2DAllVectors();
        }
      });
      ro.observe(viewerDiv);
    }
  };

  Vec2D.show2D = function () {
    const canvas = document.getElementById("canvas2d");
    const threeLayer = document.getElementById("threeLayer");
    if (canvas) canvas.style.display = "block";
    if (threeLayer) threeLayer.style.display = "none";

    requestAnimationFrame(() => {
      Vec2D.resize2D();
      if (!Vec2D._animLoopId) Vec2D.draw2DAllVectors();
    });
  };

  Vec2D.resize2D = function () {
    const rect = document.getElementById("viewer").getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width === 0 || rect.height === 0) return;
    canvas2d.width = Math.floor(rect.width * dpr);
    canvas2d.height = Math.floor(rect.height * dpr);
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.scale(dpr, dpr);
  };

  // --- EVENT HANDLERS (GIỮ NGUYÊN 100%) ---
  function centroidOfPointers(ptrs) {
    let sx = 0,
      sy = 0,
      n = 0;
    for (const p of ptrs.values()) {
      sx += p.x;
      sy += p.y;
      n++;
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n };
  }

  function distanceTwoPointers(ptrs) {
    if (ptrs.size !== 2) return null;
    const it = ptrs.values();
    const a = it.next().value,
      b = it.next().value;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function applyZoomAboutScreenPoint(mx, my, factor) {
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX;
    const cy = h / 2 + Vec2D.S2D.offsetY;
    const wx = (mx - cx) / Vec2D.S2D.pxPerUnit;
    const wy = (cy - my) / Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.pxPerUnit *= factor;
    if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12)
      Vec2D.S2D.pxPerUnit = 1e-12;
    if (Vec2D.S2D.pxPerUnit > 1e12) Vec2D.S2D.pxPerUnit = 1e12;
    const cxNew = mx - wx * Vec2D.S2D.pxPerUnit;
    const cyNew = my + wy * Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.offsetX = cxNew - w / 2;
    Vec2D.S2D.offsetY = cyNew - h / 2;
  }

  // [TÌM VÀ DÁN ĐÈ TRONG viewer2D.js]
  Vec2D.bind2DEvents = function () {
    window.addEventListener("resize", () => {
      const App = window.App || {};
      if (App.mode === "2D") {
        Vec2D.resize2D();
        Vec2D.draw2DAllVectors();
      }
    });

    // --- HÀM TÌNH BÁO: KIỂM TRA CHUỘT CÓ CHẠM NGỌN VECTOR KHÔNG ---
    function getHitVectorId(mx, my) {
      if (!App.vectorList || !Vec2D.gridInfo2D) return null;
      const { cx, cy, px } = Vec2D.gridInfo2D;
      
      let hitId = null;
      let minDistance = 25; // Bán kính nhạy cảm ban đầu
      const hasFocus = App.vectorList.some(v => v.focus);

      for (let i = App.vectorList.length - 1; i >= 0; i--) {
        const v = App.vectorList[i];
        if (v.visible === false) continue;
        
        const vx = Number(v.vec[0] || 0);
        const vy = Number(v.vec[1] || 0);
        const tipX = cx + vx * px;
        const tipY = cy - vy * px;

        const dist = Math.hypot(mx - tipX, my - tipY);

        // [MỚI] CHỐNG Z-INDEX: Ưu tiên tuyệt đối vector đang được Focus
        if (hasFocus) {
            if (v.focus && dist <= 30) return v.id; // Nếu thằng này đang bật đèn neon, tóm cổ nó liền
            continue; // Nếu có bật Focus mà thằng này mờ mờ, bỏ qua luôn không cho đụng vào!
        }

        // Bắt thằng gần nhất nếu nhiều mũi tên dính chùm
        if (dist <= minDistance) {
            minDistance = dist;
            hitId = v.id;
        }
      }
      return hitId;
    }

    canvas2d.addEventListener("pointerdown", (e) => {
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Vec2D.S2D.momentumId) cancelAnimationFrame(Vec2D.S2D.momentumId);
      const n = Vec2D.S2D.pointers.size;
      Vec2D.S2D.lastTime = performance.now();

      const rect = canvas2d.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (n === 1) {
        // RADAR BẮT VẬT THỂ
        const hitId = getHitVectorId(mouseX, mouseY);
        if (hitId) {
            Vec2D.S2D.draggedVectorId = hitId;
            canvas2d.style.cursor = "crosshair";
            canvas2d.setPointerCapture(e.pointerId);
            return; // Dừng tại đây, KHÔNG bật cờ Pan đồ thị
        }

        // NẾU KHÔNG TRÚNG VECTOR -> PAN ĐỒ THỊ NHƯ CŨ
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.draggedVectorId = null;
        Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        canvas2d.setPointerCapture(e.pointerId);
        canvas2d.style.cursor = "grabbing";
      } else if (n === 2) {
        // Thả vector nếu lỡ chạm ngón 2
        Vec2D.S2D.draggedVectorId = null;
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.isPanningOne = false;
      }
      e.preventDefault();
    });

    canvas2d.addEventListener("pointermove", (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = performance.now();
      const dt = now - Vec2D.S2D.lastTime || 16;
      const n = Vec2D.S2D.pointers.size;

      // --- LOGIC KÉO VECTOR (DRAG) ---
      if (Vec2D.S2D.draggedVectorId && n === 1) {
          const vItem = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
          if (vItem && Vec2D.gridInfo2D) {
              const { cx, cy, px } = Vec2D.gridInfo2D;
              const rect = canvas2d.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;

              // Chuyển Pixel ngược về Toán học
              let mathX = (mx - cx) / px;
              let mathY = -(my - cy) / px;

              //Giữ Ctrl -> Hít vào các vạch đang hiện trên lưới đồ thị
              if (e.ctrlKey) {
                  const step = Vec2D.gridInfo2D ? Vec2D.gridInfo2D.stepUnit : 1;
                  mathX = Math.round(mathX / step) * step;
                  mathY = Math.round(mathY / step) * step;
              }

              // Update data realtime (Duy trì các chiều cao hơn nếu có)
              vItem.vec[0] = mathX;
              vItem.vec[1] = mathY;
              
              // [LIVE SYNC] ÉP ĐỒNG BỘ PHÉP CHIẾU THỜI GIAN THỰC (ZERO LAG)
              if (App.currentProjVisual) {
                  const v1 = App.vectorList.find(v => v.id === App.currentProjVisual.v1Id);
                  const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
                  const v2 = App.vectorList.find(v => v.id === App.currentProjVisual.v2Id);
                  
                  // Nếu Sếp đang nắm đầu vật thể (v1) hoặc giá đỡ (v2)
                  if (v1 && res && v2 && (vItem.id === v1.id || vItem.id === v2.id)) {
                      let dot = 0, magSq = 0;
                      const dim = Math.max(v1.vec.length, v2.vec.length);
                      // Tự xử lý Toán học ngay trên máy Sếp để chống giật
                      for (let i = 0; i < dim; i++) {
                          const a = v1.vec[i] || 0;
                          const b = v2.vec[i] || 0;
                          dot += a * b;
                          magSq += b * b;
                      }
                      if (magSq > 1e-9) {
                          const scalar = dot / magSq;
                          res.vec = v2.vec.map(b => b * scalar);
                      } else {
                          res.vec = v2.vec.map(() => 0);
                      }
                      // Ra lệnh cho nét đứt và góc vuông bám theo ngay lập tức!
                      if (typeof App.refreshProjectionOverlay === "function") {
                          App.refreshProjectionOverlay();
                      }
                  }
              }

              // Xóa Label thật, báo UI tạm thời `[..., ...]`
              App.coordOut?.(`[..., ...]`);
              
              // Kích hoạt vẽ lại (chỉ vẽ Canvas, không đụng DOM)
              Vec2D.draw2DAllVectors(); 
          }
          return; // Chặn ngang, không cho chạy xuống logic Pan đồ thị
      }

      // --- LOGIC PAN/ZOOM ĐỒ THỊ NHƯ CŨ ---
      if (n >= 2) {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        const dist = distanceTwoPointers(Vec2D.S2D.pointers);
        if (Vec2D.S2D.lastCentroidX != null) {
          const dx = c.x - Vec2D.S2D.lastCentroidX;
          const dy = c.y - Vec2D.S2D.lastCentroidY;
          Vec2D.S2D.offsetX += dx;
          Vec2D.S2D.offsetY += dy;
          Vec2D.S2D.velX = dx / dt;
          Vec2D.S2D.velY = dy / dt;
        }
        if (Vec2D.S2D.lastDist) {
          const rawFactor = dist / Vec2D.S2D.lastDist;
          const factor = Math.pow(rawFactor, 0.9);
          applyZoomAboutScreenPoint(c.x, c.y, factor);
          Vec2D.S2D.zoomVel = Math.log(factor) / dt;
        }
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = dist;
        Vec2D.S2D.lastTime = now;
        return;
      }

      if (Vec2D.S2D.isPanningOne && n === 1) {
        if (e.shiftKey) {
          const dy = e.clientY - Vec2D.S2D.lastY;
          const factor = dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01);
          const rect = canvas2d.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          applyZoomAboutScreenPoint(mx, my, factor);
          Vec2D.S2D.lastX = e.clientX;
          Vec2D.S2D.lastY = e.clientY;
          Vec2D.S2D.lastTime = now;
          return;
        }

        if (Vec2D.S2D.pinchCooldown && now < Vec2D.S2D.pinchCooldown) {
          Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
          Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
          Vec2D.S2D.lastX = e.clientX;
          Vec2D.S2D.lastY = e.clientY;
          Vec2D.S2D.lastTime = now;
          return;
        }

        Vec2D.S2D.offsetX = e.clientX - Vec2D.S2D.startX;
        Vec2D.S2D.offsetY = e.clientY - Vec2D.S2D.startY;

        const rawVelX = (e.clientX - Vec2D.S2D.lastX) / Math.max(dt, 5);
        const rawVelY = (e.clientY - Vec2D.S2D.lastY) / Math.max(dt, 5);
        Vec2D.S2D.velX = Vec2D.S2D.velX * 0.5 + rawVelX * 0.5;
        Vec2D.S2D.velY = Vec2D.S2D.velY * 0.5 + rawVelY * 0.5;
        const MAX_VEL = 2.5;
        Vec2D.S2D.velX = Math.max(-MAX_VEL, Math.min(MAX_VEL, Vec2D.S2D.velX));
        Vec2D.S2D.velY = Math.max(-MAX_VEL, Math.min(MAX_VEL, Vec2D.S2D.velY));

        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        Vec2D.S2D.lastTime = now;
      }
    });

    const endPointer = (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.delete(e.pointerId);
      const n = Vec2D.S2D.pointers.size;

      // --- CHỐT SỔ DRAG VECTOR ---
      if (Vec2D.S2D.draggedVectorId) {
          // 1. CHỐT SỐ VECTOR VẬT THỂ VỪA KÉO
          const draggedVec = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
          if (draggedVec) {
              // Ép mảng số về chuẩn 2 chữ số (Cắt bỏ rác thập phân do JS tính toán)
              draggedVec.vec = draggedVec.vec.map(val => Number(Number(val).toFixed(2)));
              // Nạp lại chuỗi Latex để Sidebar cập nhật số mới
              draggedVec.latex = `[${draggedVec.vec.join(", ")}]`;
          }

          Vec2D.S2D.draggedVectorId = null;
          canvas2d.style.cursor = "default";
          
          // 2. CHỐT SỐ VECTOR BÓNG (HÌNH CHIẾU) VÀ Ô OUTPUT KẾT QUẢ
          if (App.currentProjVisual) {
              const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
              const mf = document.querySelector("#calcSteps math-field");
              if (res) {
                  res.vec = res.vec.map(val => Number(Number(val).toFixed(2))); 
                  res.latex = `[${res.vec.join(", ")}]`;
                  
                  if (mf) {
                      mf.value = `\\left( ${res.vec.join(",\\; ")} \\right)`;
                  }
              }
          }

          // 3. Ra lệnh vẽ lại Sidebar
          if (App.renderVectorList) App.renderVectorList();
          if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();

          return;
      }

      if (n === 0) {
        if (canvas2d.releasePointerCapture)
          canvas2d.releasePointerCapture(e.pointerId);
        canvas2d.style.cursor = "default";
        Vec2D.S2D.isPanningOne = false;
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        Vec2D.S2D.velX = 0;
        Vec2D.S2D.velY = 0;
        Vec2D.S2D.zoomVel = 0;
        if (Vec2D.S2D.momentumId) {
          cancelAnimationFrame(Vec2D.S2D.momentumId);
          Vec2D.S2D.momentumId = null;
        }
      } else if (n === 1) {
        const remain = Vec2D.S2D.pointers.values().next().value;
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.startX = remain.x - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = remain.y - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = remain.x;
        Vec2D.S2D.lastY = remain.y;
        Vec2D.S2D.lastTime = performance.now();
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        Vec2D.S2D.velX = 0;
        Vec2D.S2D.velY = 0;
        Vec2D.S2D.zoomVel = 0;

        Vec2D.S2D.pinchCooldown = performance.now() + 200;
      } else {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastTime = performance.now();
      }
    };

    canvas2d.addEventListener("pointerup", endPointer);
    canvas2d.addEventListener("pointercancel", endPointer);
    
    canvas2d.addEventListener(
      "wheel",
      (e) => {
        const rect = canvas2d.getBoundingClientRect();
        const mx = e.clientX - rect.left,
          my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        applyZoomAboutScreenPoint(mx, my, factor);

        // --- CẬP NHẬT VECTOR NẾU VỪA DRAG VỪA ZOOM ---
        if (Vec2D.S2D.draggedVectorId && Vec2D.gridInfo2D) {
            const vItem = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
            if (vItem) {
                // Do pxPerUnit vừa thay đổi, ta tính lại Toán học để vector dính chặt vào con chuột
                const { cx, cy, px } = Vec2D.S2D; // Lấy state trực tiếp vì gridInfo chưa kịp update
                let mathX = (mx - cx) / px;
                let mathY = -(my - cy) / px;

                if (e.ctrlKey) {
                    const step = Vec2D.gridInfo2D ? Vec2D.gridInfo2D.stepUnit : 1;
                    mathX = Math.round(mathX / step) * step;
                    mathY = Math.round(mathY / step) * step;
                }
                vItem.vec[0] = mathX;
                vItem.vec[1] = mathY;
                Vec2D.draw2DAllVectors(); 
            }
        }
        e.preventDefault();
      },
      { passive: false },
    );
  };

  Vec2D.render2DGrid = function () {
    const App = window.App || {};
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX,
      cy = h / 2 + Vec2D.S2D.offsetY,
      px = Vec2D.S2D.pxPerUnit;

    ctx2d.fillStyle = App.getCSS?.("--card") || "#111";
    ctx2d.fillRect(0, 0, w, h);

    const targetPx = 70;
    const rawStep = targetPx / Math.max(1e-30, px);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const res = rawStep / mag;
    let stepUnit =
      res <= 1 ? 1 * mag : res <= 2 ? 2 * mag : res <= 5 ? 5 * mag : 10 * mag;
    const tickPx = stepUnit * px;
    const subTickPx = tickPx / 5;

    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 0.5;
    for (let x = cx % subTickPx; x <= w; x += subTickPx) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, h);
      ctx2d.stroke();
    }
    for (let y = cy % subTickPx; y <= h; y += subTickPx) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(w, y);
      ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 1.2;
    const startKx = Math.floor(-cx / tickPx) - 1,
      endKx = Math.ceil((w - cx) / tickPx) + 1;
    for (let k = startKx; k <= endKx; k++) {
      const x = cx + k * tickPx;
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, h);
      ctx2d.stroke();
    }
    const startKy = Math.floor((cy - h) / tickPx) - 1,
      endKy = Math.ceil((cy + h) / tickPx) + 1;
    for (let k = startKy; k <= endKy; k++) {
      const y = cy - k * tickPx;
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(w, y);
      ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--axis") || "#aaa";
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(0, cy);
    ctx2d.lineTo(w, cy);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(cx, 0);
    ctx2d.lineTo(cx, h);
    ctx2d.stroke();

    ctx2d.fillStyle = App.getCSS?.("--fg") || "#fff";
    ctx2d.font = "12px sans-serif";
    const formatLabel2D = (v) => {
      const abs = Math.abs(v);
      if (abs >= 1e6 || (abs > 0 && abs < 1e-4)) {
        return Number(v).toExponential(2).replace(/\.00e/, "e").replace(/\+/, "");
      }
      return parseFloat(v.toFixed(12)).toString();
    };

    // --- LOGIC NEO TRỤC X (NGANG) ĐƯA SÁT MÉP TRÊN ---
    let drawCy = cy;
    if (cy < 0) drawCy = 0; // Ép sát ván lề trên để không bị tuột sâu
    if (cy > h - 18) drawCy = h - 18; // Lề dưới

    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "top";
    for (let k = startKx; k <= endKx; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) < 1e-30) continue; 
      const x = cx + k * tickPx;
      if (Math.abs(x - cx) > 15) {
          ctx2d.fillStyle = App.getCSS?.("--card") || "#111";
          ctx2d.fillRect(x - 12, drawCy + 1, 24, 16);
          ctx2d.fillStyle = App.getCSS?.("--fg") || "#fff";
          // In sát trục ngang (cách 3px thay vì 6px như cũ)
          ctx2d.fillText(formatLabel2D(unitVal), x, drawCy + 3); 
      }
    }

    // --- LOGIC NEO TRỤC Y (DỌC) ---
    let drawCx = cx;
    if (cx < 35) drawCx = 35; // Lề trái (tăng lên 35px để số âm dài ngoằng có chỗ hiển thị)
    if (cx > w - 10) drawCx = w - 10; // Lề phải

    ctx2d.textAlign = "right";
    ctx2d.textBaseline = "middle";
    for (let k = startKy; k <= endKy; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) < 1e-30) continue; 
      const y = cy - k * tickPx;
      
      // [GEOGEBRA TOUCH]: Ưu tiên trục X. Nếu nhãn trục Y sắp đụng vào đường trục X (drawCy), thì bỏ qua không vẽ nhãn Y
      if (Math.abs(y - drawCy) < 18) continue; 

      if (Math.abs(y - cy) > 15) {
          ctx2d.fillStyle = App.getCSS?.("--card") || "#111";
          ctx2d.fillRect(drawCx - 36, y - 8, 34, 16);
          ctx2d.fillStyle = App.getCSS?.("--fg") || "#fff";
          // Xích ra xa một chút (-8px) để số âm (dấu trừ) không bị dính sát cạ vào trục
          ctx2d.fillText(formatLabel2D(unitVal), drawCx - 8, y); 
      }
    }
    
    // Vẽ số 0 ở gốc tọa độ (chỉ vẽ khi gốc nằm trong màn hình)
    if (cx >= -10 && cx <= w + 10 && cy >= -10 && cy <= h + 10) {
        ctx2d.textAlign = "right";
        ctx2d.textBaseline = "top";
        ctx2d.fillText("0", cx - 6, cy + 4);
    }

    return { cx, cy, px, stepUnit };
  };

  // --- [NEON PULSE EFFECT & TỈ LỆ MŨI TÊN CHUẨN TOÁN HỌC] ---
  function draw2DVectorSingle(
    v,
    color,
    highlighted,
    alpha = 1,
    pulseFactor = 0,
    offset = [0, 0],
    noArrow = false,        
    isRightAngle = false,   
    isDashed = false        
  ) {
    alpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const { cx, cy, px } = Vec2D.gridInfo2D;
    const startX = cx + offset[0] * px;
    const startY = cy - offset[1] * px; 
    const x2 = startX + v[0] * px;
    const y2 = startY - v[1] * px;

    const angle = Math.atan2(y2 - startY, x2 - startX);
    
    // 1. Tính toán độ dài THỰC TẾ của vector trên màn hình (Pixel)
    const vecLenPx = Math.hypot(x2 - startX, y2 - startY);

    // 2. LUẬT VIỄN CẬN CÁ THỂ: 
    // Mũi tên có size tiêu chuẩn là 15px. NHƯNG không bao giờ được phép bự quá 30% thân vector.
    // -> Vector ngắn hoặc bị zoom xa sẽ tự động teo mũi tên lại và biến mất. Vector dài vẫn giữ mũi tên đẹp.
    const DYNAMIC_ARROW_HEAD = Math.min(15, vecLenPx * 0.3);

    if (highlighted) {
      ctx2d.save();
      const currentWidth = PULSE_MIN_W + (PULSE_MAX_W - PULSE_MIN_W) * pulseFactor;
      const currentAlpha = (0.3 + 0.4 * (1 - pulseFactor)) * alpha;

      ctx2d.strokeStyle = PULSE_COLOR;
      ctx2d.globalAlpha = currentAlpha;
      ctx2d.lineWidth = currentWidth;
      ctx2d.lineCap = "round";
      ctx2d.beginPath();
      ctx2d.moveTo(startX, startY);
      ctx2d.lineTo(x2, y2);
      ctx2d.stroke();

      const haloHead = DYNAMIC_ARROW_HEAD + currentWidth * 0.3;
      if (!noArrow && vecLenPx > 1) { // Chỉ vẽ quầng sáng mũi tên khi vector đủ lớn để thấy
          ctx2d.beginPath();
          ctx2d.moveTo(x2, y2);
          ctx2d.lineTo(x2 - haloHead * Math.cos(angle - Math.PI / 6), y2 - haloHead * Math.sin(angle - Math.PI / 6));
          ctx2d.moveTo(x2, y2);
          ctx2d.lineTo(x2 - haloHead * Math.cos(angle + Math.PI / 6), y2 - haloHead * Math.sin(angle + Math.PI / 6));
          ctx2d.stroke();
      }
      ctx2d.restore();
    }

    ctx2d.save();
    ctx2d.globalAlpha = alpha;
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = VEC_STROKE_W; // Giữ nguyên độ dày thân bút

    if (isDashed) {
        ctx2d.setLineDash([6, 6]);
    } else {
        ctx2d.setLineDash([]);
    }

    ctx2d.beginPath();
    ctx2d.moveTo(startX, startY);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();
    ctx2d.setLineDash([]);
    
    // Vẽ mũi tên thực
    if (!noArrow && vecLenPx > 1) {
        ctx2d.beginPath();
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - DYNAMIC_ARROW_HEAD * Math.cos(angle - Math.PI / 6), y2 - DYNAMIC_ARROW_HEAD * Math.sin(angle - Math.PI / 6));
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - DYNAMIC_ARROW_HEAD * Math.cos(angle + Math.PI / 6), y2 - DYNAMIC_ARROW_HEAD * Math.sin(angle + Math.PI / 6));
        ctx2d.stroke();
    }

    if (isRightAngle) {
        const symbolSize = 12; 
        ctx2d.beginPath();
        ctx2d.moveTo(x2, y2);
        
        const p1x = x2 - symbolSize * Math.cos(angle);
        const p1y = y2 - symbolSize * Math.sin(angle);
        const p2x = x2 - symbolSize * Math.cos(angle + Math.PI/2);
        const p2y = y2 - symbolSize * Math.sin(angle + Math.PI/2);
        const p3x = p1x - symbolSize * Math.cos(angle + Math.PI/2);
        const p3y = p1y - symbolSize * Math.sin(angle + Math.PI/2);

        ctx2d.moveTo(p1x, p1y);
        ctx2d.lineTo(p3x, p3y);
        ctx2d.lineTo(p2x, p2y);
        
        ctx2d.lineWidth = 1.5;
        ctx2d.strokeStyle = color; 
        ctx2d.stroke();
    }
    ctx2d.restore();
  }

  
  // --- VÒNG LẶP VẼ CHÍNH ---
  Vec2D.draw2DAllVectors = function () {
    const App = window.App || {};
    if (App.mode !== "2D") {
      if (Vec2D._animLoopId) {
        cancelAnimationFrame(Vec2D._animLoopId);
        Vec2D._animLoopId = null;
      }
      return;
    }

    const time = Date.now() * PULSE_SPEED;
    const pulseFactor = (Math.sin(time) + 1) / 2;

    const { w, h } = getLogicalSize();

    if (
      App.firstDrawForVector &&
      App.currentVector &&
      App.currentVector.length >= 2
    ) {
      App.firstDrawForVector = false;
    }

    Vec2D.gridInfo2D = Vec2D.render2DGrid();

    // Focus Logic: Dim others
    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0)); // Focus vẽ sau

    for (const it of list) {
      const v2 = toVec2(it.vec);
      let alpha = typeof it.alpha === "number" ? it.alpha : 1;
      if (hasFocus && !it.focus) alpha *= 0.15; // Mờ đi
      draw2DVectorSingle(
        v2,
        it.colorCss,
        !!it.focus,
        alpha,
        pulseFactor,
        [0, 0],
      );
    }
    if (App.tempGhosts && Array.isArray(App.tempGhosts)) {
      for (const g of App.tempGhosts) {
        if (g.isFlashlight) {
          // [QUAN TRỌNG] Nếu là đèn pin thì gọi hàm vẽ riêng
          drawFlashlight2D(g);

          // Vẽ thêm cái bóng đen (Vector kết quả màu đen)
          const vRes = toVec2(g.res);
          draw2DVectorSingle(vRes, "#000000", false, g.shadowAlpha, 0, [0, 0]);
        } else if (g.isNormalize) {
          const { cx, cy, px } = Vec2D.gridInfo2D;
          // 1. Vẽ vòng kim cô (Đường tròn đơn vị)
          ctx2d.save();
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, 1 * px, 0, Math.PI * 2);
          ctx2d.strokeStyle = `rgba(0, 255, 255, ${g.unitCircleAlpha})`;
          ctx2d.setLineDash([5, 5]); // Nét đứt cho "ngầu"
          ctx2d.lineWidth = 2;
          ctx2d.stroke();
          ctx2d.restore();

          // 2. Vẽ vector ảo đang co dãn (headGlow > 0.4 sẽ bật neon)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            g.headGlow > 0.4,
            g.alpha,
            g.headGlow,
            [0, 0],
          );
        } else {
          // Vẽ các ghost bình thường (như phép cộng)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            false,
            g.alpha,
            0,
            g.offset || [0, 0],
            g.noArrow,      // [THÊM] Truyền cờ noArrow
            g.isRightAngle, // [THÊM] Truyền cờ góc vuông
            g.isDashed      // [THÊM] Truyền cờ nét đứt
          );
        }
      }
    }

    if (App.currentAngleVisual2D)
      _drawAngleArc2DOverlay(App.currentAngleVisual2D);
    if (App.currentVector && App.currentVector.length >= 2) {
      const vOriginal = App.currentVector;
      const vStr = App.formatTip
        ? App.formatTip(vOriginal)
        : `[${vOriginal.join(", ")}]`;
      const suffix = vOriginal.length > 2 ? " (Chiếu 2D)" : "";
      App.coordOut?.(`Toạ độ: ${vStr}` + suffix);
    } else {
      App.coordOut?.("—");
    }

    Vec2D._animLoopId = requestAnimationFrame(Vec2D.draw2DAllVectors);
  };

  Vec2D.drawAngleArc2D = function (v1, v2, deg) {
    const a = toVec2(v1),
      b = toVec2(v2);
    const App = window.App || {};
    App.currentAngleVisual2D = {
      a: [a[0], a[1]],
      b: [b[0], b[1]],
      deg: Number(deg),
    };
  };

  // [TÌM VÀ DÁN ĐÈ TRONG viewer2D.js]
  function _drawAngleArc2DOverlay(state) {
    const App = window.App || {};
    if (!Vec2D.gridInfo2D || !state) return;
    
    // Lấy thông số môi trường Grid hiện tại
    const { cx, cy, px } = Vec2D.gridInfo2D; 
    
    const a = state.a, b = state.b;
    const { w, h } = getLogicalSize();
    
    // Tính góc bắt đầu và kết thúc
    const angA = Math.atan2(-a[1], a[0]);
    const angB = Math.atan2(-b[1], b[0]);
    
    // Chuẩn hóa góc chênh lệch (Delta) luôn từ -PI đến PI
    const normPi = (x) => {
      while (x <= -Math.PI) x += 2 * Math.PI;
      while (x > Math.PI) x -= 2 * Math.PI;
      return x;
    };
    const delta = normPi(angB - angA);
    const anticlockwise = delta < 0;

    // --- TÍNH TOÁN BÁN KÍNH ĐỘNG THEO ZOOM (PX) ---
    // 1. Độ dài thực tế Toán học của 2 vector
    const mathLenA = Math.hypot(a[0], a[1]);
    const mathLenB = Math.hypot(b[0], b[1]);
    
    // 2. Chốt bán kính hình quạt = 60% vector ngắn nhất
    const mathMinLen = Math.min(mathLenA, mathLenB);
    const mathRadius = Math.max(0.5, mathMinLen * 0.6); 
    
    // 3. Nhân với hệ số pxPerUnit để ra kích thước Pixel thật trên màn hình
    const r = mathRadius * px;

    ctx2d.save();
    
    // Vẽ phần nền quạt (Fill)
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, angA, angA + delta, anticlockwise);
    ctx2d.closePath();
    ctx2d.fillStyle = "rgba(255, 200, 0, 0.32)";
    ctx2d.fill();
    
    // Vẽ đường viền vòng cung (Stroke)
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, angA, angA + delta, anticlockwise);
    ctx2d.strokeStyle = "#ffaa00";
    ctx2d.lineWidth = 1.5;
    ctx2d.stroke();

    // Tính toán tọa độ đặt Chữ số góc
    const mid = angA + delta / 2;
    // Điểm đặt chữ lùi ra xa tâm một khoảng r + 15px
    const padPx = 15;
    const tx = cx + Math.cos(mid) * (r + padPx);
    const ty = cy + Math.sin(mid) * (r + padPx);
    const degShow = state.deg != null ? state.deg : Math.abs((delta * 180) / Math.PI);
    
    // --- TÍNH TOÁN FONT SIZE ĐỘNG THEO ZOOM ---
    // Quy chuẩn: 80px/unit tương ứng font 14px. 
    // Giới hạn nhỏ nhất là 10px, lớn nhất là 18px để không bị vỡ giao diện.
    const fontSize = Math.max(10, Math.min(18, 14 * (px / 80)));
    
    ctx2d.font = `bold ${fontSize}px sans-serif`;
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    
    // Lấy màu tương phản theo Theme
    const textColor = App.getCSS?.("--label-fg") || App.getCSS?.("--fg") || "#fff";
    ctx2d.fillStyle = textColor;
    
    // Vẽ chữ độ
    ctx2d.fillText(`${degShow.toFixed(1)}°`, tx, ty);
    ctx2d.restore();
  }

  Vec2D.resetView = function () {
    if (Vec2D._resetAnimId) cancelAnimationFrame(Vec2D._resetAnimId);
    const startX = Vec2D.S2D.offsetX;
    const startY = Vec2D.S2D.offsetY;
    const startScale = Vec2D.S2D.pxPerUnit;
    const targetX = 0;
    const targetY = 0;
    const targetScale = 80;
    const duration = 800;
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutCubic(progress);
      Vec2D.S2D.offsetX = startX + (targetX - startX) * ease;
      Vec2D.S2D.offsetY = startY + (targetY - startY) * ease;
      Vec2D.S2D.pxPerUnit = startScale + (targetScale - startScale) * ease;
      if (progress < 1) Vec2D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec2D._resetAnimId = null;
        Vec2D.S2D.offsetX = targetX;
        Vec2D.S2D.offsetY = targetY;
        Vec2D.S2D.pxPerUnit = targetScale;
      }
    }
    Vec2D._resetAnimId = requestAnimationFrame(loop);
  };
})();
