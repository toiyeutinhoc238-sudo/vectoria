// ===================== viewer3D.js (FULL FINAL - FIXED FLASH & GHOST) =====================
(function () {
  window.Vec3D = window.Vec3D || {};

  // --- CẤU HÌNH & CONSTANTS ---
  Vec3D._ZOOM_MIN = 1e-12;
  Vec3D._ZOOM_MAX = 1e12;

  const App = window.App || {};
  const toVec3 = (v) => [
    Number(v?.[0]) || 0,
    Number(v?.[1]) || 0,
    Number(v?.[2]) || 0,
  ];

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth < 768;

  const GEOM_QUALITY = {
    shaftSeg: isMobile ? 12 : 24,
    headSeg: isMobile ? 16 : 32,
    maxPixel: isMobile ? 1.5 : 2,
  };

  const threeLayer = document.getElementById("threeLayer");

  // --- CORE HANDLES ---
  Vec3D._scene = null;
  Vec3D._camera = null;
  Vec3D._renderer = null;
  Vec3D._labelRenderer = null;
  Vec3D._controls = null;

  Vec3D._angleLayer = null;
  Vec3D._vecSignature = "";

  // --- STATE ---
  Vec3D.S3D = {
    unitsPerWorld: 1,
    zoomTarget: 1,
    offset: new THREE.Vector3(0, 0, 0),
    pivotMath: new THREE.Vector3(0, 0, 0),
    pivotWorld: new THREE.Vector3(0, 0, 0),
    hasPivot: false,
  };

  Vec3D._animating = false;
  Vec3D._hover3D = false;
  Vec3D._pressed = new Set();
  Vec3D._kbAnimId = null;
  Vec3D._lastUForVectors = 1;

  // --- CONFIG AXIS ---
  Vec3D._axisMaxMath = 20;
  Vec3D._axisMaxWorld = Vec3D._axisMaxMath;

  // --- GROUPS ---
  Vec3D._frameGroup = null;
  Vec3D._axesGroup = null;
  Vec3D._planeXY = null;
  Vec3D._mathGroup = null;
  Vec3D._vectorsGroup = null;
  Vec3D._ticksGroup = null;
  Vec3D._tickLabels = [];
  Vec3D._axisLetters = [];
  Vec3D._lastLabelKey = "";
  Vec3D.threeVecMap = new Map();

  // --- VISUAL CONFIG ---
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;
  Vec3D.ANGLE_LABEL_PX = 28;
  Vec3D.ANGLE_ARC_GAP_PX = 8;
  Vec3D.ANGLE_RADIUS_RATIO = 0.72;
  Vec3D.ANGLE_LABEL_MIN_RATIO = 0.38;
  Vec3D.ANGLE_LABEL_GAP_PX = 6;

  const VEC_SHAFT_R = 0.025;
  const VEC_HEAD_R = 0.08;
  const VEC_HEAD_H = 0.25;

  // [ENERGY PULSE CONFIG 3D]
  const PULSE_COLOR_3D = 0x00ffff;
  const PULSE_SPEED_3D = 0.005;
  const PULSE_SCALE_ADD = 0.3;

  // [TÌM VÀ DÁN ĐÈ VÀO viewer3D.js - THAY THẾ TOÀN BỘ HÀM Vec3D.init3D]
  Vec3D.init3D = function () {
    if (Vec3D._scene) return;

    Vec3D.DEFAULT_FOV = 24;

    if (getComputedStyle(threeLayer).display === "none") {
      threeLayer.style.display = "block";
    }
    const rect = threeLayer.getBoundingClientRect();

    // 1. WebGL Renderer
    Vec3D._renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GEOM_QUALITY.maxPixel));
    threeLayer.appendChild(Vec3D._renderer.domElement);

    Vec3D._renderer.domElement.style.position = "absolute";
    Vec3D._renderer.domElement.style.inset = "0";
    Vec3D._renderer.domElement.style.zIndex = "0";

    // 2. CSS2D Renderer (Labels)
    Vec3D._labelRenderer = new THREE.CSS2DRenderer();
    Vec3D._labelRenderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._labelRenderer.domElement.style.position = "absolute";
    Vec3D._labelRenderer.domElement.style.inset = "0";
    
    // [FIX QUAN TRỌNG 1]: Trả lại "none" để DOM chữ không cản trở Radar và Chuột của WebGL
    Vec3D._labelRenderer.domElement.style.pointerEvents = "none"; 
    Vec3D._labelRenderer.domElement.style.overflow = "visible";
    Vec3D._labelRenderer.domElement.style.zIndex = "1";
    threeLayer.appendChild(Vec3D._labelRenderer.domElement);

    // 3. Scene & Camera
    Vec3D._scene = new THREE.Scene();
    Vec3D._scene.background = new THREE.Color(App.getCSS?.("--bg") || "#ffffff");

    Vec3D._camera = new THREE.PerspectiveCamera(Vec3D.DEFAULT_FOV, Math.max(1e-6, (rect.width || 760) / (rect.height || 760)), 0.1, 1e12);
    Vec3D._camera.position.set(10, 10, 10);
    Vec3D._camera.up.set(0, 0, 1);

    // 4. Controls
    Vec3D._controls = new THREE.OrbitControls(Vec3D._camera, Vec3D._renderer.domElement);
    Vec3D.S3D.unitsPerWorld = 1;
    Vec3D.S3D.zoomTarget = 1;
    Vec3D.S3D.offset.set(0, 0, 0);
    Vec3D.S3D.hasPivot = false;

    Vec3D._controls.enableDamping = true;
    Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6;
    
    // [FIX QUAN TRỌNG 2]: Trả lại quyền Kéo (Pan) Đồ thị cho Chuột Phải
    Vec3D._controls.enablePan = true; 
    Vec3D._controls.enableZoom = false; // Vẫn tắt Zoom mặc định để xài Math Zoom của hệ thống

    Vec3D._controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN, // Kéo rê đồ thị bằng chuột phải
    };

    Vec3D._controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.PAN, // Kéo đồ thị bằng 2 ngón
    };

    // ==========================================
    // CƠ CHẾ MATH ZOOM VÀ TƯƠNG TÁC VECTOR (RAYCASTER)
    // ==========================================
    const renderDom = Vec3D._renderer.domElement;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dragPlane = new THREE.Plane();
    let dragOffset = new THREE.Vector3();
    let constraintStart = new THREE.Vector3(); // Lưu vị trí bắt đầu kéo
    
    // Biến lưu trạng thái khóa trục hiện tại ('x', 'y', 'z' hoặc null)
    Vec3D.S3D.axisConstraint = null; 

    // Gắn sự kiện cho 3 nút UI Khóa trục
    const axisPanel = document.getElementById("axisControls");
    if (axisPanel) {
        const btns = axisPanel.querySelectorAll(".axis-btn");
        btns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                btns.forEach(b => b.classList.remove("active"));
                if (Vec3D.S3D.axisConstraint === btn.dataset.axis) {
                    Vec3D.S3D.axisConstraint = null; // Bấm lại thì tắt
                } else {
                    btn.classList.add("active");
                    Vec3D.S3D.axisConstraint = btn.dataset.axis; // Bật khóa
                }
            });
        });
    }

    const applyMathZoom = (dir, factor) => {
      if ((Vec3D.S3D.zoomTarget >= Vec3D._ZOOM_MAX && dir > 0) || (Vec3D.S3D.zoomTarget <= Vec3D._ZOOM_MIN && dir < 0)) {
        Vec3D.S3D.hasPivot = false; return;
      }
      Vec3D.S3D.pivotMath.set(0, 0, 0);
      Vec3D.S3D.pivotWorld.copy(Vec3D.S3D.offset);
      Vec3D.S3D.hasPivot = true;
      const next = Vec3D.S3D.zoomTarget * factor;
      Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, next));
    };

    const wheelHandler = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      const dir = e.deltaY < 0 ? +1 : -1;
      const factor = dir > 0 ? 1.12 : 1 / 1.12;
      applyMathZoom(dir, factor);

      if (Vec3D.S3D.draggedVectorId && !Vec3D.S3D.axisConstraint) {
          const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
          if (group) {
              const tipWorld = group.userData.tipLocal.clone().multiplyScalar(factor).add(Vec3D.S3D.offset);
              const camDir = new THREE.Vector3();
              Vec3D._camera.getWorldDirection(camDir);
              dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
              pointerMoveHandler(e); 
          }
      }
    };
    renderDom.addEventListener("wheel", wheelHandler, { passive: false });

    // POINTER DOWN: Tóm Vector
    const pointerDownHandler = (e) => {
      if (!e.touches && e.button !== 0) return; 
      
      const rect = renderDom.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, Vec3D._camera);

      if (Vec3D._vectorsGroup) {
          const heads = [];
          Vec3D._vectorsGroup.traverse(child => {
              if (child.isMesh && child.geometry && child.geometry.type === "ConeGeometry" && child.visible) {
                  heads.push(child);
              }
          });

          raycaster.params.Line.threshold = 0.5;
          const intersects = raycaster.intersectObjects(heads, false);
          
          if (intersects.length > 0) {
              let group = intersects[0].object.parent;
              let hitId = null;
              for (let [id, grp] of Vec3D.threeVecMap.entries()) {
                  if (grp === group) { hitId = id; break; }
              }

              if (hitId) {
                  Vec3D.S3D.draggedVectorId = hitId;
                  Vec3D._controls.enabled = false; 

                  const tipWorld = group.userData.tipLocal.clone().add(Vec3D.S3D.offset);
                  constraintStart.copy(tipWorld); // Lưu gốc để trượt

                  const camDir = new THREE.Vector3();
                  Vec3D._camera.getWorldDirection(camDir);

                  // NẾU ĐANG KHÓA TRỤC: Tạo mặt phẳng chứa trục đó và hướng về Camera
                  if (Vec3D.S3D.axisConstraint) {
                      const constraintLine = new THREE.Vector3();
                      if (Vec3D.S3D.axisConstraint === 'x') constraintLine.x = 1;
                      if (Vec3D.S3D.axisConstraint === 'y') constraintLine.y = 1;
                      if (Vec3D.S3D.axisConstraint === 'z') constraintLine.z = 1;

                      // Tính pháp tuyến mặt phẳng: Normal = (Axis) Cross (Camera Cross Axis)
                      const planeNormal = new THREE.Vector3().crossVectors(
                          constraintLine, 
                          new THREE.Vector3().crossVectors(camDir, constraintLine)
                      ).normalize();
                      
                      // Fix lỗi nếu nhìn thẳng góc trục
                      if (planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir).multiplyScalar(-1);
                      dragPlane.setFromNormalAndCoplanarPoint(planeNormal, tipWorld);
                  } else {
                      // KÉO TỰ DO: Dùng mặt phẳng song song Camera như cũ
                      dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
                  }

                  const planeIntersect = new THREE.Vector3();
                  raycaster.ray.intersectPlane(dragPlane, planeIntersect);
                  if (planeIntersect) dragOffset.copy(planeIntersect).sub(tipWorld);

                  e.preventDefault(); e.stopImmediatePropagation();
                  renderDom.setPointerCapture(e.pointerId || (e.touches ? e.touches[0].identifier : 0));
                  renderDom.style.cursor = Vec3D.S3D.axisConstraint ? "ns-resize" : "crosshair";
              }
          }
      }
    };
    
    // POINTER MOVE: Trượt Vector
    const pointerMoveHandler = (e) => {
      if (!Vec3D.S3D.draggedVectorId) return; 
      
      e.preventDefault(); e.stopImmediatePropagation();
      const vItem = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
      if (!vItem) return;

      const rect = renderDom.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, Vec3D._camera);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      
      // [FIX NAM CHÂM]: Chỉ dùng Ctrl, lấy thông số vạch lưới hiện tại để hít
      const isSnap = e.ctrlKey; 
      const step = Vec3D.S3D.stepUnit || 1; 

      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, intersect);
      
      if (intersect) {
          let newPosWorld;
          
          if (Vec3D.S3D.axisConstraint) {
              const constraintLine = new THREE.Vector3();
              if (Vec3D.S3D.axisConstraint === 'x') constraintLine.x = 1;
              if (Vec3D.S3D.axisConstraint === 'y') constraintLine.y = 1;
              if (Vec3D.S3D.axisConstraint === 'z') constraintLine.z = 1;

              const diff = new THREE.Vector3().subVectors(intersect, constraintStart);
              const projLen = diff.dot(constraintLine); 
              newPosWorld = constraintStart.clone().add(constraintLine.multiplyScalar(projLen));
          } else {
              newPosWorld = intersect.clone().sub(dragOffset);
          }

          newPosWorld.sub(Vec3D.S3D.offset); 
          
          let nx = newPosWorld.x / u;
          let ny = newPosWorld.y / u;
          let nz = newPosWorld.z / u;

          // LÀM TRÒN THEO CHUẨN VẠCH LƯỚI (VD: Lưới 0.5 thì 1.1 -> 1.0, 1.4 -> 1.5)
          if (isSnap) { 
              nx = Math.round(nx / step) * step; 
              ny = Math.round(ny / step) * step; 
              nz = Math.round(nz / step) * step; 
          }
          
          if (Vec3D.S3D.axisConstraint === 'x') vItem.vec[0] = nx;
          else if (Vec3D.S3D.axisConstraint === 'y') vItem.vec[1] = ny;
          else if (Vec3D.S3D.axisConstraint === 'z') vItem.vec[2] = nz;
          else { vItem.vec[0] = nx; vItem.vec[1] = ny; vItem.vec[2] = nz; }
      }
      // [LIVE SYNC] ÉP ĐỒNG BỘ PHÉP CHIẾU BÊN 3D (ZERO LAG)
      if (App.currentProjVisual) {
          const v1 = App.vectorList.find(v => v.id === App.currentProjVisual.v1Id);
          const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
          const v2 = App.vectorList.find(v => v.id === App.currentProjVisual.v2Id);
          
          if (v1 && res && v2 && (vItem.id === v1.id || vItem.id === v2.id)) {
              let dot = 0, magSq = 0;
              const dim = Math.max(v1.vec.length, v2.vec.length);
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
              // Lưu ý: Không cần gọi hàm phụ, vì file 3D đã có sync3D loop quét liên tục!
          }
      }
      const placeholder = "[" + vItem.vec.map((val, i) => {
          if (!Vec3D.S3D.axisConstraint && i < 3) return "...";
          if (Vec3D.S3D.axisConstraint) {
              if (Vec3D.S3D.axisConstraint === 'x' && i === 0) return "...";
              if (Vec3D.S3D.axisConstraint === 'y' && i === 1) return "...";
              if (Vec3D.S3D.axisConstraint === 'z' && i === 2) return "...";
          }
          return Number(val).toFixed(2).replace(/\.?0+$/, "");
      }).join(", ") + "]";
      App.coordOut?.(placeholder);

      const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
      if (group) {
          const lbl = group.children.find(ch => ch.isCSS2DObject);
          if (lbl) lbl.visible = false;
      }
      Vec3D.draw3DAllVectors(); 
    };

    // POINTER UP: Thả chuột chốt số
    const pointerUpHandler = (e) => {
      if (Vec3D.S3D.draggedVectorId) {
          // 1. Chốt số Vector vật thể
          const draggedVec = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
          if (draggedVec) {
              draggedVec.vec = draggedVec.vec.map(val => Number(Number(val).toFixed(2)));
              draggedVec.latex = `[${draggedVec.vec.join(", ")}]`;
          }

          Vec3D.S3D.draggedVectorId = null;
          Vec3D._controls.enabled = true; // Mở lại OrbitControls
          renderDom.style.cursor = "default";
          if (renderDom.releasePointerCapture && e.pointerId) renderDom.releasePointerCapture(e.pointerId);

          // 2. Chốt số Vector bóng (Hình chiếu)
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

          if (App.renderVectorList) App.renderVectorList();
          if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
          
          Vec3D.draw3DAllVectors();
      }
    };

    renderDom.addEventListener("pointerdown", pointerDownHandler);
    renderDom.addEventListener("pointermove", pointerMoveHandler);
    renderDom.addEventListener("pointerup", pointerUpHandler);
    renderDom.addEventListener("pointercancel", pointerUpHandler);

    // Kéo 2 ngón Mobile (Zoom & Pan)
    let lastTouchDistance = null;
    renderDom.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.hypot(dx, dy);
      } else {
        lastTouchDistance = null;
      }
    }, { passive: false });

    renderDom.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && lastTouchDistance !== null) {
        e.preventDefault(); e.stopImmediatePropagation();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const distDiff = currentDist - lastTouchDistance;

        if (Math.abs(distDiff) > 1) {
          const factor = distDiff > 0 ? 1.05 : 1 / 1.05;
          applyMathZoom(distDiff > 0 ? 1 : -1, factor);
          lastTouchDistance = currentDist;
          if (Vec3D.S3D.draggedVectorId) {
             const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
             if (group && !isDepthDrag) {
                 const tipWorld = group.userData.tipLocal.clone().multiplyScalar(factor).add(Vec3D.S3D.offset);
                 const camDir = new THREE.Vector3();
                 Vec3D._camera.getWorldDirection(camDir);
                 dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
                 pointerMoveHandler(e);
             }
          }
        }
      }
    }, { passive: false });

    renderDom.addEventListener("touchend", () => { lastTouchDistance = null; });

    // --- CÁC SỰ KIỆN KHÁC (Change, Resize, Keydown) ---
    Vec3D._controls.addEventListener("change", () => {
      if (App.mode !== "3D") return;
      Vec3D.addAxisLabelsDynamic();
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    });

    const onResize = () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(threeLayer);

    renderDom.addEventListener("mouseenter", () => { Vec3D._hover3D = true; threeLayer.focus(); });
    renderDom.addEventListener("mouseleave", () => { Vec3D._hover3D = false; });

    document.addEventListener("keydown", (e) => {
      const controlsPane = document.getElementById("controls");
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || (controlsPane && controlsPane.contains(e.target));
      if (App.mode !== "3D" || !Vec3D._hover3D || typing) return;
      const key = e.key.toLowerCase();
      Vec3D._pressed.add(key);
      if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
        e.preventDefault(); e.stopPropagation();
      }
    }, { capture: true });

    document.addEventListener("keyup", (e) => {
      const controlsPane = document.getElementById("controls");
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || (controlsPane && controlsPane.contains(e.target));
      if (typing) return;
      const key = e.key.toLowerCase();
      if (Vec3D._pressed.has(key)) {
        Vec3D._pressed.delete(key);
        e.preventDefault(); e.stopPropagation();

        // Vừa nhả hết phím WASD xong -> Chốt sổ
        if (["w", "a", "s", "d", "q", "e"].includes(key) && Vec3D._pressed.size === 0) {
            const activeVec = App.vectorList.find(v => v.id === Vec3D.S3D.activeVectorId || v.focus);
            if (activeVec) {
                if (App.renderVectorList) App.renderVectorList();
                if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
                
                // [FIX LỖI ANIMATION CHẠY LẠI]: Bỏ btn.click(), ép chữ hiển thị tức thì
                if (App.currentProjVisual) {
                    const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
                    const mf = document.querySelector("#calcSteps math-field");
                    if (res && mf) {
                        const fmtVal = (n) => {
                            let x = Number(n);
                            if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
                            return String(parseFloat(x.toFixed(4)));
                        };
                        mf.value = `\\left( ${res.vec.map(fmtVal).join(",\\; ")} \\right)`;
                    }
                }
                Vec3D.draw3DAllVectors();
            }
        }
      }
    }, { capture: true });

    const stepLoop = () => {
      if (App.mode === "3D" && Vec3D._pressed.size && Vec3D._camera && Vec3D._controls) {
        
        // 1. Tính toán hướng mũi Camera hiện tại
        const forward = new THREE.Vector3();
        Vec3D._camera.getWorldDirection(forward);
        forward.normalize();
        
        const worldUp = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        
        const move = new THREE.Vector3();
        if (Vec3D._pressed.has("w")) move.add(forward);
        if (Vec3D._pressed.has("s")) move.sub(forward);
        if (Vec3D._pressed.has("a")) move.sub(right);
        if (Vec3D._pressed.has("d")) move.add(right);
        
        // [BONUS CỦA TUI]: Nhấn Q để đẩy thẳng lên trời, E để dìm thẳng xuống đất (trục Z)
        if (Vec3D._pressed.has("q")) move.add(worldUp);
        if (Vec3D._pressed.has("e")) move.sub(worldUp);

        if (move.lengthSq() > 0) {
          move.normalize();

          // 2. TÌM VẬT THỂ CẦN ĐIỀU KHIỂN: Ưu tiên Vector đang click hoặc Vector đang chọn ở Sidebar
          const activeVec = App.vectorList.find(v => v.id === Vec3D.S3D.activeVectorId || v.focus);
          
          if (activeVec) {
              // --- CHẾ ĐỘ LÁI VECTOR ---
              const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
              // Shift để tăng tốc độ lái (bay nhanh hơn)
              const speed = (Vec3D._pressed.has("shift") ? 0.05 : 0.01) * (Vec3D._axisMaxWorld / u);
              move.multiplyScalar(speed);

              // Cập nhật thẳng tọa độ Toán học
              activeVec.vec[0] = (activeVec.vec[0] || 0) + move.x / u;
              activeVec.vec[1] = (activeVec.vec[1] || 0) + move.y / u;
              activeVec.vec[2] = (activeVec.vec[2] || 0) + move.z / u;

              // Giao diện tĩnh lặng [..., ..., ..., N]
              const placeholder = "[" + activeVec.vec.map((val, i) => i < 3 ? "..." : val).join(", ") + "]";
              App.coordOut?.(placeholder);

              // Ẩn Label để tránh vướng víu
              const group = Vec3D.threeVecMap.get(activeVec.id);
              if (group) {
                  const lbl = group.children.find(ch => ch.isCSS2DObject);
                  if (lbl) lbl.visible = false;
              }
              
              // Gọi Card màn hình vẽ lại ngay lập tức
              Vec3D.draw3DAllVectors();
              
          } else {
              // --- CHẾ ĐỘ LÁI CAMERA VỀ GỐC (Nếu không có vector nào được chọn) ---
              const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
              const speed = (Vec3D._pressed.has("shift") ? 0.01 : 0.005) * base;
              move.multiplyScalar(speed);
              Vec3D._camera.position.add(move);
              Vec3D._controls.target.add(move);
              Vec3D._controls.update();
          }
        }
      }
      Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
    };
    if (!Vec3D._kbAnimId) Vec3D._kbAnimId = requestAnimationFrame(stepLoop);

    Vec3D.update3DHelpersBase();
    Vec3D.show3D();
    requestAnimationFrame(() => Vec3D.hardRefresh3D(false));
  };

  // =========================================================
  // SYNC & RENDER LOOP
  // =========================================================
  Vec3D._syncVectorList = function () {
    const list = (App.vectorList || []).map((v) => [
      v.id ?? null,
      v.visible !== false ? 1 : 0,
      ...toVec3(v.vec).map((val) => +val.toFixed(12)),
      v.focus ? 1 : 0,
      +(typeof v.alpha === "number" ? v.alpha : 1).toFixed(3),
      String(v.colorHex || v.colorCss || ""),
    ]);
    const sig = JSON.stringify(list);
    if (sig !== Vec3D._vecSignature) {
      Vec3D._vecSignature = sig;
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      if (Vec3D._renderer) Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  Vec3D.show3D = function () {
    if (!Vec3D._scene) Vec3D.init3D();

    const c2d = document.getElementById("canvas2d");
    if (c2d) c2d.style.display = "none";
    threeLayer.style.display = "block";
    try {
      threeLayer.focus({
        preventScroll: true,
      });
    } catch (_) {}
    Vec3D._hover3D = true;

    if (!Vec3D._animating) {
      Vec3D._animating = true;
      (function loop() {
        if (!Vec3D._animating) return;
        requestAnimationFrame(loop);

        // --- ENERGY PULSE (Focus) ---
        if (Vec3D._vectorsGroup) {
          const time = Date.now() * PULSE_SPEED_3D;
          const pulseOpacity = 0.2 + ((Math.sin(time) + 1) / 2) * 0.5; // 0.2 -> 0.7

          Vec3D._vectorsGroup.traverse((obj) => {
            if (obj.userData?.isFocusPulse && obj.material) {
              obj.material.opacity = pulseOpacity;
            }
          });
        }
        // -----------------------------

        if (Vec3D._controls) {
          Vec3D._controls.update();
          Vec3D._syncVectorList();
        }
        const target = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, Vec3D.S3D.zoomTarget),
        );
        Vec3D.S3D.unitsPerWorld = target;
        const diff = Math.abs(Vec3D.S3D.unitsPerWorld - target);
        const eps = Math.max(1e-9, Math.abs(target) * 1e-9);
        if (diff <= eps) {
          Vec3D.S3D.unitsPerWorld = target;
          Vec3D.S3D.hasPivot = false;
        }
        Vec3D.addAxisLabelsDynamic();
        if (Vec3D._renderer)
          Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        if (Vec3D._labelRenderer)
          Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // =========================================================
  // SCENE HELPERS (GRID, AXES)
  // =========================================================
  Vec3D.update3DHelpersBase = function () {
    if (!Vec3D._scene) return;

    const Lw = Vec3D._axisMaxWorld;
    if (!Vec3D._frameGroup) {
      Vec3D._frameGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._frameGroup);
    } else {
      Vec3D._frameGroup.clear();
    }

    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(Lw * 2, Lw * 2, Lw * 2)),
      new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.25,
      }),
    );
    Vec3D._frameGroup.add(cube);

    if (!Vec3D._mathGroup) {
      Vec3D._mathGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._mathGroup);
    } else {
      const keepVectors = Vec3D._vectorsGroup || new THREE.Group();
      const keepAngles = Vec3D._angleLayer || new THREE.Group();
      keepVectors.parent && keepVectors.parent.remove(keepVectors);
      keepAngles.parent && keepAngles.parent.remove(keepAngles);
      Vec3D._mathGroup.clear();
      Vec3D._vectorsGroup = keepVectors;
      Vec3D._angleLayer = keepAngles;
    }
    if (!Vec3D._vectorsGroup) Vec3D._vectorsGroup = new THREE.Group();
    if (!Vec3D._angleLayer) Vec3D._angleLayer = new THREE.Group();

    Vec3D._planeXY = new THREE.Mesh(
      new THREE.PlaneGeometry(Lw * 2, Lw * 2),
      new THREE.MeshBasicMaterial({
        color: App.getCSS?.("--card") || "#222",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    Vec3D._planeXY.renderOrder = 0;
    Vec3D._mathGroup.add(Vec3D._planeXY);

    Vec3D._axesGroup = (function buildAxesWorld(L) {
      const g = new THREE.Group();
      const mk = (a, b, cssVar) =>
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(App.getCSS?.(cssVar) || "#888"),
          }),
        );
      g.add(
        mk(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0), "--axis-x"),
      );
      g.add(
        mk(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0), "--axis-y"),
      );
      g.add(
        mk(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L), "--axis-z"),
      );
      return g;
    })(Lw);
    Vec3D._mathGroup.add(Vec3D._axesGroup);
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    Vec3D._mathGroup.add(Vec3D._angleLayer);
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
  };

  function niceStep(raw) {
    raw = Math.max(1e-12, Math.abs(raw));
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = raw / p;
    const m = s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10;
    
    // [FIX] Bỏ Math.max(1, ...) để cho phép vạch chia là số thập phân (vd: 0.1, 0.01...)
    return m * p; 
  }

  function formatTick(v, step) {
    if (!isFinite(v)) return "";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    const s = Math.max(1e-300, Math.abs(step || 1));
    const expStep = Math.floor(Math.log10(s));
    let sig = 1 + (Math.floor(Math.log10(abs)) - expStep);
    sig = Math.max(1, Math.min(6, sig));
    if (abs >= 1e6 || abs < 1e-6)
      return Number(v)
        .toExponential(sig - 1)
        .replace("+", "");
    const dec = Math.max(0, -expStep);
    let out = (Math.round(v / step) * step).toFixed(Math.min(6, dec));
    if (out.includes(".")) out = out.replace(/\.?0+$/, "");
    return out;
  }

  // =========================================================
  // DYNAMIC LABELS
  // =========================================================
  Vec3D.addAxisLabelsDynamic = function () {
    if (!Vec3D._camera || !Vec3D._renderer || !Vec3D._mathGroup) return;
    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lw = Vec3D._axisMaxWorld;
    const Lm = Lw / u;

    if (Vec3D.S3D.hasPivot) {
      const pos = Vec3D.S3D.pivotWorld
        .clone()
        .sub(Vec3D.S3D.pivotMath.clone().multiplyScalar(u));
      Vec3D.S3D.offset.copy(pos);
    }
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);

    const dist = Vec3D._camera.position.distanceTo(
      Vec3D._controls?.target || new THREE.Vector3(),
    );
    const vFOV = (Vec3D._camera.fov * Math.PI) / 180;
    const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
    const worldH = 2 * Math.tan(vFOV / 2) * dist;
    const pxPerWorld = screenH / worldH;
    const pxPerMath = pxPerWorld * u;
    Vec3D._pxPerWorld = pxPerWorld;

    if (Math.abs(u - (Vec3D._lastUForVectors || 0)) > 1e-6) {
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      const g = App.currentAngleVisual3D;
      if (g?.userData?.angleMeta) {
        const u0 = g.userData.angleMeta.createdU || 1;
        const s = u / u0;
        g.scale.set(s, s, s);
        
      }
      Vec3D._lastUForVectors = u;
    }

    const targetPx = 80;
    const step = niceStep(targetPx / Math.max(1e-30, pxPerMath));
    Vec3D.S3D.stepUnit = step;
    const off = Vec3D.S3D.offset;
    const key = `${Lw}|${step}|${u}|${App.theme}|${Math.round(dist * 1000)}|${off.x.toFixed(4)},${off.y.toFixed(4)},${off.z.toFixed(4)}`;

    if (key === Vec3D._lastLabelKey) return;
    Vec3D._lastLabelKey = key;

    if (Vec3D._ticksGroup) {
      Vec3D._mathGroup.remove(Vec3D._ticksGroup);
      Vec3D._ticksGroup.geometry.dispose();
      Vec3D._ticksGroup.material.dispose();
      Vec3D._ticksGroup = null;
    }
    for (const o of Vec3D._tickLabels) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    for (const o of Vec3D._axisLetters) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    Vec3D._tickLabels.length = 0;
    Vec3D._axisLetters.length = 0;

    const t0x = -Vec3D.S3D.offset.x / u;
    const t0y = -Vec3D.S3D.offset.y / u;
    const t0z = -Vec3D.S3D.offset.z / u;

    function buildMajorsAround(t0) {
      const start = Math.ceil((t0 - Lm) / step) * step;
      const end = Math.floor((t0 + Lm) / step) * step;
      const arr = [];
      for (let t = start; t <= end + 1e-12; t += step) arr.push(+t.toFixed(12));
      return arr;
    }
    const majorsX = buildMajorsAround(t0x);
    const majorsY = buildMajorsAround(t0y);
    const majorsZ = buildMajorsAround(t0z);

    const tickLenW = Math.max(Lw * 0.02, 0.25);
    const pos = [];
    const addMajor = (axis, tMath) => {
      const s = tMath * u;
      if (axis === "x") pos.push(s, -tickLenW, 0, s, +tickLenW, 0);
      if (axis === "y") pos.push(-tickLenW, s, 0, +tickLenW, s, 0);
      if (axis === "z") pos.push(-tickLenW, 0, s, +tickLenW, 0, s);
    };
    majorsX.forEach((t) => addMajor("x", t));
    majorsY.forEach((t) => addMajor("y", t));
    majorsZ.forEach((t) => addMajor("z", t));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    Vec3D._ticksGroup = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(App.getCSS?.("--grid-light") || "#444").getHex(),
      }),
    );
    Vec3D._mathGroup.add(Vec3D._ticksGroup);

    const putLabel = (axis, tMath) => {
      if (Math.abs(tMath) <= 1e-12) return;
      const txt = formatTick(tMath, step);
      const outer = document.createElement("div");
      outer.className = "axis-label-outer";
      const inner = document.createElement("div");
      inner.className = `axis-label-inner axis-${axis}`;
      inner.textContent = txt;
      inner.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
      outer.appendChild(inner);
      const obj = new THREE.CSS2DObject(outer);
      const s = tMath * u;
      obj.position.set(
        axis === "x" ? s : 0,
        axis === "y" ? s : 0,
        axis === "z" ? s : 0,
      );
      Vec3D._mathGroup.add(obj);
      Vec3D._tickLabels.push(obj);
    };
    majorsX.forEach((t) => putLabel("x", t));
    majorsY.forEach((t) => putLabel("y", t));
    majorsZ.forEach((t) => putLabel("z", t));

    const letterOffW = Lw * 0.98;
    const addLetter = (txt, axis, position) => {
      const el = document.createElement("div");
      el.className = "axis-letter";
      el.textContent = txt;
      el.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
      const obj = new THREE.CSS2DObject(el);
      obj.position.copy(position);
      Vec3D._mathGroup.add(obj);
      Vec3D._axisLetters.push(obj);
    };
    addLetter("X", "x", new THREE.Vector3(letterOffW, 0, 0));
    addLetter("Y", "y", new THREE.Vector3(0, letterOffW, 0));
    addLetter("Z", "z", new THREE.Vector3(0, 0, letterOffW));

    (function updateTipLabels() {
      if (!Vec3D._vectorsGroup) return;
      // Dịch nhãn ra xa một chút (đơn vị pixel) để không đè vào mũi tên
      const desiredPx = 25; 
      const offsetW = desiredPx / (Vec3D._pxPerWorld || 1);
      
      for (const g of Vec3D._vectorsGroup.children) {
        const tip = g.userData?.tipLocal;
        if (!tip) continue;
        const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
        if (!lbl) continue;
        
        // Đẩy nhãn lệch ra một khoảng cố định (tip + offset)
        lbl.position.copy(tip.clone().add(new THREE.Vector3(offsetW, offsetW, offsetW)));
      }
    })();

    (function updateAngleLabel() {
      const g = App.currentAngleVisual3D;
      if (!g || !g.userData?.angleMeta) return;
      const {
        midDir,
        r,
        labelPx = Vec3D.ANGLE_LABEL_PX,
        gapPx = Vec3D.ANGLE_LABEL_GAP_PX,
      } = g.userData.angleMeta;
      const lbl = g.children.find((ch) => ch.isCSS2DObject);
      if (!lbl) return;
      const pxPerWorld = Vec3D._pxPerWorld || 1;
      const s = g.scale?.x || 1;
      const padPx = (gapPx || 0) + (labelPx || 0) * 0.5;
      const insetW = padPx / pxPerWorld;
      const distLocal = r + outsetW / s;
      lbl.position.copy(midDir.clone().multiplyScalar(distLocal));
    })();
  };

  // =========================================================
  // VECTOR DRAWING
  // =========================================================
  Vec3D.buildProjectionGroupZUp = function (
    vecWorld,
    colorCSS = "#444",
    alpha = 1,
  ) {
    const g = new THREE.Group();
    const [x, y, z] = vecWorld;
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35,
      transparent: true,
      opacity: Math.max(0, Math.min(1, Number(alpha) || 0)),
    });
    const mk = (pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(geo, mat);
      l.computeLineDistances();
      return l;
    };
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(0, y, z)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, 0, z)]));
    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, 0, 0)]));
    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(0, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, z), new THREE.Vector3(0, 0, z)]));
    g.add(mk([new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 0, z)]));
    g.add(mk([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(x, 0, z)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(0, y, z)]));
    return g;
  };

  function clipToCubeMath(x, y, z, L) {
    const tip = new THREE.Vector3(x, y, z);
    if (Math.abs(x) <= L && Math.abs(y) <= L && Math.abs(z) <= L) return tip;
    const tx = x ? (Math.sign(x) * L) / x : Infinity;
    const ty = y ? (Math.sign(y) * L) / y : Infinity;
    const tz = z ? (Math.sign(z) * L) / z : Infinity;
    const t = Math.min(
      tx > 0 ? tx : Infinity,
      ty > 0 ? ty : Infinity,
      tz > 0 ? tz : Infinity,
    );
    return isFinite(t) ? tip.multiplyScalar(t) : new THREE.Vector3(0, 0, 0);
  }

  Vec3D._sameVec = function (a, b, eps = 1e-9) {
    if (!a || !b) return false;
    return (
      Math.abs(a[0] - b[0]) < eps &&
      Math.abs(a[1] - b[1]) < eps &&
      Math.abs(a[2] - b[2]) < eps
    );
  };

  Vec3D._maybeInvalidateAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g?.userData?.angleMeta?.src) return;
    const { a: A0, b: B0 } = g.userData.angleMeta.src;
    const cur = (App.vectorList || []).filter((v) => v.visible !== false);
    const hasA = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), A0));
    const hasB = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), B0));
    if (!(hasA && hasB) || cur.length === 0) Vec3D.clearAngle();
  };

  Vec3D.draw3DAllVectors = function (opts = { frame: false }) {
    if (!Vec3D._mathGroup) {
      if (Vec3D.init3D) Vec3D.init3D();
      if (!Vec3D._mathGroup) return;
    }

    Vec3D._maybeInvalidateAngle();
    if (!Vec3D._vectorsGroup) {
      Vec3D._vectorsGroup = new THREE.Group();
      Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    }

    Vec3D._vectorsGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    Vec3D._vectorsGroup.clear();
    Vec3D.threeVecMap.clear();

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lm = Vec3D._axisMaxWorld / u;

    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);

    // Sort: Focus last
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0));

    for (const it of list) {
      const v = toVec3(it.vec);
      let aItem =
        typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1;

      // Dim others
      if (hasFocus && !it.focus) aItem *= 0.15;

      const tipM = clipToCubeMath(v[0], v[1], v[2], Lm);
      const tipLocal = tipM.clone().multiplyScalar(u);
      const len = Math.max(tipLocal.length(), 1e-9);
      const dirLocal = len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1, 0, 0);

      // --- CHÌA KHÓA LUẬT XA GẦN BÊN 3D (ĐỒNG BỘ 2D) ---
      // 1. Mũi tên: Nhân với u để khi zoom xa (u nhỏ) thì mũi tên teo lại. 
      // VÀ ép điều kiện: Mũi tên cao tối đa = 30% chiều dài vector (Chống đầu to hơn thân)
      const DYN_HEAD_H = Math.min(0.25 * u, len * 0.3);
      const DYN_HEAD_R = DYN_HEAD_H * 0.32; // Bán kính mũi tên tỷ lệ thuận với chiều cao

      // 2. Thân vector: Tính chiều dài thực tế (Toán học). Vector càng dài thì cho thân mập lên chút đỉnh.
      const mathLen = Math.hypot(v[0], v[1], v[2]);
      const lengthFactor = Math.max(1, Math.min(mathLen * 0.2, 2.5)); 
      const DYN_SHAFT_R = (0.025 * u) * lengthFactor;

      const shaftLen = Math.max(len - DYN_HEAD_H, 1e-6);
      const color = new THREE.Color(it.colorHex || it.colorCss || "#ffffff");

      const group = new THREE.Group();
      group.userData.tipLocal = tipLocal;
      group.userData.dirLocal = dirLocal;

      if (it.focus) {
        // [ENERGY PULSE]
        const pulseMat = new THREE.MeshBasicMaterial({
          color: PULSE_COLOR_3D,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          side: THREE.FrontSide,
        });

        const pulseShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(
            DYN_SHAFT_R + 0.05 * u, // Kẹp thêm *u để viền Glow cũng xa gần chuẩn
            DYN_SHAFT_R + 0.05 * u,
            shaftLen,
            12, 1, true
          ),
          pulseMat,
        );
        pulseShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
        pulseShaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));
        pulseShaft.userData.isFocusPulse = true;
        group.add(pulseShaft);

        const pulseHead = new THREE.Mesh(
          new THREE.ConeGeometry(
            DYN_HEAD_R + 0.08 * u,
            DYN_HEAD_H + 0.1 * u,
            12
          ),
          pulseMat,
        );
        pulseHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
        pulseHead.position.copy(tipLocal.clone().addScaledVector(dirLocal, -(DYN_HEAD_H + 0.1 * u) / 2));
        pulseHead.userData.isFocusPulse = true;
        group.add(pulseHead);
      }

      const isTransparent = aItem < 0.98;
      const vecMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: isTransparent,
        opacity: aItem,
        depthWrite: !isTransparent,
      });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(
          DYN_SHAFT_R,
          DYN_SHAFT_R,
          shaftLen,
          GEOM_QUALITY.shaftSeg, 1, true
        ),
        vecMat,
      );
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      shaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(DYN_HEAD_R, DYN_HEAD_H, GEOM_QUALITY.headSeg),
        vecMat,
      );
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      head.position.copy(tipLocal.clone().addScaledVector(dirLocal, -DYN_HEAD_H / 2));

      const proj = Vec3D.buildProjectionGroupZUp(
        [tipLocal.x, tipLocal.y, tipLocal.z],
        App.getCSS?.("--axis") || "#888",
        aItem * 0.9,
      );
      
      const el = document.createElement("div");
      el.className = "tip-label";
      el.textContent = App.formatTip ? App.formatTip(it.vec) : `[${it.vec.join(", ")}]`;
      el.style.opacity = String(aItem);
      const labelEl = new THREE.CSS2DObject(el);
      labelEl.name = "tipLabel";
      labelEl.position.copy(tipLocal);

      if (aItem <= 0.001) {
        group.visible = false;
      }

      if (App._basisAnimActive && it._basisIsBasis) {
        group.renderOrder = 999;
        shaft.renderOrder = 999;
        head.renderOrder = 999;
        shaft.material.depthTest = false;
        head.material.depthTest = false;
        shaft.material.depthWrite = false;
        head.material.depthWrite = false;
      } else {
        group.renderOrder = 1;
      }

      group.add(shaft, head, proj, labelEl);
      Vec3D._vectorsGroup.add(group);
      Vec3D.threeVecMap.set(it.id, group);
    }

    if (opts.frame) {
      const hasVec = (App.vectorList || []).some((v) => v.visible !== false);
      if (!hasVec) {
        Vec3D.S3D.unitsPerWorld = 1;
        Vec3D._camera.position.set(17, 17, 17);
      } else {
        const longest = Math.max(
          ...App.vectorList.map((it) => {
            const v3 = toVec3(it.vec);
            return Math.sqrt(v3[0] ** 2 + v3[1] ** 2 + v3[2] ** 2);
          }),
        );
        Vec3D.S3D.unitsPerWorld = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, (Lm * u * 0.55) / Math.max(1e-9, longest)),
        );
        const dist = Math.min(40, Math.max(32, Lm * u * 1.15));
        Vec3D._camera.position.set(dist, dist, dist);
        Vec3D._controls.target.copy(Vec3D.S3D.offset);
        Vec3D._controls.update();
      }
    }
    if (App.currentVector) {
      const txt = App.formatTip
        ? App.formatTip(App.currentVector)
        : `[${App.currentVector.join(",")}]`;
      App.coordOut?.(txt + (App.currentVector.length > 3 ? " (Chiếu 3D)" : ""));
    } else {
      App.coordOut?.("—");
    }

    const normalizeGhost = App.tempGhosts?.find((g) => g.isNormalize);
    if (normalizeGhost) {
      Vec3D._drawUnitSphere(normalizeGhost.unitCircleAlpha);
    } else if (Vec3D._unitSphereMesh) {
      Vec3D._unitSphereMesh.visible = false;
    }
  };

  // =========================================================
  // ANGLE VISUALS (FILLED IN LOGIC)
  // =========================================================
  Vec3D.clearAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;
    (g.parent || Vec3D._mathGroup || Vec3D._scene).remove(g);
    g.traverse((obj) => {
      obj.element?.remove?.();
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    App.currentAngleVisual3D = null;
  };

  Vec3D.refreshAngleTheme = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;

    // 1. Phục hồi màu sắc cho mặt quét và đường viền cung tròn
    const mesh = g.children.find((c) => c.isMesh);
    if (mesh && mesh.material) {
      mesh.material.color = new THREE.Color(0xffaa00);
      mesh.material.opacity = 0.3;
    }
    const line = g.children.find((c) => c.isLine);
    if (line && line.material) {
      line.material.color = new THREE.Color(0xffaa00);
    }

    // 2. Chuyển màu chữ Trắng/Đen theo Theme
    const lbl = g.children.find((c) => c.isCSS2DObject);
    if (lbl && lbl.element) {
      lbl.element.style.color = (window.App && App.theme === "dark") ? "#ffffff" : "#000000";
    }
  };

  Vec3D.removeAllAngleVisuals = function () {
    Vec3D.clearAngle();
  };

  // HÀM VẼ GÓC 3D (Được viết đầy đủ)
  Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
    Vec3D.clearAngle(); // Xóa cái cũ trước

    const u = Vec3D.S3D.unitsPerWorld || 1;
    const rawA = new THREE.Vector3(...toVec3(v1));
    const rawB = new THREE.Vector3(...toVec3(v2));
    const A = rawA.clone().normalize();
    const B = rawB.clone().normalize();

    // Nếu 2 vector song song hoặc trùng nhau -> không vẽ
    if (A.lengthSq() < 1e-9 || B.lengthSq() < 1e-9) return;
    const angleVal = A.angleTo(B);
    if (Math.abs(angleVal) < 1e-5) return;

    // [FIX] Bán kính: Lấy 60% chiều dài của vector ngắn nhất để không bị lố
    const minLen = Math.min(rawA.length(), rawB.length());
    const displayRadius = Math.max(0.5, minLen * 0.6) * u;

    // Tạo geometry cung tròn
    const curve = new THREE.EllipseCurve(
      0,
      0, // ax, aY
      displayRadius,
      displayRadius, // xRadius, yRadius
      0,
      angleVal, // startAngle, endAngle
      false, // clockwise
      0, // rotation
    );
    const pts = curve.getPoints(32);
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);

    // Vật liệu (Material)
    const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
    const arcLine = new THREE.Line(geometry, material);

    // Tạo mặt phẳng rẻ quạt (Mesh) cho đẹp
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    pts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(0, 0);
    const meshGeo = new THREE.ShapeGeometry(shape);
    const meshMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(meshGeo, meshMat);

    // Group chứa tất cả
    const group = new THREE.Group();
    group.add(arcLine);
    group.add(mesh);

    // Xoay Group để khớp với mặt phẳng tạo bởi 2 vector
    // Trục Z mặc định của EllipseCurve là (0,0,1). Ta cần xoay nó trùng với Cross(A, B).
    const normal = new THREE.Vector3().crossVectors(A, B).normalize();
    // Nếu cross = 0 (song song), dùng trục bất kỳ
    if (normal.lengthSq() < 0.001) normal.set(0, 0, 1);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
    group.setRotationFromQuaternion(quaternion);

    // Xoay tiếp để điểm bắt đầu khớp với A
    // EllipseCurve bắt đầu tại (Radius, 0, 0) local.
    // Sau khi xoay phẳng, vector (1,0,0) local sẽ nằm trên mặt phẳng.
    // Ta cần xoay quanh trục Normal sao cho vector đó trùng với A.
    const startVecLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(
      quaternion,
    );
    const angleOffset = startVecLocal.angleTo(A);
    // Kiểm tra hướng xoay (trái hay phải)
    const testCross = new THREE.Vector3().crossVectors(startVecLocal, A);
    const sign = testCross.dot(normal) >= 0 ? 1 : -1;

    group.rotateOnAxis(new THREE.Vector3(0, 0, 1), sign * angleOffset);

    // Label hiển thị số độ
    const degTxt = (deg !== undefined ? deg : (angleVal * 180) / Math.PI).toFixed(1) + "°";
    const div = document.createElement("div");
    div.className = "angle-label";
    div.textContent = degTxt;
    
    // [FIX] Đổi màu chữ Trắng/Đen theo Theme
    div.style.color = (window.App && App.theme === "dark") ? "#ffffff" : "#000000";
    div.style.fontWeight = "bold"; // In đậm cho dễ nhìn
    
    const labelObj = new THREE.CSS2DObject(div);

    // [FIX] Dùng tọa độ Local, KHÔNG applyQuaternion để chữ không bị văng ra vũ trụ
    const midAngle = angleVal / 2;
    const midDirLocal = new THREE.Vector3(Math.cos(midAngle), Math.sin(midAngle), 0);
    
    labelObj.position.copy(midDirLocal.clone().multiplyScalar(displayRadius + 0.6 * u));
    group.add(labelObj);

    // Metadata để scale theo zoom (Truyền đúng midDirLocal vào)
    group.userData.angleMeta = {
      src: { a: toVec3(v1), b: toVec3(v2) },
      createdU: u,
      r: displayRadius,
      midDir: midDirLocal.clone().normalize(),
    };

    Vec3D._angleLayer.add(group);
    App.currentAngleVisual3D = group;
  };

  // [THÊM MỚI] Hàm này giúp Animation chạy mượt mà không bị xóa mất Ghost
  Vec3D.renderOnce = function () {
    if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  // --- UTILS ---
  Vec3D.hardRefresh3D = function (frameFirst = false) {
    if (App.mode !== "3D") return;
    if (!Vec3D._scene) Vec3D.init3D();
    Vec3D.draw3DAllVectors({
      frame: frameFirst,
    });
    Vec3D._controls.update();
    Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
  };

  Vec3D.setFOV = function (fovDeg = 24) {
    if (!Vec3D._camera) return;
    Vec3D._camera.fov = Math.max(5, Math.min(90, fovDeg));
    Vec3D._camera.updateProjectionMatrix();
    Vec3D.hardRefresh3D(false);
  };

  Vec3D.resetView = function () {
    if (!Vec3D._camera || !Vec3D._controls) return;
    if (Vec3D._resetAnimId) cancelAnimationFrame(Vec3D._resetAnimId);
    const startPos = Vec3D._camera.position.clone();
    const startTarget = Vec3D._controls.target.clone();
    const startZoom = Vec3D.S3D.unitsPerWorld;
    const targetPos = new THREE.Vector3(10, 10, 10);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const targetZoom = 1;
    const duration = 1000;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      Vec3D._camera.position.lerpVectors(startPos, targetPos, ease(progress));
      Vec3D._controls.target.lerpVectors(
        startTarget,
        targetLookAt,
        ease(progress),
      );
      Vec3D.S3D.unitsPerWorld =
        startZoom + (targetZoom - startZoom) * ease(progress);
      Vec3D.S3D.zoomTarget = Vec3D.S3D.unitsPerWorld;
      Vec3D._controls.update();
      if (!Vec3D._animating) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D.addAxisLabelsDynamic();
      }
      if (progress < 1) Vec3D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec3D._resetAnimId = null;
        Vec3D.S3D.offset.set(0, 0, 0);
        Vec3D.S3D.hasPivot = false;
        Vec3D.hardRefresh3D(false);
      }
    }
    Vec3D._resetAnimId = requestAnimationFrame(loop);
  };

  Vec3D._drawUnitSphere = function (alpha) {
    if (!Vec3D._unitSphereMesh) {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      Vec3D._unitSphereMesh = new THREE.Mesh(geo, mat);
      Vec3D._mathGroup.add(Vec3D._unitSphereMesh);
    }
    const u = Vec3D.S3D.unitsPerWorld;
    Vec3D._unitSphereMesh.scale.setScalar(u); // Tỉ lệ theo zoom
    Vec3D._unitSphereMesh.material.opacity = alpha;
    Vec3D._unitSphereMesh.visible = alpha > 0.01;
  };
})();
