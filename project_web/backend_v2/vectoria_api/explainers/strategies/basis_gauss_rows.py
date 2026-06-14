from __future__ import annotations
from typing import Dict, List, Tuple
import numpy as np
import math

from vectoria_api.explainers.models import Step
from vectoria_api.core.linalg import gaussian_elimination_rows_with_ops
from vectoria_api.core.format import vector_pretty_score, format_number_pretty


def _dependent_expressions_rows(
    A_rows: List[List[float]], pivot_indices: List[int], tol: float = 1e-10
):
    """
    A_rows: (m x dim) - mỗi hàng là vector gốc
    pivot_indices: index vector gốc thuộc cơ sở

    Trả về:
      dependents: list index vector gốc phụ thuộc
      coeff_map: dict dep_index -> coeffs theo basis (length = rank)
            v_dep ≈ sum_k coeffs[k] * v_basis_k
    """
    A = np.array(A_rows, dtype=float)
    m, dim = A.shape

    piv = list(pivot_indices)
    dep = [i for i in range(m) if i not in piv]

    if (not dep) or (not piv):
        return dep, {}

    B = A[piv, :]  # r x dim
    BT = B.T  # dim x r

    coeff_map: Dict[int, List[float]] = {}
    for i in dep:
        v = A[i, :]
        # Giải hệ B^T * c = v^T (tìm tọa độ c) để biểu diễn v theo basis B
        c, _, _, _ = np.linalg.lstsq(BT, v, rcond=None)
        coeff_map[i] = c.tolist()

    return dep, coeff_map


def _fmt_k(val: float, tol: float = 1e-9) -> str:
    """
    Format số an toàn:
    1. Số nguyên (Chuẩn)
    2. Căn bậc 2 (Chuẩn, VD: 2sqrt(2))
    3. Phân số (CỰC KỲ NGHIÊM NGẶT - Sai số < 1e-9 mới nhận)
    4. Còn lại -> Số thập phân (Tránh ép loga/pi thành phân số)
    """
    # 1. Số 0
    if abs(val) < tol:
        return "0"

    # 2. Số nguyên
    if abs(val - round(val)) < tol:
        return str(int(round(val)))

    sign = "-" if val < 0 else ""
    abs_val = abs(val)

    # 3. Check Căn thức (Ưu tiên số 1)
    sq = abs_val * abs_val
    sq_round = round(sq)
    # Chỉ đoán căn nếu bình phương lên ra số nguyên đẹp < 1000
    if abs(sq - sq_round) < 1e-5 and sq_round < 1000:
        coef = 1
        n = sq_round
        for i in range(int(math.isqrt(n)), 1, -1):
            if n % (i * i) == 0:
                coef = i
                n //= i * i
                break

        latex = f"\\sqrt{{{n}}}" if n > 1 else ""
        if latex == "":
            latex = "1"

        res = latex if coef == 1 else f"{coef}{latex}"
        if coef == 1 and n == 1:
            res = "1"
        return sign + res

    # 4. Check Phân số (SIẾT CHẶT)
    # Chỉ nhận phân số nếu nó CHÍNH XÁC TUYỆT ĐỐI (sai số < 1e-9)
    # Ví dụ: 0.3333333333 -> 1/3 (OK)
    # Ví dụ: 1.6094 (ln5) -> 993/617 (Sai số ~ 1e-5 -> LOẠI NGAY)
    max_denom = 100
    h1, h2, k1, k2 = 1, 0, 0, 1
    b = abs_val
    while True:
        a = math.floor(b)
        aux = h1
        h1 = a * h1 + h2
        h2 = aux
        aux = k1
        k1 = a * k1 + k2
        k2 = aux

        if k1 > max_denom:
            break

        # [QUAN TRỌNG] Kiểm tra sai số cực gắt (1e-9)
        if abs(abs_val - h1 / k1) < 1e-9:
            return f"{sign}\\frac{{{h1}}}{{{k1}}}"

        if abs(b - a) < 1e-9:
            break
        b = 1 / (b - a)

    # 5. Fallback: Số thập phân (cho ln, pi, e...)
    return f"{val:.4f}".rstrip("0").rstrip(".")


