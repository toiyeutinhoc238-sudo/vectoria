# backend_v2/vectoria_api/routes/matrix.py
from flask import Blueprint, request, jsonify
import numpy as np
import math
from vectoria_api.core.format import format_number_pretty

matrix_bp = Blueprint("matrix", __name__)

def format_matrix_latex(matrix):
    lines = []
    for row in matrix:
        lines.append(" & ".join([format_number_pretty(val) for val in row]))
    return "\\begin{bmatrix} " + " \\\\ ".join(lines) + " \\end{bmatrix}"

def format_augmented_matrix_latex(matrix, n):
    align = "c" * n + "|" + "c" * n
    lines = []
    for row in matrix:
        lines.append(" & ".join([format_number_pretty(val) for val in row]))
    return "\\left[\\begin{array}{" + align + "} " + " \\\\ ".join(lines) + " \\end{array}\\right]"


def format_matrix_v_latex(matrix):
    lines = []
    for row in matrix:
        lines.append(" & ".join([format_number_pretty(val) for val in row]))
    return "\\begin{vmatrix} " + " \\\\ ".join(lines) + " \\end{vmatrix}"


def get_gauss_det_steps(A):
    n = A.shape[0]
    steps = []
    steps.append("Đưa ma trận ban đầu về dạng tam giác trên bằng biến đổi sơ cấp dòng:")
    steps.append(f"$$A = {format_matrix_latex(A)}$$")
    
    U = A.copy()
    det_sign = 1.0
    for i in range(n):
        if abs(U[i, i]) < 1e-10:
            swap_row = -1
            for r in range(i+1, n):
                if abs(U[r, i]) > 1e-10:
                    swap_row = r
                    break
            if swap_row == -1:
                steps.append(f"Cột {i+1} không có pivot khác 0 ở các dòng dưới. Ma trận suy biến.")
                steps.append(f"$$\\det(A) = 0$$")
                return 0.0, steps
            
            U[[i, swap_row]] = U[[swap_row, i]]
            det_sign *= -1
            steps.append(f"Hoán vị dòng $R_{{{i+1}}} \\leftrightarrow R_{{{swap_row+1}}}$ (định thức đổi dấu, nhân thêm $-1$):")
            steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
        
        for r in range(i+1, n):
            if abs(U[r, i]) > 1e-10:
                factor = U[r, i] / U[i, i]
                U[r] = U[r] - factor * U[i]
                steps.append(f"Biến đổi dòng: $R_{{{r+1}}} \\rightarrow R_{{{r+1}}} - ({format_number_pretty(factor)}) \\cdot R_{{{i+1}}}$:")
                steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
    
    diag_prod = 1.0
    diag_terms = []
    for i in range(n):
        diag_prod *= U[i, i]
        diag_terms.append(format_number_pretty(U[i, i]))
        
    det = det_sign * diag_prod
    steps.append("Ma trận đã ở dạng tam giác trên. Định thức bằng tích các phần tử chéo nhân với dấu hoán vị:")
    sign_str = "-" if det_sign < 0 else ""
    diag_terms_str = ' \\cdot '.join(diag_terms)
    steps.append(f"$$\\det(A) = {sign_str} ({diag_terms_str}) = {format_number_pretty(det)}$$")
    return det, steps


