// File: js/app/ui/tour_calculation.js

/* =========================================================
   1. HỆ THỐNG GIẢ LẬP HÀNH VI CON NGƯỜI (AUTO-PILOT)
   ========================================================= */
let tourTimeouts = [];

function clearTourTimeouts() {
  tourTimeouts.forEach(clearTimeout);
  tourTimeouts = [];
}

function tourSetTimeout(fn, delay) {
  const id = setTimeout(fn, delay);
  tourTimeouts.push(id);
  return id;
}

// Khóa nút Tiếp tục
function lockTour(msg = "Đang thao tác...") {
  const nextBtn = document.querySelector(".driver-popover-next-btn");
  if (nextBtn) {
    if (!nextBtn.dataset.originalText) {
      nextBtn.dataset.originalText = nextBtn.innerText;
    }
    nextBtn.innerText = msg;
    nextBtn.style.pointerEvents = "none";
    nextBtn.style.opacity = "0.4";
    nextBtn.style.cursor = "not-allowed";
  }
}

// Mở khóa nút Tiếp tục
function unlockTour() {
  const nextBtn = document.querySelector(".driver-popover-next-btn");
  if (nextBtn) {
    nextBtn.innerText = nextBtn.dataset.originalText || "Tiếp tục →";
    nextBtn.style.pointerEvents = "auto";
    nextBtn.style.opacity = "1";
    nextBtn.style.cursor = "pointer";
  }
}

// Hàm tính toán Bounding Box chính xác ôm sát vector
function toggleGraphHighlight(isActive, vectors = []) {
  let flashlight = document.getElementById("tour-graph-flashlight");
  if (!flashlight) {
    flashlight = document.createElement("div");
    flashlight.id = "tour-graph-flashlight";
    document.body.appendChild(flashlight);
  }

  if (!isActive) {
    flashlight.classList.remove("active");
    return;
  }

  try {
    if (
      vectors.length > 0 &&
      window.App.mode === "3D" &&
      window.Vec3D &&
      Vec3D._camera
    ) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const points = [[0, 0, 0], ...vectors];

      const canvasRect = Vec3D._renderer.domElement.getBoundingClientRect();
      const u = Vec3D.S3D ? Math.max(1e-12, Vec3D.S3D.unitsPerWorld) : 1;

      points.forEach((v) => {
        const vec3 = new THREE.Vector3(
          v[0] || 0,
          v[1] || 0,
          v[2] || 0,
        ).multiplyScalar(u);
        vec3.project(Vec3D._camera);
        const px = (vec3.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
        const py = (-(vec3.y * 0.5) + 0.5) * canvasRect.height + canvasRect.top;

        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      });

      const padding = 20;
      flashlight.style.left = minX - padding + "px";
      flashlight.style.top = minY - padding + "px";
      flashlight.style.width = maxX - minX + padding * 2 + "px";
      flashlight.style.height = maxY - minY + padding * 2 + "px";
      flashlight.style.transform = "none";
    } else {
      flashlight.style.top = "10%";
      flashlight.style.left = "10%";
      flashlight.style.width = "80%";
      flashlight.style.height = "40vh";
    }
  } catch (e) {
    console.warn("Lỗi tính toán khung sáng:", e);
  }

  flashlight.classList.add("active");
}

// Tạo và lấy chuột giả
function getFakeCursor() {
  let cursor = document.getElementById("tour-fake-cursor");
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.id = "tour-fake-cursor";
    cursor.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.8C5.5 21.46 6.25 21.84 6.78 21.44L11.44 17.96C11.66 17.8 11.93 17.71 12.21 17.71H19.5C20.18 17.71 20.55 16.92 20.12 16.42L5.5 3.21Z" fill="#111" stroke="white" stroke-width="2"/></svg>`;

    cursor.style.position = "fixed";
    cursor.style.zIndex = "999999999";
    cursor.style.transition =
      "top 0.8s ease-in-out, left 0.8s ease-in-out, transform 0.2s";
    cursor.style.pointerEvents = "none";
    cursor.style.opacity = "0";
    cursor.style.top = "80%";
    cursor.style.left = "80%";
    cursor.style.transformOrigin = "top left";
    cursor.style.filter = "drop-shadow(0px 4px 6px rgba(0,0,0,0.4))";
    document.body.appendChild(cursor);
  }
  return cursor;
}

