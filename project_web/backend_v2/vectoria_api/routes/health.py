# backend_v2/vectoria_api/routes/health.py
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.get("/")
def home():
    return jsonify({"status": "ok"})


@bp.get("/api/health")
def health():
    return jsonify({"ok": True})
