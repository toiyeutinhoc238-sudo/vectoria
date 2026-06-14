# backend_v2/vectoria_api/explainers/models.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional, List


@dataclass
class Step:
    kind: str
    text: str
    matrix: Optional[List[List[float]]] = None
    row_op: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"kind": self.kind, "text": self.text}
        if self.matrix is not None:
            d["matrix"] = self.matrix
        if self.row_op is not None:
            d["row_op"] = self.row_op
        if self.meta is not None:
            d["meta"] = self.meta
        return d