function moveCursorTo(target, callback) {
  const cursor = getFakeCursor();
  let el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  cursor.style.opacity = "1";
  cursor.style.top = rect.top + rect.height / 2 + "px";
  cursor.style.left = rect.left + rect.width / 2 + "px";

  if (callback) tourSetTimeout(callback, 850);
}

function clickCursor(targetElement, callback) {
  const cursor = getFakeCursor();
  cursor.style.transform = "scale(0.8)";
  tourSetTimeout(() => {
    cursor.style.transform = "scale(1)";
    if (targetElement) targetElement.click();
    if (callback) tourSetTimeout(callback, 300);
  }, 150);
}

// [PHÉP THUẬT]: Đã sửa! Chuột chỉ click 1 lần để focus, sau đó đứng im để gõ phím
function simulateHumanTyping(mf, text, callback) {
  if (!mf) return callback && callback();

  // GỌI CHUỘT LÊN MÀN HÌNH
  const cursor = getFakeCursor();
  const rect = mf.getBoundingClientRect();
  cursor.style.opacity = "1";
  cursor.style.top = rect.top + rect.height / 2 + "px";
  cursor.style.left = rect.left + rect.width / 2 + "px";

  // Chờ 600ms cho màn hình cuộn mượt và chuột bay tới nơi
  tourSetTimeout(() => {
    // Chuột chỉ CLICK ĐÚNG 1 LẦN để "nhấn vào" ô nhập
    cursor.style.transform = "scale(0.85)";

    tourSetTimeout(() => {
      cursor.style.transform = "scale(1)"; // Nhả click ra

      mf.focus();
      mf.executeCommand("deleteAll");

      let i = 0;
      // Hàm gõ phím nhẹ nhàng, không giật chuột nữa
      const typeNext = () => {
        if (i < text.length) {
          mf.executeCommand(["insert", text[i]]);
          mf.dispatchEvent(new Event("input", { bubbles: true }));
          i++;
          tourSetTimeout(typeNext, 200);
        } else {
          mf.dispatchEvent(new Event("change", { bubbles: true }));
          if (callback) tourSetTimeout(callback, 200);
        }
      };
      typeNext(); // Bắt đầu gõ
    }, 150);
  }, 600);
}

function quickSyncMathLive(mf, text) {
  if (!mf || !text) return;
  mf.executeCommand("deleteAll");
  mf.executeCommand(["insert", text]);
  mf.dispatchEvent(new Event("input", { bubbles: true }));
  mf.dispatchEvent(new Event("change", { bubbles: true }));
}

/* =========================================================
   [MỚI] HỆ THỐNG CACHE TRẠNG THÁI (TRƯỚC TOUR & TỪNG BƯỚC)
   ========================================================= */
let isTourRunning = false;
let userPreTourState = { input: "", vectors: [] };
// 1. Khóa mõm tính năng cuộn giật cục của Driver.js
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
HTMLElement.prototype.scrollIntoView = function (...args) {
  if (isTourRunning) return; // Nếu Tour đang chạy, cấm Driver.js tự ý cuộn!
  originalScrollIntoView.apply(this, args);
};

// 2. Ép Driver.js cập nhật vị trí khung liên tục khi màn hình cuộn mượt
document.addEventListener("DOMContentLoaded", () => {
  const controlsArea = document.getElementById("controls");
  if (controlsArea) {
    controlsArea.addEventListener("scroll", () => {
      if (isTourRunning) window.dispatchEvent(new Event("resize"));
    });
  }
  // Lắng nghe lúc bấm nút bật Tour - Backup NGAY LẬP TỨC ở đây
const btnTour = document.getElementById("btn-tour-khoitao");
if (btnTour) {
  btnTour.addEventListener("click", (e) => {
    // Chỉ backup nếu tour chưa chạy
    if (!isTourRunning) {
      backupUserState(); 
      isTourRunning = true;
    }
  }, { capture: true });
}
});

