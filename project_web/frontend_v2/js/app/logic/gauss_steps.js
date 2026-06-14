// ===================== gauss_steps.js (CASIO MODE: ROOT PRIORITY) =====================
(function () {
  window.App = window.App || {};

  // 1. Hàm làm sạch số (ép về 0 hoặc số nguyên nếu cực sát)
  function clean(x) {
    if (Math.abs(x) < 1e-9) return 0;
    if (Math.abs(x - Math.round(x)) < 1e-9) return Math.round(x);
    return x;
  }

  function deepCopy(M) {
    return M.map((r) => r.slice());
  }

  // 2. Tìm phân số (Giới hạn mẫu số = 100 để né phân số xấu 2786/985)
  function toFraction(val, maxDenom = 100) {
    const tol = 1.0e-9;
    let h1 = 1,
      h2 = 0,
      k1 = 0,
      k2 = 1;
    let b = val;
    do {
      let a = Math.floor(b);
      let aux = h1;
      h1 = a * h1 + h2;
      h2 = aux;
      aux = k1;
      k1 = a * k1 + k2;
      k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(val - h1 / k1) > val * tol && k1 < maxDenom);

    if (k1 <= maxDenom && Math.abs(val - h1 / k1) < 1e-5)
      return { n: h1, d: k1 };
    return null;
  }

  // 3. Rút gọn căn: căn(8) -> 2căn(2)
  function simplifySqrt(n, d = 1) {
    let coef = 1;
    for (let i = Math.floor(Math.sqrt(n)); i > 1; i--) {
      if (n % (i * i) === 0) {
        coef = i;
        n = n / (i * i);
        break;
      }
    }
    // Format LaTeX
    let latex = n === 1 ? "" : `\\sqrt{${n}}`;
    if (latex === "") latex = "1"; // Trường hợp căn(1)

    // Ghép hệ số
    let numStr = coef === 1 ? latex : `${coef}${latex}`;
    if (numStr === "1\\sqrt{...}") numStr = latex; // Fix lỗi nhỏ nếu có
    if (coef !== 1 && latex === "1") numStr = String(coef);

    if (d === 1) return numStr;
    return `\\frac{${numStr}}{${d}}`;
  }

  // 4. [QUAN TRỌNG] Logic đoán số thông minh
  // Nhiệm vụ: Nhận diện 2.8284... là căn(8) chứ không phải 2786/985
  function fmtNum(x) {
    let val = clean(x);
    if (val === 0) return "0";

    let sign = val < 0 ? "-" : "";
    let absVal = Math.abs(val);

    // [Ưu tiên 1] Số nguyên
    if (Number.isInteger(absVal)) return String(val);

    // [Ưu tiên 2] Căn thức (CHECK CĂN TRƯỚC KHI CHECK PHÂN SỐ)
    // Bình phương lên xem có đẹp không. VD: 2.828^2 = 8.000001 -> Căn 8
    let sq = absVal * absVal;
    let sqRound = Math.round(sq);
    if (Math.abs(sq - sqRound) < 1e-5 && sqRound < 1000) {
      return sign + simplifySqrt(sqRound);
    }

    // [Ưu tiên 3] Phân số đơn giản (Mẫu < 100)
    // VD: 1.666 -> 5/3 (Mẫu 3 < 100 -> LẤY)
    // VD: 2.828 -> 2786/985 (Mẫu 985 > 100 -> BỎ)
    let frac = toFraction(absVal, 100);
    if (frac) {
      return `${sign}\\frac{${frac.n}}{${frac.d}}`;
    }

    // [Ưu tiên 4] Căn thức dạng phân số (VD: căn(5/3))
    let sqFrac = toFraction(sq, 100);
    if (sqFrac) {
      let n = sqFrac.n * sqFrac.d; // Quy đồng khử mẫu trong căn: sqrt(n/d)
      let d = sqFrac.d;
      return sign + simplifySqrt(n, d);
    }

    // Đường cùng: Số thập phân 4 số (không đoán được thì hiện số)
    return String(parseFloat(val.toFixed(4)));
  }

  // --- Các hàm tạo chuỗi phép tính (giữ nguyên logic hiển thị) ---
  function opSwap(i, j) {
    return `d_${i} \\leftrightarrow d_${j}`;
  }

  function opScale(i, k) {
    let kStr = fmtNum(k);
    // Nếu là phân số LaTeX hoặc có dấu trừ thì đóng ngoặc
    if (
      kStr.includes("\\frac") ||
      kStr.includes("sqrt") ||
      kStr.startsWith("-")
    )
      kStr = `(${kStr})`;
    return `d_${i} \\to ${kStr}\\,d_${i}`;
  }

  function opAdd(i, a, j) {
    const aClean = clean(a);
    if (aClean === 0) return "";
    const sign = aClean >= 0 ? "+" : "-";
    const mag = Math.abs(aClean);
    let coef = fmtNum(mag);
    if (coef === "1") coef = "";
    return `d_${i} \\to d_${i} ${sign} ${coef}d_${j}`;
  }

  // Hàm chính: Khử Gauss
  App.gaussElimWithOps = function (A) {
    // Ép kiểu dữ liệu đầu vào sang số thực (parseFloat) để tính toán chuẩn
    const M = deepCopy(A).map((row) => row.map((x) => parseFloat(x)));
    const m = M.length;
    const n = m ? M[0].length : 0;
    const matrices = [deepCopy(M)];
    const ops = [];
    let row = 0;

    for (let col = 0; col < n && row < m; col++) {
      let piv = row;
      for (let r = row; r < m; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      }
      if (Math.abs(M[piv][col]) < 1e-9) continue;
      if (piv !== row) {
        const tmp = M[piv];
        M[piv] = M[row];
        M[row] = tmp;
        ops.push(opSwap(piv + 1, row + 1));
        matrices.push(deepCopy(M));
      }
      const pv = M[row][col];
      if (Math.abs(pv - 1) > 1e-9) {
        const k = 1 / pv;
        for (let c = col; c < n; c++) M[row][c] = clean(M[row][c] * k);
        ops.push(opScale(row + 1, k));
        matrices.push(deepCopy(M));
      }
      for (let r = row + 1; r < m; r++) {
        const factor = clean(M[r][col]);
        if (Math.abs(factor) < 1e-9) continue;
        for (let c = col; c < n; c++)
          M[r][c] = clean(M[r][c] - factor * M[row][c]);
        const a = -factor;
        const op = opAdd(r + 1, a, row + 1);
        if (op) {
          ops.push(op);
          matrices.push(deepCopy(M));
        }
      }
      row++;
    }
    return { matrices, ops };
  };
})();
