// ===================== basis_generator.js (ORIGINAL TEXT - HTML FORMAT - WITH ROW OPS FIX) =====================
(function () {
  window.App = window.App || {};
  App.TasksGen = App.TasksGen || {}; // Namespace cha
  App.TasksGen.Basis = {}; // Namespace con (Đã sửa)

  /* =======================================================================
      PHẦN 1: GIỮ NGUYÊN CÁC HÀM BỔ TRỢ CỦA BẢN CŨ
      ======================================================================= */
  function fmtScalarLatex(x) {
    let val = x;
    // 1. Ép số nguyên (1.0000001 -> 1)
    if (typeof val === "number" && Math.abs(val - Math.round(val)) < 1e-4) {
      val = Math.round(val);
    }
    // 2. Ép phân số đơn giản (1.3333 -> 4/3) - phòng hờ backend gửi số thực
    if (typeof val === "number") {
      for (let d = 2; d <= 12; d++) {
        if (Math.abs(val - Math.round(val * d) / d) < 1e-4) {
          // Nếu App.formatScalar xịn thì để nó lo, ko thì tự xử
          if (typeof App.formatScalar !== "function")
            return "\\frac{" + Math.round(val * d) + "}{" + d + "}";
        }
      }
    }

    let s =
      typeof App.formatScalar === "function"
        ? App.formatScalar(val)
        : String(val);
    s = String(s).trim();
    s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
    return s.replace(/(\d)\s*\*\s*(\\sqrt|\w)/g, "$1\\cdot $2");
  }

  function vecToLatex(v) {
    const items = (v || []).map(fmtScalarLatex);
    return `\\left(${items.join(",\\, ")}\\right)`;
  }

  function matrixToLatex(M) {
    if (!Array.isArray(M) || !M.length) return "\\begin{pmatrix}\\end{pmatrix}";
    const rows = M.map((row) =>
      (row || []).map(fmtScalarLatex).join(" & "),
    ).join(" \\\\ ");
    return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
  }

  function nonZeroRowCount(M) {
    if (!Array.isArray(M)) return 0;
    let c = 0;
    for (const row of M) {
      if (!Array.isArray(row)) continue;
      const allZero = row.every((x) => {
        const s = String(x);
        return x === 0 || s === "0" || s === "0.0";
      });
      if (!allZero) c++;
    }
    return c;
  }

  function isZeroRow(row) {
    if (!Array.isArray(row)) return true;
    return row.every((x) => {
      const s = String(x);
      return x === 0 || s === "0" || s === "0.0";
    });
  }

  function isZeroVector(v, tol = 1e-10) {
    if (!Array.isArray(v) || !v.length) return true;
    return v.every((x) => Math.abs(Number(x)) < tol);
  }

  function normCell(x) {
    if (x === null || x === undefined) return "";
    if (typeof x === "number") {
      if (!Number.isFinite(x)) return String(x);
      const r = Math.round(x);
      if (Math.abs(x - r) < 1e-12) return String(r);
      return String(Number(x.toFixed(12)));
    }
    return String(x).trim();
  }

  function matrixEqual(A, B) {
    if (A === B) return true;
    if (!Array.isArray(A) || !Array.isArray(B)) return false;
    if (A.length !== B.length) return false;
    for (let i = 0; i < A.length; i++) {
      const ra = A[i],
        rb = B[i];
      if (!Array.isArray(ra) || !Array.isArray(rb)) return false;
      if (ra.length !== rb.length) return false;
      for (let j = 0; j < ra.length; j++) {
        if (normCell(ra[j]) !== normCell(rb[j])) return false;
      }
    }
    return true;
  }

  function fmtNumForOp(k) {
    let val = Number(k);

    // Ép số nguyên mạnh tay
    if (Math.abs(val - Math.round(val)) < 1e-4) {
      return String(Math.round(val));
    }

    if (typeof App.formatScalar === "function") {
      return App.formatScalar(val);
    }
    return String(Number(val).toFixed(4)).replace(/\.?0+$/, "");
  }

  function rowOpDictToLatex(op) {
    if (!op || typeof op !== "object") return "";
    const kind = op.op;
    if (kind === "swap") {
      const a = Number(op.i) + 1;
      const b = Number(op.j) + 1;
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return `d_{${a}}\\;\\leftrightarrow\\;d_{${b}}`;
      }
      return "";
    }
    if (kind === "elim") {
      const dst = Number(op.i) + 1;
      const src = Number(op.j) + 1;
      const k = Number(op.factor);
      if (!Number.isFinite(dst) || !Number.isFinite(src)) return "";
      if (Math.abs(k) < 1e-12) return `d_{${dst}}\\;\\to\\;d_{${dst}}`;
      if (Math.abs(k - 1) < 1e-12)
        return `d_{${dst}}\\;\\to\\;d_{${dst}}-d_{${src}}`;
      if (Math.abs(k + 1) < 1e-12)
        return `d_{${dst}}\\;\\to\\;d_{${dst}}+d_{${src}}`;
      if (k > 0)
        return `d_{${dst}}\\;\\to\\;d_{${dst}}-${fmtNumForOp(k)}d_{${src}}`;
      return `d_{${dst}}\\;\\to\\;d_{${dst}}+${fmtNumForOp(Math.abs(k))}d_{${src}}`;
    }
    if (kind === "scale") {
      const i = Number(op.i) + 1;
      const k = Number(op.factor);
      return `d_{${i}} \\to (${fmtNumForOp(k)})d_{${i}}`;
    }
    return "";
  }

  /* =======================================================================
      [FIX DUY NHẤT] CHUẨN HÓA LABEL MŨI TÊN TỪ BACKEND
      ======================================================================= */
  function cleanLabelFromText(text) {
    let s = String(text ?? "").trim();
    if (!s) return "";

    // d1tod2-d1 , d2tod2+3d1 , d10tod3-d2
    s = s.replace(
      /d(\d+)\s*to\s*d(\d+)\s*-\s*(\d*)d(\d+)/gi,
      (_, a, b, k, c) => `d_{${a}}\\;\\to\\;d_{${b}}-${k ? k : ""}d_{${c}}`,
    );

    s = s.replace(
      /d(\d+)\s*to\s*d(\d+)\s*\+\s*(\d*)d(\d+)/gi,
      (_, a, b, k, c) => `d_{${a}}\\;\\to\\;d_{${b}}+${k ? k : ""}d_{${c}}`,
    );

    s = s.replace(/d(\d+)\s*to\s*d(\d+)/gi, "d_{$1}\\;\\to\\;d_{$2}");

    s = s.replace(/^Bước\s*[^:]*:\s*/i, "").trim();
    s = s.replace(/↔/g, "\\leftrightarrow").replace(/→/g, "\\to");

    const hasArrow = /(\\+to|\\+leftrightarrow)/.test(s);
    const hasD = /d_\d+/.test(s);
    if (!hasArrow || !hasD) return "";

    s = s.replace(/\\+to/g, "\\to");
    s = s.replace(/\\+leftrightarrow/g, "\\leftrightarrow");

    s = s.replace(/d_(\d+)\s*\\to\s*d_(\d+)/g, "d_{$1}\\;\\to\\;d_{$2}");
    s = s.replace(
      /d_(\d+)\s*\\leftrightarrow\s*d_(\d+)/g,
      "d_{$1}\\;\\leftrightarrow\\;d_{$2}",
    );
    s = s.replace(/d_(\d+)/g, "d_{$1}");

    return s.replace(/\s+/g, " ").trim();
  }

  function arrowLatex(label) {
    return label ? `\\xrightarrow{\\;${label}\\;}` : "\\to";
  }

  function buildChainFromSteps(steps) {
    const list = Array.isArray(steps) ? steps : [];

    // 1. Tìm ma trận đầu tiên (Giữ nguyên)
    let firstMatrix = null;
    for (const st of list) {
      if (
        st &&
        (st.kind === "matrix" || st.kind === "info") &&
        Array.isArray(st.matrix) &&
        st.matrix.length
      ) {
        firstMatrix = st.matrix;
        break;
      }
    }
    if (!firstMatrix) return { chain: "", lastMatrix: null };

    const mats = [];
    for (const st of list) {
      if (st && st.kind === "matrix" && Array.isArray(st.matrix)) {
        let label = "";

        // Bất chấp Backend có gửi text hay không.
        if (st.row_op) {
          label = rowOpDictToLatex(st.row_op);
        }

        // Chỉ khi nào không tính được thì mới lấy text của Backend làm phương án dự phòng
        if (!label) {
          label = cleanLabelFromText(st.text);
        }

        mats.push({ M: st.matrix, label: label });
      }
    }

    if (!mats.length)
      return { chain: matrixToLatex(firstMatrix), lastMatrix: firstMatrix };
    if (!matrixEqual(firstMatrix, mats[0].M))
      mats.unshift({ M: firstMatrix, label: "" });

    let chain = matrixToLatex(mats[0].M);
    let prevM = mats[0].M;

    for (let i = 1; i < mats.length; i++) {
      const label = mats[i].label || "";
      const nextM = mats[i].M;
      // Nếu ma trận không đổi và không có nhãn thì bỏ qua
      if (!label && matrixEqual(prevM, nextM)) continue;

      chain += `\\;${arrowLatex(label)}\\;${matrixToLatex(nextM)}`;
      prevM = nextM;
    }
    return { chain, lastMatrix: prevM };
  }

  /* =======================================================================
      PHẦN 2: CÁCH 1 - MA TRẬN (HTML Version - Text gốc)
      ======================================================================= */
  App.TasksGen.Basis.buildBasisByMatrix = function (selectedItems, apiData) {
    const vecs = (selectedItems || []).map((it) => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;
    const dim =
      typeof apiData?.dimension === "number" ? apiData.dimension : null;
    const A = vecs;

    const steps = Array.isArray(apiData?.steps) ? apiData.steps : [];

    // [GỌI HÀM ĐÃ SỬA]
    const { chain, lastMatrix } = buildChainFromSteps(steps);

    const chainLatex = chain ? chain : `${matrixToLatex(A)}`;

    const rankFromE = Array.isArray(lastMatrix)
      ? nonZeroRowCount(lastMatrix)
      : null;
    const rank = dim !== null ? dim : (rankFromE ?? null);

    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");

    // CƠ SỞ LẤY TỪ CÁC DÒNG KHÁC 0 CỦA MA TRẬN CUỐI
    let basisFromMatrix = [];
    if (Array.isArray(lastMatrix)) {
      for (const row of lastMatrix) {
        if (!isZeroRow(row)) {
          basisFromMatrix.push(row);
        }
      }
    }

    const basisRowsLatex = basisFromMatrix.length
      ? `\\left\\{${basisFromMatrix.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";

    // --- CHUYỂN TEXT CŨ SANG HTML ---
    let html = `<div class="sol-step-container">`;
    html += `<div class="sol-text">Cho $${vecListLatex}$.</div>`;
    html += `<div class="sol-text">Lập ma trận $A$ (các vectơ là các dòng) và biến đổi về dạng bậc thang:</div>`;

    // Math block có scroll ngang
    html += `<div class="sol-math-block" style="overflow-x: auto; white-space: nowrap;">\\[ ${chainLatex} \\]</div>`;

    html += `<div class="sol-bold">Kết luận.</div>`;
    html += `<div class="sol-bullet">Số chiều: $\\dim(V) = ${rank !== null ? rank : "?"}$.</div>`;
    // [FIX LAYOUT] Tách text và công thức ra 2 dòng riêng biệt
    html += `<div class="sol-bullet" style="margin-bottom: 5px;">Một cơ sở của $V$ là:</div>`;
    // Dùng div riêng với overflow-x để có thanh cuộn nếu quá dài
    html += `<div class="sol-math-block" style="overflow-x: auto; padding-bottom: 5px;">\\[ B = ${basisRowsLatex} \\]</div>`;
    html += `</div>`;

    return {
      titleText: "Cơ sở và số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,
      htmlContent: html,
      basisVectors: basisFromMatrix,
    };
  };

  /* =======================================================================
      PHẦN 3: LOGIC TOÁN (GIỮ NGUYÊN BẢN CŨ CỦA BẠN)
      ======================================================================= */
  function buildComponentSystemLatex(vecs) {
    const m = vecs.length;
    const n = vecs[0]?.length ?? 0;
    const eqs = [];
    for (let i = 0; i < n; i++) {
      const parts = [];
      for (let j = 0; j < m; j++) {
        const a = Number(vecs[j][i] ?? 0);
        const kj = `k_{${j + 1}}`;
        if (j === 0) {
          parts.push(`${fmtScalarLatex(a)}${kj}`);
        } else {
          if (a >= 0) parts.push(`+ ${fmtScalarLatex(a)}${kj}`);
          else parts.push(`- ${fmtScalarLatex(Math.abs(a))}${kj}`);
        }
      }
      let lhs = parts.join(" ");
      lhs = lhs
        .replace(/\+\s*0k_\{\d+\}/g, "")
        .replace(/-\s*0k_\{\d+\}/g, "")
        .replace(/\s+/g, " ")
        .trim();
      eqs.push(`${lhs} = 0\\;(${i + 1})`);
    }
    return `\\left\\{\\begin{array}{l}\n${eqs.join(" \\\\\n")}\n\\end{array}\\right.`;
  }

  function rref(A, tol = 1e-10) {
    const M = A.map((r) => r.map((x) => Number(x)));
    const rows = M.length;
    const cols = M[0]?.length ?? 0;
    let r = 0;
    const pivotCols = [];
    for (let c = 0; c < cols && r < rows; c++) {
      let piv = r;
      for (let i = r; i < rows; i++)
        if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i;
      if (Math.abs(M[piv][c]) < tol) continue;
      if (piv !== r) {
        const tmp = M[piv];
        M[piv] = M[r];
        M[r] = tmp;
      }
      const pv = M[r][c];
      for (let j = c; j < cols; j++) M[r][j] /= pv;
      for (let i = 0; i < rows; i++) {
        if (i === r) continue;
        const f = M[i][c];
        if (Math.abs(f) < tol) continue;
        for (let j = c; j < cols; j++) M[i][j] -= f * M[r][j];
      }
      pivotCols.push(c);
      r++;
    }
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) if (Math.abs(M[i][j]) < tol) M[i][j] = 0;
    return { M, pivotCols, rank: pivotCols.length };
  }

  function solutionFromRrefLatex(R, pivotCols) {
    const n = R.length;
    const m = R[0]?.length ?? 0;
    const pivSet = new Set(pivotCols);
    const freeCols = [];
    for (let j = 0; j < m; j++) if (!pivSet.has(j)) freeCols.push(j);

    if (freeCols.length === 0) {
      const lines = [];
      for (let j = 0; j < m; j++) lines.push(`k_{${j + 1}} = 0`);
      return {
        freeCount: 0,
        freeCols,
        latex:
          "\\left\\{\\begin{array}{l}\n" +
          lines.join(" \\\\\n") +
          "\n\\end{array}\\right.",
      };
    }

    const tNames = freeCols.map((_, idx) => `t_{${idx + 1}}`);
    const lines = [];
    for (let idx = 0; idx < freeCols.length; idx++)
      lines.push(`k_{${freeCols[idx] + 1}} = ${tNames[idx]}`);

    function findPivotRow(pc) {
      for (let i = 0; i < n; i++) {
        if (R[i][pc] !== 1) continue;
        let ok = true;
        for (let j = 0; j < pc; j++)
          if (Math.abs(Number(R[i][j])) > 1e-12) {
            ok = false;
            break;
          }
        if (ok) return i;
      }
      return -1;
    }

    for (const pc of pivotCols) {
      const row = findPivotRow(pc);
      if (row < 0) continue;
      const terms = [];
      for (let idx = 0; idx < freeCols.length; idx++) {
        const fc = freeCols[idx];
        const coeff = Number(R[row][fc] ?? 0);
        if (Math.abs(coeff) < 1e-12) continue;
        const c = -coeff;
        if (Math.abs(c - 1) < 1e-12) terms.push(`${tNames[idx]}`);
        else if (Math.abs(c + 1) < 1e-12) terms.push(`- ${tNames[idx]}`);
        else terms.push(`${fmtScalarLatex(c)}${tNames[idx]}`);
      }
      const rhs = terms.length
        ? terms.join(" + ").replace(/\+\s*-\s*/g, "- ")
        : "0";
      lines.push(`k_{${pc + 1}} = ${rhs}`);
    }
    return {
      freeCount: freeCols.length,
      freeCols,
      latex:
        "\\left\\{\\begin{array}{l}\n" +
        lines.join(" \\\\\n") +
        "\n\\end{array}\\right.",
    };
  }

  /* =======================================================================
      PHẦN 4: CÁCH 2A - GIẢI HỆ (HTML Version - Text gốc)
      ======================================================================= */
  App.TasksGen.Basis.buildBasisByEquationsGeneral = function (
    selectedItems,
    apiData,
  ) {
    if (apiData && apiData.solution && apiData.solution.eq_general_latex) {
      const n = selectedItems[0]?.vec?.length ?? 0;
      let html = `<div class="sol-step-container">`;
      html += `<div class="sol-math-block" style="overflow-x: auto; padding: 10px 0;">\\[ ${apiData.solution.eq_general_latex} \\]</div>`;
      html += `</div>`;
      return {
        titleText: "Cơ sở & số chiều trong",
        titleMath: `\\(\\mathbb{R}^{${n}}\\)`,
        htmlContent: html
      };
    }

    const vecs = (selectedItems || []).map((it) => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;
    const m = vecs.length;
    const dim =
      typeof apiData?.dimension === "number" ? apiData.dimension : null;
    const pivotFromApi = Array.isArray(apiData?.pivot_indices)
      ? apiData.pivot_indices
      : null;

    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");
    const eq0 =
      Array.from({ length: m }, (_, i) => `k_{${i + 1}}v_{${i + 1}}`).join(
        " + ",
      ) + " = \\vec{0}";
    const sysLatex = buildComponentSystemLatex(vecs);

    const A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (_, j) => Number(vecs[j][i] ?? 0)),
    );
    const { M: R, pivotCols, rank: rnk } = rref(A, 1e-10);
    const sol = solutionFromRrefLatex(R, pivotCols);
    const independent = sol.freeCount === 0;

    let piv = pivotFromApi;
    if (!Array.isArray(piv) || !piv.length) piv = pivotCols.slice();
    const basisFromSet = piv.length ? piv.map((i) => vecs[i]) : [];
    const basisLatex = basisFromSet.length
      ? `\\left\\{${basisFromSet.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";
    const rank =
      typeof dim === "number" ? dim : typeof rnk === "number" ? rnk : null;

    // --- HTML OUTPUT ---
    let html = `<div class="sol-step-container">`;
    html += `<div class="sol-text">Cho $${vecListLatex}$.</div>`;
    html += `<div class="sol-text">Xét $V=\\mathrm{span}\\{v_1,\\dots,v_m\\}$ ($m \\ge 1$). Một tập con các vector trong hệ sinh sẽ làm cơ sở</div>`;

    html += `<div class="sol-bold">Bước 1: Lập hệ phương trình.</div>`;
    html += `<div class="sol-text">Xét phương trình vectơ: $${eq0}$.</div>`;
    html += `<div class="sol-text">Tương đương hệ phương trình theo từng thành phần:</div>`;
    html += `<div class="sol-math-block">\\[ ${sysLatex} \\]</div>`;

    html += `<div class="sol-bold">Bước 2: Giải hệ (khử Gauss).</div>`;
    html += `<div class="sol-text">Đưa ma trận hệ số về dạng bậc thang rút gọn:</div>`;
    html += `<div class="sol-math-block">\\[ ${matrixToLatex(A)} \\to ${matrixToLatex(R)} \\]</div>`;
    html += `<div class="sol-text">Suy ra nghiệm của hệ:</div>`;
    html += `<div class="sol-math-block">\\[ ${sol.latex} \\]</div>`;

    html += `<div class="sol-bold">Bước 3: Kết luận.</div>`;
    if (independent)
      html += `<div class="sol-text">Hệ chỉ có nghiệm tầm thường nên các vectơ độc lập tuyến tính.</div>`;
    else
      html += `<div class="sol-text">Hệ có nghiệm không tầm thường nên các vectơ phụ thuộc tuyến tính.</div>`;

    html += `<div class="sol-bullet">Số chiều: $\\dim(V) = ${rank != null ? String(rank) : "?"}$.</div>`;

    // [FIX FINAL] Tách dòng cho Cách 2 (Tổng quát)
    html += `<div class="sol-bullet" style="margin-bottom: 5px;">Một cơ sở (lấy từ hệ sinh) là:</div>`;
    html += `<div class="sol-math-block" style="overflow-x: auto; padding-bottom: 5px;">\\[ B = ${basisLatex} \\]</div>`;

    html += `</div>`;

    return {
      titleText: "Cơ sở & số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,
      htmlContent: html,
    };
  };

  /* =======================================================================
      PHẦN 5: CÁCH 2B - XÉT TỪNG BƯỚC (HTML Version - Text gốc)
      ======================================================================= */
  function ratioCheckLatex(v1, v2) {
    const a1 = fmtScalarLatex(v1[0]);
    const b1 = fmtScalarLatex(v2[0]);
    const a2 = fmtScalarLatex(v1[1] ?? 0);
    const b2 = fmtScalarLatex(v2[1] ?? 0);
    return `\\left(\\dfrac{${a1}}{${b1}} \\neq \\dfrac{${a2}}{${b2}}\\right)`;
  }

  function solveCoeffs(B, v) {
    const n = v.length;
    const r = B.length;
    const BT = Array.from({ length: n }, (_, i) =>
      Array.from({ length: r }, (_, j) => Number(B[j][i] ?? 0)),
    );
    const rhs = Array.from({ length: n }, (_, i) => Number(v[i] ?? 0));
    const idxs = Array.from({ length: n }, (_, i) => i);
    function det2(A) {
      return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    }
    function det3(A) {
      return (
        A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
        A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
        A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
      );
    }
    function combinations(arr, k) {
      const out = [];
      const rec = (start, cur) => {
        if (cur.length === k) {
          out.push(cur.slice());
          return;
        }
        for (let i = start; i < arr.length; i++) {
          cur.push(arr[i]);
          rec(i + 1, cur);
          cur.pop();
        }
      };
      rec(0, []);
      return out;
    }
    let rows = null;
    if (r === 1) rows = [0];
    else if (r === 2 || r === 3) {
      for (const cand of combinations(idxs, r)) {
        const A = cand.map((i) => BT[i].slice());
        const d = r === 2 ? det2(A) : det3(A);
        if (Math.abs(d) > 1e-10) {
          rows = cand;
          break;
        }
      }
    } else {
      rows = Array.from({ length: r }, (_, i) => i);
    }
    if (!rows) return { rowsUsed: [0], coeffs: Array(r).fill(0), ok: false };
    const A = rows.map((i) => BT[i].slice());
    const b = rows.map((i) => rhs[i]);
    const M = A.map((row, i) => row.concat([b[i]]));
    for (let col = 0; col < r; col++) {
      let piv = col;
      for (let i = col; i < r; i++)
        if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
      if (Math.abs(M[piv][col]) < 1e-12) continue;
      if (piv !== col) {
        const tmp = M[piv];
        M[piv] = M[col];
        M[col] = tmp;
      }
      const pv = M[col][col];
      for (let j = col; j <= r; j++) M[col][j] /= pv;
      for (let i = 0; i < r; i++) {
        if (i === col) continue;
        const f = M[i][col];
        for (let j = col; j <= r; j++) M[i][j] -= f * M[col][j];
      }
    }
    const coeffs = Array.from({ length: r }, (_, i) => M[i][r]);
    let ok = true;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < r; j++) s += Number(B[j][i] ?? 0) * coeffs[j];
      if (Math.abs(s - rhs[i]) > 1e-6) {
        ok = false;
        break;
      }
    }
    return { rowsUsed: rows, coeffs, ok };
  }

  function fmtCoeff(k) {
    const x = Number(k);
    if (!Number.isFinite(x)) return "0";
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-10) return String(r);
    return String(Number(x.toFixed(6)));
  }

  App.TasksGen.Basis.buildBasisByEquationsStepwise = function (
    selectedItems,
    apiData,
  ) {
    if (apiData && apiData.solution && apiData.solution.eq_step_latex) {
      const n = selectedItems[0]?.vec?.length ?? 0;
      let html = `<div class="sol-step-container">`;
      html += `<div class="sol-math-block" style="overflow-x: auto; padding: 10px 0;">\\[ ${apiData.solution.eq_step_latex} \\]</div>`;
      html += `</div>`;
      return {
        titleText: "Cơ sở & số chiều trong",
        titleMath: `\\(\\mathbb{R}^{${n}}\\)`,
        htmlContent: html,
      };
    }

    const vecs = (selectedItems || []).map((it) => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;
    const m = vecs.length;
    const basisFromApi = Array.isArray(apiData?.basis) ? apiData.basis : [];
    const dim =
      typeof apiData?.dimension === "number" ? apiData.dimension : null;
    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");

    // --- HTML OUTPUT ---
    let html = `<div class="sol-step-container">`;
    html += `<div class="sol-text">Cho $${vecListLatex}$.</div>`;
    html += `<div class="sol-text">Xét $V=\\mathrm{span}\\{v_1,\\dots,v_m\\}$ ($m \\ge 1$). Một tập con các vector trong hệ sinh sẽ làm cơ sở</div>`;

    if (m === 1) {
      html += `<div class="sol-bold">Bước 1: Xét hệ $\\left\\{v_{1}\\right\\}$.</div>`;
      if (isZeroVector(vecs[0]))
        html += `<div class="sol-text">Vì $v_{1}=\\vec{0}$ nên $\\left\\{v_{1}\\right\\}$ phụ thuộc tuyến tính.</div>`;
      else
        html += `<div class="sol-text">Vì $v_{1}\\neq\\vec{0}$ nên $\\left\\{v_{1}\\right\\}$ độc lập tuyến tính.</div>`;
    } else {
      html += `<div class="sol-bold">Bước 1: Xét hệ $\\left\\{v_{1},\\,v_{2}\\right\\}$.</div>`;
      if (isZeroVector(vecs[0]) && isZeroVector(vecs[1])) {
        html += `<div class="sol-text">Vì $v_{1}=\\vec{0},\\;v_{2}=\\vec{0}$ nên hệ phụ thuộc tuyến tính.</div>`;
      } else if (isZeroVector(vecs[0])) {
        html += `<div class="sol-text">Vì $v_{1}=\\vec{0}$ nên xét $\\left\\{v_{2}\\right\\}$. Do $v_{2}\\neq\\vec{0}$ nên độc lập tuyến tính.</div>`;
      } else if (isZeroVector(vecs[1])) {
        html += `<div class="sol-text">Vì $v_{2}=\\vec{0}$ nên xét $\\left\\{v_{1}\\right\\}$. Do $v_{1}\\neq\\vec{0}$ nên độc lập tuyến tính.</div>`;
      } else {
        html += `<div class="sol-text">Vì $v_{1}$ và $v_{2}$ không tỉ lệ $${ratioCheckLatex(vecs[0], vecs[1])}$ nên $\\left\\{v_{1},\\,v_{2}\\right\\}$ độc lập tuyến tính.</div>`;
      }

      // --- BẮT ĐẦU VÒNG LẶP XỬ LÝ TỪ VECTOR THỨ 3 TRỞ ĐI ---
      // --- BẮT ĐẦU VÒNG LẶP XỬ LÝ TỪ VECTOR THỨ 3 TRỞ ĐI ---
      for (let i = 2; i < m; i++) {
        const viName = `v_{${i + 1}}`;
        html += `<div class="sol-bold">Bước ${i}: Kiểm tra $${viName}$ có là tổ hợp tuyến tính của $v_{1},\\,v_{2}$ không.</div>`;
        html += `<div class="sol-text">Giả sử $${viName} = a\\cdot v_{1} + b\\cdot v_{2}$. Ta xét 2 thành phần đầu tiên:</div>`;

        // 1. Lấy dữ liệu
        const a11 = fmtScalarLatex(vecs[0][0]),
          a12 = fmtScalarLatex(vecs[1][0]),
          b1 = fmtScalarLatex(vecs[i][0]);
        const a21 = fmtScalarLatex(vecs[0][1] ?? 0),
          a22 = fmtScalarLatex(vecs[1][1] ?? 0),
          b2 = fmtScalarLatex(vecs[i][1] ?? 0);

        // 2. Hệ phương trình 2 ẩn
        const sys = `\\left\\{\\begin{array}{l} ${a11}a + ${a12}b = ${b1}\\\\ ${a21}a + ${a22}b = ${b2} \\end{array}\\right.`;

        // 3. Giải tìm a, b
        const B = [vecs[0], vecs[1]];
        const { coeffs, ok } = solveCoeffs(B, vecs[i]); // coeffs=[a, b]
        const aValStr = fmtCoeff(coeffs[0]);
        const bValStr = fmtCoeff(coeffs[1]);

        // 4. Kết quả giải hệ
        const resSys = `\\left\\{\\begin{array}{l} a = ${aValStr}\\\\ b = ${bValStr} \\end{array}\\right.`;
        html += `<div class="sol-math-block">\\[ ${sys} \\quad \\Leftrightarrow \\quad ${resSys} \\]</div>`;

        // ============================================================
        // [PHẦN MỚI] THÊM BƯỚC THỬ LẠI (SUBSTITUTION CHECK)
        // ============================================================
        if (n > 2) {
          html += `<div class="sol-text">Thử lại với các thành phần còn lại của $${viName}$:</div>`;

          let allMatch = true;
          // Duyệt các dòng còn lại (từ index 2 trở đi)
          // Duyệt các dòng còn lại (từ index 2 trở đi)
          for (let k = 2; k < n; k++) {
            const valA = coeffs[0];
            const valB = coeffs[1];
            const v1_k = Number(vecs[0][k] || 0);
            const v2_k = Number(vecs[1][k] || 0);
            const vi_k = Number(vecs[i][k] || 0);

            const calcVal = valA * v1_k + valB * v2_k;

            const sV1 = fmtScalarLatex(v1_k);
            const sV2 = fmtScalarLatex(v2_k);

            // [FIX LỖI DÍNH SỐ]
            // Thay vì ghép chuỗi thô, ta dùng dấu nhân (\cdot) hoặc ngoặc đơn để tách biệt
            // Style PDF: 1(3) + (-2)(-1) -> Dùng ngoặc cho vector component

            const formatTerm = (cStr, vStr) => {
              // Luôn đóng ngoặc giá trị vector để tránh dính: 1.73(3) hoặc 1.73 \cdot 3
              // Nếu hệ số là số thập phân dài, dùng \cdot cho thoáng
              if (cStr.includes(".")) return `${cStr} \\cdot ${vStr}`;

              // Nếu hệ số nguyên đẹp (như 1, -2) thì dùng style a(v) giống PDF
              // Nếu v âm thì đóng ngoặc
              const vDisplay =
                vStr.startsWith("-") || vStr.includes("/") ? `(${vStr})` : vStr;

              if (cStr === "1") return vDisplay;
              if (cStr === "-1") return `-${vDisplay}`;
              return `${cStr}(${vStr})`;
            };

            let term1 = formatTerm(aValStr, sV1);
            let term2 = formatTerm(bValStr, sV2);

            // Xử lý dấu cộng trừ giữa 2 số hạng
            let lhsExpr = "";
            if (term2.startsWith("-")) {
              lhsExpr = `${term1} - ${term2.substring(1)}`;
            } else {
              lhsExpr = `${term1} + ${term2}`;
            }

            const strRes = fmtCoeff(calcVal);
            const strTarget = fmtScalarLatex(vi_k);

            const isMatch = Math.abs(calcVal - vi_k) < 1e-4;
            if (!isMatch) allMatch = false;

            const rel = isMatch ? "=" : "\\neq";
            const note = isMatch ? "(\\text{đúng})" : "(\\text{mâu thuẫn})";

            html += `<div class="sol-math-block">\\[ ${lhsExpr} = ${strRes} \\; ${rel} \\; ${strTarget} \\quad ${note} \\]</div>`;
          }

          if (allMatch && ok) {
            html += `<div class="sol-text">Các đẳng thức đều đúng. Vậy $${viName} = ${aValStr}v_{1} + ${bValStr}v_{2}$. Loại $${viName}$ khỏi hệ sinh.</div>`;
          } else {
            html += `<div class="sol-text">Xuất hiện mâu thuẫn nên không tồn tại bộ số $a, b$ thỏa mãn. Vậy $${viName}$ độc lập tuyến tính với $v_{1},\\,v_{2}$.</div>`;
          }
        } else {
          // Trường hợp không gian 2 chiều (không còn dòng để thử)
          if (ok)
            html += `<div class="sol-text">Vậy $${viName} = ${aValStr}v_{1} + ${bValStr}v_{2}$. Loại $${viName}$.</div>`;
          else
            html += `<div class="sol-text">Hệ vô nghiệm. $${viName}$ độc lập tuyến tính.</div>`;
        }
      }
    }

    const basisLatex = basisFromApi.length
      ? `\\left\\{${basisFromApi.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";

    html += `<div class="sol-bold">Kết luận.</div>`;
    html += `<div class="sol-bullet">Số chiều: $\\dim(V) = ${dim != null ? String(dim) : "?"}$.</div>`;

    // [FIX FINAL] Tách dòng chữ và công thức + Bật thanh cuộn ngang
    html += `<div class="sol-bullet" style="margin-bottom: 5px;">Một cơ sở (lấy từ hệ sinh) là:</div>`;
    html += `<div class="sol-math-block" style="overflow-x: auto; padding-bottom: 5px; margin-bottom: 10px;">\\[ B = ${basisLatex} \\]</div>`;

    html += `</div>`;

    return {
      titleText: "Cơ sở & số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,
      htmlContent: html,
    };
  };
})();