/* =========================================================
   HỆ THỐNG BACKUP & RESTORE CHUẨN - FIX LỖI LIST RỖNG
   ========================================================= */

function backupUserState() {
  const mf = document.getElementById("vectorInput");
  // 1. Lưu cái chữ đang gõ dở
  userPreTourState.input = mf ? mf.value : "";
  
  // 2. [QUAN TRỌNG] Lưu danh sách vector từ mảng App.vectorList thật
  userPreTourState.vectors = [];
  if (window.App && App.vectorList) {
    // Chỉ lấy mảng tọa độ [x, y...] của từng vector
    userPreTourState.vectors = App.vectorList.map(item => [...item.vec]);
  }
  console.log(">> Đã sao lưu trạng thái:", userPreTourState);
}

function restoreUserState() {
  console.log(">> Đang phục hồi trạng thái cho sếp...");
  
  // 1. Xóa sạch đống rác mà Tour Guide bày ra
  if (typeof App.clearAllVectors === 'function') {
    App.clearAllVectors();
  } else {
    App.vectorList = [];
    if (App.redrawAll) App.redrawAll({ frame: true });
  }

  const mf = document.getElementById("vectorInput");
  const btnDraw = document.getElementById("btnDraw");
  
  if (mf && btnDraw) {
    // 2. Vẽ lại những gì sếp đã có từ mảng backup
    if (userPreTourState.vectors && userPreTourState.vectors.length > 0) {
      userPreTourState.vectors.forEach((vArray) => {
        // Biến mảng [1, 2] thành chuỗi "[1, 2]" để nhập vào ô
        const vecStr = "[" + vArray.join(", ") + "]";
        quickSyncMathLive(mf, vecStr);
        btnDraw.click(); // Kích hoạt hàm thêm vector của sếp
      });
    }

    // 3. Trả lại cái chữ sếp đang gõ dở
    quickSyncMathLive(mf, userPreTourState.input || "");
  }
}

const stepStates = {
  "step-nhap-1": { v: [], i: "" },
  "step-menu": { v: [], i: "[1, 3]" },
  "step-add-1": { v: [], i: "[1, 3]" },
  "step-auto": { v: ["[1, 3]"], i: "[1, 3]" },
  "step-nhap-2": { v: ["[1, 3]"], i: "[1, 3]" },
  "step-add-2": { v: ["[1, 3]"], i: "[1, 2, 3]" },
  "step-search": { v: ["[1, 3]", "[1, 2, 3]"], i: "[1, 2, 3]" },
  "step-focus": { v: ["[1, 3]", "[1, 2, 3]"], i: "[1, 2, 3]" },
  "step-toggle": { v: ["[1, 3]", "[1, 2, 3]"], i: "[1, 2, 3]" },
  "step-delete": { v: ["[1, 3]", "[1, 2, 3]"], i: "[1, 2, 3]" },
  "step-clear": { v: ["[1, 2, 3]"], i: "[1, 2, 3]" },
};

function syncStepState(stepId) {
  const state = stepStates[stepId];
  if (!state) return;
  const btnClear = document.getElementById("btnClearAll");
  if (btnClear) btnClear.click();
  const mf = document.getElementById("vectorInput");
  const btnDraw = document.getElementById("btnDraw");
  if (mf && btnDraw) {
    state.v.forEach((vec) => {
      quickSyncMathLive(mf, vec);
      btnDraw.click();
    });
    quickSyncMathLive(mf, state.i);
  }
}

/* =========================================================
   THUẬT TOÁN CUỘN NHANH VÀ BÁM DÍNH KHUNG ĐỒNG THỜI
   ========================================================= */
