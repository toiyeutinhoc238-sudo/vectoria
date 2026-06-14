# backend_v2/vectoria_api/core/validate.py
from __future__ import annotations
from typing import Any, Dict, List, Tuple
import numpy as np
from flask import request


def require_json() -> Dict[str, Any]:
    return request.get_json(silent=True) or {}


def validate_vector(
    x: Any, *, allow_2d_3d: bool = False
) -> np.ndarray:  # Sửa True thành False
    if not isinstance(x, list):
        raise ValueError("Vector phải là list.")

    # --- ĐOẠN ĐÃ SỬA ---
    # Bỏ kiểm tra (2, 3) để cho phép n chiều
    if len(x) == 0:
        raise ValueError("Vector không được rỗng.")
    # -------------------

    try:
        return np.array([float(v) for v in x], dtype=float)
    except Exception:
        raise ValueError("Vector chứa phần tử không phải số.")


def validate_vectors_2d_list(vecs: Any) -> np.ndarray:
    """
    vecs: list[list[float]] -> np.ndarray shape (m, dim)
    """
    if not isinstance(vecs, list) or len(vecs) == 0:
        raise ValueError("vectors phải là list 2D không rỗng.")
    mat = np.array(vecs, dtype=float)
    if mat.ndim != 2:
        raise ValueError("vectors phải là list 2D.")
    return mat


def ensure_same_dim(a: np.ndarray, b: np.ndarray):
    if a.shape[0] != b.shape[0]:
        raise ValueError("Hai vector phải cùng chiều.")
