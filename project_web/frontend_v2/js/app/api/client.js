// ===================== client.js (Full Toast Support) =====================
(function () {
  window.App = window.App || {};

  /* ===== Utilities / Debug ===== */
  App.log = function (s) {
    console.log(s);
    const el = document.getElementById("logOut");
    if (!el) return;
    el.innerText =
      (el.innerText === "—" ? "" : el.innerText + "\n") + String(s);
  };

  App.pingBackend = async function () {
    try {
      const r = await fetch(`${App.API_BASE}/api/health`, { mode: "cors" });
      const j = await r.json();
      App.log(`Backend OK (${App.API_BASE}) — health: ${JSON.stringify(j)}`);
    } catch (e) {
      App.log(`Không gọi được /api/health tại ${App.API_BASE} — ${e}`);
      
      // Nếu đang dùng localhost/127.0.0.1 nhưng lỗi kết nối, tự động fallback về Render Production
      if (App.API_BASE.includes("127.0.0.1") || App.API_BASE.includes("localhost")) {
        const fallbackBase = "https://visualization-rr5v.onrender.com";
        App.log(`Thử kết nối đến Production Backend: ${fallbackBase}`);
        try {
          const r = await fetch(`${fallbackBase}/api/health`, { mode: "cors" });
          const j = await r.json();
          App.API_BASE = fallbackBase;
          App.log(`Đã chuyển sang Production Backend OK (${App.API_BASE}) — health: ${JSON.stringify(j)}`);
          return;
        } catch (err2) {
          App.log(`Không gọi được Production Backend: ${err2}`);
        }
      }

      // THAY ALERT BẰNG TOAST
      if (typeof App.showToast === "function") {
        App.showToast(
          `Không kết nối được Backend tại ${App.API_BASE}. Đang khởi động lại server, vui lòng đợi xíu nhé!`,
          "error",
        );
      } else {
        console.warn("Backend error: " + e.message);
      }
    }
  };

  App.callAPI = async function (op, payload) {
    const url = `${App.API_BASE}/api/${op}`;
    let res;

    try {
      res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (netErr) {
      // Ném lỗi để Controller bắt và hiện Toast
      throw new Error(`Lỗi kết nối mạng: ${netErr.message}`);
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Lỗi API ${op} (HTTP ${res.status}): ${t}`);
    }
    return await res.json();
  };
})();