function smartScrollTo(targetSelector) {
  const targetEl =
    typeof targetSelector === "string"
      ? document.querySelector(targetSelector)
      : targetSelector;
  const container = document.getElementById("controls");
  const tabs = document.querySelector(".sidebar-tabs");

  if (!container || !targetEl) return false;

  const tRect = targetEl.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const tabsRect = tabs ? tabs.getBoundingClientRect() : { bottom: cRect.top };

  const safeTop = tabsRect.bottom + 10;
  const safeBottom = cRect.bottom - 10;

  // Nếu đã nằm trong vùng an toàn thì không cuộn
  if (tRect.top >= safeTop && tRect.bottom <= safeBottom) {
    return false;
  }

  // Tính tọa độ ĐÍCH đến chính xác tuyệt đối (Không dùng offsetTop)
  const relativeTop = tRect.top - cRect.top;
  const absoluteTop = container.scrollTop + relativeTop;
  const tabsHeight = tabs ? tabs.offsetHeight : 0;

  // Đích đến: nằm ngay dưới thanh Tab, cách ra 15px
  const targetScrollPos = absoluteTop - tabsHeight - 15;

  // 1. Bắn lệnh cuộn mượt (Trình duyệt sẽ tự lo phần trượt nhanh chậm)
  container.scrollTo({ top: targetScrollPos, behavior: "smooth" });

  // 2. ÉP KHUNG BAO CHẠY CÙNG LÚC:
  // Chạy vòng lặp 10ms/lần (100FPS) để Driver.js vẽ lại khung liên tục trong lúc màn hình đang cuộn
  let count = 0;
  const syncInterval = setInterval(() => {
    window.dispatchEvent(new Event("resize"));
    count++;
    // Sau khoảng 400ms (thường là thời gian cuộn smooth xong), dừng vòng lặp
    if (count > 40) clearInterval(syncInterval);
  }, 10);

  return true;
}

// Bắt buộc cuộn về đỉnh (Có ép khung chạy cùng)
function forceScrollToTop() {
  const container = document.getElementById("controls");
  if (container && container.scrollTop > 0) {
    // Cuộn mượt
    container.scrollTo({ top: 0, behavior: "smooth" });

    // Ép khung chạy bám theo cùng lúc
    let count = 0;
    const syncInterval = setInterval(() => {
      window.dispatchEvent(new Event("resize"));
      count++;
      if (count > 40) clearInterval(syncInterval);
    }, 10);

    return true;
  }
  return false;
}

/* =========================================================
   KỊCH BẢN ĐẠO DIỄN CHÍNH THỨC
   ========================================================= */