def _fmt_row_op_latex(op: dict, tol: float = 1e-10) -> str:
    """
    Trả về CHUỖI LaTeX ĐÚNG ĐỂ ĐẶT LÊN MŨI TÊN:
      - swap: d_1 <-> d_2
      - elim: d_3 -> d_3 - 2d_1
      - scale: d_2 -> (1/3) d_2
    """
    kind = op.get("op")

    if kind == "swap":
        a = int(op["i"]) + 1
        b = int(op["j"]) + 1
        return f"d_{a} \\\\leftrightarrow d_{b}"

    if kind == "elim":
        dst = int(op["i"]) + 1
        src = int(op["j"]) + 1
        k = float(op.get("factor", 0.0))

        # row_dst <- row_dst - k*row_src
        if abs(k) < tol:
            return f"d_{dst} \\\\to d_{dst}"

        if abs(k - round(k)) < tol:
            k = int(round(k))

        sign = "-" if k > 0 else "+"
        mag = abs(k)

        if abs(mag - 1) < tol:
            return f"d_{dst} \\\\to d_{dst} {sign} d_{src}"

        return f"d_{dst} \\\\to d_{dst} {sign} {_fmt_k(mag, tol)}d_{src}"

    if kind == "scale":
        i = int(op["i"]) + 1
        k = float(op.get("factor", 1.0))
        k_str = _fmt_k(k, tol)

        # Nếu là chuỗi phức tạp (phân số, căn, số âm) thì đóng ngoặc
        if "\\" in k_str or k_str.startswith("-"):
            return f"d_{{{i}}} \\\\to ({k_str})\\,d_{{{i}}}"
        else:
            return f"d_{{{i}}} \\\\to {k_str}\\,d_{{{i}}}"

    return ""


