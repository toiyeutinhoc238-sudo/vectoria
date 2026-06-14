# backend_v2/vectoria_api/routes/__init__.py
from flask import Flask

from vectoria_api.routes.health import bp as health_bp
from vectoria_api.routes.vector_ops import bp as vector_ops_bp
from vectoria_api.routes.linear_algebra import bp as linear_algebra_bp


def register_blueprints(app: Flask):
    app.register_blueprint(health_bp)
    app.register_blueprint(vector_ops_bp)
    app.register_blueprint(linear_algebra_bp)
