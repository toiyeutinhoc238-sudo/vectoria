// File: js/app/live-collab.js
// Quản lý Cộng tác thời gian thực cho TOÀN BỘ website (Tự động vẽ UI)

document.addEventListener("DOMContentLoaded", () => {
    const CURRENT_USER_NAME = localStorage.getItem('user_name') || `Khách_${Math.floor(Math.random() * 1000)}`;
    const urlParams = new URLSearchParams(window.location.search);
    let CURRENT_ROOM = urlParams.get("room");

    // --- [DIỆT CỎ TẬN GỐC CHỖ NÀY] ---
    // Chỉ tin tưởng thanh địa chỉ (URL). Bỏ qua hoàn toàn bộ nhớ tạm.
    if (!CURRENT_ROOM || CURRENT_ROOM.trim() === "") {
        sessionStorage.removeItem("LIVE_ROOM"); // Dọn dẹp sạch sẽ rác cũ
        console.log(">> Chế độ Offline (Cá nhân): Không tải Live Collab.");
        return; // Lệnh này sẽ "khai tử" toàn bộ file, cấm Widget hiện lên!
    }

    // Ghi nhận phòng hiện tại
    sessionStorage.setItem("LIVE_ROOM", CURRENT_ROOM);

    // ==========================================
    // TỰ ĐỘNG BƠM GIAO DIỆN (CÓ CHỨC NĂNG KÉO THẢ)
    // ==========================================
    function injectCollabUI() {
    if (document.getElementById("adminFab")) return;

    // 1. Bơm CSS (Đã chuyển sang Vibe Xanh Dương #2196f3 và CĂN CHỈNH LẠI BỐ CỤC)
    const style = document.createElement("style");
    style.innerHTML = `
        .admin-fab { position: fixed; top: 120px; right: 15px; width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #2196f3, #1976d2); color: white; border: none; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4); font-size: 1.2rem; cursor: grab; z-index: 9999; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, box-shadow 0.2s; touch-action: none; user-select: none; }
        .admin-fab:active { cursor: grabbing; transform: scale(0.95); }
        .admin-fab:hover { box-shadow: 0 6px 20px rgba(33, 150, 243, 0.6); }
        .admin-fab-badge { position: absolute; top: -2px; right: -2px; background: #f44336; color: white; font-size: 10px; font-weight: bold; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--card, #fff); pointer-events: none; }
        .admin-popup { position: fixed; width: 340px; max-width: calc(100vw - 30px); background: var(--card, #ffffff); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 1px solid var(--border, #eee); z-index: 9998; display: flex; flex-direction: column; transform-origin: top; animation: popupIn 0.2s ease-out; overflow: hidden; }
        body.dark .admin-popup { background: #1e1e1e; border-color: #444; }
        @keyframes popupIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .admin-popup-header { background: rgba(33, 150, 243, 0.1); padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(33, 150, 243, 0.2); }
        .admin-popup-body { padding: 15px; }
        .fake-cursor { position:absolute; pointer-events:none; z-index:999; transition:all 0.1s linear; display:flex; flex-direction:column; align-items:center; transform: translate(-2px, -2px); }
        
        /* CSS CHUẨN CHO BẢNG MEDIA (Video + Nút bấm) */
        .media-btn-panel { display: flex; gap: 10px; align-items: center; justify-content: center; padding: 10px; background: var(--bg, #f8f9fa); border-radius: 8px; border: 1px solid var(--border, #eee); margin-top: 15px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); }
        body.dark .media-btn-panel { background: #252526; border-color: #333; }
        .media-btn { background: #2196f3; border: none; color: white; width: 42px; height: 38px; border-radius: 6px; cursor: pointer; font-size: 15px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .media-btn.off { background: #f44336; }
        .media-btn:hover { filter: brightness(1.1); }
        .media-btn i { pointer-events: none; }
    `;
    document.head.appendChild(style);

    // 2. Bơm Nút FAB
    const fab = document.createElement("button");
    fab.id = "adminFab";
    fab.className = "admin-fab";
    fab.style.display = "none";
    fab.title = "Quản lý phòng (Có thể kéo thả)";
    fab.innerHTML = `<i class="fa-solid fa-users-gear"></i><span class="admin-fab-badge" id="adminFabBadge">0</span>`;
    document.body.appendChild(fab);

    // 3. Bơm Khung Popup (BỐ CỤC CHUẨN - KHÔNG BỊ TRÔI)
    const popup = document.createElement("div");
    popup.id = "adminPanelPopup";
    popup.className = "admin-popup";
    popup.style.display = "none";
    popup.innerHTML = `
        <div class="admin-popup-header">
            <label style="margin:0; color:#2196f3; font-weight:bold; font-size: 14px;"><i class="fa-solid fa-crown"></i> ĐIỀU HÀNH</label>
            <button id="closeAdminPopup" style="background:transparent; border:none; color:inherit; font-size:1.2rem; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="admin-popup-body">
            <div class="admin-popup-body">
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span id="roomCodeDisplay" style="font-size: 0.85em; background: var(--bg, #eee); color: var(--text-main, #333); padding: 5px 10px; border-radius: 4px; border: 1px solid var(--border, #ddd); font-weight: 600;">Phòng: ...</span>
                    <button id="btnLeaveRoom" style="background: #f44336; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;" title="Rời khỏi phòng này"><i class="fa-solid fa-right-from-bracket"></i> Rời</button>
                </div>
                <span class="sol-badge" style="background: #2196f3; color: white; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: bold; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Bạn (${CURRENT_USER_NAME})</span>
            </div>
            
            <div id="videoFocusArea" style="width: 100%; aspect-ratio: 16/9; max-height: 180px; background: #111; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 2px solid #333; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <video id="localVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                <i id="videoPlaceholder" class="fa-solid fa-user-astronaut fa-3x" style="color: #444;"></i>
                <div style="position: absolute; bottom: 8px; left: 10px; font-size: 11px; color: #fff; background: rgba(0,0,0,0.7); padding: 3px 8px; border-radius: 4px;">
                    <i class="fa-solid fa-volume-high" style="color: #4caf50;"></i> Local
                </div>
            </div>

            <div class="media-btn-panel">
                <button id="toggleMic" class="media-btn" title="Tắt/Mở Mic"><i class="fa-solid fa-microphone"></i></button>
                <button id="toggleCam" class="media-btn" title="Tắt/Mở Cam"><i class="fa-solid fa-video"></i></button>
            </div>

            <div style="margin-top: 20px;">
                <label class="small" style="color: var(--text-main, #333); border-bottom: 1px solid var(--border, #eee); display: block; padding-bottom: 5px; margin-bottom: 5px; font-size: 13px;"><b>Thành viên:</b></label>
                <ul id="memberList" style="list-style: none; padding: 0; margin: 0; max-height: 140px; overflow-y: auto;"></ul>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // ==========================================
    // 4. LOGIC KÉO THẢ (DRAG & DROP) CHO NÚT FAB (Giữ nguyên)
    // ==========================================
    let isDragging = false;
    let isClickPrevented = false; // Phân biệt giữa "Kéo" và "Bấm"
    let startX, startY, initialLeft, initialTop;

    const startDrag = (e) => {
      // Chỉ kéo khi nhấn bằng chuột trái hoặc chạm tay
      if (e.type === "mousedown" && e.button !== 0) return;

      isDragging = true;
      isClickPrevented = false;
      fab.style.transition = "none"; // Tắt mượt để kéo theo tay cho nhạy

      const clientX = e.type.includes("mouse")
        ? e.clientX
        : e.touches[0].clientX;
      const clientY = e.type.includes("mouse")
        ? e.clientY
        : e.touches[0].clientY;

      startX = clientX;
      startY = clientY;

      const rect = fab.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Xóa right, chỉ dùng left tuyệt đối
      fab.style.right = "auto";
      fab.style.left = initialLeft + "px";

      document.addEventListener("mousemove", doDrag);
      document.addEventListener("touchmove", doDrag, { passive: false });
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchend", endDrag);
    };

    const doDrag = (e) => {
      if (!isDragging) return;

      const clientX = e.type.includes("mouse")
        ? e.clientX
        : e.touches[0].clientX;
      const clientY = e.type.includes("mouse")
        ? e.clientY
        : e.touches[0].clientY;

      const dx = clientX - startX;
      const dy = clientY - startY;

      // Nếu tay nhúc nhích > 5px thì xác nhận là đang KÉO, chặn mở Popup
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isClickPrevented = true;
        e.preventDefault(); // Chặn cuộn màn hình trên Mobile
      }

      if (isClickPrevented) {
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // GIỚI HẠN: Không cho kéo lọt ra ngoài màn hình
        const maxX = window.innerWidth - fab.offsetWidth;
        const maxY = window.innerHeight - fab.offsetHeight;

        fab.style.left = Math.max(0, Math.min(newLeft, maxX)) + "px";
        fab.style.top = Math.max(0, Math.min(newTop, maxY)) + "px";

        // Đang kéo thì ẩn cái bảng đi cho đỡ vướng
        popup.style.display = "none";
      }
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      fab.style.transition = "transform 0.2s, box-shadow 0.2s"; // Bật lại mượt

      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("touchmove", doDrag);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchend", endDrag);
    };

    fab.addEventListener("mousedown", startDrag);
    fab.addEventListener("touchstart", startDrag, { passive: false });

    // ==========================================
    // 5. MỞ BẢNG ĐIỀU KHIỂN (THÔNG MINH THEO VỊ TRÍ)
    // ==========================================
    fab.addEventListener("click", (e) => {
      if (isClickPrevented) {
        e.preventDefault();
        return; // Vừa kéo xong thì bỏ qua, không mở bảng
      }

      if (popup.style.display === "none") {
        const rect = fab.getBoundingClientRect();

        // Mặc định hiện bên dưới nút
        let pTop = rect.bottom + 10;

        // Nếu nút đang nằm quá sát đáy màn hình, lật cái bảng lên trên nút
        if (pTop + 300 > window.innerHeight) {
          pTop = rect.top - 310; // 300px là chiều cao dự kiến của popup
        }
        popup.style.top = Math.max(10, pTop) + "px"; // Không cho lố lên viền trên

        // Mặc định thả sang trái nút, nhưng nếu đụng lề trái thì canh theo lề
        popup.style.right = "auto";
        let pLeft = rect.right - 320; // 320px là độ rộng popup
        if (pLeft < 10) pLeft = 10;
        popup.style.left = pLeft + "px";

        popup.style.display = "flex";
      } else {
        popup.style.display = "none";
      }
    });

    
    document.getElementById('closeAdminPopup').addEventListener('click', () => { popup.style.display = 'none'; });

        // LOGIC NÚT RỜI PHÒNG
        document.getElementById('btnLeaveRoom').addEventListener('click', () => {
            if (confirm("Bạn có chắc chắn muốn rời khỏi phòng này?")) {
                // Xóa mã phòng trong bộ nhớ
                sessionStorage.removeItem("LIVE_ROOM");
                // Cắt đứt kết nối với Server ngay lập tức
                if (window.socket) window.socket.disconnect();
                // Đá văng ra trang tính toán trống (Offline)
                window.location.href = "calculation.html";
            }
        });
  }

  // Kích hoạt bơm giao diện (CHỈ KHI CÓ MÃ PHÒNG HỢP LỆ)
    if (CURRENT_ROOM && CURRENT_ROOM.trim() !== "") {
        injectCollabUI();
    } else {
        console.log(">> Chế độ Offline: Không bơm Widget Live Collab.");
        return; // Dừng toàn bộ các lệnh bên dưới lại
    }

  // ==========================================
  // 2. KẾT NỐI SERVER & KHỞI TẠO
  // ==========================================
  const serverUrl = "http://" + window.location.hostname + ":5000";
  if (typeof window.socket === "undefined") {
    window.socket = io(serverUrl);
  }
  window.remoteCursors = window.remoteCursors || {};

  window.socket.on("connect", () => {
    window.socket.emit('join', { room: CURRENT_ROOM, name: CURRENT_USER_NAME });
    console.log(`>> Đã vào phòng Live: ${CURRENT_ROOM}`);
  });

  // ==========================================
  // 3. ĐỒNG BỘ CHUỘT (Vùng an toàn)
  // ==========================================
  function sendPosition(clientX, clientY) {
    const viewer = document.getElementById("viewerWrap");
    if (!viewer) return;

    const rect = viewer.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      window.socket.emit("mouse_move", {
        room: CURRENT_ROOM,
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        name: CURRENT_USER_NAME,
        color: "#3a78ff",
      });
    }
  }

  document.addEventListener("mousemove", (e) =>
    sendPosition(e.clientX, e.clientY),
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 0)
        sendPosition(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );

  window.socket.on("mouse_update", (data) => {
    const viewer = document.getElementById("viewerWrap");
    if (!viewer) return;

    let cursor = window.remoteCursors[data.name];
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.className = "fake-cursor";
      cursor.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${data.color}">
                    <path d="M5.5 3.21V20.8L11.44 17.96L19.5 17.71L5.5 3.21Z" stroke="white" stroke-width="1.5"/>
                </svg>
                <span style="background:${data.color}; color:white; font-size:11px; font-weight:bold; padding:2px 6px; border-radius:4px; white-space:nowrap; margin-top:2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${data.name}</span>
            `;
      viewer.appendChild(cursor);
      window.remoteCursors[data.name] = cursor;
    }
    cursor.style.left = data.x * 100 + "%";
    cursor.style.top = data.y * 100 + "%";
  });

  // ==========================================
  // 4. LẮNG NGHE QUYỀN LỰC VÀ BẢNG ĐIỀU KHIỂN
  // ==========================================
  window.socket.on("permission_update", (state) => {
    const mySid = window.socket.id;
    const myStatus = state.members[mySid];
    const isOwner = state.owner === mySid;

    // Khóa chức năng nếu bị cấm
    if (!isOwner && myStatus && myStatus.blocked) {
      document
        .querySelectorAll(
          'button:not(#adminFab, #closeAdminPopup, #btnTogglePanel), math-field, input:not([type="checkbox"]), select',
        )
        .forEach((el) => {
          el.style.pointerEvents = "none";
          el.style.opacity = "0.5";
        });
      if (typeof App !== "undefined" && App.showToast)
        App.showToast("Bạn đã bị Chủ phòng khóa thao tác!", "error");
    } else {
      document
        .querySelectorAll("button, math-field, input, select")
        .forEach((el) => {
          el.style.pointerEvents = "auto";
          el.style.opacity = "1";
        });
    }

    // Cập nhật Nút FAB
    const adminFab = document.getElementById("adminFab");
    const badge = document.getElementById("adminFabBadge");
    if (adminFab) adminFab.style.display = "flex";
    if (badge) badge.innerText = Object.keys(state.members).length;

    const roomCodeDisplay = document.getElementById("roomCodeDisplay");
    if (roomCodeDisplay) roomCodeDisplay.innerText = `Phòng: ${CURRENT_ROOM}`;

    // Cập nhật Danh sách thành viên
    const memberList = document.getElementById("memberList");
    if (memberList) {
      memberList.innerHTML = "";
      for (const [sid, member] of Object.entries(state.members)) {
        const isThisUserOwner = state.owner === sid;
        const isMe = sid === mySid;

        let li = document.createElement("li");
        li.style.cssText =
          "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border, #eee); font-size: 0.9em;";

        let leftCol = `<div style="color: var(--text-main, #333);">
                    <span style="${member.blocked ? "text-decoration: line-through; color: gray;" : ""}">${member.name} ${isMe ? "(Bạn)" : ""}</span>
                    ${isThisUserOwner ? '<span class="sol-badge" style="background: #ff9800; color: white; margin-left:5px; font-size:9px; padding:2px 4px;">Chủ</span>' : ""}
                    ${member.blocked ? '<span class="sol-badge" style="background: #f44336; color: white; margin-left:5px; font-size:9px; padding:2px 4px;">Cấm</span>' : ""}
                </div>`;

        let rightCol = "";
        if (isOwner && !isMe) {
          rightCol = `<div style="display: flex; gap: 4px;">
                        <button onclick="adminAction('${sid}', 'block', ${!member.blocked})" style="padding: 3px 6px; font-size: 10px; cursor:pointer; background: ${member.blocked ? "#4caf50" : "#f44336"}; color: white; border:none; border-radius:3px;">
                            ${member.blocked ? '<i class="fa-solid fa-unlock"></i>' : '<i class="fa-solid fa-lock"></i>'}
                        </button>
                        <button onclick="adminAction('${sid}', 'transfer', null)" title="Nhượng quyền" style="padding: 3px 6px; font-size: 10px; cursor:pointer; background: #2196f3; color: white; border:none; border-radius:3px;">
                            <i class="fa-solid fa-share"></i>
                        </button>
                    </div>`;
        }
        li.innerHTML = leftCol + rightCol;
        memberList.appendChild(li);
      }
    }
  });

  window.adminAction = function (targetSid, action, value) {
    if (
      action === "transfer" &&
      !confirm("CẢNH BÁO: Bạn có chắc muốn nhượng quyền Chủ phòng?")
    )
      return;
    window.socket.emit("admin_control", {
      room: CURRENT_ROOM,
      target_sid: targetSid,
      action: action,
      value: value,
    });
  };

  // ==========================================
  // 5. LẮNG NGHE LỆNH ACTION (Đồng bộ)
  // ==========================================
  window.socket.on("action_update", (data) => {
    if (data.action === "theme") {
      const isDark = data.theme === "dark";
      if (typeof window.App !== "undefined") App.theme = data.theme;
      localStorage.setItem("vec_theme", data.theme);
      if (typeof window.ThemeManager !== "undefined" && ThemeManager.applyTheme)
        ThemeManager.applyTheme(isDark);
      else if (typeof window.App !== "undefined" && App.applyTheme)
        App.applyTheme();

      if (typeof window.triggerThemeAnim === "function")
        window.triggerThemeAnim(isDark);

      const toggle = document.getElementById("themeToggle");
      if (toggle) toggle.checked = isDark;
    } else if (data.action === "navigate") {
      if (typeof App !== "undefined" && App.showToast)
        App.showToast(`${data.name} đang chuyển hướng phòng...`, "success");
      setTimeout(() => {
        window.location.href = data.url;
      }, 1000);
    } else if (window.App && App.vectorList) {
      if (data.action === "add") {
        const hue = App._pickUniqueHue ? App._pickUniqueHue() : 0;
        const newItem = App._attachVectorItem(data.vec, hue);
        App.vectorList.push(newItem);
        if (App.renderVectorList) App.renderVectorList();
        if (App.redrawAll) App.redrawAll({ frame: false });
      } else if (data.action === "clear") {
        if (typeof App.clearAllVectors === "function") App.clearAllVectors();
        else {
          App.vectorList.length = 0;
          if (App.redrawAll) App.redrawAll({ frame: true });
        }
      }
    }
  });

  // ==========================================
  // 6. ĐÁNH CHẶN THAO TÁC (Gửi lệnh)
  // ==========================================
  const themeToggleBtn = document.getElementById("themeToggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("change", (e) => {
      window.socket.emit("sync_action", {
        room: CURRENT_ROOM,
        action: "theme",
        theme: e.target.checked ? "dark" : "light",
        name: CURRENT_USER_NAME,
      });
    });
  }

  const navLinks = document.querySelectorAll(
    'a[href$=".html"], a[href*=".html?"]',
  );
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetUrl = link.getAttribute("href");
      window.socket.emit("sync_action", {
        room: CURRENT_ROOM,
        action: "navigate",
        url: targetUrl,
        name: CURRENT_USER_NAME,
      });
      window.location.href = targetUrl;
    });
  });

  window.addEventListener("popstate", (e) => {
    window.socket.emit("sync_action", {
      room: CURRENT_ROOM,
      action: "navigate",
      url: window.location.href,
      name: CURRENT_USER_NAME,
    });
  });

  const btnDraw = document.getElementById("btnDraw");
  if (btnDraw) {
    btnDraw.addEventListener("click", () => {
      setTimeout(() => {
        if (window.App && App.vectorList) {
          const newestVector = App.vectorList[App.vectorList.length - 1];
          if (newestVector)
            window.socket.emit("sync_action", {
              room: CURRENT_ROOM,
              action: "add",
              vec: newestVector.vec,
              name: CURRENT_USER_NAME,
            });
        }
      }, 100);
    });
  }

  const btnClear = document.getElementById("btnClearAll");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      window.socket.emit("sync_action", {
        room: CURRENT_ROOM,
        action: "clear",
        name: CURRENT_USER_NAME,
      });
    });
  }

  let localStream = null;
