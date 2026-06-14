# backend_v2/vectoria_api/routes/vector_ops.py
from flask import Blueprint, jsonify
import numpy as np

from vectoria_api.core.validate import require_json, validate_vector, ensure_same_dim

bp = Blueprint("vector_ops", __name__)


@bp.post("/api/add_vectors")
def add_vectors():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        return jsonify({"result": (v1 + v2).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/sub_vectors")
def sub_vectors():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        return jsonify({"result": (v1 - v2).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/scale_vector")
def scale_vector():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        k = float(data.get("scalar", 0.0))
        return jsonify({"result": (v * k).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/dot_product")
def dot_product():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)
        return jsonify({"result": float(np.dot(v1, v2))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/cross_product")
def cross_product():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))

        a = v1 if len(v1) == 3 else np.array([v1[0], v1[1], 0.0])
        b = v2 if len(v2) == 3 else np.array([v2[0], v2[1], 0.0])

        return jsonify({"result": np.cross(a, b).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/vector_norm")
def vector_norm():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        return jsonify({"result": float(np.linalg.norm(v))})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/projection")
def projection():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        u = validate_vector(data.get("u", []))
        ensure_same_dim(v, u)

        den = float(np.dot(u, u))
        if abs(den) <= 1e-12:
            return jsonify({"error": "Vector u không thể bằng 0"}), 400

        proj = (float(np.dot(v, u)) / den) * u
        return jsonify({"result": proj.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/angle_between")
def angle_between():
    try:
        data = require_json()
        v1 = validate_vector(data.get("v1", []))
        v2 = validate_vector(data.get("v2", []))
        ensure_same_dim(v1, v2)

        den = float(np.linalg.norm(v1) * np.linalg.norm(v2))
        if abs(den) <= 1e-12:
            return jsonify({"error": "Vector không được bằng 0"}), 400

        cos_theta = float(np.dot(v1, v2) / den)
        angle = float(np.arccos(np.clip(cos_theta, -1.0, 1.0)))
        return jsonify({"result": angle})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/normalize")
def normalize():
    try:
        data = require_json()
        v = validate_vector(data.get("v", []))
        n = float(np.linalg.norm(v))
        if n <= 1e-12:
            return jsonify({"result": [0.0] * len(v)})
        return jsonify({"result": (v / n).tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