def get_laplace_det_steps_internal(A, name="A"):
    n = A.shape[0]
    steps = []
    if n == 1:
        det = A[0,0]
        steps.append(f"$$\\det({name}) = {format_number_pretty(det)}$$")
        return det, steps
    elif n == 2:
        det = A[0,0]*A[1,1] - A[0,1]*A[1,0]
        steps.append(f"$$\\det({name}) = {format_matrix_v_latex(A)} = {format_number_pretty(A[0,0])} \\cdot {format_number_pretty(A[1,1])} - {format_number_pretty(A[0,1])} \\cdot {format_number_pretty(A[1,0])} = {format_number_pretty(det)}$$")
        return det, steps
    else:
        steps.append(f"Khai triển định thức {name} theo hàng 1:")
        terms = []
        det_val = 0.0
        sub_steps = []
        sub_dets = []
        for j in range(n):
            sign = 1 if j % 2 == 0 else -1
            sign_str = "+" if j % 2 == 0 else "-"
            coef = A[0, j]
            
            rows_idx = list(range(1, n))
            cols_idx = [col for col in range(n) if col != j]
            sub_matrix = A[np.ix_(rows_idx, cols_idx)]
            
            sub_name = f"M_{{1{j+1}}}"
            sub_det, sub_det_steps = get_laplace_det_steps_internal(sub_matrix, sub_name)
            det_val += sign * coef * sub_det
            sub_dets.append(sub_det)
            
            term_coef_str = format_number_pretty(coef)
            if j == 0:
                t = f"{term_coef_str} \\cdot {format_matrix_v_latex(sub_matrix)}"
            else:
                t = f"{sign_str} {term_coef_str} \\cdot {format_matrix_v_latex(sub_matrix)}"
            terms.append(t)
            
            sub_steps.append(f"Tính định thức con ${sub_name}$ (bằng cách bỏ hàng 1, cột {j+1}):")
            sub_steps.append(f"$${sub_name} = {format_matrix_latex(sub_matrix)}$$")
            for s in sub_det_steps:
                sub_steps.append(s)
                
        steps.append(f"$$\\det({name}) = {' '.join(terms)}$$")
        steps.extend(sub_steps)
        
        sub_vals_expr = []
        for j in range(n):
            sign = 1 if j % 2 == 0 else -1
            sign_str = "+" if j % 2 == 0 else "-"
            coef = A[0, j]
            coef_pretty = format_number_pretty(coef)
            sub_det_pretty = format_number_pretty(sub_dets[j])
            if j == 0:
                term_val = f"{coef_pretty} \\cdot ({sub_det_pretty})"
            else:
                term_val = f"{sign_str} {coef_pretty} \\cdot ({sub_det_pretty})"
            sub_vals_expr.append(term_val)
            
        steps.append("Thế kết quả định thức các ma trận con vào biểu thức khai triển ban đầu:")
        steps.append(f"$$\\det({name}) = {' '.join(sub_vals_expr)}$$")
        steps.append(f"$$\\det({name}) = {format_number_pretty(det_val)}$$")
        return det_val, steps


def get_laplace_det_steps(A):
    _, steps = get_laplace_det_steps_internal(A, name="A")
    return steps


def get_gauss_jordan_inv_steps(A):
    n = A.shape[0]
    steps = []
    steps.append("Sử dụng phương pháp khử Gauss-Jordan trên ma trận bổ sung $[A | I]$:")
    I = np.eye(n)
    Aug = np.hstack((A, I))
    
    steps.append(f"$$[A|I] = {format_augmented_matrix_latex(Aug, n)}$$")
    
    for i in range(n):
        if abs(Aug[i, i]) < 1e-10:
            swap_row = -1
            for r in range(i+1, n):
                if abs(Aug[r, i]) > 1e-10:
                    swap_row = r
                    break
            if swap_row == -1:
                raise ValueError("Ma trận suy biến, không thể tìm thấy phần tử xoay (pivot) khác 0.")
            Aug[[i, swap_row]] = Aug[[swap_row, i]]
            steps.append(f"Hoán vị dòng $R_{{{i+1}}} \\leftrightarrow R_{{{swap_row+1}}}$:")
            steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
        
        pivot = Aug[i, i]
        if abs(pivot - 1.0) > 1e-10:
            Aug[i] = Aug[i] / pivot
            steps.append(f"Chia dòng $R_{{{i+1}}}$ cho pivot ${format_number_pretty(pivot)}$ để đưa về cột đơn vị ($R_{{{i+1}}} \\rightarrow R_{{{i+1}}} / {format_number_pretty(pivot)}$):")
            steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
        
        for r in range(n):
            if r != i and abs(Aug[r, i]) > 1e-10:
                factor = Aug[r, i]
                Aug[r] = Aug[r] - factor * Aug[i]
                steps.append(f"Khử phần tử cột {i+1} ở dòng {r+1}: $R_{{{r+1}}} \\rightarrow R_{{{r+1}}} - ({format_number_pretty(factor)}) \\cdot R_{{{i+1}}}$:")
                steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
    
    inv = Aug[:, n:]
    steps.append("Sau khi đưa vế trái về ma trận đơn vị $I$, vế phải chính là ma trận nghịch đảo $A^{-1}$:")
    steps.append(f"$$A^{{-1}} = {format_matrix_latex(inv)}$$")
    return inv, steps


