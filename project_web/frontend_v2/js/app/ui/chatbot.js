(function () {
  // 1. CẤU HÌNH GLOBAL & API BASE
  const GEMINI_API_KEY = "AQ.Ab8RN6KMsBbo2SuAYd39wwL_OvvRpc7QPcF33QPT2c2ube5U3Q";
  const GEMINI_MODEL = "gemini-1.5-flash";
  const API_BASE = (window.App && window.App.API_BASE) || 
    ((location.hostname === "127.0.0.1" || location.hostname === "localhost") 
      ? "http://127.0.0.1:5000" : "https://vectoria-3fdh.onrender.com");

  const SYSTEM_INSTRUCTION = "Bạn là Trợ lý AI Vectoria, một chuyên gia thân thiện về Đại số tuyến tính, Không gian Vector, Ma trận và Hình học không gian 2D/3D. Bạn được tích hợp trong ứng dụng Vectoria (công cụ học tập trực quan hóa Vector). Hãy trả lời ngắn gọn, súc tích, dễ hiểu bằng tiếng Việt. Sử dụng Markdown để định dạng và sử dụng LaTeX (bọc bằng dấu $$ hoặc $) khi viết công thức toán học nếu cần.";

  let chatHistory = [];
  let isWindowOpen = false;

  // 2. INJECT CSS STYLES
  function injectChatbotStyles() {
    if (document.getElementById("vectoria-chatbot-styles")) return;

    const style = document.createElement("style");
    style.id = "vectoria-chatbot-styles";
    style.textContent = `
      /* --- FLOATING BUBBLE --- */
      .ai-chat-bubble {
        position: fixed;
        right: 30px;
        bottom: 30px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2196F3, #4f85ff);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
        cursor: pointer;
        z-index: 10000;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        animation: chatBubblePop 1s ease-out;
      }
      .ai-chat-bubble:hover {
        transform: scale(1.1) rotate(10deg);
        box-shadow: 0 6px 20px rgba(33, 150, 243, 0.6);
      }
      .ai-chat-bubble i {
        font-size: 24px;
      }
      .ai-chat-bubble .notification-dot {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background-color: #ff4444;
        border: 2px solid white;
        border-radius: 50%;
        display: none;
      }

      /* --- CHAT WINDOW CONTAINER --- */
      .ai-chat-window {
        position: fixed;
        right: 30px;
        bottom: 95px;
        width: 380px;
        height: 520px;
        max-height: 80vh;
        max-width: 90vw;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(58, 120, 255, 0.15);
        border-radius: 16px;
        box-shadow: 0 10px 40px -10px rgba(58, 120, 255, 0.25);
        display: none;
        flex-direction: column;
        z-index: 10000;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
        transition: transform 0.3s ease, opacity 0.3s ease;
        transform: translateY(20px) scale(0.95);
        opacity: 0;
      }
      .ai-chat-window.show {
        display: flex;
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      /* --- CHAT HEADER --- */
      .ai-chat-header {
        background: linear-gradient(135deg, #2196F3, #4f85ff);
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .ai-chat-header-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ai-chat-header-info i {
        font-size: 20px;
      }
      .ai-chat-header-text {
        text-align: left;
      }
      .ai-chat-header-title {
        font-weight: 700;
        font-size: 15px;
        margin: 0;
      }
      .ai-chat-header-status {
        font-size: 11px;
        opacity: 0.8;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        background-color: #4caf50;
        border-radius: 50%;
        display: inline-block;
      }
      .ai-chat-header-actions {
        display: flex;
        gap: 12px;
      }
      .ai-chat-header-action {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        opacity: 0.8;
        font-size: 16px;
        padding: 0;
        transition: opacity 0.2s;
      }
      .ai-chat-header-action:hover {
        opacity: 1;
      }

      /* --- CHAT BODY (MESSAGES) --- */
      .ai-chat-body {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ai-msg-row {
        display: flex;
        flex-direction: column;
        max-width: 80%;
      }
      .ai-msg-row.user {
        align-self: flex-end;
        align-items: flex-end;
      }
      .ai-msg-row.model {
        align-self: flex-start;
        align-items: flex-start;
      }
      .ai-msg-bubble {
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13.5px;
        line-height: 1.5;
        word-break: break-word;
        box-sizing: border-box;
      }
      .ai-msg-row.user .ai-msg-bubble {
        background-color: #2196F3;
        color: white;
        border-bottom-right-radius: 4px;
      }
      .ai-msg-row.model .ai-msg-bubble {
        background-color: rgba(0, 0, 0, 0.05);
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }
      .ai-msg-time {
        font-size: 10px;
        color: #999;
        margin-top: 4px;
      }

      /* Formatting inside bubble */
      .ai-msg-bubble p {
        margin: 0 0 8px 0;
      }
      .ai-msg-bubble p:last-child {
        margin-bottom: 0;
      }
      .ai-msg-bubble strong {
        font-weight: 700;
      }
      .ai-msg-bubble ul, .ai-msg-bubble ol {
        margin: 0 0 8px 0;
        padding-left: 20px;
      }
      .ai-msg-bubble li {
        margin-bottom: 4px;
      }
      .ai-msg-bubble pre {
        background: rgba(0,0,0,0.08);
        padding: 8px;
        border-radius: 6px;
        overflow-x: auto;
        font-family: monospace;
        margin: 5px 0;
        font-size: 12px;
      }
      .ai-msg-bubble code {
        font-family: monospace;
        background: rgba(0,0,0,0.06);
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 12px;
      }

      /* --- TYPING INDICATOR --- */
      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 12px;
        border-bottom-left-radius: 4px;
        align-self: flex-start;
      }
      .typing-dot {
        width: 6px;
        height: 6px;
        background-color: #888;
        border-radius: 50%;
        animation: typingDotBounce 1.4s infinite ease-in-out both;
      }
      .typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .typing-dot:nth-child(2) { animation-delay: -0.16s; }

      /* --- CHAT FOOTER (INPUT) --- */
      .ai-chat-footer {
        padding: 12px;
        background: rgba(255,255,255,0.9);
        border-top: 1px solid rgba(58, 120, 255, 0.1);
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .ai-chat-input {
        flex: 1;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 20px;
        padding: 8px 15px;
        font-size: 13.5px;
        outline: none;
        background: white;
        color: #333;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .ai-chat-input:focus {
        border-color: #2196F3;
      }
      .ai-chat-send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: #2196F3;
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }
      .ai-chat-send-btn:hover {
        background-color: #1976D2;
      }

      /* --- DARK MODE OVERRIDES --- */
      body.dark .ai-chat-window {
        background: rgba(15, 23, 42, 0.85);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
      }
      body.dark .ai-chat-body {
        background: transparent;
      }
      body.dark .ai-msg-row.model .ai-msg-bubble {
        background-color: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
        border-color: rgba(255, 255, 255, 0.05);
      }
      body.dark .ai-msg-row.model pre {
        background: rgba(0,0,0,0.3);
      }
      body.dark .ai-msg-row.model code {
        background: rgba(255,255,255,0.1);
      }
      body.dark .ai-chat-footer {
        background: rgba(15, 23, 42, 0.95);
        border-top-color: rgba(255, 255, 255, 0.1);
      }
      body.dark .ai-chat-input {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.15);
        color: white;
      }
      body.dark .ai-chat-input:focus {
        border-color: #4f85ff;
      }
      body.dark .ai-chat-send-btn {
        background-color: #4f85ff;
      }
      body.dark .ai-chat-send-btn:hover {
        background-color: #3a78ff;
      }
      body.dark .typing-indicator {
        background-color: rgba(255, 255, 255, 0.08);
      }
      body.dark .typing-dot {
        background-color: #aaa;
      }

      /* --- KEYFRAMES --- */
      @keyframes chatBubblePop {
        0% { transform: scale(0); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes typingDotBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // 3. INJECT HTML ELEMENTS
  function injectChatbotHTML() {
    if (document.getElementById("vectoria-chatbot-bubble")) return;

    // Bubble button
    const bubble = document.createElement("div");
    bubble.id = "vectoria-chatbot-bubble";
    bubble.className = "ai-chat-bubble";
    bubble.title = "Trợ lý AI";
    bubble.innerHTML = `
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <div class="notification-dot" id="chatbot-notif"></div>
    `;

    // Chat Window
    const win = document.createElement("div");
    win.id = "vectoria-chatbot-window";
    win.className = "ai-chat-window";
    win.innerHTML = `
      <div class="ai-chat-header">
        <div class="ai-chat-header-info">
          <i class="fa-solid fa-robot"></i>
          <div class="ai-chat-header-text">
            <h4 class="ai-chat-header-title">Trợ lý AI Vectoria</h4>
            <div class="ai-chat-header-status">
              <span class="status-dot"></span> Online
            </div>
          </div>
        </div>
        <div class="ai-chat-header-actions">
          <button class="ai-chat-header-action" id="chatbot-clear-btn" title="Xóa lịch sử">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button class="ai-chat-header-action" id="chatbot-close-btn" title="Thu nhỏ">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="ai-chat-body" id="chatbot-messages">
        <!-- Messages render dynamically -->
      </div>
      <div class="ai-chat-footer">
        <input type="text" class="ai-chat-input" id="chatbot-input" placeholder="Hỏi tôi về vector, ma trận..." autocomplete="off">
        <button class="ai-chat-send-btn" id="chatbot-send-btn">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    // Event Bindings
    bubble.addEventListener("click", toggleChatWindow);
    document.getElementById("chatbot-close-btn").addEventListener("click", toggleChatWindow);
    document.getElementById("chatbot-clear-btn").addEventListener("click", handleClearHistory);
    document.getElementById("chatbot-send-btn").addEventListener("click", handleSend);
    document.getElementById("chatbot-input").addEventListener("keypress", function (e) {
      if (e.key === "Enter") handleSend();
    });
  }

  // 4. PARSE MARKDOWN
  function parseMarkdown(text) {
    let s = text;
    // Xử lý HTML escape
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Xử lý Code block
    s = s.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Xử lý Inline code
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Xử lý Bold text
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Xử lý xuống dòng thành <br>
    s = s.split("\n").map(line => {
      // Check list items
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return `<li>${line.trim().substring(2)}</li>`;
      }
      return `<p>${line}</p>`;
    }).join("");

    // Bọc các thẻ <li> cạnh nhau bằng <ul>
    s = s.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
    s = s.replace(/<\/ul><ul>/g, ''); // Gộp các <ul> liền kề
    
    return s;
  }

  // 5. RENDER MESSAGES
  function renderMessage(sender, text, timestamp = null) {
    const chatBody = document.getElementById("chatbot-messages");
    if (!chatBody) return;

    // Loại bỏ typing indicator nếu có
    const typing = document.getElementById("chatbot-typing");
    if (typing) typing.remove();

    const row = document.createElement("div");
    row.className = `ai-msg-row ${sender}`;
    
    const parsedText = parseMarkdown(text);
    const timeStr = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <div class="ai-msg-bubble">${parsedText}</div>
      <span class="ai-msg-time">${timeStr}</span>
    `;

    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const chatBody = document.getElementById("chatbot-messages");
    if (!chatBody || document.getElementById("chatbot-typing")) return;

    const div = document.createElement("div");
    div.id = "chatbot-typing";
    div.className = "typing-indicator";
    div.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // 6. DB & SYNC HISTORY
  function getUserEmail() {
    return localStorage.getItem("user_email") || null;
  }

  async function loadChatHistory() {
    const email = getUserEmail();
    const chatBody = document.getElementById("chatbot-messages");
    if (!chatBody) return;
    chatBody.innerHTML = "";

    if (email) {
      // Đang đăng nhập -> Kéo lịch sử từ Neon Postgres
      try {
        const res = await fetch(`${API_BASE}/api/get_chat_history?email=${encodeURIComponent(email)}`);
        const result = await res.json();
        if (result.status === "success" && result.data) {
          chatHistory = result.data.map(item => ({
            role: item.sender === "user" ? "user" : "model",
            parts: [{ text: item.message }],
            created_at: item.created_at
          }));
          
          if (chatHistory.length > 0) {
            chatHistory.forEach(msg => {
              renderMessage(msg.role, msg.parts[0].text, msg.created_at);
            });
          } else {
            showWelcomeMessage();
          }
        } else {
          showWelcomeMessage();
        }
      } catch (err) {
        console.error("Lỗi đồng bộ lịch sử AI:", err);
        showWelcomeMessage();
      }
    } else {
      // Chế độ khách -> Kéo lịch sử từ LocalStorage
      const localData = localStorage.getItem("vectoria_guest_chat");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          chatHistory = parsed;
          chatHistory.forEach(msg => {
            renderMessage(msg.role, msg.parts[0].text);
          });
        } catch (e) {
          chatHistory = [];
          showWelcomeMessage();
        }
      } else {
        showWelcomeMessage();
      }
    }
  }

  function showWelcomeMessage() {
    const userName = localStorage.getItem("user_name") || "Bạn";
    const welcome = `Xin chào **${userName}**! Tôi là Trợ lý AI của Vectoria. 🤖🚀\n\nTôi có thể giúp bạn giải đáp các kiến thức về:\n- **Độc lập / phụ thuộc tuyến tính**\n- **Tìm cơ sở & số chiều không gian Vector**\n- **Các phép toán ma trận, tích vô hướng**\n\nBạn có câu hỏi gì cần tôi giải đáp không?`;
    renderMessage("model", welcome);
  }

  async function saveChatMessage(sender, message) {
    // Luôn cập nhật vào chatHistory trong bộ nhớ để giữ context hội thoại cho Gemini
    chatHistory.push({
      role: sender === "user" ? "user" : "model",
      parts: [{ text: message }]
    });

    const email = getUserEmail();
    if (email) {
      // Lưu lên Neon Postgres
      try {
        await fetch(`${API_BASE}/api/save_chat_message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, sender, message })
        });
      } catch (err) {
        console.error("Lỗi lưu tin nhắn lên DB:", err);
      }
    } else {
      // Lưu vào LocalStorage của khách
      localStorage.setItem("vectoria_guest_chat", JSON.stringify(chatHistory));
    }
  }

  async function handleClearHistory() {
    const email = getUserEmail();
    
    // Hiện modal confirm của Vectoria
    const confirmClear = () => {
      const chatBody = document.getElementById("chatbot-messages");
      if (chatBody) chatBody.innerHTML = "";
      chatHistory = [];
      showWelcomeMessage();
      
      if (email) {
        fetch(`${API_BASE}/api/clear_chat_history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }).catch(err => console.error("Lỗi xóa DB:", err));
      } else {
        localStorage.removeItem("vectoria_guest_chat");
      }
    };

    if (window.Modal && typeof window.Modal.show === "function") {
      window.Modal.show({
        title: '<i class="fa-solid fa-trash-can"></i> Xóa lịch sử Chat',
        message: "Bạn có chắc chắn muốn xóa sạch toàn bộ lịch sử tin nhắn với Trợ lý AI? Hành động này không thể phục hồi.",
        confirmText: "Xóa ngay",
        confirmClass: "btn-danger",
        onConfirm: confirmClear
      });
    } else {
      if (confirm("Bạn có muốn xóa sạch lịch sử chat không?")) {
        confirmClear();
      }
    }
  }

  // 7. TOGGLE DISPLAY
  function toggleChatWindow() {
    const win = document.getElementById("vectoria-chatbot-window");
    if (!win) return;

    isWindowOpen = !isWindowOpen;
    if (isWindowOpen) {
      win.style.display = "flex";
      // Bắt đầu kích hoạt animation mở
      setTimeout(() => win.classList.add("show"), 10);
      document.getElementById("chatbot-notif").style.display = "none";
      
      // Load lịch sử nếu rỗng hoặc khởi tạo
      const messages = document.getElementById("chatbot-messages");
      if (messages && messages.children.length === 0) {
        loadChatHistory();
      }
      setTimeout(() => document.getElementById("chatbot-input").focus(), 150);
    } else {
      win.classList.remove("show");
      // Đợi hiệu ứng transition tắt hẳn rồi mới display:none
      setTimeout(() => {
        if (!isWindowOpen) win.style.display = "none";
      }, 300);
    }
  }

  // 8. SEND MESSAGE & CALL GEMINI API
  async function handleSend() {
    const input = document.getElementById("chatbot-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    input.focus();

    // 1. Vẽ tin nhắn User lên màn hình
    renderMessage("user", message);

    // 2. Lưu tin nhắn User
    await saveChatMessage("user", message);

    // 3. Hiển thị typing...
    showTypingIndicator();

    // 4. Chuẩn bị payload lịch sử gửi đến Gemini
    // Format: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
    const apiHistory = [];
    
    // Chỉ lấy tối đa 12 tin nhắn gần nhất làm ngữ cảnh để tránh tràn token
    const contextMessages = chatHistory.slice(-12);
    contextMessages.forEach(msg => {
      apiHistory.push({
        role: msg.role === "user" ? "user" : "model",
        parts: msg.parts
      });
    });

    // Thêm tin nhắn mới nhất
    apiHistory.push({
      role: "user",
      parts: [{ text: message }]
    });

    // 5. Gọi API Gemini
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: apiHistory,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const result = await response.json();
      
      let replyText = "";
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
        replyText = result.candidates[0].content.parts[0].text;
      } else {
        replyText = "Hệ thống AI không phản hồi. Vui lòng thử lại sau.";
      }

      // 6. Vẽ câu trả lời lên màn hình
      renderMessage("model", replyText);

      // 7. Lưu câu trả lời của AI
      await saveChatMessage("model", replyText);

    } catch (err) {
      console.error(err);
      const errorMsg = "Không thể kết nối tới Trợ lý AI. Vui lòng kiểm tra lại kết nối mạng của bạn!";
      renderMessage("model", errorMsg);
      // Xóa typing
      const typing = document.getElementById("chatbot-typing");
      if (typing) typing.remove();
    }
  }

  // 9. KHỞI CHẠY TỰ ĐỘNG KHI SẴN SÀNG
  function initChatbot() {
    injectChatbotStyles();
    injectChatbotHTML();

    // Lắng nghe sự kiện login/logout thành công từ các tab khác để sync lại
    window.addEventListener("storage", function (e) {
      if (e.key === "user_email") {
        loadChatHistory();
      }
    });
  }

  // Chạy ngay
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatbot);
  } else {
    initChatbot();
  }
})();
