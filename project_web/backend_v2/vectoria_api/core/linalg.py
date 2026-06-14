# backend_v2/vectoria_api/core/linalg.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple, Optional
import numpy as np

from vectoria_api.core.format import vector_pretty_score


@dataclass
class RowOp:
    op: str  # "swap" | "elim"
    # positions in CURRENT matrix (0-based)
    i: int
    j: Optional[int] = None
    factor: Optional[float] = None  # for elim: Ri <- Ri - factor*Rr
    pivot_row: Optional[int] = None  # r position used as pivot
    pivot_col: Optional[int] = None  # c
    # original vector indices currently at rows i/j (for explain)
    orig_i: Optional[int] = None
    orig_j: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "op": self.op,
            "i": self.i,
        }
        if self.j is not None:
            d["j"] = self.j
        if self.factor is not None:
            d["factor"] = float(self.factor)
        if self.pivot_row is not None:
            d["pivot_row"] = int(self.pivot_row)
        if self.pivot_col is not None:
            d["pivot_col"] = int(self.pivot_col)
        if self.orig_i is not None:
            d["orig_i"] = int(self.orig_i)
        if self.orig_j is not None:
            d["orig_j"] = int(self.orig_j)
        return d


def gaussian_elimination_rows_with_ops(
    M: List[List[float]] | np.ndarray,
    tol: float = 1e-10,
    pivot_strategy: str = "min_norm",
    snapshot_every_step: bool = True,
) -> Tuple[int, List[int], np.ndarray, List[Dict[str, Any]], List[int]]:
    """
    Gauss theo HÀNG, mỗi hàng là 1 vector.

    Trả về:
      rank: số vector độc lập
      pivot_indices: index vector GỐC được chọn làm pivot (0-based)
      E: ma trận dạng bậc thang (row echelon)
      ops: list các bước (row_op) + (option) snapshot matrix_after
      row_ids: mapping vị trí hàng hiện tại -> index vector gốc

    pivot_strategy:
      - "min_norm": ưu tiên vector tối giản (norm nhỏ)
      - "max_abs":  partial pivot theo |A[i,c]| lớn nhất (ổn định số)
      - "pretty":   ưu tiên vector "đẹp/dễ đọc" (sparsity + gần nguyên/phân số/căn) rồi mới tie-break theo |A[i,c]|
    """
    A = np.array(M, dtype=float).copy()
    if A.ndim != 2:
        raise ValueError("M phải là ma trận 2D (m x dim), mỗi hàng là 1 vector.")

    m, n = A.shape
    row_ids = list(range(m))  # row_ids[pos] = index vector gốc đang nằm ở pos
    ops: List[Dict[str, Any]] = []

    def row_norm(pos: int) -> float:
        return float(np.linalg.norm(A[pos, :], ord=2))

    pivot_indices: List[int] = []
    r = 0  # pivot row position (in current matrix)

    for c in range(n):
        if r >= m:
            break

        # tìm ứng viên có A[i,c] != 0 từ r..m-1
        candidates = [i for i in range(r, m) if abs(A[i, c]) > tol]
        if not candidates:
            continue

        if pivot_strategy == "max_abs":
            pivot_pos = max(candidates, key=lambda i: abs(A[i, c]))

        elif pivot_strategy == "pretty":
            # ưu tiên vector đẹp, tie-break: |A[i,c]| lớn hơn để pivot không quá yếu
            pivot_pos = min(
                candidates, key=lambda i: (vector_pretty_score(A[i, :]), -abs(A[i, c]))
            )

        else:
            # min_norm: ưu tiên hàng có norm nhỏ, tie-break bằng |A[i,c]| lớn hơn
            pivot_pos = min(candidates, key=lambda i: (row_norm(i), -abs(A[i, c])))

        # swap pivot lên hàng r nếu cần
        if pivot_pos != r:
            op = RowOp(
                op="swap",
                i=r,
                j=pivot_pos,
                orig_i=row_ids[r],
                orig_j=row_ids[pivot_pos],
                pivot_row=r,
                pivot_col=c,
            )
            A[[r, pivot_pos], :] = A[[pivot_pos, r], :]
            row_ids[r], row_ids[pivot_pos] = row_ids[pivot_pos], row_ids[r]

            d = op.to_dict()
            if snapshot_every_step:
                d["matrix_after"] = A.tolist()
            ops.append(d)

        # hàng r hiện tại tương ứng vector gốc row_ids[r]
        pivot_indices.append(row_ids[r])

        # khử các hàng dưới
        pivot_val = A[r, c]
        for i in range(r + 1, m):
            if abs(A[i, c]) <= tol:
                continue
            factor = A[i, c] / pivot_val
            # Ri <- Ri - factor*Rr
            A[i, :] -= factor * A[r, :]

            op = RowOp(
                op="elim",
                i=i,
                j=r,  # dùng row r làm nguồn
                factor=float(factor),
                pivot_row=r,
                pivot_col=c,
                orig_i=row_ids[i],
                orig_j=row_ids[r],
            )
            d = op.to_dict()
            if snapshot_every_step:
                d["matrix_after"] = A.tolist()
            ops.append(d)

        r += 1

    rank = len(pivot_indices)
    return rank, pivot_indices, A, ops, row_ids
