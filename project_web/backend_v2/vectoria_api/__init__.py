# backend_v2/vectoria_api/__init__.py
from __future__ import annotations
from flask import Flask

from vectoria_api.middleware.cors import attach_cors_middleware
from vectoria_api.routes import register_blueprints
from vectoria_api.explainers import init_explainers


def create_app() -> Flask:
    app = Flask(__name__)

    # 1) CORS
    attach_cors_middleware(app)

    # 2) Nạp explainer strategies (để registry có "basis.gauss_rows", ...)
    init_explainers()

    # 3) Routes / blueprints
    register_blueprints(app)

    return app
