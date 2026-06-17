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

        steps = []
        det = 0.0

        if n == 1:
            det = A[0,0]
            steps.append("Định thức của ma trận cấp 1 bằng chính phần tử duy nhất của nó:")
            steps.append(f"$$\\det(A) = {format_number_pretty(det)}$$")
            
        elif n == 2:
            det = A[0,0]*A[1,1] - A[0,1]*A[1,0]
            steps.append("Áp dụng công thức cho ma trận cấp 2: $\\det(A) = ad - bc$:")
            steps.append(f"$$\\det(A) = {format_number_pretty(A[0,0])} \\cdot {format_number_pretty(A[1,1])} - {format_number_pretty(A[0,1])} \\cdot {format_number_pretty(A[1,0])}$$")
            steps.append(f"$$\\det(A) = {format_number_pretty(A[0,0]*A[1,1])} - {format_number_pretty(A[0,1]*A[1,0])} = {format_number_pretty(det)}$$")
            
        elif n == 3:
            # Khai triển dòng 1
            a00, a01, a02 = A[0,0], A[0,1], A[0,2]
            m00 = A[1:3, 1:3]
            m01 = A[1:3, [0,2]]
            m02 = A[1:3, 0:2]
            
            det_m00 = m00[0,0]*m00[1,1] - m00[0,1]*m00[1,0]
            det_m01 = m01[0,0]*m01[1,1] - m01[0,1]*m01[1,0]
            det_m02 = m02[0,0]*m02[1,1] - m02[0,1]*m02[1,0]
            
            det = a00 * det_m00 - a01 * det_m01 + a02 * det_m02
            
            steps.append("Khai triển định thức theo hàng 1:")
            steps.append(f"$$\\det(A) = {format_number_pretty(a00)} \\cdot \\begin{{vmatrix}} {format_number_pretty(m00[0,0])} & {format_number_pretty(m00[0,1])} \\\\ {format_number_pretty(m00[1,0])} & {format_number_pretty(m00[1,1])} \\end{{vmatrix}} - {format_number_pretty(a01)} \\cdot \\begin{{vmatrix}} {format_number_pretty(m01[0,0])} & {format_number_pretty(m01[0,1])} \\\\ {format_number_pretty(m01[1,0])} & {format_number_pretty(m01[1,1])} \\end{{vmatrix}} + {format_number_pretty(a02)} \\cdot \\begin{{vmatrix}} {format_number_pretty(m02[0,0])} & {format_number_pretty(m02[0,1])} \\\\ {format_number_pretty(m02[1,0])} & {format_number_pretty(m02[1,1])} \\end{{vmatrix}}$$")
            steps.append("Tính giá trị các định thức con 2x2:")
            steps.append(f"$$\\det(M_{{11}}) = {format_number_pretty(m00[0,0])} \\cdot {format_number_pretty(m00[1,1])} - {format_number_pretty(m00[0,1])} \\cdot {format_number_pretty(m00[1,0])} = {format_number_pretty(det_m00)}$$")
            steps.append(f"$$\\det(M_{{12}}) = {format_number_pretty(m01[0,0])} \\cdot {format_number_pretty(m01[1,1])} - {format_number_pretty(m01[0,1])} \\cdot {format_number_pretty(m01[1,0])} = {format_number_pretty(det_m01)}$$")
            steps.append(f"$$\\det(M_{{13}}) = {format_number_pretty(m02[0,0])} \\cdot {format_number_pretty(m02[1,1])} - {format_number_pretty(m02[0,1])} \\cdot {format_number_pretty(m02[1,0])} = {format_number_pretty(det_m02)}$$")
            steps.append("Thế kết quả vào biểu thức khai triển ban đầu:")
            steps.append(f"$$\\det(A) = {format_number_pretty(a00)} \\cdot ({format_number_pretty(det_m00)}) - {format_number_pretty(a01)} \\cdot ({format_number_pretty(det_m01)}) + {format_number_pretty(a02)} \\cdot ({format_number_pretty(det_m02)})$$")
            steps.append(f"$$\\det(A) = {format_number_pretty(det)}$$")
            
        else:
            # Đối với 4x4 hoặc 5x5, dùng phép biến đổi dòng đưa về ma trận tam giác
            steps.append(f"Đưa ma trận ban đầu về dạng tam giác trên bằng biến đổi sơ cấp dòng:")
            steps.append(f"$$A = {format_matrix_latex(A)}$$")
            
            U = A.copy()
            det_sign = 1.0
            for i in range(n):
                # Chọn pivot
                if abs(U[i, i]) < 1e-10:
                    # Tìm dòng dưới để hoán vị
                    swap_row = -1
                    for r in range(i+1, n):
                        if abs(U[r, i]) > 1e-10:
                            swap_row = r
                            break
                    if swap_row == -1:
                        det = 0.0
                        steps.append(f"Cột {i+1} không có pivot khác 0 ở các dòng dưới. Ma trận suy biến.")
                        steps.append(f"$$\\det(A) = 0$$")
                        return jsonify({"status": "success", "result": "0", "steps": steps})
                    
                    # Hoán vị dòng
                    U[[i, swap_row]] = U[[swap_row, i]]
                    det_sign *= -1
                    steps.append(f"Hoán vị dòng ${i+1} \\leftrightarrow {swap_row+1}$ (định thức đổi dấu, nhân thêm $-1$):")
                    steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
                
                # Khử các phần tử cột dưới pivot
                for r in range(i+1, n):
                    if abs(U[r, i]) > 1e-10:
                        factor = U[r, i] / U[i, i]
                        U[r] = U[r] - factor * U[i]
                        steps.append(f"Biến đổi dòng: $R_{{{r+1}}} \\rightarrow R_{{{r+1}}} - ({format_number_pretty(factor)}) \\cdot R_{{{i+1}}}$:")
                        steps.append(f"$$A \\sim {format_matrix_latex(U)}$$")
            
            # Tính tích đường chéo
            diag_prod = 1.0
            diag_terms = []
            for i in range(n):
                diag_prod *= U[i, i]
                diag_terms.append(format_number_pretty(U[i, i]))
                
            det = det_sign * diag_prod
            steps.append("Ma trận đã ở dạng tam giác trên. Định thức bằng tích các phần tử chéo nhân với dấu hoán vị:")
            sign_str = "-" if det_sign < 0 else ""
            steps.append(f"$$\\det(A) = {sign_str} ({' \\cdot '.join(diag_terms)}) = {format_number_pretty(det)}$$")

        return jsonify({"status": "success", "result": format_number_pretty(det), "steps": steps})
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

        # Tính định thức trước để check khả nghịch
        det = np.linalg.det(A)
        if abs(det) < 1e-10:
            return jsonify({"status": "error", "message": f"Ma trận không khả nghịch do định thức bằng 0 (det = {format_number_pretty(det)})."}), 400

        steps = []
        
        if n == 1:
            inv_val = 1.0 / A[0,0]
            steps.append("Ma trận nghịch đảo của ma trận vuông cấp 1 $[a]$ chính là $[\\frac{1}{a}]$:")
            steps.append(f"$$A^{{-1}} = \\begin{{bmatrix}} {format_number_pretty(inv_val)} \\end{{bmatrix}}$$")
            return jsonify({"status": "success", "result": [[inv_val]], "result_latex": f"\\begin{{bmatrix}} {format_number_pretty(inv_val)} \\end{{bmatrix}}", "steps": steps})
            
        elif n == 2:
            steps.append("Áp dụng công thức nghịch đảo ma trận 2x2: $A^{-1} = \\frac{1}{ad-bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$:")
            det_val = A[0,0]*A[1,1] - A[0,1]*A[1,0]
            steps.append(f"$$\\det(A) = {format_number_pretty(A[0,0])} \\cdot {format_number_pretty(A[1,1])} - {format_number_pretty(A[0,1])} \\cdot {format_number_pretty(A[1,0])} = {format_number_pretty(det_val)}$$")
            
            adj = np.array([[A[1,1], -A[0,1]], [-A[1,0], A[0,0]]])
            steps.append(f"Ma trận phụ hợp (Adjugate): $Adj(A) = {format_matrix_latex(adj)}$")
            
            inv = adj / det_val
            steps.append(f"$$A^{{-1}} = \\frac{{1}}{{{format_number_pretty(det_val)}}} \\cdot {format_matrix_latex(adj)} = {format_matrix_latex(inv)}$$")
            return jsonify({"status": "success", "result": inv.tolist(), "result_latex": format_matrix_latex(inv), "steps": steps})
            
        else:
            # Gauss-Jordan trên ma trận bổ sung [A | I]
            steps.append("Sử dụng phương pháp khử Gauss-Jordan trên ma trận bổ sung $[A | I]$:")
            I = np.eye(n)
            Aug = np.hstack((A, I))
            
            steps.append(f"$$[A|I] = {format_augmented_matrix_latex(Aug, n)}$$")
            
            for i in range(n):
                # Pivot
                if abs(Aug[i, i]) < 1e-10:
                    # Tìm dòng dưới để hoán vị
                    swap_row = -1
                    for r in range(i+1, n):
                        if abs(Aug[r, i]) > 1e-10:
                            swap_row = r
                            break
                    if swap_row == -1:
                        return jsonify({"status": "error", "message": "Ma trận suy biến, không thể tìm thấy phần tử xoay (pivot) khác 0."}), 400
                    Aug[[i, swap_row]] = Aug[[swap_row, i]]
                    steps.append(f"Hoán vị dòng $R_{{{i+1}}} \\leftrightarrow R_{{{swap_row+1}}}$:")
                    steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
                
                # Chia dòng i cho pivot để đưa pivot về 1
                pivot = Aug[i, i]
                if abs(pivot - 1.0) > 1e-10:
                    Aug[i] = Aug[i] / pivot
                    steps.append(f"Chia dòng $R_{{{i+1}}}$ cho pivot ${format_number_pretty(pivot)}$ để đưa về cột đơn vị ($R_{{{i+1}}} \\rightarrow R_{{{i+1}}} / {format_number_pretty(pivot)}$):")
                    steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
                
                # Khử tất cả các dòng khác (cả trên và dưới) ở cột i
                for r in range(n):
                    if r != i and abs(Aug[r, i]) > 1e-10:
                        factor = Aug[r, i]
                        Aug[r] = Aug[r] - factor * Aug[i]
                        steps.append(f"Khử phần tử cột {i+1} ở dòng {r+1}: $R_{{{r+1}}} \\rightarrow R_{{{r+1}}} - ({format_number_pretty(factor)}) \\cdot R_{{{i+1}}}$:")
                        steps.append(f"$$[A|I] \\sim {format_augmented_matrix_latex(Aug, n)}$$")
            
            inv = Aug[:, n:]
            steps.append("Sau khi đưa vế trái về ma trận đơn vị $I$, vế phải chính là ma trận nghịch đảo $A^{-1}$:")
            steps.append(f"$$A^{{-1}} = {format_matrix_latex(inv)}$$")
            return jsonify({"status": "success", "result": inv.tolist(), "result_latex": format_matrix_latex(inv), "steps": steps})
            
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
                    steps.append(f"$$C_{{{i+1},{j+1}}} = {' + '.join(terms)} = {format_number_pretty(dot_sum)}$$".replace("+ -", "- "))
                    
            steps.append(f"Kết quả cuối cùng:")
            steps.append(f"$$A \\cdot B = {format_matrix_latex(res_matrix)}$$")
            
            return jsonify({"status": "success", "result": res_matrix.tolist(), "result_latex": format_matrix_latex(res_matrix), "steps": steps})
            
        else:
            return jsonify({"status": "error", "message": "Phép toán không được hỗ trợ."}), 400
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
