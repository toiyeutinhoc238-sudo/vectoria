/**
 * ==================================================================================
 * OPERATION ANIMATION CONTROLLER (FINAL DETAILED VERSION)
 * ==================================================================================
 * Module xử lý hiệu ứng hình ảnh (VFX) cho các phép toán Vector.
 */

(function () {
  window.App = window.App || {};

  // --- 1. CẤU HÌNH (CONFIG) ---
  const CONFIG = {
    DURATION: {
      PRE_FADE: 300, // Thời gian ẩn các vector không liên quan
      POPUP: 600, // Thời gian đèn pin hiện ra
      BEAM_ON: 300, // Thời gian bật sáng
      SHADOW_GROW: 800, // Thời gian bóng đổ dài ra
      CLEANUP: 600, // Thời gian dọn dẹp và hiện kết quả thật
      SLIDE: 1000, // Thời gian trượt cho phép cộng
    },
    COLOR: {
      BEAM: 0xffeb3b,
      BEAM_2D_START: "rgba(255, 235, 59, 0.1)",
      BEAM_2D_END: "rgba(255, 235, 59, 0.0)",
      SHADOW: 0x111111,
      LAMP_BODY: 0x212121,
      LAMP_RING: 0xffc107,
      LAMP_GLASS: 0xffffff,
    },
    GEOMETRY: {
      LAMP_OFFSET_3D: 3.5, // Khoảng cách đèn 3D
      LAMP_OFFSET_2D: 160, // Khoảng cách đèn 2D (px)
      BEAM_SCALE: 1.2, // Hệ số mở rộng bán kính chùm sáng
    },
  };

  const Easing = {
    linear: function (t) {
      return t;
    },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeOutBack: function (t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    elasticOut: function (t) {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return (
        Math.pow(2, -3 * t) * Math.sin(((t * 15 - 0.75) * (2 * Math.PI)) / 3) +
        1
      );
    },
  };

  // ==================================================================================
  // 2. CÁC HÀM TIỆN ÍCH CỐT LÕI (CORE UTILS)
  // ==================================================================================

  // Hàm vẽ lại màn hình (Hỗ trợ cả 2D và 3D)
  function requestRedraw() {
    if (App.mode === "3D" && window.Vec3D) {
      if (typeof Vec3D.renderOnce === "function") {
        Vec3D.renderOnce();
      } else if (typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      }
    } else if (App.mode === "2D" && window.Vec2D) {
      Vec2D.draw2DAllVectors();
    }
  }

  // Hàm chạy Tween Animation
  function runTween(duration, easing, onUpdate, onComplete) {
    const start = performance.now();
    function loop(now) {
      const p = Math.min((now - start) / duration, 1);
      onUpdate(easing(p));
      requestRedraw();
      if (p < 1) {
        requestAnimationFrame(loop);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(loop);
  }

  // Hàm ẩn các vector không liên quan (Fade Out)
  // keepIds: Danh sách ID các vector cần GIỮ LẠI (không ẩn)
  function fadeUnrelatedVectors(keepIds, targetAlpha, callback) {
    if (!App.vectorList) {
      if (callback) callback();
      return;
    }

    // Chuyển ID sang String để so sánh chính xác
    const safeKeepIds = keepIds.map(String);

    // Lọc các vector KHÔNG nằm trong danh sách giữ lại
    const targetVectors = App.vectorList.filter(function (v) {
      return !safeKeepIds.includes(String(v.id)) && v.visible !== false;
    });

    if (targetVectors.length === 0) {
      if (callback) callback();
      return;
    }

    const startAlpha =
      targetVectors[0].alpha !== undefined ? targetVectors[0].alpha : 1;

    runTween(
      CONFIG.DURATION.PRE_FADE,
      Easing.linear,
      function (v) {
        const currentAlpha = startAlpha + (targetAlpha - startAlpha) * v;

        targetVectors.forEach(function (item) {
          item.alpha = currentAlpha;
          // Nếu đang ở 3D, cập nhật trực tiếp Mesh Opacity
          if (window.Vec3D && Vec3D.threeVecMap) {
            const group = Vec3D.threeVecMap.get(item.id);
            if (group) setOpacity3D(group, currentAlpha);
          }
        });
      },
      callback,
    );
  }

  // ==================================================================================
  // 3. XỬ LÝ 3D (3D IMPLEMENTATION)
  // ==================================================================================

  function get3DGroup(id) {
    return window.Vec3D && Vec3D.threeVecMap ? Vec3D.threeVecMap.get(id) : null;
  }

  function setOpacity3D(group, val) {
    if (!group) return;
    group.traverse(function (c) {
      if (c.isMesh && c.material) {
        c.material.transparent = true;
        c.material.opacity = val;
        c.material.depthWrite = val > 0.5;
        c.visible = val > 0.01;
      }
      if (c.isCSS2DObject && c.element) {
        c.element.style.opacity = val;
        c.visible = val > 0.01;
      }
    });
  }

  // ==================================================================================
  // KỊCH BẢN HỌC THUẬT: HÌNH CHIẾU TRỰC GIAO (3 NHỊP CHUẨN SƯ PHẠM)
  // ==================================================================================

  // [Hệ 3D] Nhịp 1: Giá vươn ra -> Nhịp 2: Nét đứt rớt -> Nhịp 3: Fade In Hình chiếu
  function runAnimProj3D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !v2 || !res) return;

    App.currentProjVisual = null;
    if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();
    const resG = get3DGroup(resId);

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const u = Vec3D.S3D.unitsPerWorld || 1;
      
      const getTip = (id, vec) => {
          const g = get3DGroup(id);
          if (g && g.userData && g.userData.tipLocal) return g.userData.tipLocal.clone();
          return new THREE.Vector3(vec[0]*u, vec[1]*u, (vec[2]||0)*u);
      };

      const startP = getTip(v1Id, v1.vec);
      const endP = getTip(resId, res.vec);
      const v2P = getTip(v2Id, v2.vec);
      const distDash = startP.distanceTo(endP);
      
      // Tính độ dài Giá (Nhô ra khỏi điểm chạm một khoảng 0.5*u)
      const actionLen = Math.max(endP.length(), v2P.length()) + 0.5 * u;

      const animGroup = new THREE.Group();
      if (window.Vec3D) Vec3D._mathGroup.add(animGroup);

      const isDark = document.body.classList.contains("dark");
      const dashColor = isDark ? 0xcccccc : 0x666666;
      const actionColor = isDark ? 0x888888 : 0xaaaaaa;
      const tubeThick = Math.max(0.015 * u, 0.05);

      // 1. CHUẨN BỊ ỐNG TRỤ NÉT ĐỨT
      let dashedTubeGroup = new THREE.Group();
      dashedTubeGroup.position.copy(startP);
      if (distDash > 0.001) dashedTubeGroup.lookAt(endP); 

      if (distDash > 0.001) {
          const dashLen = Math.max(0.15 * u, 0.2); 
          const gapLen = dashLen * 0.8;          
          let currentZ = 0;
          while (currentZ < distDash) {
              let segmentLen = Math.min(dashLen, distDash - currentZ);
              const segmentGeo = new THREE.CylinderGeometry(tubeThick, tubeThick, segmentLen, 8);
              segmentGeo.translate(0, segmentLen / 2, 0);
              segmentGeo.rotateX(Math.PI / 2); 
              
              const mesh = new THREE.Mesh(segmentGeo, new THREE.MeshBasicMaterial({color: dashColor, transparent: true, opacity: 0.8}));
              mesh.position.set(0, 0, currentZ); 
              dashedTubeGroup.add(mesh);
              currentZ += dashLen + gapLen;
          }
      }
      dashedTubeGroup.scale.set(1, 1, 0.001); // Giấu đi chờ nhịp 2
      animGroup.add(dashedTubeGroup);

      // 2. CHUẨN BỊ GIÁ CỦA VECTOR (Line of action)
      const actionGeo = new THREE.CylinderGeometry(tubeThick * 0.6, tubeThick * 0.6, actionLen, 8);
      actionGeo.translate(0, actionLen / 2, 0);
      actionGeo.rotateX(Math.PI / 2);
      const actionMesh = new THREE.Mesh(actionGeo, new THREE.MeshBasicMaterial({color: actionColor, transparent: true, opacity: 0.5}));
      actionMesh.position.set(0, 0, 0);
      if (endP.lengthSq() > 0.001) actionMesh.lookAt(endP);
      else if (v2P.lengthSq() > 0.001) actionMesh.lookAt(v2P);
      actionMesh.scale.set(1, 1, 0.001); // Giấu đi chờ nhịp 1
      animGroup.add(actionMesh);

      // 3. CHUẨN BỊ GÓC VUÔNG
      let sqGroup = new THREE.Group();
      const dir1 = new THREE.Vector3().subVectors(startP, endP).normalize();
      let dir2 = endP.clone().multiplyScalar(-1).normalize();
      if (dir2.lengthSq() < 0.001 && v2) dir2 = v2P.clone().normalize();

      if (dir1.lengthSq() > 0.1 && dir2.lengthSq() > 0.1) {
        const sqSize = 0.15 * u; 
        const pA = endP.clone().add(dir1.clone().multiplyScalar(sqSize));
        const pB = endP.clone().add(dir2.clone().multiplyScalar(sqSize));
        const corner = endP.clone().add(dir1.clone().multiplyScalar(sqSize)).add(dir2.clone().multiplyScalar(sqSize));

        const createEdge = (pS, pE) => {
            const d = pS.distanceTo(pE);
            const geo = new THREE.CylinderGeometry(tubeThick * 0.5, tubeThick * 0.5, d, 6);
            geo.translate(0, d/2, 0);
            geo.rotateX(Math.PI/2);
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: dashColor}));
            mesh.position.copy(pS);
            mesh.lookAt(pE);
            return mesh;
        };
        sqGroup.add(createEdge(pA, corner));
        sqGroup.add(createEdge(pB, corner));
        sqGroup.visible = false; 
        animGroup.add(sqGroup);
      }

      // Giấu Vector kết quả chuẩn bị Fade In
      if (resG) { resG.visible = true; resG.scale.set(1, 1, 1); setOpacity3D(resG, 0); }

      // THỰC THI 3 NHỊP
      // Nhịp 1: Giá vector phóng ra tạo đường cơ sở
      runTween(400, Easing.easeInOutCubic, function(v) {
        actionMesh.scale.set(1, 1, Math.max(0.001, v));
      }, function() {
        
        // Nhịp 2: Nét đứt thả rớt xuống trúng cái Giá
        runTween(400, Easing.linear, function(v) {
            dashedTubeGroup.scale.set(1, 1, Math.max(0.001, v));
        }, function() {
            
            // Chạm đáy: Nháy góc vuông
            sqGroup.visible = true;

            // Nhịp 3: Fade In Vector kết quả đè lên Giá
            runTween(400, Easing.linear, function(v) {
                if (resG) setOpacity3D(resG, v);
            }, function() {
                res.alpha = 1;
                if (animGroup.parent) animGroup.parent.remove(animGroup); 
                App.currentProjVisual = { v1Id, v2Id, resId }; 
                if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();
                fadeUnrelatedVectors([v1Id, v2Id, resId], 1, () => requestRedraw());
            });
        });
      });
    });
  }

  // [Hệ 2D] Animation Hình chiếu (Đã Sửa Màu Thật & Giá)
  function runAnimProj2D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !v2 || !res) return;

    App.currentProjVisual = null;
    if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const dropVec = [res.vec[0] - v1.vec[0], res.vec[1] - v1.vec[1]];
      const endPx = res.vec[0], endPy = res.vec[1];
      
      const isDark = document.body.classList.contains("dark");
      const actionColor = isDark ? "#888888" : "#aaaaaa";

      let actionTarget = [endPx * 1.15, endPy * 1.15];
      if (actionTarget[0] === 0 && actionTarget[1] === 0) actionTarget = [v2.vec[0] * 1.15, v2.vec[1] * 1.15];

      // ĐƯỜNG GIÓNG (DROP GHOST) SỬ DỤNG MÀU THẬT CỦA V1
      const dropGhost = { 
        vec: [0, 0], offset: [...v1.vec], 
        colorCss: v1.colorCss, // MÀU THẬT CỦA V1
        alpha: 0.6, 
        isGhost: true, isDashed: true, noArrow: true, isRightAngle: false 
      };
      
      // GIÁ VECTOR SỬ DỤNG MÀU XÁM TRUNG TÍNH
      const actionGhost = { 
        vec: [0, 0], offset: [0, 0], 
        colorCss: actionColor, 
        alpha: 0.5, 
        isGhost: true, isDashed: false, noArrow: true, isRightAngle: false 
      };
      
      App.tempGhosts = [actionGhost, dropGhost];

      const targetRes = [...res.vec];
      res.vec = targetRes; 
      res.alpha = 0; 

      runTween(400, Easing.easeInOutCubic, function(v) {
        actionGhost.vec = [actionTarget[0] * v, actionTarget[1] * v]; 
      }, function() {
        runTween(400, Easing.linear, function(v) {
            dropGhost.vec = [dropVec[0] * v, dropVec[1] * v];
        }, function() {
            dropGhost.isRightAngle = true;
            runTween(400, Easing.linear, function(v) {
                res.alpha = v;
                requestRedraw();
            }, function() {
                setTimeout(() => {
                    res.alpha = 1;
                    App.tempGhosts = []; 
                    App.currentProjVisual = { v1Id, v2Id, resId };
                    if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();
                    fadeUnrelatedVectors([v1Id, v2Id, resId], 1, () => requestRedraw());
                }, 400);
            });
        });
      });
    });
  }
  // ==================================================================================
  // 4. XỬ LÝ 2D (2D IMPLEMENTATION)
  // ==================================================================================

  // Lấy tọa độ tuyệt đối (Absolute Coordinates) trên trang web
  function getAbsoluteCoords(vecX, vecY) {
    const cvs = document.getElementById("canvas2d");
    // Nếu không tìm thấy canvas hoặc Vec2D chưa sẵn sàng, trả về toạ độ 0 tạm thời
    if (!cvs || !window.Vec2D || !Vec2D.S2D) {
      console.warn("Vec2D hoặc Canvas chưa sẵn sàng!");
      return { x: 0, y: 0 };
    }

    const rect = cvs.getBoundingClientRect();
    const s = Vec2D.S2D;

    // Đảm bảo các thông số unit, offX, offY là số, nếu không thì mặc định là 0 hoặc 1
    const unit = Number(s.unit) || 20;
    const offX = Number(s.offX) || 0;
    const offY = Number(s.offY) || 0;

    // Tính toạ độ tâm Canvas so với Viewport
    const centerX = rect.left + rect.width / 2 + offX;
    const centerY = rect.top + rect.height / 2 + offY;

    // Chuyển toạ độ toán học sang Pixel màn hình
    const px = centerX + (Number(vecX) || 0) * unit;
    const py = centerY - (Number(vecY) || 0) * unit;

    return { x: px, y: py };
  }

  
  // ==================================================================================
  // 5. PHÉP CỘNG (ADDITION)
  // ==================================================================================

  function createGhost3D(src, col) {
    if (!src) return null;
    const g = src.clone();
    g.userData.isGhost = true;
    setOpacity3D(g, 0.6);
    g.traverse(function (c) {
      if (c.isMesh) c.material.color.setHex(col);
      if (c.isCSS2DObject) c.visible = false;
    });
    return g;
  }

  function runAnimAdd3D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;
    const v1G = get3DGroup(v1Id);
    const v2G = get3DGroup(v2Id);

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const ghost = createGhost3D(v2G, 0xffaa00);
      if (window.Vec3D) Vec3D._mathGroup.add(ghost);

      const start = new THREE.Vector3(0, 0, 0);
      const end = v1G.userData.tipLocal.clone();
      ghost.position.copy(start);

      const tRes = get3DGroup(resId);
      if (tRes) {
        tRes.visible = true;
        tRes.scale.set(1, 1, 1);
        setOpacity3D(tRes, 0);
      }

      runTween(
        CONFIG.DURATION.SLIDE,
        Easing.easeInOutCubic,
        function (v) {
          ghost.position.lerpVectors(start, end, v);
        },
        function () {
          if (tRes) {
            const dat = App.vectorList.find((x) => x.id === resId);
            runTween(
              CONFIG.DURATION.CLEANUP,
              Easing.linear,
              function (v) {
                setOpacity3D(tRes, v);
                if (dat) dat.alpha = v;
              },
              function () {
                if (dat) dat.alpha = 1;
                runTween(
                  400,
                  Easing.linear,
                  function (v) {
                    setOpacity3D(ghost, 0.6 * (1 - v));
                  },
                  function () {
                    if (ghost.parent) ghost.parent.remove(ghost);
                    fadeUnrelatedVectors([v1Id, v2Id, resId], 1, function () {
                      requestRedraw();
                    });
                  },
                );
              },
            );
          } else {
            ghost.parent.remove(ghost);
          }
        },
      );
    });
  }

  function runAnimAdd2D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !v2 || !res) return;

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const g = {
        vec: v2.vec,
        colorCss: "#ffaa00",
        alpha: 0.6,
        isGhost: true,
        offset: [0, 0],
      };
      App.tempGhosts = [g];
      res.alpha = 0;
      const ex = v1.vec[0];
      const ey = v1.vec[1];

      runTween(
        CONFIG.DURATION.SLIDE,
        Easing.easeInOutCubic,
        function (v) {
          g.offset = [ex * v, ey * v];
        },
        function () {
          runTween(
            CONFIG.DURATION.CLEANUP,
            Easing.linear,
            function (v) {
              res.alpha = v;
            },
            function () {
              res.alpha = 1;
              runTween(
                400,
                Easing.linear,
                function (v) {
                  g.alpha = 0.6 * (1 - v);
                },
                function () {
                  App.tempGhosts = [];
                  fadeUnrelatedVectors([v1Id, v2Id, resId], 1, function () {
                    requestRedraw();
                  });
                },
              );
            },
          );
        },
      );
    });
  }

  // ==================================================================================
  // KỊCH BẢN HỌC THUẬT: TÍCH VÔ HƯỚNG (VECTOR SCALING & PERFECT HUD UX)
  // ==================================================================================

  // LÕI HOẠT HỌA BẤT ĐỒNG BỘ (HỖ TRỢ PAUSE / PLAY)
  App.isAnimPaused = false;

  async function waitAnim(ms) {
      let start = performance.now();
      let elapsed = 0;
      return new Promise(resolve => {
          function check(now) {
              if (App.isAnimPaused) {
                  start = now - elapsed; 
              } else {
                  elapsed = now - start;
                  if (elapsed >= ms) return resolve();
              }
              requestAnimationFrame(check);
          }
          requestAnimationFrame(check);
      });
  }

  async function runTweenAsync(duration, easing, onUpdate) {
      let start = performance.now();
      let elapsed = 0;
      return new Promise(resolve => {
          function loop(now) {
              if (App.isAnimPaused) {
                  start = now - elapsed;
              } else {
                  elapsed = now - start;
                  const p = Math.min(elapsed / duration, 1);
                  onUpdate(easing(p));
                  requestRedraw();
                  if (p >= 1) return resolve();
              }
              requestAnimationFrame(loop);
          }
          requestAnimationFrame(loop);
      });
  }
  // Khóa/Mở nút tính toán chống Spam
  function toggleComputeBtn(disable) {
      const btn = document.getElementById("btnCompute");
      if (btn) {
          btn.disabled = disable;
          btn.style.opacity = disable ? '0.5' : '1';
          btn.style.cursor = disable ? 'not-allowed' : 'pointer';
      }
  }

  // ==================================================================================
  // HUD: CHUẨN HÓA TRÀN LỀ MOBILE & DESKTOP
  // ==================================================================================
  function createVectoriaHUD() {
    App.isAnimPaused = false; 

    if (!document.getElementById('vectoria-hud-style')) {
        const style = document.createElement('style');
        style.id = 'vectoria-hud-style';
        style.innerHTML = `
            .vec-hud {
                /* ÉP BUỘC TRÀN LỀ 100% CHO MOBILE */
                position: relative; margin-top: 15px; margin-bottom: 20px;
                padding: 15px; border-radius: 8px; z-index: 99;
                text-align: left; opacity: 0; transform: translateY(10px); 
                transition: opacity 0.4s ease, transform 0.4s ease;
                font-family: system-ui, sans-serif;
                background: var(--bg, rgba(255, 255, 255, 0.95)); color: var(--text, #222); 
                border: 1px solid rgba(128,128,128,0.2);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                
                /* [CỨU CÁNH CSS] Phá vỡ Flexbox bó hẹp của thẻ cha */
                display: block !important; 
                width: 100% !important; 
                max-width: 100% !important; 
                box-sizing: border-box !important;
                align-self: stretch !important;
                
                max-height: 450px; overflow-y: auto; overflow-x: hidden;
            }
            body.dark .vec-hud { background: rgba(30, 30, 35, 0.5); border: 1px solid rgba(255,255,255,0.1); }
            
            .vec-hud::-webkit-scrollbar { width: 5px; height: 5px; }
            .vec-hud::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.4); border-radius: 4px; }
            
            .vec-hud-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 6px; }
            .vec-hud-step { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #0088cc; font-weight: 800; }
            body.dark .vec-hud-step { color: #4dabf7; }
            .vec-hud-text { font-size: 13.5px; font-weight: 500; line-height: 1.5; margin-top: 8px; }
            
            .vec-btn-pause { background: none; border: none; color: inherit; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.7; transition: all 0.2s; outline: none; border-radius: 4px;}
            .vec-btn-pause:hover { opacity: 1; background: rgba(128,128,128,0.2); color: #ff9800;}
            
            .vec-math-list { margin: 8px 0; padding-left: 20px; font-size: 13px; opacity: 0.9; line-height: 1.6; }
            .vec-result-hl { color: #0088cc; font-weight: 900; }
            body.dark .vec-result-hl { color: #4dabf7; }
            
            .math-block { 
                background: rgba(128,128,128,0.08); padding: 12px; border-radius: 6px; 
                margin: 10px 0; overflow-x: auto; overflow-y: hidden;
                -webkit-overflow-scrolling: touch; 
            }
                /* [BỔ SUNG VÀO CUỐI STYLE CỦA HUD] */
            .vec-anim-label {
                position: absolute; top: 0; left: 0;
                background: var(--bg, rgba(255, 255, 255, 0.85));
                backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                border: 1px solid rgba(128,128,128,0.3);
                padding: 2px 6px; border-radius: 4px;
                font-family: monospace; font-size: 13px; font-weight: bold;
                color: #555; pointer-events: none; z-index: 100;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                transform: translate(-50%, -50%); /* Luôn căn giữa tọa độ */
            }
            body.dark .vec-anim-label { background: rgba(30,30,35,0.8); color: #ccc; border-color: rgba(255,255,255,0.2); }
            .vec-anim-label .hl { color: #0088cc; font-size: 14px;}
            body.dark .vec-anim-label .hl { color: #4dabf7; }
        `;
        document.head.appendChild(style);
    }

    const hud = document.createElement('div');
    hud.className = 'vec-hud';
    hud.innerHTML = `
        <div class="vec-hud-header">
            <div id="hud-step" class="vec-hud-step"></div>
            <button id="btnPausePlay" class="vec-btn-pause" title="Dừng / Phát">
                <i class="fa-solid fa-square"></i>
            </button>
        </div>
        <div id="hud-text" class="vec-hud-text"></div>
    `;

    // [FIX NHÚNG HUD] Đẩy hẳn ra ngoài cùng của Tab Content để không bị ép bởi Flex Row của Nút Tính Toán
    const btnCompute = document.getElementById("btnCompute");
    const tabContent = btnCompute ? btnCompute.closest('.tab-content') || btnCompute.closest('.card') : document.body;
    
    if (tabContent) {
        tabContent.appendChild(hud);
    } else {
        document.body.appendChild(hud);
    }

    // Xử lý sự kiện Pause/Play
    const btnPP = hud.querySelector("#btnPausePlay");
    btnPP.onclick = () => {
        App.isAnimPaused = !App.isAnimPaused;
        btnPP.innerHTML = App.isAnimPaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-square"></i>';
        btnPP.style.color = App.isAnimPaused ? '#ff9800' : 'inherit'; 
    };

    let syncThemeId;
    const syncTheme = () => {
        if (!hud.parentNode) return;
        const isDark = document.body.classList.contains("dark");
        hud.style.background = isDark ? 'rgba(30, 30, 35, 0.5)' : 'rgba(255, 255, 255, 0.95)';
        hud.style.color = isDark ? '#ffffff' : '#222222';
        syncThemeId = requestAnimationFrame(syncTheme);
    };
    syncTheme();

    requestAnimationFrame(() => { hud.style.opacity = '1'; hud.style.transform = 'translateY(0)'; });

    return {
        el: hud,
        setStep: (step, desc) => { 
            document.getElementById('hud-step').innerHTML = step;
            document.getElementById('hud-text').innerHTML = desc;
            hud.scrollTop = hud.scrollHeight;
        },
        close: () => {
            cancelAnimationFrame(syncThemeId);
            hud.style.opacity = '0';
            hud.style.transform = 'translateY(10px)';
            setTimeout(() => { if(hud.parentNode) hud.remove(); }, 400);
        }
    };
  }

  // [Hệ 3D] Tích Vô Hướng (Chuẩn Vector, Đã thêm cơ chế "Hồi sinh" khi đổi Theme)
  function runAnimDot3D(v1Id, v2Id, resVal) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;

    toggleComputeBtn(true); 

    App.currentProjVisual = null;
    if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();

    fadeUnrelatedVectors([v1Id, v2Id], 0.1, function () {
      const initialU = Vec3D.S3D.unitsPerWorld || 1; 
      
      const getTip = (id, vec) => {
          const g = get3DGroup(id);
          if (g && g.userData && g.userData.tipLocal) return g.userData.tipLocal.clone();
          return new THREE.Vector3(vec[0]*initialU, vec[1]*initialU, (vec[2]||0)*initialU);
      };

      const v1P = getTip(v1Id, v1.vec);
      const v2P = getTip(v2Id, v2.vec);
      
      const uLenSq = v1P.lengthSq();
      const uLenMath = Math.sqrt(uLenSq) / initialU; 
      const uDir = v1P.lengthSq() > 0.0001 ? v1P.clone().normalize() : new THREE.Vector3(1,0,0);
      
      const pLenWorld = v2P.dot(uDir); 
      const p = uDir.clone().multiplyScalar(pLenWorld);
      const distDash = v2P.distanceTo(p);

      const animGroup = new THREE.Group();
      if (window.Vec3D) Vec3D._mathGroup.add(animGroup);

      const isDarkInit = document.body.classList.contains("dark");
      const dashColorInit = isDarkInit ? 0x888888 : 0xaaaaaa;
      const axisColorInit = isDarkInit ? 0x444444 : 0xdddddd; 
      const projColor = 0x0088cc; 
      const tubeThick = Math.max(0.015 * initialU, 0.05);

      // 1. Ống rớt nét đứt
      let dashedTubeGroup = new THREE.Group();
      dashedTubeGroup.position.copy(v2P);
      if (distDash > 0.001) dashedTubeGroup.lookAt(p); 
      if (distDash > 0.001) {
          const dashLen = Math.max(0.15 * initialU, 0.2); 
          const gapLen = dashLen * 0.8;          
          let currentZ = 0;
          while (currentZ < distDash) {
              let segmentLen = Math.min(dashLen, distDash - currentZ);
              const segmentGeo = new THREE.CylinderGeometry(tubeThick*0.8, tubeThick*0.8, segmentLen, 8);
              segmentGeo.translate(0, segmentLen / 2, 0);
              segmentGeo.rotateX(Math.PI / 2); 
              const mesh = new THREE.Mesh(segmentGeo, new THREE.MeshBasicMaterial({color: dashColorInit}));
              mesh.position.set(0, 0, currentZ); 
              dashedTubeGroup.add(mesh);
              currentZ += dashLen + gapLen;
          }
      }
      dashedTubeGroup.scale.set(1, 1, 0.001);
      animGroup.add(dashedTubeGroup);

      // 2. VECTOR CHIẾU (Có đầu mũi tên)
      const projVectorGroup = new THREE.Group();
      const cylGeo = new THREE.CylinderGeometry(tubeThick * 1.5, tubeThick * 1.5, 1, 8); 
      cylGeo.translate(0, 0.5, 0);
      cylGeo.rotateX(Math.PI / 2);
      const cylMesh = new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({color: projColor, transparent: true, opacity: 0.95}));
      
      const coneGeo = new THREE.ConeGeometry(tubeThick * 4, tubeThick * 7, 16);
      coneGeo.rotateX(Math.PI / 2);
      const coneMesh = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({color: projColor}));
      
      projVectorGroup.add(cylMesh);
      projVectorGroup.add(coneMesh);
      projVectorGroup.position.set(0,0,0);
      projVectorGroup.scale.set(1, 1, 0.001); 
      animGroup.add(projVectorGroup);

      // --- [QUAN TRỌNG] VÒNG LẶP ĐỒNG BỘ ZOOM VÀ BẤT TỬ THEME ---
      let syncFrameId;
      const syncZoomAndTheme = () => {
          if (window.Vec3D && Vec3D._mathGroup) {
              // 1. Tự động "Hồi sinh" nếu bị hàm chuyển Theme xóa mất
              if (animGroup.parent !== Vec3D._mathGroup) {
                  Vec3D._mathGroup.add(animGroup);
              }
              
              // 2. Đồng bộ tỷ lệ Zoom
              if (Vec3D.S3D) {
                  const currentU = Vec3D.S3D.unitsPerWorld || 1;
                  const ratio = currentU / initialU; 
                  animGroup.scale.set(ratio, ratio, ratio); 
              }

              // 3. Cập nhật màu sắc thời gian thực nếu đang chạy mà đổi Theme
              const isDarkNow = document.body.classList.contains("dark");
              const newDashC = isDarkNow ? 0x888888 : 0xaaaaaa;
              dashedTubeGroup.children.forEach(c => {
                  if (c.isMesh) c.material.color.setHex(newDashC);
              });
          }
          syncFrameId = requestAnimationFrame(syncZoomAndTheme);
      };
      syncZoomAndTheme();
      // ------------------------------------------------------------

      const hud = createVectoriaHUD();
      
      hud.setStep("<i class='fa-solid fa-down-long'></i> BƯỚC 1: PHÉP CHIẾU", `Hạ vuông góc v2 xuống giá của v1 để tạo <b>Vector hình chiếu</b>.`);
      
      runTween(1500, Easing.easeInOutCubic, function(v) {
        dashedTubeGroup.scale.set(1, 1, Math.max(0.001, v));
        
        const currentLenWorld = pLenWorld * v; 
        const L = Math.max(0.001, Math.abs(currentLenWorld));
        const faceDir = currentLenWorld >= 0 ? uDir : uDir.clone().negate();
        
        projVectorGroup.lookAt(projVectorGroup.position.clone().add(faceDir));
        cylMesh.scale.set(1, 1, L);
        coneMesh.position.set(0, 0, L); 
        projVectorGroup.scale.set(1, 1, 1);
      }, function() {
        
        setTimeout(() => {
            hud.setStep("<i class='fa-solid fa-expand'></i> BƯỚC 2: TỶ LỆ HÓA", `Nhân bản Vector chiếu lên gấp <b>||v1||</b> lần (hệ số ${uLenMath.toFixed(2)}).`);
            
            const rawDotWorld = pLenWorld * uLenMath; 

            runTween(2000, Easing.easeInOutCubic, function(v) {
                const currentLenWorld = pLenWorld + (rawDotWorld - pLenWorld) * v; 
                const L = Math.max(0.001, Math.abs(currentLenWorld));
                const faceDir = currentLenWorld >= 0 ? uDir : uDir.clone().negate();

                projVectorGroup.lookAt(projVectorGroup.position.clone().add(faceDir));
                cylMesh.scale.set(1, 1, L);
                coneMesh.position.set(0, 0, L);
            }, function() {
                
                setTimeout(() => {
                    const signStr = resVal >= 0 ? "Cùng chiều" : "Ngược chiều";
                    const formattedRes = App.formatScalar ? App.formatScalar(resVal) : resVal;
                    
                    hud.setStep("<i class='fa-solid fa-check-circle'></i> KẾT LUẬN", `
                        Độ dài Vector: <b>${Math.abs(resVal).toFixed(2)}</b><br/>
                        Hướng so với v1: <b>${signStr}</b>
                        <hr style="margin:6px 0; border:0; border-top:1px solid rgba(128,128,128,0.2);">
                        Tích vô hướng = <span class="vec-result-hl">${formattedRes}</span>
                    `);
                    
                    runTween(400, Easing.elasticOut, function(v) {
                        const pulse = 1 + 0.05 * Math.sin(v * Math.PI);
                        projVectorGroup.scale.set(pulse, pulse, 1);
                    }, function() {
                        setTimeout(() => {
                            hud.close();
                            cancelAnimationFrame(syncFrameId); // Hủy vòng lặp
                            if (animGroup.parent) animGroup.parent.remove(animGroup); 
                            fadeUnrelatedVectors([v1Id, v2Id], 1, () => {
                                requestRedraw();
                                toggleComputeBtn(false); 
                            });
                        }, 5000); 
                    });
                }, 500); 
            });
        }, 1500); 
      });
    });
  }

  // [Hệ 2D] Tích vô hướng (Đã thêm cập nhật màu Theme Realtime)
  function runAnimDot2D(v1Id, v2Id, resVal) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;

    toggleComputeBtn(true); 

    App.currentProjVisual = null;
    if (App.refreshProjectionOverlay) App.refreshProjectionOverlay();

    fadeUnrelatedVectors([v1Id, v2Id], 0.1, function () {
      
      const v1x = v1.vec[0], v1y = v1.vec[1];
      const v2x = v2.vec[0], v2y = v2.vec[1];
      
      const rawDot = v1x*v2x + v1y*v2y;
      const uLen = Math.hypot(v1x, v1y);
      
      let pLen = 0, px = 0, py = 0;
      if (uLen > 0.0001) {
          pLen = rawDot / uLen;
          px = (v1x / uLen) * pLen;
          py = (v1y / uLen) * pLen;
      }
      
      const finalPx = uLen > 0.0001 ? (v1x / uLen) * rawDot : 0;
      const finalPy = uLen > 0.0001 ? (v1y / uLen) * rawDot : 0;

      const isDarkInit = document.body.classList.contains("dark");
      const dashColorInit = isDarkInit ? "#888888" : "#aaaaaa";
      const projColor = "#0088cc"; 

      const dropGhost = { vec: [0,0], offset: [v2x, v2y], colorCss: dashColorInit, alpha: 0, isGhost: true, isDashed: true, noArrow: true };
      const projGhost = { vec: [0, 0], offset: [0, 0], colorCss: projColor, alpha: 0, isGhost: true, isDashed: false, noArrow: false, drawThick: true }; 
      
      App.tempGhosts = [dropGhost, projGhost];
      const hud = createVectoriaHUD();

      // --- Vòng lặp cập nhật màu thời gian thực cho 2D Ghost ---
      let syncFrame2D;
      const syncTheme2D = () => {
          const isDarkNow = document.body.classList.contains("dark");
          dropGhost.colorCss = isDarkNow ? "#888888" : "#aaaaaa";
          // Nếu tempGhosts đã bị dọn sạch thì tự dừng vòng lặp
          if (App.tempGhosts && App.tempGhosts.length > 0) {
              syncFrame2D = requestAnimationFrame(syncTheme2D);
          }
      };
      syncTheme2D();
      // ---------------------------------------------------------
      
      hud.setStep("<i class='fa-solid fa-down-long'></i> BƯỚC 1: PHÉP CHIẾU", `Hạ vuông góc v2 xuống giá của v1 để tạo <b>Vector hình chiếu</b>.`);
      dropGhost.alpha = 1; projGhost.alpha = 1;
      
      runTween(1500, Easing.easeInOutCubic, function(v) {
          dropGhost.vec = [(px - v2x) * v, (py - v2y) * v];
          projGhost.vec = [px * v, py * v];
      }, function() {
          
          setTimeout(() => {
              hud.setStep("<i class='fa-solid fa-expand'></i> BƯỚC 2: TỶ LỆ HÓA", `Nhân bản Vector chiếu lên gấp <b>||v1||</b> lần (hệ số ${uLen.toFixed(2)}).`);
              
              runTween(2000, Easing.easeInOutCubic, function(v) {
                  projGhost.vec = [px + (finalPx - px) * v, py + (finalPy - py) * v];
              }, function() {
                  
                  setTimeout(() => {
                      const signStr = resVal >= 0 ? "Cùng chiều" : "Ngược chiều";
                      const formattedRes = App.formatScalar ? App.formatScalar(resVal) : resVal;

                      hud.setStep("<i class='fa-solid fa-check-circle'></i> KẾT LUẬN", `
                          Độ dài Vector: <b>${Math.abs(resVal).toFixed(2)}</b><br/>
                          Hướng so với v1: <b>${signStr}</b>
                          <hr style="margin:6px 0; border:0; border-top:1px solid rgba(128,128,128,0.2);">
                          Tích vô hướng = <span class="vec-result-hl">${formattedRes}</span>
                      `);

                      requestRedraw();

                      setTimeout(() => {
                          hud.close();
                          cancelAnimationFrame(syncFrame2D); // Hủy vòng lặp màu
                          App.tempGhosts = [];
                          fadeUnrelatedVectors([v1Id, v2Id], 1, () => {
                              requestRedraw();
                              toggleComputeBtn(false); 
                          });
                      }, 5000); 
                  }, 500);
              });
          }, 1500);
      });
    });
  }

  // ==================================================================================
  // KỊCH BẢN HỌC THUẬT: TÍCH CÓ HƯỚNG (CROSS PRODUCT - CHUẨN SƯ PHẠM)
  // ==================================================================================

  // [Hệ 3D] Tích có hướng: Khai triển Đại số & Hệ quả Hình học
  function runAnimCross3D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !v2 || !res) return;

    toggleComputeBtn(true);
    const initialU = Vec3D.S3D.unitsPerWorld || 1;
    const resG = get3DGroup(resId);
    if (resG) setOpacity3D(resG, 0);

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, async function () {
        const animGroup = new THREE.Group();
        Vec3D._mathGroup.add(animGroup);

        let syncFrameId;
        const syncZoomAndTheme = () => {
            if (window.Vec3D && Vec3D._mathGroup) {
                if (animGroup.parent !== Vec3D._mathGroup) Vec3D._mathGroup.add(animGroup);
                if (Vec3D.S3D) animGroup.scale.setScalar((Vec3D.S3D.unitsPerWorld || 1) / initialU);
            }
            syncFrameId = requestAnimationFrame(syncZoomAndTheme);
        };
        syncZoomAndTheme();

        const getTip = (id, vec) => {
            const g = get3DGroup(id);
            if (g && g.userData && g.userData.tipLocal) return g.userData.tipLocal.clone();
            return new THREE.Vector3(vec[0] * initialU, vec[1] * initialU, (vec[2] || 0) * initialU);
        };

        const pA = getTip(v1Id, v1.vec);
        const pB = getTip(v2Id, v2.vec);
        const origin = new THREE.Vector3(0, 0, 0);
        const thick = Math.max(0.015 * initialU, 0.05);

        const createGhostTube = (pEnd) => {
            const d = origin.distanceTo(pEnd);
            const geo = new THREE.CylinderGeometry(thick*0.8, thick*0.8, d, 8);
            geo.translate(0, d/2, 0); geo.rotateX(Math.PI/2);
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: 0x888888, transparent: true, opacity: 0.6}));
            mesh.lookAt(pEnd);
            return mesh;
        };
        const ghostV1 = createGhostTube(pA);
        const ghostV2 = createGhostTube(pB);
        animGroup.add(ghostV1); animGroup.add(ghostV2);

        const rectGeo = new THREE.BufferGeometry();
        const verts = new Float32Array(12);
        rectGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        rectGeo.setIndex([0, 1, 2, 0, 2, 3]);
        const rectMat = new THREE.MeshBasicMaterial({color: 0x9c27b0, transparent: true, opacity: 0, side: THREE.DoubleSide});
        const rectMesh = new THREE.Mesh(rectGeo, rectMat);
        animGroup.add(rectMesh);

        const hud = createVectoriaHUD();
        
        // --- SỐ LIỆU LATEX ---
        const fmt = (n) => {
            let num = Number(n);
            if (Math.abs(num - Math.round(num)) < 1e-4) return Math.round(num);
            return Number(num).toFixed(2).replace(/\.?0+$/, '');
        };
        const a1 = v1.vec[0], a2 = v1.vec[1], a3 = v1.vec[2] || 0;
        const b1 = v2.vec[0], b2 = v2.vec[1], b3 = v2.vec[2] || 0;
        const cx = a2*b3 - a3*b2, cy = a3*b1 - a1*b3, cz = a1*b2 - a2*b1;
        const resLen = Math.sqrt(cx**2 + cy**2 + cz**2);
        const formattedCoords = `[${fmt(cx)}, ${fmt(cy)}, ${fmt(cz)}]`;

        // BẢNG MATHLIVE LATEX CHUẨN XỊN (CHỐNG GÃY DÒNG)
        const mathHtml = `
            <div class="math-block">
                <div style="min-width: max-content; padding-bottom: 8px;">
                    <math-field read-only style="font-size: 14px; background: transparent; border: none; outline: none; margin-bottom: 8px;">
                        \\text{Det} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${fmt(a1)} & ${fmt(a2)} & ${fmt(a3)} \\\\ ${fmt(b1)} & ${fmt(b2)} & ${fmt(b3)} \\end{vmatrix}
                    </math-field>
                    
                    <math-field read-only style="font-size: 13px; background: transparent; border: none; outline: none; margin-bottom: 12px; border-top: 1px dashed rgba(128,128,128,0.4); padding-top: 8px;">
                        = \\mathbf{i}\\begin{vmatrix}${fmt(a2)}&${fmt(a3)}\\\\${fmt(b2)}&${fmt(b3)}\\end{vmatrix} - \\mathbf{j}\\begin{vmatrix}${fmt(a1)}&${fmt(a3)}\\\\${fmt(b1)}&${fmt(b3)}\\end{vmatrix} + \\mathbf{k}\\begin{vmatrix}${fmt(a1)}&${fmt(a2)}\\\\${fmt(b1)}&${fmt(b2)}\\end{vmatrix}
                    </math-field>

                    <div style="border-top: 1px solid rgba(128,128,128,0.2); padding-top: 6px; text-align: left;">
                        <math-field read-only style="font-size: 13px; background: transparent; border: none; outline: none;">\\mathbf{x} = (${fmt(a2)})(${fmt(b3)}) - (${fmt(a3)})(${fmt(b2)}) = ${fmt(cx)}</math-field><br>
                        <math-field read-only style="font-size: 13px; background: transparent; border: none; outline: none;">\\mathbf{y} = (${fmt(a3)})(${fmt(b1)}) - (${fmt(a1)})(${fmt(b3)}) = ${fmt(cy)}</math-field><br>
                        <math-field read-only style="font-size: 13px; background: transparent; border: none; outline: none;">\\mathbf{z} = (${fmt(a1)})(${fmt(b2)}) - (${fmt(a2)})(${fmt(b1)}) = ${fmt(cz)}</math-field>
                    </div>
                </div>
            </div>
        `;

        // BƯỚC 1: KHUNG CƠ SỞ
        hud.setStep("<i class='fa-solid fa-layer-group'></i> BƯỚC 1: ĐỊNH NGHĨA MẶT PHẲNG", "Tịnh tiến các vector thành phần để thiết lập mặt phẳng cơ sở (chứa hình bình hành).");
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            ghostV1.position.copy(origin).lerp(pB, v);
            ghostV2.position.copy(origin).lerp(pA, v);
        });
        
        verts[0]=0; verts[1]=0; verts[2]=0; 
        verts[3]=pA.x; verts[4]=pA.y; verts[5]=pA.z; 
        // ... (Cập nhật tọa độ lưới)
        verts[6]=pA.x+pB.x; verts[7]=pA.y+pB.y; verts[8]=pA.z+pB.z; 
        verts[9]=pB.x; verts[10]=pB.y; verts[11]=pB.z; 
        rectGeo.attributes.position.needsUpdate = true;

        await runTweenAsync(600, Easing.linear, (v) => rectMat.opacity = 0.5 * v);
        await waitAnim(1000);

        // BƯỚC 2: KHAI TRIỂN ĐẠI SỐ
        hud.setStep("<i class='fa-solid fa-calculator'></i> BƯỚC 2: KHAI TRIỂN ĐỊNH THỨC", `Áp dụng định thức ma trận vuông để tính tọa độ Vector kết quả:${mathHtml}`);
        if (resG) { resG.scale.set(0.001, 0.001, 0.001); setOpacity3D(resG, 1); }
        
        // Ngâm 3.5 giây để user kịp nhấn Pause đọc công thức
        await waitAnim(3500); 

        // Vector đâm lên
        await runTweenAsync(1500, Easing.elasticOut, (v) => {
            if (resG) resG.scale.set(v, v, v);
        });
        await waitAnim(1000);

        // BƯỚC 3: HỆ QUẢ HÌNH HỌC
        hud.setStep("<i class='fa-solid fa-check-circle'></i> BƯỚC 3: TÍNH CHẤT HÌNH HỌC", `
            Hệ quả từ định thức tọa độ <span class="vec-result-hl">${formattedCoords}</span>:
            <ul class="vec-math-list">
                <li><b>Phương:</b> Trực giao (vuông góc) với mặt phẳng cơ sở.</li>
                <li><b>Chiều:</b> Tuân theo quy tắc bàn tay phải.</li>
                <li><b>Độ lớn:</b> Trùng khớp với diện tích mặt phẳng (${resLen.toFixed(2)}).</li>
            </ul>
        `);

        await waitAnim(7000);
        hud.close();
        cancelAnimationFrame(syncFrameId);
        if (animGroup.parent) animGroup.parent.remove(animGroup);
        fadeUnrelatedVectors([v1Id, v2Id, resId], 1, () => { requestRedraw(); toggleComputeBtn(false); });
    });
  }

  // ==================================================================================
  // KỊCH BẢN HỌC THUẬT: ĐỘ DÀI VECTOR (VECTOR NORM / MAGNITUDE)
  // ==================================================================================

  // [HỆ 3D] ĐỘ DÀI VECTOR: Tận dụng CSS2DObject chuẩn của Three.js
  function runAnimNorm3D(vId, resVal) {
    const v = App.vectorList.find(x => x.id === vId);
    if (!v) return;
    toggleComputeBtn(true);

    fadeUnrelatedVectors([vId], 0.1, async function () {
        const initialU = Vec3D.S3D.unitsPerWorld || 1;
        const animGroup = new THREE.Group();
        Vec3D._mathGroup.add(animGroup);

        let syncFrameId;
        const syncZoomAndTheme = () => {
            if (window.Vec3D && Vec3D._mathGroup) {
                if (animGroup.parent !== Vec3D._mathGroup) Vec3D._mathGroup.add(animGroup);
                if (Vec3D.S3D) animGroup.scale.setScalar((Vec3D.S3D.unitsPerWorld || 1) / initialU);
            }
            syncFrameId = requestAnimationFrame(syncZoomAndTheme);
        };
        syncZoomAndTheme();

        const x = v.vec[0], y = v.vec[1], z = v.vec[2] || 0;
        const fmt = (n) => App.formatScalar ? App.formatScalar(n) : Number(n).toFixed(2).replace(/\.?0+$/, "");

        const origin = new THREE.Vector3(0, 0, 0);
        const Px = new THREE.Vector3(x * initialU, 0, 0);
        const Pxy = new THREE.Vector3(x * initialU, y * initialU, 0);
        const P = new THREE.Vector3(x * initialU, y * initialU, z * initialU);

        const thick = Math.max(0.015 * initialU, 0.05);

        const createScaffoldLine = (p1, p2, colorHex) => {
            const d = p1.distanceTo(p2);
            if (d < 0.001) return new THREE.Group(); // Chống crash độ dài 0
            const geo = new THREE.CylinderGeometry(thick*0.8, thick*0.8, d, 8);
            geo.translate(0, d / 2, 0); geo.rotateX(Math.PI / 2);
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0 }));
            mesh.position.copy(p1); mesh.lookAt(p2);
            return mesh;
        };

        const createRightAngle = (corner, pA, pB) => {
            const dir1 = new THREE.Vector3().subVectors(pA, corner).normalize();
            const dir2 = new THREE.Vector3().subVectors(pB, corner).normalize();
            if (dir1.lengthSq() < 0.1 || dir2.lengthSq() < 0.1) return new THREE.Group();

            const sqSize = 0.2 * initialU; 
            const p1 = corner.clone().add(dir1.clone().multiplyScalar(sqSize));
            const p2 = corner.clone().add(dir2.clone().multiplyScalar(sqSize));
            const p3 = corner.clone().add(dir1.clone().multiplyScalar(sqSize)).add(dir2.clone().multiplyScalar(sqSize));

            const makeEdge = (start, end) => {
                const d = start.distanceTo(end);
                const geo = new THREE.CylinderGeometry(thick*0.6, thick*0.6, d, 4);
                geo.translate(0, d / 2, 0); geo.rotateX(Math.PI / 2);
                const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 }));
                mesh.position.copy(start); mesh.lookAt(end);
                return mesh;
            };

            const grp = new THREE.Group();
            grp.add(makeEdge(p1, p3)); grp.add(makeEdge(p2, p3));
            return grp;
        };

        const isDark = document.body.classList.contains("dark");
        const lineColor = isDark ? 0xaaaaaa : 0x666666;
        const planeColor = 0xff9800; 

        const legX = createScaffoldLine(origin, Px, lineColor);
        const legY = createScaffoldLine(Px, Pxy, lineColor);
        const diagBase = createScaffoldLine(origin, Pxy, planeColor);
        const legZ = createScaffoldLine(Pxy, P, lineColor);

        const sq1 = createRightAngle(Px, origin, Pxy); 
        const sq2 = createRightAngle(Pxy, origin, P); 

        const elements = [legX, legY, diagBase, legZ, sq1, sq2];
        elements.forEach(el => animGroup.add(el));

        App._activeAnimLabels = App._activeAnimLabels || [];
        const createLabel3D = (htmlText, posMath) => {
            const div = document.createElement("div");
            div.className = "vec-anim-label";
            div.innerHTML = htmlText;
            div.style.opacity = "0";
            
            const obj = new THREE.CSS2DObject(div);
            obj.position.copy(posMath.clone().multiplyScalar(initialU));
            animGroup.add(obj);
            App._activeAnimLabels.push(div);
            return { div, obj };
        };

        const lblX = createLabel3D(`|x|=<span class="hl">${fmt(Math.abs(x))}</span>`, new THREE.Vector3(x/2, 0, 0));
        const lblY = createLabel3D(`|y|=<span class="hl">${fmt(Math.abs(y))}</span>`, new THREE.Vector3(x, y/2, 0));
        const lblZ = createLabel3D(`|z|=<span class="hl">${fmt(Math.abs(z))}</span>`, new THREE.Vector3(x, y, z/2));

        // [MŨI TIÊM CỨU MẠNG CHỐNG CRASH]
        const safeSetOpacity = (obj, val) => {
            if (obj && obj.material) obj.material.opacity = val;
        };

        const hud = createVectoriaHUD();
        const normStr = resVal.toFixed(4).replace(/\.?0+$/, "");

        const mathHtmlBase = `
            <div class="math-block">
                <math-field read-only style="font-size: 14px; background:transparent; border:none; outline:none; font-weight:bold;">
                    d_{xy}^2 = (${fmt(x)})^2 + (${fmt(y)})^2
                </math-field>
            </div>`;

        hud.setStep("<i class='fa-solid fa-shapes'></i> BƯỚC 1: PHÂN RÃ MẶT ĐÁY", `Từ hình chiếu dưới mặt phẳng tọa độ Oxy, ta tính được bình phương đường chéo:${mathHtmlBase}`);
        
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            // Thay thế toàn bộ gán trực tiếp bằng hàm an toàn
            safeSetOpacity(legX, v); 
            safeSetOpacity(legY, v); 
            safeSetOpacity(diagBase, v);
            sq1.children.forEach(c => safeSetOpacity(c, v));
            lblX.div.style.opacity = v; 
            lblY.div.style.opacity = v;
        });
        await waitAnim(2000);

        const mathHtmlTotal = `
            <div class="math-block">
                <math-field read-only style="font-size: 14px; background:transparent; border:none; outline:none; margin-bottom:6px; font-weight:bold;">
                    \\|\\mathbf{v}\\| = \\sqrt{d_{xy}^2 + z^2}
                </math-field>
                <div style="border-top: 1px dashed rgba(128,128,128,0.4); padding-top: 8px;">
                    <math-field read-only style="font-size: 13px; background:transparent; border:none; outline:none;">
                        = \\sqrt{(${fmt(x)})^2 + (${fmt(y)})^2 + (${fmt(z)})^2} = ${normStr}
                    </math-field>
                </div>
            </div>`;

        hud.setStep("<i class='fa-solid fa-cube'></i> BƯỚC 2: ĐỊNH LÝ PYTHAGORAS", `Dựng tam giác vuông chứa đường chéo đáy và chiều cao z để tìm độ dài Vector:${mathHtmlTotal}`);
        
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            // An toàn cho bước 2
            safeSetOpacity(legZ, v);
            sq2.children.forEach(c => safeSetOpacity(c, v));
            lblZ.div.style.opacity = v;
        });
        await waitAnim(6000);

        hud.close();
        cancelAnimationFrame(syncFrameId);
        if (animGroup.parent) animGroup.parent.remove(animGroup);
        if (App._activeAnimLabels) App._activeAnimLabels.forEach(l => l.remove());
        App._activeAnimLabels = [];
        fadeUnrelatedVectors([vId], 1, () => { requestRedraw(); toggleComputeBtn(false); });
    });
  }

  // [HỆ 2D] ĐỘ DÀI VECTOR: Tối ưu chống Layout Thrashing
  function runAnimNorm2D(vId, resVal) {
    const v = App.vectorList.find(x => x.id === vId);
    if (!v) return;
    toggleComputeBtn(true);

    fadeUnrelatedVectors([vId], 0.1, async function () {
        const x = v.vec[0], y = v.vec[1];
        const fmt = (n) => App.formatScalar ? App.formatScalar(n) : Number(n).toFixed(2).replace(/\.?0+$/, '');
        const normStr = resVal.toFixed(4).replace(/\.?0+$/, '');
        
        const isDark = document.body.classList.contains("dark");
        const techColor = isDark ? "#888888" : "#aaaaaa";
        
        // noArrow = true tắt hẳn mũi tên để nhìn giống đoạn thẳng hình học
        const legX = { vec: [x, 0], offset: [0, 0], colorCss: techColor, alpha: 0, isGhost: true, isDashed: false, noArrow: true };
        const legY = { vec: [0, y], offset: [x, 0], colorCss: techColor, alpha: 0, isGhost: true, isDashed: false, noArrow: true };
        
        // Ký hiệu góc vuông thủ công bằng 2 đoạn ngắn (chống mũi tên triệt để)
        const sqSize = 0.4; 
        const sX = x >= 0 ? 1 : -1; const sY = y >= 0 ? 1 : -1;
        const edge1 = { offset: [x - sqSize*sX, 0], vec: [0, sqSize*sY], colorCss: techColor, alpha: 0, isGhost: true, noArrow: true };
        const edge2 = { offset: [x - sqSize*sX, sqSize*sY], vec: [sqSize*sX, 0], colorCss: techColor, alpha: 0, isGhost: true, noArrow: true };

        App.tempGhosts = [legX, legY, edge1, edge2];

        App._activeAnimLabels = App._activeAnimLabels || [];
        const container = document.getElementById("canvas2d").parentElement;
        const create2DLabel = (text) => {
            const div = document.createElement('div');
            div.className = 'vec-anim-label';
            div.innerHTML = text;
            div.style.position = 'absolute';
            div.style.top = '0'; div.style.left = '0';
            div.style.opacity = '0';
            container.appendChild(div);
            App._activeAnimLabels.push(div);
            return div;
        };

        const lblX = create2DLabel(`|x|=<span class="hl">${fmt(Math.abs(x))}</span>`);
        const lblY = create2DLabel(`|y|=<span class="hl">${fmt(Math.abs(y))}</span>`);

        let syncFrameId;
        const syncThemeAndPos = () => {
            const isDarkNow = document.body.classList.contains("dark");
            App.tempGhosts.forEach(g => g.colorCss = isDarkNow ? "#888888" : "#aaaaaa");

            const canvas = document.getElementById("canvas2d");
            if (canvas && window.Vec2D && Vec2D.S2D) {
                // Tự tính toán không dùng getBoundingClientRect để chống giật lag
                const dpr = window.devicePixelRatio || 1;
                const w = canvas.width / dpr;
                const h = canvas.height / dpr;
                const cx = w / 2 + Vec2D.S2D.offsetX;
                const cy = h / 2 + Vec2D.S2D.offsetY;
                const unit = Vec2D.S2D.pxPerUnit || 80;

                const posX = cx + (x / 2) * unit;
                const posY = cy; 
                lblX.style.transform = `translate(-50%, -50%) translate(${posX}px, ${posY + (y>=0? 25 : -25)}px)`;
                
                const pyX = cx + x * unit;
                const pyY = cy - (y / 2) * unit;
                lblY.style.transform = `translate(-50%, -50%) translate(${pyX + (x>=0? 35 : -35)}px, ${pyY}px)`;
            }
            syncFrameId = requestAnimationFrame(syncThemeAndPos);
        };
        syncThemeAndPos();

        const hud = createVectoriaHUD();
        const mathHtml = `
            <div class="math-block">
                <math-field read-only style="font-size: 15px; background: transparent; border: none; outline: none; margin-bottom: 8px; font-weight: bold;">
                    \\|\\mathbf{v}\\| = \\sqrt{x^2 + y^2}
                </math-field>
                <div style="border-top: 1px dashed rgba(128,128,128,0.4); padding-top: 12px; text-align: center;">
                    <math-field read-only style="font-size: 14px; background: transparent; border: none; outline: none;">
                        = \\sqrt{(${fmt(x)})^2 + (${fmt(y)})^2} = ${normStr}
                    </math-field>
                </div>
            </div>
        `;

        hud.setStep("<i class='fa-solid fa-vector-square'></i> BƯỚC 1: DỰNG TAM GIÁC", "Phân rã vector thành hai thành phần tọa độ để tạo thành một tam giác vuông.");
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            App.tempGhosts.forEach(g => g.alpha = v * 0.8);
            lblX.style.opacity = v; lblY.style.opacity = v;
        });
        await waitAnim(1500);

        hud.setStep("<i class='fa-solid fa-calculator'></i> BƯỚC 2: CHUẨN EUCLID", `Áp dụng định lý Pythagoras tính độ dài cạnh huyền:${mathHtml}`);
        await waitAnim(6000);

        hud.close();
        cancelAnimationFrame(syncFrameId);
        if (App._activeAnimLabels) App._activeAnimLabels.forEach(l => l.remove());
        App._activeAnimLabels = [];
        App.tempGhosts = [];
        fadeUnrelatedVectors([vId], 1, () => { requestRedraw(); toggleComputeBtn(false); });
    });
  }

  // ==================================================================================
  // KỊCH BẢN HỌC THUẬT: GÓC GIỮA 2 VECTOR (ANGLE)
  // ==================================================================================

  // [HỆ 3D] QUÉT GÓC TRÊN MẶT PHẲNG CHỨA 2 VECTOR
  function runAnimAngle3D(v1Id, v2Id, radVal) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;
    toggleComputeBtn(true);

    fadeUnrelatedVectors([v1Id, v2Id], 0.1, async function () {
        const initialU = Vec3D.S3D.unitsPerWorld || 1;
        const animGroup = new THREE.Group();
        Vec3D._mathGroup.add(animGroup);

        let syncFrameId;
        const syncZoomAndTheme = () => {
            if (window.Vec3D && Vec3D._mathGroup) {
                if (animGroup.parent !== Vec3D._mathGroup) Vec3D._mathGroup.add(animGroup);
                if (Vec3D.S3D) animGroup.scale.setScalar(Vec3D.S3D.unitsPerWorld || 1);
            }
            syncFrameId = requestAnimationFrame(syncZoomAndTheme);
        };
        syncZoomAndTheme();

        // Ẩn cái cung tròn có sẵn của phần mềm đi để ta vẽ hoạt họa quét quạt
        if (App.currentAngleVisual3D) App.currentAngleVisual3D.visible = false;

        const toVec3Safe = (vArr) => new THREE.Vector3(Number(vArr[0]||0), Number(vArr[1]||0), Number(vArr[2]||0));
        const A = toVec3Safe(v1.vec);
        const B = toVec3Safe(v2.vec);
        
        // Toán học tính Toán
        const dot = A.dot(B);
        const lenA = A.length(); const lenB = B.length();
        const degVal = (radVal * 180) / Math.PI;

        const fmt = (n) => App.formatScalar ? App.formatScalar(n) : Number(n).toFixed(2).replace(/\.?0+$/, "");
        
        const normA = A.clone().normalize();
        const normB = B.clone().normalize();
        
        // Tìm pháp tuyến mặt phẳng chứa 2 vector
        let N = new THREE.Vector3().crossVectors(normA, normB).normalize();
        if (N.lengthSq() < 0.001) N.set(0, 0, 1); // Trùng nhau thì lấy trục Z

        // Setup lưới xoay cho Hình quạt
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), N);
        const startXLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
        const angleOffset = startXLocal.angleTo(normA);
        const sign = new THREE.Vector3().crossVectors(startXLocal, normA).dot(N) >= 0 ? 1 : -1;
        const finalQuat = quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sign * angleOffset));

        const minLen = Math.min(lenA, lenB);
        const radius = Math.max(0.5, minLen * 0.6) * initialU;

        let sectorMesh = new THREE.Mesh(
            new THREE.CircleGeometry(radius, 32, 0, 0.001),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
        );
        sectorMesh.setRotationFromQuaternion(finalQuat);
        animGroup.add(sectorMesh);

        const hud = createVectoriaHUD();
        const mathHtml = `
            <div class="math-block">
                <math-field read-only style="font-size: 14px; background:transparent; border:none; outline:none; font-weight:bold;">
                    \\cos(\\theta) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\| \\|\\mathbf{v}\\|}
                </math-field>
                <div style="border-top: 1px dashed rgba(128,128,128,0.4); padding-top: 8px;">
                    <math-field read-only style="font-size: 13px; background:transparent; border:none; outline:none;">
                        = \\frac{${fmt(dot)}}{(${fmt(lenA)}) \\times (${fmt(lenB)})}
                    </math-field><br>
                    <math-field read-only style="font-size: 14px; color: var(--text); background:transparent; border:none; outline:none; margin-top:8px; font-weight:bold;">
                        \\theta \\approx ${degVal.toFixed(2)}^\\circ
                    </math-field>
                </div>
            </div>`;

        hud.setStep("<i class='fa-solid fa-fan'></i> BƯỚC 1: QUÉT GÓC MẶT PHẲNG", "Mọi cặp vector cắt nhau đều tạo thành một mặt phẳng. Góc được đo bằng cách quét từ vector này sang vector kia trên mặt phẳng đó.");
        
        // Animation Quét hình quạt (Thay đổi geometry để tạo cảm giác quét)
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            const currentAngle = radVal * v;
            // Recreate geometry is extremely fast, safe for animations
            sectorMesh.geometry.dispose();
            sectorMesh.geometry = new THREE.CircleGeometry(radius, 32, 0, Math.max(0.001, currentAngle));
        });
        await waitAnim(1000);

        hud.setStep("<i class='fa-solid fa-calculator'></i> BƯỚC 2: CÔNG THỨC COSIN", `Đại số sử dụng Tích vô hướng và Độ dài để tính toán chính xác số đo góc:${mathHtml}`);
        
        // Hiện lại Arc gốc đẹp đẽ
        if (App.currentAngleVisual3D) App.currentAngleVisual3D.visible = true;
        animGroup.remove(sectorMesh);
        
        await waitAnim(7000);

        hud.close();
        cancelAnimationFrame(syncFrameId);
        if (animGroup.parent) animGroup.parent.remove(animGroup);
        fadeUnrelatedVectors([v1Id, v2Id], 1, () => { requestRedraw(); toggleComputeBtn(false); });
    });
  }

  // [HỆ 2D] QUÉT GÓC 2D
  function runAnimAngle2D(v1Id, v2Id, radVal) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;
    toggleComputeBtn(true);

    fadeUnrelatedVectors([v1Id, v2Id], 0.1, async function () {
        const hud = createVectoriaHUD();
        
        const a = [Number(v1.vec[0]||0), Number(v1.vec[1]||0)];
        const b = [Number(v2.vec[0]||0), Number(v2.vec[1]||0)];
        
        const dot = a[0]*b[0] + a[1]*b[1];
        const lenA = Math.hypot(a[0], a[1]); const lenB = Math.hypot(b[0], b[1]);
        const degVal = (radVal * 180) / Math.PI;
        const fmt = (n) => App.formatScalar ? App.formatScalar(n) : Number(n).toFixed(2).replace(/\.?0+$/, "");

        const mathHtml = `
            <div class="math-block">
                <math-field read-only style="font-size: 14px; background:transparent; border:none; outline:none; font-weight:bold;">
                    \\cos(\\theta) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\| \\|\\mathbf{v}\\|}
                </math-field>
                <div style="border-top: 1px dashed rgba(128,128,128,0.4); padding-top: 8px;">
                    <math-field read-only style="font-size: 13px; background:transparent; border:none; outline:none;">
                        = \\frac{${fmt(dot)}}{(${fmt(lenA)}) \\times (${fmt(lenB)})}
                    </math-field><br>
                    <math-field read-only style="font-size: 14px; color: var(--text); background:transparent; border:none; outline:none; margin-top:8px; font-weight:bold;">
                        \\theta \\approx ${degVal.toFixed(2)}^\\circ
                    </math-field>
                </div>
            </div>`;

        hud.setStep("<i class='fa-solid fa-fan'></i> BƯỚC 1: ĐO GÓC PHẲNG", "Tiến hành quét góc cung tròn từ Vector thứ nhất sang Vector thứ hai.");
        
        // Animation xoay vector giả mạo (để mồi cho viewer2D tự quét cung tròn)
        // viewer2D vẽ cung dựa vào App.currentAngleVisual2D {a, b}
        await runTweenAsync(1500, Easing.easeInOutCubic, (v) => {
            if (!App.currentAngleVisual2D) return;
            // Interpolate vector B từ A tới B thực tế
            const currentB = [
                a[0] + (b[0] - a[0]) * v,
                a[1] + (b[1] - a[1]) * v
            ];
            // Cập nhật ngầm để viewer2D vẽ cung đang nở ra
            App.currentAngleVisual2D.b = currentB;
            // Cập nhật chữ số độ đang tăng dần
            App.currentAngleVisual2D.deg = degVal * v;
        });
        
        // Trả lại trạng thái thật
        App.currentAngleVisual2D.b = b;
        App.currentAngleVisual2D.deg = degVal;
        await waitAnim(1000);

        hud.setStep("<i class='fa-solid fa-calculator'></i> BƯỚC 2: CÔNG THỨC COSIN", `Góc được chứng minh thông qua định lý hình chiếu (Cosin):${mathHtml}`);
        await waitAnim(7000);

        hud.close();
        fadeUnrelatedVectors([v1Id, v2Id], 1, () => { requestRedraw(); toggleComputeBtn(false); });
    });
  }

  // ==================================================================================
  // ĐỊNH TUYẾN LỆNH ANIMATION TỪ BÊN NGOÀI
  // ==================================================================================
  App.animateOperation = function (op, ids, resValOrId) {
    if (op === "add") {
      if (App.mode === "3D") runAnimAdd3D(ids[0], ids[1], resValOrId);
      else runAnimAdd2D(ids[0], ids[1], resValOrId);
    } else if (op === "projection") {
      if (App.mode === "3D") runAnimProj3D(ids[0], ids[1], resValOrId);
      else runAnimProj2D(ids[0], ids[1], resValOrId);
    } else if (op === "dot") {
      if (App.mode === "3D") runAnimDot3D(ids[0], ids[1], resValOrId);
      else runAnimDot2D(ids[0], ids[1], resValOrId);
    } else if (op === "cross") {
      if (App.mode === "3D") {
          runAnimCross3D(ids[0], ids[1], resValOrId);
      } else {
          App.showToast("Cảnh báo: Tích có hướng chỉ được định nghĩa trong không gian 3D.", "warning");
          setTimeout(() => toggleComputeBtn(false), 500);
      }
    } else if (op === "vector_norm") {
      if (App.mode === "3D") runAnimNorm3D(ids[0], resValOrId);
      else runAnimNorm2D(ids[0], resValOrId);
    } else if (op === "angle_between") { // <--- NHÁNH MỚI BỔ SUNG
      if (App.mode === "3D") runAnimAngle3D(ids[0], ids[1], resValOrId);
      else runAnimAngle2D(ids[0], ids[1], resValOrId);
    }
  };
})();