const khoiTaoVectorSteps = [
  {
    id: "step-nhap-1",
    element: "#vectorInput",
    popover: {
      title: "Khu vực nhập liệu",
      description:
        "Trong Vectoria, tọa độ của vector là mảng một chiều chứa các giá trị tọa độ... Ví dụ ta có vector <b>[1, 3]</b>.",
      side: "bottom",
    },
    onHighlighted: () => {
      
        
      isTourRunning = true;
      
      syncStepState("step-nhap-1");
      clearTourTimeouts();
      lockTour("Đang nhập liệu...");
      toggleGraphHighlight(false);

      forceScrollToTop(); // Luôn về đầu màn hình ở bước 1

      // Rút bỏ moveCursorTo vì simulateHumanTyping đã kiêm luôn chuyện gọi chuột
      const mf = document.getElementById("vectorInput");
      simulateHumanTyping(mf, "[1, 3]", unlockTour);
    },
  },
  {
    id: "step-menu",
    element: "#myMenuBtn",
    popover: {
      title: "Danh sách các lệnh",
      description:
        "Đây là danh sách chứa các lệnh để chèn hàm vào trong khu vực nhập liệu gồm dấu khai căn, logarit, lũy thừa,...",
      side: "bottom",
    },
    onHighlighted: () => {
      syncStepState("step-menu");
      clearTourTimeouts();
      lockTour("Đang di chuyển...");
      forceScrollToTop();
      tourSetTimeout(() => moveCursorTo("#myMenuBtn", unlockTour), 50);
    },
  },
  {
    id: "step-add-1",
    element: "#btnDraw",
    popover: {
      title: "Khởi tạo Vector",
      description:
        "Sau khi nhập tọa độ xong, bấm nút <b>Thêm vector</b> để tạo vector trên đồ thị.",
      side: "right",
    },
    onHighlighted: () => {
      syncStepState("step-add-1");
      clearTourTimeouts();
      lockTour("Đang click...");
      forceScrollToTop();
      tourSetTimeout(
        () =>
          moveCursorTo("#btnDraw", () =>
            clickCursor(document.getElementById("btnDraw"), unlockTour),
          ),
        50,
      );
    },
  },
  {
    id: "step-auto",
    element: "#btnAuto",
    popover: {
      title: "Chuyển chiều không gian tự động",
      description:
        "Tính năng này mặc định <b>BẬT</b>. Tác dụng của nó là đồng bộ chiều không gian của đồ thị với vector mà mình đã tạo...",
      side: "right",
    },
    onHighlighted: () => {
      syncStepState("step-auto");
      clearTourTimeouts();
      lockTour("Đang di chuyển...");
      forceScrollToTop();
      tourSetTimeout(() => moveCursorTo("#btnAuto", unlockTour), 50);
    },
  },
  {
    id: "step-nhap-2",
    element: "#vectorInput",
    popover: {
      title: 'Thử nghiệm tính năng "Chuyển chiều không gian tự động" [1]',
      description:
        "Hiện tại, đồ thị đang là không gian 2 chiều, ta nhập tiếp một vector 3 chiều: <b>[1, 2, 3]</b>.",
      side: "bottom",
    },
    onHighlighted: () => {
      syncStepState("step-nhap-2");
      clearTourTimeouts();
      lockTour("Đang nhập liệu...");
      forceScrollToTop();

      const mf = document.getElementById("vectorInput");
      simulateHumanTyping(mf, "[1, 2, 3]", unlockTour);
    },
  },
  {
    id: "step-add-2",
    element: "#btnDraw",
    popover: {
      title: 'Thử nghiệm tính năng "Chuyển chiều không gian tự động" [2]',
      description:
        "Kết quả là đồ thị tự đồng bộ chiều không gian với vector vừa được tạo.",
      side: "right",
    },
    onHighlighted: () => {
      syncStepState("step-add-2");
      clearTourTimeouts();
      lockTour("Đang click...");
      forceScrollToTop();
      tourSetTimeout(
        () =>
          moveCursorTo("#btnDraw", () =>
            clickCursor(document.getElementById("btnDraw"), unlockTour),
          ),
        50,
      );
    },
  },
  {
    id: "step-search",
    element: "#mainVecSearch",
    popover: {
      title: "Khu vực tìm kiếm vector",
      description:
        "Khi có hàng tá vector trong danh sách, để tìm nhanh một vector nhằm mục đích thao tác trên vector đó, ta cứ gõ tọa độ vào đây...",
      side: "top",
    },
    onHighlighted: () => {
      syncStepState("step-search");
      clearTourTimeouts();
      lockTour("Đang di chuyển...");
      toggleGraphHighlight(false);

      smartScrollTo("#mainVecSearch");
      tourSetTimeout(() => moveCursorTo("#mainVecSearch", unlockTour), 100);
    },
  },
  {
    id: "step-focus",
    element: ".vec-item:nth-child(1) .vec-actions button:nth-child(1)",
    popover: {
      title: 'Nút "Chú ý"',
      description:
        "Nút <b>Chú ý</b> giúp vector [1, 3] được nổi bật và làm mờ các vector khác.",
      side: "top",
    },
    onHighlighted: () => {
      syncStepState("step-focus");
      clearTourTimeouts();
      lockTour("Đang thao tác...");
      toggleGraphHighlight(false);

      const targetBtn = document.querySelector(
        ".vec-item:nth-child(1) .vec-actions button:nth-child(1)",
      );
      if (targetBtn) {
        smartScrollTo(".vec-item:nth-child(1)");

        tourSetTimeout(() => {
          toggleGraphHighlight(true, [
            [1, 3],
            [1, 2, 3],
          ]);
          moveCursorTo(targetBtn, () =>
            clickCursor(targetBtn, () => {
              tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
            }),
          );
        }, 100);
      } else unlockTour();
    },
  },
  {
    id: "step-toggle",
    element: ".vec-item:nth-child(1) .vec-actions button:nth-child(2)",
    popover: {
      title: 'Nút "Ẩn/Hiện"',
      description:
        "Nút <b>Ẩn</b> làm ẩn vector được chỉ định. Nút <b>Hiện</b> làm hiện vector được chỉ định ẩn trước đó.",
      side: "top",
    },
    onHighlighted: () => {
      syncStepState("step-toggle");
      clearTourTimeouts();
      lockTour("Đang thao tác...");

      const targetBtn = document.querySelector(
        ".vec-item:nth-child(1) .vec-actions button:nth-child(2)",
      );
      if (targetBtn) {
        smartScrollTo(".vec-item:nth-child(1)");

        tourSetTimeout(() => {
          toggleGraphHighlight(true, [
            [1, 3],
            [1, 2, 3],
          ]);
          moveCursorTo(targetBtn, () =>
            clickCursor(targetBtn, () => {
              tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
            }),
          );
        }, 100);
      } else unlockTour();
    },
  },
  {
    id: "step-delete",
    element: ".vec-item:nth-child(1) .vec-actions button:nth-child(3)",
    popover: {
      title: 'Nút "Xóa"',
      description:
        "Nút <b>Xóa</b> sẽ loại bỏ hoàn toàn vector ra khỏi danh sách và đồ thị.",
      side: "top",
    },
    onHighlighted: () => {
      syncStepState("step-delete");
      clearTourTimeouts();
      lockTour("Đang thao tác...");

      const targetBtn = document.querySelector(
        ".vec-item:nth-child(1) .vec-actions button:nth-child(3)",
      );
      if (targetBtn) {
        smartScrollTo(".vec-item:nth-child(1)");

        tourSetTimeout(() => {
          toggleGraphHighlight(true, [
            [1, 3],
            [1, 2, 3],
          ]);
          moveCursorTo(targetBtn, () => clickCursor(targetBtn, unlockTour));
        }, 100);
      } else unlockTour();
    },
  },
  {
    id: "step-clear",
    element: "#btnClearAll",
    popover: {
      title: 'Nút "Xóa hết vector"',
      description: "Loại bỏ hết các vector có trong danh sách và đồ thị",
      side: "right",
    },
    onHighlighted: () => {
      syncStepState("step-clear");
      clearTourTimeouts();
      lockTour("Đang dọn dẹp...");
      toggleGraphHighlight(false);

      smartScrollTo("#btnClearAll");
      tourSetTimeout(
        () =>
          moveCursorTo("#btnClearAll", () =>
            clickCursor(document.getElementById("btnClearAll"), unlockTour),
          ),
        100,
      );
    },
  },
];

function cleanupTour() {
  clearTourTimeouts();
  toggleGraphHighlight(false);
  const cursor = document.getElementById("tour-fake-cursor");
  if (cursor) cursor.style.opacity = "0";
  restoreUserState();
  isTourRunning = false;
}

let finalSteps = khoiTaoVectorSteps;

if (window.innerWidth <= 768) {
  finalSteps = khoiTaoVectorSteps.filter((step) => step.id !== "step-menu");
}

setupGuidedTour("btn-tour-khoitao", finalSteps, cleanupTour);
