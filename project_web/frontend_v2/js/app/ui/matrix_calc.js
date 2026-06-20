(function () {
  const API_BASE = (window.App && window.App.API_BASE) || 
    ((location.hostname === "127.0.0.1" || location.hostname === "localhost" || location.protocol === "file:") 
      ? "http://127.0.0.1:5000" : "https://vectoria-3fdh.onrender.com");

  // State
  const state = {
    A: { rows: 3, cols: 3, values: {} },
    B: { rows: 3, cols: 3, values: {} }
  };

  let activeSolutionSteps = [];
  let activeSolutionMethods = null;
  let activeMethodIndex = 0;

  // Custom Input Modal logic thay thế cho prompt()
  function showInputModal(title, label, defaultValue, minVal, maxVal, isInt) {
    return new Promise((resolve) => {
      const modal = document.getElementById("inputModal");
      const titleEl = document.getElementById("inputModalTitle");
      const labelEl = document.getElementById("inputModalLabel");
      const inputEl = document.getElementById("inputModalValue");
      const btnClose = document.getElementById("btnInputModalClose");
      const btnCancel = document.getElementById("btnInputModalCancel");
      const btnConfirm = document.getElementById("btnInputModalConfirm");

      if (!modal || !inputEl) {
        const val = prompt(`${title}\n${label}`);
        resolve(val);
        return;
      }

      titleEl.innerText = title;
      labelEl.innerText = label;
      inputEl.value = defaultValue;
      if (minVal !== undefined) inputEl.setAttribute("min", minVal);
      else inputEl.removeAttribute("min");
      if (maxVal !== undefined) inputEl.setAttribute("max", maxVal);
      else inputEl.removeAttribute("max");

      modal.classList.add("is-visible");
      
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 50);

      function cleanup() {
        modal.classList.remove("is-visible");
        btnConfirm.removeEventListener("click", onConfirm);
        btnCancel.removeEventListener("click", onCancel);
        btnClose.removeEventListener("click", onCancel);
        inputEl.removeEventListener("keydown", onKeyDown);
      }

      function onConfirm() {
        const valStr = inputEl.value.trim();
        if (valStr === "") {
          alert("Vui lòng nhập giá trị.");
          return;
        }
        const val = isInt ? parseInt(valStr) : parseFloat(valStr);
        if (isNaN(val)) {
          alert("Vui lòng nhập một số hợp lệ.");
          return;
        }
        if (minVal !== undefined && val < minVal) {
          alert(`Giá trị phải lớn hơn hoặc bằng ${minVal}.`);
          return;
        }
        if (maxVal !== undefined && val > maxVal) {
          alert(`Giá trị phải nhỏ hơn hoặc bằng ${maxVal}.`);
          return;
        }
        cleanup();
        resolve(valStr);
      }

      function onCancel() {
        cleanup();
        resolve(null);
      }

      function onKeyDown(e) {
        if (e.key === "Enter") {
          onConfirm();
        } else if (e.key === "Escape") {
          onCancel();
        }
      }

      btnConfirm.addEventListener("click", onConfirm);
      btnCancel.addEventListener("click", onCancel);
      btnClose.addEventListener("click", onCancel);
      inputEl.addEventListener("keydown", onKeyDown);
      
      modal.onclick = function (e) {
        if (e.target === modal) {
          onCancel();
        }
      };
    });
  }

  // Helper: Định dạng số đẹp
  function formatNumberPretty(val) {
    if (Math.abs(val) < 1e-9) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-4) return Math.round(val).toString();
    
    // Tìm phân số xấp xỉ mẫu số nhỏ (<= 12)
    for (let d = 2; d <= 12; d++) {
      const n = Math.round(val * d);
      if (Math.abs(n / d - val) < 1e-4) {
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const g = Math.abs(gcd(n, d));
        const num = n / g;
        const den = d / g;
        if (den === 1) return num.toString();
        return `\\frac{${num}}{${den}}`;
      }
    }
    
    const str = val.toFixed(4);
    return str.replace(/\.?0+$/, "");
  }

  // Helper: Biểu diễn ma trận dưới dạng LaTeX
  function formatMatrixLatex(matrix) {
    const lines = matrix.map(row => 
      row.map(val => formatNumberPretty(val)).join(" & ")
    );
    return "\\begin{bmatrix} " + lines.join(" \\\\ ") + " \\end{bmatrix}";
  }

  // Vẽ lưới ô nhập liệu cho Ma trận
  function renderGrid(name) {
    const grid = document.getElementById(`grid${name}`);
    const rSpan = document.getElementById(`rows${name}`);
    const cSpan = document.getElementById(`cols${name}`);
    
    if (!grid) return;

    const { rows, cols, values } = state[name];
    rSpan.innerText = rows;
    cSpan.innerText = cols;

    grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    grid.innerHTML = "";

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "matrix-cell";
        input.placeholder = "0";
        
        const cellKey = `${i}_${j}`;
        if (values[cellKey] !== undefined) {
          input.value = values[cellKey];
        }

        // Lưu giá trị khi thay đổi
        input.addEventListener("input", (e) => {
          values[cellKey] = e.target.value.trim();
        });

        grid.appendChild(input);
      }
    }
  }

  // Tăng/giảm kích thước ma trận
  window.adjustSize = function (name, type, delta) {
    const key = type === "row" ? "rows" : "cols";
    const nextVal = state[name][key] + delta;
    
    if (nextVal >= 1 && nextVal <= 5) {
      state[name][key] = nextVal;
      renderGrid(name);
    }
  };

  // Reset ma trận về trống
  function clearMatrix(name) {
    state[name].values = {};
    renderGrid(name);
  }

  // Lấy dữ liệu ma trận dạng mảng 2D số thực
  function getMatrixData(name) {
    const { rows, cols, values } = state[name];
    const data = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const valStr = values[`${i}_${j}`] || "";
        let val = parseFloat(valStr);
        if (isNaN(val)) {
          // Xử lý phân số dạng x/y
          if (valStr.includes("/")) {
            const parts = valStr.split("/");
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            if (!isNaN(num) && !isNaN(den) && den !== 0) {
              val = num / den;
            } else {
              val = 0.0;
            }
          } else {
            val = 0.0;
          }
        }
        row.push(val);
      }
      data.push(row);
    }
    return data;
  }

  // Hiển thị Card kết quả
  function showResult(latexContent, steps, methods = null) {
    const card = document.getElementById("resultCard");
    const output = document.getElementById("resultOutput");
    if (!card || !output) return;

    output.innerHTML = latexContent;
    activeSolutionSteps = steps || [];
    activeSolutionMethods = methods;
    activeMethodIndex = 0;
    card.style.display = "block";

    // Trigger MathJax typeset cho kết quả vừa vẽ
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([output]).catch(err => console.log(err));
    }
  }

  // Gọi các phép toán 1 ma trận (Det, Inv, Rank, Transpose, Power, Scalar)
  window.calcSingle = async function (name, op) {
    const matrix = getMatrixData(name);
    const rows = state[name].rows;
    const cols = state[name].cols;

    if (op === "determinant") {
      try {
        const res = await fetch(`${API_BASE}/api/matrix/determinant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matrix })
        });
        const data = await res.json();
        if (data.status === "success") {
          showResult(`$$\\det(${name}) = ${data.result}$$`, data.steps, data.methods);
        } else {
          alert(data.message || "Lỗi tính định thức.");
        }
      } catch (err) {
        console.error(err);
        alert("Không thể kết nối đến máy chủ.");
      }
    } 
    else if (op === "inverse") {
      try {
        const res = await fetch(`${API_BASE}/api/matrix/inverse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matrix })
        });
        const data = await res.json();
        if (data.status === "success") {
          showResult(`$$${name}^{{-1}} = ${data.result_latex}$$`, data.steps, data.methods);
        } else {
          alert(data.message || "Lỗi tính ma trận nghịch đảo.");
        }
      } catch (err) {
        console.error(err);
        alert("Không thể kết nối đến máy chủ.");
      }
    } 
    else if (op === "rank") {
      try {
        const res = await fetch(`${API_BASE}/api/matrix/rank`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matrix })
        });
        const data = await res.json();
        if (data.status === "success") {
          showResult(`$$Rank(${name}) = ${data.result}$$`, data.steps);
        } else {
          alert(data.message || "Lỗi tính hạng ma trận.");
        }
      } catch (err) {
        console.error(err);
        alert("Không thể kết nối đến máy chủ.");
      }
    } 
    else if (op === "transpose") {
      // Tính chuyển vị client-side luôn cho tiện
      const transposed = [];
      for (let j = 0; j < cols; j++) {
        const newRow = [];
        for (let i = 0; i < rows; i++) {
          newRow.push(matrix[i][j]);
        }
        transposed.push(newRow);
      }
      
      const latex = `$$${name}^T = ${formatMatrixLatex(transposed)}$$`;
      const steps = [
        `Ma trận chuyển vị $${name}^T$ được tạo ra bằng cách hoán đổi dòng và cột của ma trận $${name}$ (dòng $i$ biến thành cột $i$):`,
        `$$${name} = ${formatMatrixLatex(matrix)}$$`,
        `$$${name}^T = ${formatMatrixLatex(transposed)}$$`
      ];
      showResult(latex, steps);
    } 
    else if (op === "scalar") {
      const kStr = await showInputModal("Nhập hằng số k", "Nhập hệ số thực k để thực hiện phép nhân ma trận (k · A):", "2");
      if (kStr === null) return;
      const k = parseFloat(kStr);
      if (isNaN(k)) {
        alert("Vui lòng nhập một số thực hợp lệ.");
        return;
      }

      const resMatrix = matrix.map(row => row.map(val => val * k));
      const latex = `$$${formatNumberPretty(k)} \\cdot ${name} = ${formatMatrixLatex(resMatrix)}$$`;
      
      // Tạo bước nhân
      const elementsExpr = matrix.map(row => 
        row.map(val => `${formatNumberPretty(k)} \\cdot (${formatNumberPretty(val)})`).join(" & ")
      );
      const steps = [
        `Nhân hằng số $k = ${formatNumberPretty(k)}$ vào từng vị trí phần tử của ma trận $${name}$:`,
        `$$${formatNumberPretty(k)} \\cdot ${name} = \\begin{bmatrix} ${elementsExpr.join(" \\\\ ")} \\end{bmatrix}$$`,
        `$$${formatNumberPretty(k)} \\cdot ${name} = ${formatMatrixLatex(resMatrix)}$$`
      ];
      showResult(latex, steps);
    } 
    else if (op === "power") {
      if (rows !== cols) {
        alert("Chỉ tính được lũy thừa cho ma trận vuông.");
        return;
      }
      const kStr = await showInputModal("Nhập số mũ k", "Nhập số mũ nguyên dương k để tính lũy thừa (A^k, từ 1 đến 10):", "2", 1, 10, true);
      if (kStr === null) return;
      const k = parseInt(kStr);
      if (isNaN(k) || k < 1 || k > 10) {
        alert("Vui lòng nhập số nguyên dương hợp lệ từ 1 đến 10.");
        return;
      }

      const steps = [`Tính lũy thừa bậc $k = ${k}$ của ma trận vuông $${name}$:`];
      let current = matrix;
      steps.append = (msg) => steps.push(msg); // helper

      if (k === 1) {
        steps.push(`$$${name}^1 = ${name} = ${formatMatrixLatex(matrix)}$$`);
      } else {
        steps.push(`$$${name}^1 = ${formatMatrixLatex(matrix)}$$`);
        for (let p = 2; p <= k; p++) {
          const next = [];
          const dim = rows;
          
          steps.push(`Tính $${name}^{${p}} = ${name}^{${p-1}} \\cdot ${name}$:`);
          
          const elementSteps = [];
          for (let i = 0; i < dim; i++) {
            const newRow = [];
            for (let j = 0; j < dim; j++) {
              let dotSum = 0;
              const multiplyTerms = [];
              for (let m = 0; m < dim; m++) {
                dotSum += current[i][m] * matrix[m][j];
                multiplyTerms.push(`${formatNumberPretty(current[i][m])} \\cdot ${formatNumberPretty(matrix[m][j])}`);
              }
              newRow.push(dotSum);
              elementSteps.push(`$$C_{${i+1},${j+1}} = ${multiplyTerms.join(" + ").replace(/\+\s*-/g, "- ")} = ${formatNumberPretty(dotSum)}$$`);
            }
            next.push(newRow);
          }
          steps.push("Tính giá trị các phần tử bằng tích vô hướng:");
          elementSteps.forEach(s => steps.push(s));
          current = next;
          steps.push(`Kết quả tích lũy thừa bậc $${p}$ là:`);
          steps.push(`$$${name}^{${p}} = ${formatMatrixLatex(current)}$$`);
        }
      }

      showResult(`$$${name}^{${k}} = ${formatMatrixLatex(current)}$$`, steps);
    }
  };

  // Gọi các phép toán nhị phân hai ma trận (A + B, A - B, A * B)
  window.calcBinary = async function (op) {
    const matrix_a = getMatrixData("A");
    const matrix_b = getMatrixData("B");

    try {
      const res = await fetch(`${API_BASE}/api/matrix/binary_op`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix_a, matrix_b, op })
      });
      const data = await res.json();
      if (data.status === "success") {
        let opSymbol = "+";
        if (op === "subtract") opSymbol = "-";
        if (op === "multiply") opSymbol = "\\cdot";
        
        showResult(`$$A ${opSymbol} B = ${data.result_latex}$$`, data.steps);
      } else {
        alert(data.message || "Lỗi tính toán hai ma trận.");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối đến máy chủ.");
    }
  };

  // Mở overlay lời giải chi tiết
  function showSolutionOverlay() {
    const overlay = document.getElementById("solutionOverlay");
    const body = document.getElementById("solutionBody");
    const toolbar = document.getElementById("solutionToolbar");
    const tabsContainer = document.getElementById("solutionTabs");
    if (!overlay || !body) return;

    // Xử lý hiển thị toolbar phương pháp giải
    if (activeSolutionMethods && activeSolutionMethods.length > 1) {
      if (toolbar && tabsContainer) {
        toolbar.style.display = "flex";
        tabsContainer.innerHTML = "";
        activeSolutionMethods.forEach((method, idx) => {
          const tabBtn = document.createElement("button");
          tabBtn.className = `sol-tab${idx === activeMethodIndex ? " is-active" : ""}`;
          tabBtn.innerText = method.name;
          tabBtn.addEventListener("click", () => {
            // Đổi cách giải active
            activeMethodIndex = idx;
            // Render lại nội dung
            renderActiveSteps();
          });
          tabsContainer.appendChild(tabBtn);
        });
      }
    } else {
      if (toolbar) {
        toolbar.style.display = "none";
      }
    }

    // Hàm vẽ các bước giải của cách giải đang active
    function renderActiveSteps() {
      // Cập nhật lại trạng thái active của các nút tab
      if (tabsContainer) {
        const tabs = tabsContainer.querySelectorAll(".sol-tab");
        tabs.forEach((tab, idx) => {
          if (idx === activeMethodIndex) {
            tab.classList.add("is-active");
          } else {
            tab.classList.remove("is-active");
          }
        });
      }

      body.innerHTML = "";
      // Lấy danh sách các bước tương ứng
      const currentSteps = (activeSolutionMethods && activeSolutionMethods[activeMethodIndex]) 
        ? activeSolutionMethods[activeMethodIndex].steps 
        : activeSolutionSteps;

      currentSteps.forEach((step, index) => {
        const trimmedStep = step.trim();
        const stepDiv = document.createElement("div");
        stepDiv.className = "sol-text";
        
        // Nếu là dòng công thức toán $$...$$, bọc bằng class chuyên dụng
        if (trimmedStep.startsWith("$$") && trimmedStep.endsWith("$$")) {
          const mathBlock = document.createElement("div");
          mathBlock.className = "sol-math-block";
          mathBlock.innerText = trimmedStep;
          stepDiv.appendChild(mathBlock);
        } else {
          // Là chữ thông thường
          const textSpan = document.createElement("span");
          if (index > 0 && currentSteps[index-1].indexOf("$$") === -1 && !currentSteps[index-1].startsWith("Tính")) {
            // Gắn nhãn các bước tính
            if (trimmedStep.startsWith("Biến đổi dòng") || trimmedStep.startsWith("Hoán vị dòng") || trimmedStep.startsWith("Chia dòng") || trimmedStep.startsWith("Khử phần tử")) {
              textSpan.className = "sol-bold";
            }
          }
          textSpan.innerHTML = step;
          stepDiv.appendChild(textSpan);
        }
        body.appendChild(stepDiv);
      });

      // Trigger MathJax typeset cho phần nội dung vừa render
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise([body]).catch(err => console.log(err));
      }
    }

    // Lần đầu vẽ phương pháp giải active mặc định (mũi index = 0)
    renderActiveSteps();

    overlay.classList.add("is-visible");
  }

  // Đóng overlay lời giải
  function closeSolutionOverlay() {
    const overlay = document.getElementById("solutionOverlay");
    if (overlay) {
      overlay.classList.remove("is-visible");
    }
  }

  // Init
  function init() {
    renderGrid("A");
    renderGrid("B");

    document.getElementById("btnClearA").addEventListener("click", () => clearMatrix("A"));
    document.getElementById("btnClearB").addEventListener("click", () => clearMatrix("B"));
    document.getElementById("btnShowSolution").addEventListener("click", showSolutionOverlay);
    document.getElementById("btnOverlayClose").addEventListener("click", closeSolutionOverlay);
    
    // Đóng modal khi click ra ngoài panel
    document.getElementById("solutionOverlay").addEventListener("click", (e) => {
      if (e.target.id === "solutionOverlay") closeSolutionOverlay();
    });
  }

  // Khởi động
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
