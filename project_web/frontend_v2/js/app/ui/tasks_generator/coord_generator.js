// ===================== js/app/ui/tasks_generator/coord_generator.js =====================
(function () {
  window.App = window.App || {};
  App.TasksGen = App.TasksGen || {};
  App.TasksGen.Coord = {}; // Namespace riêng cho bài Tọa độ

  // --- CÁC HÀM BỔ TRỢ FORMAT ---
  function fmt(x) {
    if (typeof App.formatScalar === "function") return App.formatScalar(x);
    // Làm tròn số thập phân
    if (Number.isInteger(x)) return String(x);
    const s = String(Math.round(x * 10000) / 10000);
    return s.replace("-", "−");
  }

  // Định dạng phân số cho đẹp
  function fmtFrac(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));

    // Tìm phân số tối giản
    for (let d = 2; d <= 100; d++) {
      let n = x * d;
      if (Math.abs(n - Math.round(n)) < 1e-5) {
        let num = Math.round(n);
        // Xử lý dấu: đưa dấu trừ ra trước phân số
        let sign = "";
        if (num < 0 || d < 0) {
          sign = "-";
          num = Math.abs(num);
        }
        return `${sign}\\frac{${num}}{${Math.abs(d)}}`;
      }
    }
    return fmt(x);
  }

  function vecToColLatex(v) {
    return `\\begin{pmatrix} ${v.map(fmtFrac).join(" \\\\ ")} \\end{pmatrix}`;
  }

  function matToLatex(rows) {
    const content = rows.map((r) => r.map(fmtFrac).join(" & ")).join(" \\\\ ");
    return `\\begin{pmatrix} ${content} \\end{pmatrix}`;
  }

  function augMatToLatex(rows) {
    if (!rows || !rows.length) return "";
    const n = rows[0].length;
    const colStr = "c".repeat(n - 1) + "|" + "c";
    const content = rows
      .map((r) => {
        const last = r[n - 1];
        const rest = r.slice(0, n - 1);
        return rest.map(fmtFrac).join(" & ") + " & " + fmtFrac(last);
      })
      .join(" \\\\ ");
    return `\\left(\\begin{array}{${colStr}} ${content} \\end{array}\\right)`;
  }

  // --- THUẬT TOÁN GAUSS-JORDAN (TỰ VIẾT ĐỂ LẤY STEP CHUẨN) ---
  function solveGaussJordan(augMatrix) {
    // Clone ma trận để không sửa dữ liệu gốc
    let M = augMatrix.map((row) => [...row]);
    let steps = [];
    let snapshots = [augMatrix.map((row) => [...row])];
    const rowCount = M.length;
    const colCount = M[0].length - 1;

    let pivotRow = 0;
    for (let j = 0; j < colCount && pivotRow < rowCount; j++) {
      // 1. Tìm pivot lớn nhất
      let maxRow = pivotRow;
      for (let i = pivotRow + 1; i < rowCount; i++) {
        if (Math.abs(M[i][j]) > Math.abs(M[maxRow][j])) {
          maxRow = i;
        }
      }

      if (Math.abs(M[maxRow][j]) < 1e-9) continue;

      // 2. Hoán vị dòng
      if (maxRow !== pivotRow) {
        [M[pivotRow], M[maxRow]] = [M[maxRow], M[pivotRow]];
        // [FIX] LaTeX chuẩn: \leftrightarrow
        steps.push(`d_${pivotRow + 1} \\leftrightarrow d_${maxRow + 1}`);
        snapshots.push(M.map((r) => [...r]));
      }

      // 3. Chuẩn hóa pivot về 1
      let pivotVal = M[pivotRow][j];
      if (Math.abs(pivotVal - 1) > 1e-9) {
        for (let k = j; k < M[0].length; k++) M[pivotRow][k] /= pivotVal;

        let factorText = fmtFrac(1 / pivotVal);
        // Nếu là phân số thì thêm ngoặc cho dễ nhìn trong text mô tả
        if (factorText.includes("frac"))
          factorText = `\\left(${factorText}\\right)`;

        steps.push(`d_${pivotRow + 1} \\to ${factorText} d_${pivotRow + 1}`);
        snapshots.push(M.map((r) => [...r]));
      }

      // 4. Khử các dòng khác (Gauss-Jordan: Khử cả trên lẫn dưới)
      for (let i = 0; i < rowCount; i++) {
        if (i !== pivotRow) {
          let factor = M[i][j];
          if (Math.abs(factor) > 1e-9) {
            for (let k = j; k < M[0].length; k++) {
              M[i][k] -= factor * M[pivotRow][k];
            }

            let factorText = fmtFrac(Math.abs(factor));
            let sign = factor > 0 ? "-" : "+";

            steps.push(
              `d_${i + 1} \\to d_${i + 1} ${sign} ${factorText} d_${pivotRow + 1}`,
            );
            snapshots.push(M.map((r) => [...r]));
          }
        }
      }
      pivotRow++;
    }

    return { matrices: snapshots, ops: steps, resultMatrix: M };
  }

  // --- CÁCH 1: LẬP HỆ PHƯƠNG TRÌNH ---
  App.TasksGen.Coord.buildMethod1 = function (basisVecs, targetVec) {
    const n = basisVecs[0].length;
    const m = basisVecs.length;

    let html = `<div class="sol-step-container">`;

    // 1. Đề bài
    html += `<div class="sol-text">Trong không gian $\\mathbb{R}^{${n}}$, cho cơ sở $B = \\{u_1, ..., u_${m}\\}$ với:</div>`;
    const defs = basisVecs
      .map((v, i) => `u_{${i + 1}} = ${vecToColLatex(v)}`)
      .join(",\\; ");
    html += `<div class="sol-math-block">\\[ ${defs} \\]</div>`;
    html += `<div class="sol-text">Tìm tọa độ của vector $\\mathbf{x} = ${vecToColLatex(targetVec)}$ đối với cơ sở $B$.</div>`;

    // 2. Phương trình vector
    html += `<div class="sol-bold">Bước 1: Lập phương trình vector</div>`;
    html += `<div class="sol-text">Ta cần tìm các số $c_1, ..., c_${m}$ sao cho:</div>`;
    const linComb = basisVecs
      .map((v, i) => `c_{${i + 1}} u_{${i + 1}}`)
      .join(" + ");
    html += `<div class="sol-math-block">\\[ ${linComb} = \\mathbf{x} \\]</div>`;

    // 3. Hệ phương trình
    html += `<div class="sol-text">Hệ phương trình tương đương:</div>`;
    let sysLines = [];
    let matrix = [];

    for (let i = 0; i < n; i++) {
      let row = basisVecs.map((v) => v[i]);
      row.push(targetVec[i]);
      matrix.push(row);

      let lhs = basisVecs
        .map((v, j) => {
          let val = v[i];
          if (Math.abs(val) < 1e-9) return null;
          let valStr = fmtFrac(Math.abs(val));
          if (Math.abs(val - 1) < 1e-9) valStr = "";
          let sign = val < 0 ? "-" : j > 0 ? "+" : "";
          if (j === 0 && val > 0) sign = "";
          if (sign === "+") sign = "+ ";
          if (sign === "-") sign = "- ";
          return `${sign}${valStr}c_{${j + 1}}`;
        })
        .filter((x) => x !== null)
        .join(" ");

      if (!lhs.trim()) lhs = "0";
      sysLines.push(`${lhs} = ${fmtFrac(targetVec[i])}`);
    }
    html += `<div class="sol-math-block">\\[ \\begin{cases} ${sysLines.join(" \\\\ ")} \\end{cases} \\]</div>`;

    // 4. Giải hệ
    const res = solveGaussJordan(matrix);
    const finalM = res.resultMatrix;

    let coords = [];
    for (let i = 0; i < m; i++) coords.push(finalM[i][m]);

    html += `<div class="sol-bold">Bước 2: Giải hệ phương trình</div>`;
    const solStr = coords
      .map((c, i) => `c_{${i + 1}} = ${fmtFrac(c)}`)
      .join(",\\; ");
    html += `<div class="sol-text">Giải hệ ta thu được: $${solStr}$.</div>`;

    // 5. Kết luận
    html += `<div class="sol-bold">Kết luận:</div>`;
    html += `<div class="sol-text">Tọa độ của $\\mathbf{x}$ đối với cơ sở $B$ là:</div>`;
    html += `<div class="sol-math-block">\\[ [\\mathbf{x}]_B = ${vecToColLatex(coords)} \\]</div>`;
    html += `</div>`;

    return html;
  };

  // --- CÁCH 2: MA TRẬN CHUYỂN CƠ SỞ ---
  App.TasksGen.Coord.buildMethod2 = function (basisVecs, targetVec) {
    const n = basisVecs[0].length;
    const m = basisVecs.length;
    let html = `<div class="sol-step-container">`;

    // 1. Ma trận P
    html += `<div class="sol-bold">Bước 1: Lập ma trận chuyển cơ sở P</div>`;
    html += `<div class="sol-text">Gọi $P$ là ma trận có các cột là các vector của cơ sở $B$:</div>`;

    let matP = [];
    for (let i = 0; i < n; i++) {
      let row = basisVecs.map((v) => v[i]);
      matP.push(row);
    }
    html += `<div class="sol-math-block">\\[ P = ${matToLatex(matP)} \\]</div>`;

    // 2. Khử Gauss
    html += `<div class="sol-text">Công thức tìm tọa độ là: $[\\mathbf{x}]_B = P^{-1}\\mathbf{x}$.</div>`;
    html += `<div class="sol-text">Ta thực hiện biến đổi ma trận mở rộng $[P|\\mathbf{x}]$ về dạng $[I|[\\mathbf{x}]_B]$ bằng khử Gauss-Jordan:</div>`;

    let augMat = [];
    for (let i = 0; i < n; i++) {
      let row = [...matP[i]];
      row.push(targetVec[i]);
      augMat.push(row);
    }

    const res = solveGaussJordan(augMat);
    const steps = res.ops || [];
    const matrices = res.matrices || [augMat];

    // Hiện ma trận đầu tiên
    html += `<div class="sol-math-block">\\[ ${augMatToLatex(augMat)} \\]</div>`;

    if (steps.length > 0) {
      html += `<div class="sol-bold">Các bước biến đổi:</div>`;
      for (let i = 0; i < steps.length; i++) {
        let opText = steps[i];
        // [FIX QUAN TRỌNG] Thêm dấu $ để MathJax render công thức
        html += `<div class="sol-text" style="margin-top:12px; font-style:italic">(${i + 1}) $${opText}$:</div>`;
        html += `<div class="sol-math-block">\\[ ${augMatToLatex(matrices[i + 1])} \\]</div>`;
      }
    } else {
      html += `<div class="sol-text">(Ma trận đã ở dạng tối giản)</div>`;
    }

    // 3. Kết luận
    const finalM = res.resultMatrix;
    let coords = [];
    for (let i = 0; i < m; i++) coords.push(finalM[i][m]);

    html += `<div class="sol-bold">Kết luận:</div>`;
    html += `<div class="sol-text">Cột cuối cùng chính là tọa độ cần tìm:</div>`;
    html += `<div class="sol-math-block">\\[ [\\mathbf{x}]_B = ${vecToColLatex(coords)} \\]</div>`;

    // Kiểm tra khớp với cách 1 cho chắc chắn
    html += `</div>`;

    return html;
  };
})();