def get_adjugate_inv_steps(A):
    n = A.shape[0]
    steps = []
    
    if n == 2:
        det_val = A[0,0]*A[1,1] - A[0,1]*A[1,0]
    elif n == 3:
        a00, a01, a02 = A[0,0], A[0,1], A[0,2]
        det_val = (
            a00 * (A[1,1]*A[2,2] - A[1,2]*A[2,1])
            - a01 * (A[1,0]*A[2,2] - A[1,2]*A[2,0])
            + a02 * (A[1,0]*A[2,1] - A[1,1]*A[2,0])
        )
    else:
        det_val = np.linalg.det(A)
        
    steps.append("Sử dụng phương pháp ma trận phụ hợp (Adjugate): $A^{-1} = \\frac{1}{\\det(A)} \\cdot Adj(A)$")
    steps.append("Bước 1: Tính định thức của ma trận A:")
    steps.append(f"$$\\det(A) = {format_number_pretty(det_val)}$$")
    
    if abs(det_val) < 1e-10:
        steps.append("Định thức bằng 0, ma trận không khả nghịch.")
        return None, steps
        
    steps.append("Bước 2: Tính các phần bù đại số (Cofactors) $C_{ij} = (-1)^{i+j} \\cdot \\det(M_{ij})$:")
    
    C_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            rows_idx = [r for r in range(n) if r != i]
            cols_idx = [c for c in range(n) if c != j]
            sub_matrix = A[np.ix_(rows_idx, cols_idx)]
            
            if n == 2:
                sub_det = sub_matrix[0, 0]
            elif n == 3:
                sub_det = sub_matrix[0,0]*sub_matrix[1,1] - sub_matrix[0,1]*sub_matrix[1,0]
            else:
                sub_det = np.linalg.det(sub_matrix)
                
            cofactor = ((-1) ** (i + j)) * sub_det
            C_matrix[i, j] = cofactor
            
            sign_factor = 1 if (i + j) % 2 == 0 else -1
            sign_latex = "+" if sign_factor > 0 else "-"
            
            sub_det_latex = format_matrix_v_latex(sub_matrix) if n > 2 else format_number_pretty(sub_matrix[0, 0])
            
            steps.append(
                f"$$C_{{{i+1},{j+1}}} = (-1)^{{{i+1}+{j+1}}} \\cdot \\det(M_{{{i+1},{j+1}}}) = {sign_latex} {sub_det_latex} = {format_number_pretty(cofactor)}$$"
            )
            
    steps.append("Bước 3: Thành lập ma trận các phần bù đại số $C$:")
    steps.append(f"$$C = {format_matrix_latex(C_matrix)}$$")
    
    Adj = C_matrix.T
    steps.append("Bước 4: Tìm ma trận phụ hợp $Adj(A)$ bằng cách chuyển vị ma trận $C$ ($Adj(A) = C^T$):")
    steps.append(f"$$Adj(A) = {format_matrix_latex(Adj)}$$")
    
    inv = Adj / det_val
    steps.append("Bước 5: Áp dụng công thức tìm ma trận nghịch đảo:")
    steps.append(f"$$A^{{-1}} = \\frac{{1}}{{{format_number_pretty(det_val)}}} \\cdot {format_matrix_latex(Adj)} = {format_matrix_latex(inv)}$$")
    
    return inv, steps