def _solve_homogeneous_rank(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[int, int]:
    """
    Rank theo kiểu 'hệ phương trình' k1..km (m ẩn).
    Ma trận hệ: n x m (cột là vector).
    """
    if not vectors:
        return 0, 0
    A = np.array(vectors, dtype=float)  # m x n (rows)
    M = A.T  # n x m (cols)
    r = int(np.linalg.matrix_rank(M, tol=tol))
    m = M.shape[1]
    return r, m


# =========================
# PDF-style LaTeX helpers
# =========================
def _latex_vec(v: List[float], tol: float = 1e-10) -> str:
    items = [_fmt_k(float(x), tol=tol) for x in v]
    return "\\left(" + ",\\;".join(items) + "\\right)"


def _latex_vec_list(vectors: List[List[float]], tol: float = 1e-10) -> str:
    parts = []
    for i, v in enumerate(vectors):
        parts.append(f"v_{{{i+1}}} = {_latex_vec(v, tol=tol)}")
    return ",\\; ".join(parts)


def _build_homogeneous_system_latex(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[str, str]:
    if not vectors:
        return "", ""

    m = len(vectors)
    n = len(vectors[0])

    combo = " + ".join([f"k_{{{i+1}}}v_{{{i+1}}}" for i in range(m)])
    eq_line = f"{combo} = \\vec{{0}}"

    lines = []
    for j in range(n):
        terms = []
        for i in range(m):
            a = float(vectors[i][j])
            ak = _fmt_k(a, tol=tol)
            if ak == "0":
                continue
            if ak == "1":
                terms.append(f"k_{{{i+1}}}")
            elif ak == "-1":
                terms.append(f"-k_{{{i+1}}}")
            else:
                terms.append(f"{ak}k_{{{i+1}}}")
        if not terms:
            lhs = "0"
        else:
            lhs = " + ".join(terms).replace("+ -", "- ")
        lines.append(f"{lhs} = 0")

    system = (
        "\\left\\{\\begin{array}{l}\n"
        + " \\\\\n".join(lines)
        + "\n\\end{array}\\right."
    )
    return eq_line, system


def _eq_general_pdf_latex(
    vectors: List[List[float]], basis_indices: List[int], rank: int, tol: float = 1e-10
) -> str:
    if not vectors:
        return ""

    m = len(vectors)
    vec_list = _latex_vec_list(vectors, tol=tol)
    eq_line, system = _build_homogeneous_system_latex(vectors, tol=tol)

    # [FIX LAYOUT] Hàm tạo dòng kết luận cơ sở (Tách dòng B riêng biệt)
    def make_basis_line(indices):
        if not indices:
            # Dòng 1: Text --> Xuống dòng 8pt --> Dòng 2: B = rỗng
            return "\\bullet\\; \\text{Một cơ sở của }V\\text{ là:} \\\\[8pt] B = \\emptyset."

        vec_strs = [f"v_{{{i+1}}}" for i in indices]

        # [QUAN TRỌNG] Ngắt dòng dứt khoát ở đây
        return (
            "\\bullet\\; \\text{Một cơ sở của }V\\text{ là:} \\\\[8pt]"
            "B = \\left\\{ " + ",\\; ".join(vec_strs) + " \\right\\}."
        )

    if rank == m:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        basis_line = make_basis_line(list(range(m)))

        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "Vì hệ phương trình chỉ có nghiệm tầm thường nên hệ vectơ độc lập tuyến tính.\\\\[4pt]\n"
            f"{dim_line}\\\\[5pt]\n"  # Tăng khoảng cách dòng
            f"{basis_line}"
        )
    else:
        dim_line = f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {rank}."
        basis_line = make_basis_line(basis_indices)

        concl = (
            "\\textbf{Bước 3: Kết luận. }"
            "Hệ phương trình có nghiệm không tầm thường nên hệ vectơ phụ thuộc tuyến tính.\\\\[4pt]\n"
            f"{dim_line}\\\\[5pt]\n"  # Tăng khoảng cách dòng
            f"{basis_line}"
        )

    latex = (
        "\\renewcommand{\\arraystretch}{1.25}\n"
        "\\begin{array}{l}\n"
        f"\\text{{Cho }} {vec_list}.\\\\[6pt]\n"
        "\\textbf{Bước 1: }\\text{Kiểm tra tính độc lập tuyến tính của hệ. Xét phương trình}\\\\[2pt]\n"
        f"{eq_line}.\\\\[2pt]\n"
        "\\Leftrightarrow\\\\[-2pt]\n"
        f"{system}\\\\[8pt]\n"
        "\\textbf{Bước 2: }\\text{Giải hệ phương trình.}\\\\[2pt]\n"
        "\\text{(Từ phép khử Gauss, ta xác định được hạng và số ẩn tự do.)}\\\\[10pt]\n"
        f"{concl}\n"
        "\\end{array}"
    )
    return latex


def _is_multiple(
    v2: np.ndarray, v1: np.ndarray, tol: float = 1e-10
) -> Tuple[bool, float]:
    if np.linalg.norm(v1) < tol:
        return False, 0.0
    idx = None
    for i in range(v1.shape[0]):
        if abs(v1[i]) >= tol:
            idx = i
            break
    if idx is None:
        return False, 0.0
    t = v2[idx] / v1[idx]
    if np.linalg.norm(v2 - t * v1) < tol:
        return True, float(t)
    return False, float(t)


def _solve_in_span(
    B_rows: List[List[float]], v: List[float], tol: float = 1e-10
) -> Tuple[bool, List[float]]:
    """
    Solve v = sum c_i * b_i where b_i are rows in B_rows.
    Return (in_span, coeffs).
    """
    if not B_rows:
        return False, []

    B = np.array(B_rows, dtype=float)  # r x n (rows)
    BT = B.T  # n x r
    vv = np.array(v, dtype=float)  # n

    c, _, _, _ = np.linalg.lstsq(BT, vv, rcond=None)
    recon = BT @ c
    ok = np.linalg.norm(recon - vv) < tol
    return ok, c.tolist()


def _eq_stepwise_pdf_latex(
    vectors: List[List[float]], tol: float = 1e-10
) -> Tuple[str, List[int], int]:
    if not vectors:
        return "", [], 0

    m, n = len(vectors), len(vectors[0])
    basis_idx: List[int] = []
    basis_rows: List[List[float]] = []  # Lưu các vector cơ sở dạng float

    vec_list = _latex_vec_list(vectors, tol=tol)
    lines = [
        "\\renewcommand{\\arraystretch}{1.25}",
        "\\begin{array}{l}",
        f"\\text{{Cho }} {vec_list}.\\\\[6pt]",
    ]

    # --- Bước 1: Xét v1 ---
    v1 = np.array(vectors[0], dtype=float)
    if np.linalg.norm(v1) < tol:
        lines.append(
            "\\textbf{Bước 1: }\\text{Vì }v_1=\\vec{0}\\text{ nên bỏ }v_1.\\\\[6pt]"
        )
    else:
        basis_idx.append(0)
        basis_rows.append(vectors[0])
        lines.append(
            "\\textbf{Bước 1: }\\text{Xét hệ }\\{v_1\\}.\\text{ Vì }v_1\\neq\\vec{0}\\text{ nên độc lập tuyến tính.}\\\\[6pt]"
        )

    # --- Bước 2: Xét v2 ---
    if m >= 2:
        v2 = np.array(vectors[1], dtype=float)
        if basis_rows:
            # Check tỉ lệ: v2 = k*v1
            mul, t = _is_multiple(v2, np.array(basis_rows[0], dtype=float), tol=tol)
            if not mul:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                # Lấy 2 thành phần đầu để minh họa khác tỉ lệ (nếu n >= 2)
                idx1, idx2 = 0, 1 if n > 1 else 0
                a_val = _fmt_k(basis_rows[0][idx1], tol)
                b_val = _fmt_k(v2[idx1], tol)
                lines.append(
                    f"\\textbf{{Bước 2: }}\\text{{Xét hệ }}\\{{v_1, v_2\\}}.\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Vì }} v_1, v_2 \\text{{ không tỉ lệ (}}\\frac{{{b_val}}}{{{a_val}}} \\neq ...\\text{{) nên độc lập tuyến tính.}}\\\\[6pt]"
                )
            else:
                k_str = _fmt_k(t, tol)
                lines.append(
                    f"\\textbf{{Bước 2: }}\\text{{Ta có }}v_2 = {k_str}v_1\\text{{ nên phụ thuộc. Bỏ }}v_2.\\\\[6pt]"
                )
        else:
            if np.linalg.norm(v2) > tol:
                basis_idx.append(1)
                basis_rows.append(vectors[1])
                lines.append(
                    "\\textbf{Bước 2: }\\text{Lấy }v_2\\text{ làm cơ sở.}\\\\[6pt]"
                )
            else:
                lines.append("\\textbf{Bước 2: }\\text{Bỏ }v_2=\\vec{0}.\\\\[6pt]")

    # --- Bước 3 trở đi: Logic Giải hệ con & Thử lại ---
    step_no = 3
    for k in range(2, m):
        vk = np.array(vectors[k], dtype=float)
        if np.linalg.norm(vk) < tol:
            lines.append(
                f"\\textbf{{Bước {step_no}: }}\\text{{Bỏ }}v_{{{k+1}}}=\\vec{{0}}.\\\\[6pt]"
            )
            step_no += 1
            continue

        num_vars = len(basis_rows)
        # Tạo chuỗi phương trình giả định: v_k = x*v_i + y*v_j
        rhs_terms = [f"k_{{{i+1}}}v_{{{basis_idx[i]+1}}}" for i in range(num_vars)]
        rhs_eq = " + ".join(rhs_terms)

        lines.append(
            f"\\textbf{{Bước {step_no}: }}\\text{{Kiểm tra }}v_{{{k+1}}}\\text{{ có là tổ hợp tuyến tính của }}v_1, v_2...\\text{{ không.}}\\\\[2pt]"
        )
        lines.append(
            f"\\text{{Giả sử }} v_{{{k+1}}} = {rhs_eq}. \\text{{ Ta xét {num_vars} thành phần đầu tiên:}}\\\\[2pt]"
        )

        # 1. Giải hệ phương trình con (chỉ lấy num_vars dòng đầu tiên)
        # A_sub * x = b_sub
        A_sub = np.array([r[:num_vars] for r in basis_rows]).T
        b_sub = vk[:num_vars]

        # Tạo hệ phương trình LaTeX để hiển thị
        sys_lines = []
        for r_i in range(num_vars):
            row_terms = []
            for c_i in range(num_vars):
                val = basis_rows[c_i][r_i]
                val_s = _fmt_k(val, tol)
                if val_s == "0":
                    continue
                var_char = chr(97 + c_i)  # a, b, c...
                if val_s == "1":
                    row_terms.append(var_char)
                elif val_s == "-1":
                    row_terms.append(f"-{var_char}")
                else:
                    row_terms.append(f"{val_s}{var_char}")

            lhs_expr = " + ".join(row_terms).replace("+ -", "- ") if row_terms else "0"
            rhs_val = _fmt_k(b_sub[r_i], tol)
            sys_lines.append(f"{lhs_expr} = {rhs_val}")

        sys_latex = (
            "\\left\\{\\begin{matrix} "
            + " \\\\ ".join(sys_lines)
            + " \\end{matrix}\\right."
        )

        # Giải nghiệm
        try:
            sol = np.linalg.solve(A_sub, b_sub)
            has_sol = True
        except np.linalg.LinAlgError:
            has_sol = False
            sol = np.zeros(num_vars)  # Fallback

        if not has_sol:
            # Trường hợp hiếm: ngay 2 dòng đầu đã vô nghiệm
            lines.append(f"{sys_latex} \\Rightarrow \\text{{ Hệ vô nghiệm.}}\\\\[2pt]")
            lines.append(
                f"\\text{{Vậy }}v_{{{k+1}}}\\text{{ độc lập tuyến tính. Bổ sung vào cơ sở.}}\\\\[6pt]"
            )
            basis_idx.append(k)
            basis_rows.append(vectors[k])
        else:
            # Hiển thị nghiệm tìm được
            sol_strs = [f"{chr(97+i)} = {_fmt_k(sol[i], tol)}" for i in range(num_vars)]
            sol_latex = "\\begin{cases} " + " \\\\ ".join(sol_strs) + " \\end{cases}"
            lines.append(f"{sys_latex} \\Rightarrow {sol_latex}\\\\[4pt]")

            # 2. Thử lại vào các thành phần còn lại (từ dòng num_vars trở đi)
            is_dependent = True
            lines.append(
                f"\\text{{Thử lại với các thành phần còn lại của }} v_{{{k+1}}}:\\\\[2pt]"
            )

            explanation_parts = []
            for check_idx in range(num_vars, n):
                # Tính vế phải: a*v1[i] + b*v2[i]
                rhs_check = sum(
                    sol[i] * basis_rows[i][check_idx] for i in range(num_vars)
                )
                lhs_check = vk[check_idx]

                # Format chuỗi tính toán: 1(2) + (-2)(3)...
                calc_terms = []
                for i in range(num_vars):
                    c_s = _fmt_k(sol[i], tol)
                    v_s = _fmt_k(basis_rows[i][check_idx], tol)
                    if v_s == "0":
                        continue
                    # Đóng ngoặc số âm/phân số
                    if "-" in v_s or "/" in v_s:
                        v_s = f"({v_s})"
                    if "-" in c_s or "/" in c_s:
                        c_s = f"({c_s})"
                    calc_terms.append(f"{c_s}\\cdot{v_s}")

                calc_str = (
                    " + ".join(calc_terms).replace("+ -", "- ") if calc_terms else "0"
                )
                res_str = _fmt_k(rhs_check, tol)
                target_str = _fmt_k(lhs_check, tol)

                if abs(rhs_check - lhs_check) < tol:
                    explanation_parts.append(
                        f"\\bullet\\; \\text{{Dòng {check_idx+1}: }} {calc_str} = {res_str} = {target_str} \\;(\\text{{Đúng}})"
                    )
                else:
                    explanation_parts.append(
                        f"\\bullet\\; \\text{{Dòng {check_idx+1}: }} {calc_str} = {res_str} \\neq {target_str} \\;(\\text{{Sai}})"
                    )
                    is_dependent = False
                    break  # Chỉ cần 1 dòng sai là kết luận luôn

            lines.append(" \\\\ ".join(explanation_parts) + "\\\\[4pt]")

            if is_dependent:
                # Tạo chuỗi kết luận v3 = ...
                final_comb = []
                for i, s_val in enumerate(sol):
                    s_fmt = _fmt_k(s_val, tol)
                    v_name = f"v_{{{basis_idx[i]+1}}}"
                    if s_fmt == "0":
                        continue
                    if s_fmt == "1":
                        term = v_name
                    elif s_fmt == "-1":
                        term = f"-{v_name}"
                    else:
                        term = f"{s_fmt}{v_name}"
                    final_comb.append(term)
                res_eq = " + ".join(final_comb).replace("+ -", "- ")

                lines.append(
                    f"\\text{{Tất cả đều thỏa mãn. Vậy }} v_{{{k+1}}} = {res_eq}.\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Kết luận: }} v_{{{k+1}}} \\text{{ phụ thuộc tuyến tính. Loại bỏ.}}\\\\[6pt]"
                )
            else:
                lines.append(
                    f"\\text{{Xuất hiện mâu thuẫn. Vậy không tồn tại bộ số thỏa mãn.}}\\\\[2pt]"
                )
                lines.append(
                    f"\\text{{Kết luận: }} v_{{{k+1}}} \\text{{ độc lập tuyến tính. Bổ sung vào cơ sở.}}\\\\[6pt]"
                )
                basis_idx.append(k)
                basis_rows.append(vectors[k])

        step_no += 1

    # Kết luận cuối cùng
    dim = len(basis_idx)
    basis_vec_strs = [f"v_{{{i+1}}}" for i in basis_idx]

    lines.append("\\textbf{Kết luận.}\\\\[4pt]")
    lines.append(
        f"\\bullet\\; \\text{{Số chiều: }}\\dim(V) = {dim}.\\\\[5pt]"
    )  # Thêm giãn dòng 5pt

    # [FIX LAYOUT] Tách B ra dòng riêng hoàn toàn
    if not basis_idx:
        lines.append(
            f"\\bullet\\; \\text{{Một cơ sở của }} V \\text{{ là:}} \\\\[8pt] B = \\emptyset."
        )
    else:
        b_str = "B = \\left\\{ " + ",\\; ".join(basis_vec_strs) + " \\right\\}."
        lines.append(
            f"\\bullet\\; \\text{{Một cơ sở của }} V \\text{{ là:}} \\\\[8pt] {b_str}"
        )

    lines.append("\\end{array}")

    return "\n".join(lines), basis_idx, dim


# =========================================================================
# MAIN FUNCTION (ĐÃ SỬA HIỂN THỊ PHÂN SỐ/CĂN)
# =========================================================================
def compute_basis_payload(
    vectors: List[List[float]], tol: float = 1e-10, pivot_strategy: str = "min_norm"
):
    """
    vectors: list[list[float]] với mỗi vector là 1 HÀNG.
    """
    if not vectors:
        raise ValueError("Danh sách vector rỗng.")

    mat = np.array(vectors, dtype=float)
    if mat.ndim != 2:
        raise ValueError("Dữ liệu vector không hợp lệ (phải là list 2D).")

    m, dim = mat.shape
    A = mat.tolist()

    # 1. Chạy Khử Gauss (Cho Cách 1 - Ma trận)
    rank, pivot_indices_gauss, E, ops, row_ids = gaussian_elimination_rows_with_ops(
        A, tol=tol, pivot_strategy=pivot_strategy, snapshot_every_step=True
    )

    # 2. Chạy Logic "Xét từng vector" (Cho Cách 2 - Phương trình & KẾT QUẢ CUỐI CÙNG)
    eq_step_latex, step_basis_idx, step_dim = _eq_stepwise_pdf_latex(vectors, tol=tol)

    # [QUAN TRỌNG]: GHI ĐÈ KẾT QUẢ CHÍNH BẰNG KẾT QUẢ CỦA CÁCH 2
    final_pivot_indices = step_basis_idx
    final_pivot_indices.sort()

    basis_vectors = [vectors[i] for i in final_pivot_indices]

    # Tính lại phụ thuộc (dependents) và hệ số (coeff_map) dựa trên cơ sở CHUẨN này
    dependents, coeff_map = _dependent_expressions_rows(A, final_pivot_indices, tol=tol)

    # =========================
    # Steps for "Cách 1: Ma trận" (Visual Steps)
    # =========================
    steps: List[dict] = []

    steps.append(
        Step(
            kind="info",
            text=f"Bước 1: Lập ma trận A gồm {m} hàng (mỗi hàng là 1 vector).",
        ).to_dict()
    )

    # [SỬA 1]: Format ma trận đầu vào A thành chuỗi đẹp (dùng _fmt_k)
    pretty_A = [[_fmt_k(x, tol) for x in row] for row in A]
    steps.append(
        Step(
            kind="matrix",
            text="Ma trận A ban đầu:",
            matrix=pretty_A,
        ).to_dict()
    )

    if ops:
        steps.append(
            Step(
                kind="info",
                text="Bước 2: Khử Gauss để đưa A về dạng bậc thang E:",
            ).to_dict()
        )

        for op in ops:
            mat_after = op.get("matrix_after")
            if mat_after is None:
                continue

            arrow_text = _fmt_row_op_latex(op, tol=tol).strip()

            # [SỬA 2]: Format ma trận sau mỗi bước biến đổi
            pretty_mat_after = [[_fmt_k(x, tol) for x in row] for row in mat_after]

            steps.append(
                Step(
                    kind="matrix",
                    text=arrow_text if arrow_text else "",
                    matrix=pretty_mat_after,
                ).to_dict()
            )

    # [SỬA 3]: Format ma trận kết quả E thành chuỗi đẹp
    E_list = E.tolist() if hasattr(E, "tolist") else E
    pretty_E = [[_fmt_k(x, tol) for x in row] for row in E_list]

    steps.append(
        Step(
            kind="matrix",
            text="",
            matrix=pretty_E,
        ).to_dict()
    )

    rank_val = int(step_dim)

    if rank_val == 0:
        steps.append(
            Step(
                kind="summary",
                text="Kết luận: Tất cả vector đều bằng 0 ⇒ rank = 0, không có cơ sở khác 0.",
            ).to_dict()
        )
    else:
        basis_human = ", ".join([f"#{i+1}" for i in final_pivot_indices])
        steps.append(
            Step(
                kind="pivot_choose",
                text=f"Bước 3: Dựa trên quá trình xét độc lập tuyến tính (Cách 2), ta chọn các vector {basis_human} làm cơ sở.",
                meta={"pivot_indices": final_pivot_indices},
            ).to_dict()
        )

        if dependents:
            dep_human = ", ".join([f"#{i+1}" for i in dependents])
            steps.append(
                Step(
                    kind="dependents",
                    text=f"Bước 4: Các vector còn lại ({dep_human}) là phụ thuộc tuyến tính và sẽ bị ẩn.",
                    meta={"dependents": dependents, "coeff_map": coeff_map},
                ).to_dict()
            )

        steps.append(
            Step(
                kind="summary",
                text=f"Kết luận: rank = {rank_val}. Cơ sở: {basis_human}.",
            ).to_dict()
        )

    # =========================
    # Generate LaTeX Explanations
    # =========================
    rank_eq, m_unknowns = _solve_homogeneous_rank(vectors, tol=tol)

    eq_general_latex = _eq_general_pdf_latex(
        vectors=vectors, basis_indices=final_pivot_indices, rank=rank_eq, tol=tol
    )
    # ... (code cũ) ...

    # --- CHÈN ĐOẠN NÀY ĐỂ DEBUG ---
    print("\n" + "=" * 30)
    print("DEBUG KIỂM TRA FORMAT SỐ:")
    print(f"Input gốc (số xấu): {3.000000000012}")
    print(f"Format thử: {format_number_pretty(3.000000000012)}")

    if len(steps) > 1:
        print("Ma trận đầu tiên trong steps:", steps[1]["matrix"])
    print("=" * 30 + "\n")
    # ------------------------------

    return {
        "basis": basis_vectors,
        "dimension": rank_val,
        "pivot_indices": final_pivot_indices,
        "dependents": dependents,
        "coeff_map": coeff_map,
        "steps": steps,
        "solution": {
            "eq_general_latex": eq_general_latex,
            "eq_step_latex": eq_step_latex,
            "eq_step_basis_indices": step_basis_idx,
            "eq_step_dimension": int(step_dim),
        },
    }


from vectoria_api.explainers.registry import register

register("basis.gauss_rows", compute_basis_payload)
