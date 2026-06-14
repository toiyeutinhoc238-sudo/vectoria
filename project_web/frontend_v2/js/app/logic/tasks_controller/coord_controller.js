// ==========================================================================
// FILE: js/app/logic/tasks_controller/coord_controller.js
// MÔ TẢ: Điều khiển logic bài toán Tọa độ (Coordinates)
// ==========================================================================
(function () {
  window.App = window.App || {};
  let cachedConfig = null;

  // Hàm lấy element nhanh
  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    const btnCalc = $("btnCoord"); // Nút "Xuất tọa độ"
    const btnShow = $("btnCoordSolution"); // Nút "Lời giải"

    // --- 1. XỬ LÝ NÚT "XUẤT TỌA ĐỘ" ---
    if (btnCalc) {
      btnCalc.addEventListener("click", () => {
        // A. LẤY DỮ LIỆU TỪ UI
        // 1. Lấy vector đích (x)
        const targetSelect = $("vCoordSelect");
        if (!targetSelect) return;
        const targetId = parseInt(targetSelect.value);
        const targetObj = App.vectorList.find((v) => v.id === targetId);

        // 2. Lấy hệ cơ sở (B)
        const checkContainer = $("basisCoordChecklist");
        if (!checkContainer) return;

        // Lấy các checkbox đang được tick
        const checkedInputs = Array.from(
          checkContainer.querySelectorAll('input[type="checkbox"]:checked'),
        );
        const basisObjs = checkedInputs
          .map((inp) => {
            const vid = parseInt(inp.value);
            return App.vectorList.find((v) => v.id === vid);
          })
          .filter(Boolean);

        // B. KIỂM TRA LỖI (VALIDATION)
        if (!targetObj) {
          alert("Vui lòng chọn vector đích (x)!");
          return;
        }
        if (basisObjs.length === 0) {
          alert("Vui lòng chọn các vector cho hệ cơ sở (B)!");
          return;
        }

        const n = targetObj.vec.length; // Số chiều không gian

        // Kiểm tra số chiều có khớp nhau không
        if (basisObjs.some((b) => b.vec.length !== n)) {
          alert(`Lỗi: Tất cả vector phải cùng số chiều ${n}!`);
          return;
        }

        // Kiểm tra số lượng vector cơ sở (Cơ sở của R^n phải có n vector)
        if (basisObjs.length !== n) {
          alert(
            `Lưu ý: Để tìm tọa độ trong R^${n}, hệ cơ sở cần có đúng ${n} vector.\n(Bạn đang chọn ${basisObjs.length} vector)`,
          );
          // Không return, vẫn cho tính tiếp để người dùng thấy kết quả (vô nghiệm/vô số nghiệm) nếu muốn
        }

        // C. SINH LỜI GIẢI (GỌI GENERATOR)
        const basisVecs = basisObjs.map((v) => v.vec);
        const targetVec = targetObj.vec;

        // Kiểm tra xem Generator đã nạp chưa
        if (!App.TasksGen || !App.TasksGen.Coord) {
          console.error("Thiếu module App.TasksGen.Coord (coord_generator.js)");
          alert("Lỗi hệ thống: Chưa nạp module sinh lời giải.");
          return;
        }

        // Sinh HTML cho 2 cách
        const content1 = App.TasksGen.Coord.buildMethod1(basisVecs, targetVec);
        const content2 = App.TasksGen.Coord.buildMethod2(basisVecs, targetVec);

        cachedConfig = {
          title: "Tọa độ vector theo cơ sở",
          math: `\\( \\mathbb{R}^${n} \\)`,
          tab1Label: "Cách 1: Lập hệ phương trình",
          tab2Label: "Cách 2: Ma trận chuyển cơ sở",
          showSubTabs: false,
          content1: content1,
          content2: content2,
          autoOpen: false,
        };

        // D. NẠP VÀO PANEL (KHÔNG MỞ)
        if (typeof App.openSolutionPanel === "function") {
          App.openSolutionPanel({
            title: "Tọa độ vector theo cơ sở",
            math: `\\( \\mathbb{R}^${n} \\)`,

            // Cấu hình Tab
            tab1Label: "Cách 1: Lập hệ phương trình",
            tab2Label: "Cách 2: Ma trận chuyển cơ sở",
            showSubTabs: false, // Bài này không cần sub-tab

            // Nội dung
            content1: content1,
            content2: content2,

            autoOpen: false, // Quan trọng: Chỉ nạp dữ liệu nền
          });

          // E. THÔNG BÁO THÀNH CÔNG
          const resBox = $("result_coord");
          if (resBox) {
            resBox.innerHTML = `✅ <span style="color:green; font-weight:bold">Đã tính xong!</span><br>Bấm nút <b>"Lời giải"</b> để xem chi tiết.`;
          }
        } else {
          console.error("Thiếu module solution_panel.js");
        }
      });
    }

    // --- 2. XỬ LÝ NÚT "LỜI GIẢI" ---
    if (btnShow) {
      // Clone nút để xóa event rác
      const newBtnShow = btnShow.cloneNode(true);
      if (btnShow.parentNode)
        btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", () => {
        if (typeof App.openSolutionPanel !== "function") return;

        // Kiểm tra xem đã có kết quả CỦA TAB NÀY chưa
        if (cachedConfig) {
          // Nếu có rồi thì nạp lại nó vào Panel và mở lên
          App.openSolutionPanel({ ...cachedConfig, autoOpen: true });
        } else {
          // Nếu chưa có, nạp thông báo nhắc nhở
          App.openSolutionPanel({
            title: "Tọa độ vector",
            content1: `<div class="sol-empty">
                            Vui lòng chọn vector và bấm nút <b>"Xuất tọa độ"</b> trước.
                        </div>`,
            tab1Label: "Cách 1",
            showSubTabs: false,
            autoOpen: true,
          });
        }
      });
    }
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
