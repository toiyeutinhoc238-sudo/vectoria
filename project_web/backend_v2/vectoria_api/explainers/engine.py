# backend_v2/vectoria_api/explainers/engine.py
from __future__ import annotations
from typing import Any, Dict

from vectoria_api.explainers.registry import get


def explain(key: str, **kwargs) -> Dict[str, Any]:
    """
    key: tên bài toán + phương pháp, ví dụ: 'basis.gauss_rows'
    kwargs: dữ liệu đầu vào cho strategy
    """
    strategy_fn = get(key)  # sẽ raise KeyError nếu chưa register
    payload = strategy_fn(**kwargs)  # strategy phải trả dict payload chuẩn
    return payload