let micEnabled = true;
let camEnabled = true;

async function startMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const videoEl = document.getElementById('localVideo');
        const placeholder = document.getElementById('videoPlaceholder');
        
        if (videoEl) {
            videoEl.srcObject = localStream;
            videoEl.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
    } catch (err) {
        console.warn("Không thể truy cập Mic/Cam:", err);
        if (typeof App !== 'undefined') App.showToast("Cần cấp quyền Mic/Cam để sử dụng!", "error");
    }
}

// Gắn sự kiện cho nút Mic/Cam
document.addEventListener('click', (e) => {
    if (e.target.closest('#toggleMic')) {
        micEnabled = !micEnabled;
        localStream.getAudioTracks()[0].enabled = micEnabled;
        e.target.closest('#toggleMic').classList.toggle('off', !micEnabled);
        e.target.closest('#toggleMic').innerHTML = micEnabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
    }
    
    if (e.target.closest('#toggleCam')) {
        camEnabled = !camEnabled;
        localStream.getVideoTracks()[0].enabled = camEnabled;
        const videoEl = document.getElementById('localVideo');
        videoEl.style.display = camEnabled ? 'block' : 'none';
        document.getElementById('videoPlaceholder').style.display = camEnabled ? 'none' : 'block';
        e.target.closest('#toggleCam').classList.toggle('off', !camEnabled);
    }
});

// Gọi hàm bật Media khi mở Popup lần đầu
document.addEventListener('click', (e) => {
    if (e.target.closest('#adminFab') && !localStream) {
        startMedia();
    }
});
});