# ==========================================
# 1. API TÍNH ĐỊNH THỨC (DETERMINANT)
# ==========================================
@matrix_bp.route("/api/matrix/determinant", methods=["POST"])
def api_determinant():
    try:
        data = request.get_json() or {}
        matrix = data.get("matrix", [])
        
        A = np.array(matrix, dtype=float)
        if A.ndim != 2 or A.shape[0] != A.shape[1]:
            return jsonify({"status": "error", "message": "Ma trận phải là ma trận vuông (số hàng bằng số cột)."}), 400
            
        n = A.shape[0]
        if n < 1 or n > 5:
            return jsonify({"status": "error", "message": "Kích thước ma trận phải từ 1x1 đến 5x5."}), 400

        if n == 1:
            det = A[0,0]
            steps = [
                "Định thức của ma trận cấp 1 bằng chính phần tử duy nhất của nó:",
                f"$$\\det(A) = {format_number_pretty(det)}$$"
            ]
            return jsonify({
                "status": "success",
                "result": format_number_pretty(det),
                "steps": steps
            })
            
        det_gauss, steps_gauss = get_gauss_det_steps(A)
        steps_laplace = get_laplace_det_steps(A)
        
        return jsonify({
            "status": "success",
            "result": format_number_pretty(det_gauss),
            "steps": steps_gauss,
            "methods": [
                { "name": "Biến đổi dòng (Gauss)", "steps": steps_gauss },
                { "name": "Khai triển Laplace", "steps": steps_laplace }
            ]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# 2. API TÍNH MA TRẬN NGHỊCH ĐẢO (INVERSE)
# ==========================================
@matrix_bp.route("/api/matrix/inverse", methods=["POST"])
def api_inverse():
    try:
        data = request.get_json() or {}
        matrix = data.get("matrix", [])
        
        A = np.array(matrix, dtype=float)
        if A.ndim != 2 or A.shape[0] != A.shape[1]:
            return jsonify({"status": "error", "message": "Ma trận phải là ma trận vuông."}), 400
            
        n = A.shape[0]
        if n < 1 or n > 5:
            return jsonify({"status": "error", "message": "Kích thước ma trận phải từ 1x1 đến 5x5."}), 400

        if n == 2:
            det = A[0,0]*A[1,1] - A[0,1]*A[1,0]
        elif n == 3:
            a00, a01, a02 = A[0,0], A[0,1], A[0,2]
            det = (
                a00 * (A[1,1]*A[2,2] - A[1,2]*A[2,1])
                - a01 * (A[1,0]*A[2,2] - A[1,2]*A[2,0])
                + a02 * (A[1,0]*A[2,1] - A[1,1]*A[2,0])
            )
        else:
            det = np.linalg.det(A)
            
        if abs(det) < 1e-10:
            return jsonify({"status": "error", "message": f"Ma trận không khả nghịch do định thức bằng 0 (det = {format_number_pretty(det)})."}), 400

        if n == 1:
            inv_val = 1.0 / A[0,0]
            steps = [
                "Ma trận nghịch đảo của ma trận vuông cấp 1 $[a]$ chính là $[\\frac{1}{a}]$:",
                f"$$A^{{-1}} = \\begin{{bmatrix}} {format_number_pretty(inv_val)} \\end{{bmatrix}}$$"
            ]
            return jsonify({
                "status": "success",
                "result": [[inv_val]],
                "result_latex": f"\\begin{{bmatrix}} {format_number_pretty(inv_val)} \\end{{bmatrix}}",
                "steps": steps
            })
            
        inv_gj, steps_gj = get_gauss_jordan_inv_steps(A)
        _, steps_adj = get_adjugate_inv_steps(A)
        
        return jsonify({
            "status": "success",
            "result": inv_gj.tolist(),
            "result_latex": format_matrix_latex(inv_gj),
            "steps": steps_gj,
            "methods": [
                { "name": "Biến đổi Gauss-Jordan", "steps": steps_gj },
                { "name": "Ma trận phụ hợp (Adjugate)", "steps": steps_adj }
            ]
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# 3. API TÍNH HẠNG MA TRẬN (RANK)
# ==========================================
@matrix_bp.route("/api/matrix/rank", methods=["POST"])
def api_rank():
    try:
        data = request.get_json() or {}
        matrix = data.get("matrix", [])
        
        A = np.array(matrix, dtype=float)
        if A.ndim != 2:
            return jsonify({"status": "error", "message": "Dữ liệu ma trận không hợp lệ."}), 400
            
        m, n = A.shape
        steps = []
        steps.append(f"Đưa ma trận về dạng bậc thang bằng các phép biến đổi dòng sơ cấp:")
        steps.append(f"$$A = {format_matrix_latex(A)}$$")
        
        U = A.copy()
        r = 0  # Số dòng khác không đã khử (hạng)
        for c in range(n):
            if r >= m:
                break
            # Tìm pivot ở dòng r trở xuống trên cột c
            pivot_row = -1
            for row in range(r, m):
                if abs(U[row, c]) > 1e-10:
                    pivot_row = row
                    break
            
            if pivot_row == -1:
                # Không tìm thấy pivot cột này, chuyển cột tiếp theo
                continue
                
            # Hoán vị dòng lên vị trí dòng r
            if pivot_row != r:
                U[[r, pivot_row]] = U[[pivot_row, r]]
                steps.append(f"Hoán vị dòng $R_{{{r+1}}} \\leftrightarrow R_{{{pivot_row+1}}}$:")
                steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
                
            # Khử các phần tử ở dưới dòng r
            for row in range(r+1, m):
                if abs(U[row, c]) > 1e-10:
                    factor = U[row, c] / U[r, c]
                    U[row] = U[row] - factor * U[r]
                    steps.append(f"Biến đổi dòng: $R_{{{row+1}}} \\rightarrow R_{{{row+1}}} - ({format_number_pretty(factor)}) \\cdot R_{{{r+1}}}$:")
                    steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
            r += 1
            
        # Xác định hạng
        rank_val = r
        steps.append(f"Ma trận bậc thang có đúng **{rank_val}** dòng khác không (dòng có ít nhất một phần tử khác 0):")
        steps.append(f"$$Rank(A) = {rank_val}$$")
        
        return jsonify({"status": "success", "result": str(rank_val), "steps": steps})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# 4. API PHÉP TOÁN HAI MA TRẬN (BINARY OP)
# ==========================================
@matrix_bp.route("/api/matrix/binary_op", methods=["POST"])
def api_binary_op():
    try:
        data = request.get_json() or {}
        matrix_a = data.get("matrix_a", [])
        matrix_b = data.get("matrix_b", [])
        op = data.get("op", "")  # 'add', 'subtract', 'multiply'
        
        A = np.array(matrix_a, dtype=float)
        B = np.array(matrix_b, dtype=float)
        
        if A.ndim != 2 or B.ndim != 2:
            return jsonify({"status": "error", "message": "Ma trận A và B phải hợp lệ."}), 400

        steps = []
        
        if op in ("add", "subtract"):
            if A.shape != B.shape:
                return jsonify({"status": "error", "message": f"Hai ma trận phải có cùng kích thước để thực hiện cộng/trừ (A: {A.shape[0]}x{A.shape[1]}, B: {B.shape[0]}x{B.shape[1]})."}), 400
            
            m, n = A.shape
            sign = "+" if op == "add" else "-"
            op_name = "Cộng" if op == "add" else "Trừ"
            
            steps.append(f"Thực hiện phép tính {op_name} hai ma trận cùng kích thước {m}x{n} từng vị trí:")
            steps.append(f"$$A {sign} B = {format_matrix_latex(A)} {sign} {format_matrix_latex(B)}$$")
            
            # Khai triển từng phần tử
            expr_lines = []
            res_matrix = np.zeros((m, n))
            for i in range(m):
                row_exprs = []
                for j in range(n):
                    a_val = A[i, j]
                    b_val = B[i, j]
                    c_val = (a_val + b_val) if op == "add" else (a_val - b_val)
                    res_matrix[i, j] = c_val
                    row_exprs.append(f"{format_number_pretty(a_val)} {sign} ({format_number_pretty(b_val)})".replace("(0)", "0").replace("- -", "+ "))
                expr_lines.append(" & ".join(row_exprs))
                
            steps.append("$$A " + sign + " B = \\begin{bmatrix} " + " \\\\ ".join(expr_lines) + " \\end{bmatrix}$$")
            steps.append(f"$$A {sign} B = {format_matrix_latex(res_matrix)}$$")
            
            return jsonify({"status": "success", "result": res_matrix.tolist(), "result_latex": format_matrix_latex(res_matrix), "steps": steps})
            
        elif op == "multiply":
            if A.shape[1] != B.shape[0]:
                return jsonify({"status": "error", "message": f"Số cột của ma trận A ({A.shape[1]}) phải bằng số hàng của ma trận B ({B.shape[0]}) để nhân hai ma trận."}), 400
                
            m, p = A.shape
            _, q = B.shape
            
            steps.append(f"Nhân hai ma trận kích thước {m}x{p} và {p}x{q} tạo thành ma trận kích thước {m}x{q}:")
            steps.append(f"$$A \\cdot B = {format_matrix_latex(A)} \\cdot {format_matrix_latex(B)}$$")
            
            res_matrix = np.zeros((m, q))
            steps.append("Tính giá trị các phần tử $C_{ij}$ bằng tích vô hướng hàng $i$ của A và cột $j$ của B:")
            
            for i in range(m):
                for j in range(q):
                    terms = []
                    dot_sum = 0.0
                    for k in range(p):
                        a_val = A[i, k]
                        b_val = B[k, j]
                        dot_sum += a_val * b_val
                        terms.append(f"{format_number_pretty(a_val)} \\cdot {format_number_pretty(b_val)}")
                    res_matrix[i, j] = dot_sum
                    terms_str = ' + '.join(terms)
                    steps.append(f"$$C_{{{i+1},{j+1}}} = {terms_str} = {format_number_pretty(dot_sum)}$$".replace("+ -", "- "))
                    
            steps.append(f"Kết quả cuối cùng:")
            steps.append(f"$$A \\cdot B = {format_matrix_latex(res_matrix)}$$")
            
            return jsonify({"status": "success", "result": res_matrix.tolist(), "result_latex": format_matrix_latex(res_matrix), "steps": steps})
            
        else:
            return jsonify({"status": "error", "message": "Phép toán không được hỗ trợ."}), 400
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
