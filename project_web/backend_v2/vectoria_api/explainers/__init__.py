# backend_v2/vectoria_api/explainers/__init__.py
from __future__ import annotations

# Import strategies để chúng tự register vào registry.
# Lưu ý: chỉ cần import, không cần dùng biến.
def init_explainers() -> None:
    # Thêm strategy nào thì import ở đây
    from vectoria_api.explainers.strategies import basis_gauss_rows  # noqa: F401
