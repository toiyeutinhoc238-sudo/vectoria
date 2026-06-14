# backend_v2/vectoria_api/explainers/registry.py
from __future__ import annotations
from typing import Callable, Dict, List, Any

# Registry thật sự
_STRATEGIES: Dict[str, Callable[..., Dict[str, Any]]] = {}

# (Optional) alias để debug/inspect
STRATEGY_REGISTRY = _STRATEGIES


def register(name: str, fn: Callable[..., Dict[str, Any]]) -> None:
    _STRATEGIES[name] = fn


def get(name: str) -> Callable[..., Dict[str, Any]]:
    if name not in _STRATEGIES:
        raise KeyError(f"Strategy '{name}' chưa được đăng ký.")
    return _STRATEGIES[name]


def list_strategies() -> List[str]:
    return sorted(_STRATEGIES.keys())
