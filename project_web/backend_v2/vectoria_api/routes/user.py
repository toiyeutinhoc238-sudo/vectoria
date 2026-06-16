# backend_v2/vectoria_api/routes/user.py
from flask import Blueprint, request, jsonify
import psycopg2
import json
from werkzeug.security import generate_password_hash, check_password_hash

user_bp = Blueprint("user", __name__)

# Lấy lại cái link DB Neon của sếp
DB_URL = "postgresql://neondb_owner:npg_RnDGSQ9kuUp6@ep-icy-scene-anyf8auc.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"


# --- 1. TẠO BẢNG DATABASE CHO USER ---
def init_user_db():
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Bảng Users (Khách hàng)
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Bảng Lịch sử tính toán (Lưu ma trận/vector)
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS calc_history (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255),
                math_type VARCHAR(100),   -- Ví dụ: "Tìm cơ sở", "Hệ phương trình"
                matrix_data TEXT,         -- Lưu chuỗi JSON của ma trận
                status VARCHAR(50) DEFAULT 'saved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Bảng Lịch sử chat với AI Chatbot
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id SERIAL PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                sender VARCHAR(50) NOT NULL,       -- 'user' hoặc 'model'
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )
        conn.commit()
        conn.close()
        print(">> [Database] Bảng Users, History & Chat đã sẵn sàng.")
    except Exception as e:
        print(f">> [Database Error - User DB] {e}")


# Chạy tạo bảng khi khởi động
init_user_db()


# --- 2. CÁC API DÀNH CHO USER DASHBOARD ---


@user_bp.route("/api/save_history", methods=["POST"])
def save_history():
    """API để frontend bắn dữ liệu ma trận đang tính dở vào đây lưu lại"""
    try:
        data = request.get_json()
        email = data.get(
            "email", "guest@vectoria.io.vn"
        )  # Tạm thời cho xài guest nếu chưa login
        math_type = data.get("math_type", "Chưa phân loại")
        matrix_data = json.dumps(
            data.get("matrix_data", [])
        )  # Ép mảng JS thành chuỗi Text để lưu

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute(
            "INSERT INTO calc_history (user_email, math_type, matrix_data) VALUES (%s, %s, %s)",
            (email, math_type, matrix_data),
        )
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "message": "Đã lưu phiên làm việc"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_bp.route("/api/get_history", methods=["GET"])
def get_history():
    """API để User Dashboard kéo dữ liệu lịch sử về hiển thị"""
    email = request.args.get("email", "guest@vectoria.io.vn")
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute(
            "SELECT id, math_type, matrix_data, created_at FROM calc_history WHERE user_email = %s ORDER BY created_at DESC",
            (email,),
        )
        rows = c.fetchall()
        conn.close()

        # Đóng gói dữ liệu gửi về Frontend
        history_list = []
        for row in rows:
            history_list.append(
                {
                    "id": row[0],
                    "math_type": row[1],
                    "matrix_data": json.loads(
                        row[2]
                    ),  # Xả chuỗi Text ra lại thành Mảng cho JS dễ đọc
                    "created_at": row[3].strftime("%d/%m/%Y %H:%M"),
                }
            )

        return jsonify({"status": "success", "data": history_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# 3. API ĐĂNG KÝ (Nhận Tên đăng nhập, Email, Mật khẩu)
# ==========================================
@user_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return (
            jsonify({"status": "error", "message": "Vui lòng điền đủ thông tin!"}),
            400,
        )

    # Băm nhỏ mật khẩu
    password_hash = generate_password_hash(password)

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Kiểm tra xem Tên đăng nhập (name) hoặc Email đã bị trùng chưa
        c.execute("SELECT id FROM users WHERE name = %s OR email = %s", (name, email))
        if c.fetchone():
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Tên đăng nhập hoặc Email đã tồn tại!",
                    }
                ),
                400,
            )

        # Nếu hợp lệ thì Insert vào DB
        c.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, password_hash),
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Đăng ký thành công!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 4. API ĐĂNG NHẬP (Chỉ nhận Tên đăng nhập và Mật khẩu theo chuẩn sếp yêu cầu)
# ==========================================
@user_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    name = data.get("name")  # Lấy Tên đăng nhập
    password = data.get("password")

    if not name or not password:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Vui lòng nhập Tên đăng nhập và Mật khẩu!",
                }
            ),
            400,
        )

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Tìm user bằng Tên đăng nhập (name)
        c.execute(
            "SELECT id, name, email, password_hash FROM users WHERE name = %s", (name,)
        )
        user = c.fetchone()

        # user[0] = id, user[1] = name, user[2] = email, user[3] = password_hash
        if user and check_password_hash(user[3], password):
            fake_token = f"vec_token_{user[0]}"

            return (
                jsonify(
                    {
                        "status": "success",
                        "token": fake_token,
                        "name": user[1],
                        "email": user[2],
                    }
                ),
                200,
            )
        else:
            return (
                jsonify(
                    {"status": "error", "message": "Sai Tên đăng nhập hoặc Mật khẩu!"}
                ),
                401,
            )
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 5. API ĐĂNG NHẬP BẰNG GOOGLE (SSO)
# ==========================================
@user_bp.route("/api/google_login", methods=["POST"])
def google_login():
    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"status": "error", "message": "Thiếu mã xác thực Google Token!"}), 400

    try:
        # Gọi API Google để verify tokeninfo
        import requests
        response = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
        if response.status_code != 200:
            return jsonify({"status": "error", "message": "Google Token không hợp lệ hoặc đã hết hạn!"}), 400
        
        payload = response.json()
        email = payload.get("email")
        name = payload.get("name")
        sub = payload.get("sub")  # Google User ID duy nhất

        if not email:
            return jsonify({"status": "error", "message": "Không thể lấy email từ tài khoản Google!"}), 400

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Kiểm tra xem email đã tồn tại trong DB chưa
        c.execute("SELECT id, name, email FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user:
            # User đã tồn tại, tiến hành đăng nhập
            user_id, user_name, user_email = user[0], user[1], user[2]
        else:
            # Chưa tồn tại, đăng ký tự động
            # Vì mật khẩu không được trống (NOT NULL), ta tạo mật khẩu băm ngẫu nhiên
            placeholder_hash = generate_password_hash("google_sso_dummy_pwd_" + sub)
            
            # Cố gắng sử dụng name từ Google, nếu trùng name thì thêm sub vào cho unique
            c.execute("SELECT id FROM users WHERE name = %s", (name,))
            if c.fetchone():
                name = f"{name} {sub[:4]}"
            
            c.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email",
                (name, email, placeholder_hash),
            )
            new_user = c.fetchone()
            conn.commit()
            user_id, user_name, user_email = new_user[0], new_user[1], new_user[2]

        fake_token = f"vec_token_{user_id}"
        return jsonify({
            "status": "success",
            "token": fake_token,
            "name": user_name,
            "email": user_email
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi xử lý đăng nhập Google: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 6. API XÓA LỊCH SỬ TÍNH TOÁN
# ==========================================
@user_bp.route("/api/delete_history", methods=["POST"])
def delete_history():
    data = request.get_json()
    item_id = data.get("id")
    email = data.get("email")

    if not item_id or not email:
        return jsonify({"status": "error", "message": "Thiếu thông tin ID hoặc Email!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # Kiểm tra xem bản ghi đó có đúng là của user này không trước khi xóa
        c.execute("SELECT id FROM calc_history WHERE id = %s AND user_email = %s", (item_id, email))
        if not c.fetchone():
            return jsonify({"status": "error", "message": "Không tìm thấy bản ghi hoặc bạn không có quyền xóa!"}), 403

        c.execute("DELETE FROM calc_history WHERE id = %s AND user_email = %s", (item_id, email))
        conn.commit()
        return jsonify({"status": "success", "message": "Đã xóa lịch sử tính toán thành công!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 7. API LƯU TIN NHẮN CHATBOT AI
# ==========================================
@user_bp.route("/api/save_chat_message", methods=["POST"])
def save_chat_message():
    data = request.get_json()
    email = data.get("email")
    sender = data.get("sender")    # 'user' hoặc 'model'
    message = data.get("message")

    if not email or not sender or not message:
        return jsonify({"status": "error", "message": "Thiếu thông tin Email, Người gửi hoặc Tin nhắn!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute(
            "INSERT INTO chat_history (user_email, sender, message) VALUES (%s, %s, %s)",
            (email, sender, message),
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Đã lưu tin nhắn chat thành công!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 8. API LẤY LỊCH SỬ CHATBOT AI
# ==========================================
@user_bp.route("/api/get_chat_history", methods=["GET"])
def get_chat_history():
    email = request.args.get("email")
    if not email:
        return jsonify({"status": "error", "message": "Thiếu thông tin Email!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute(
            "SELECT sender, message, created_at FROM chat_history WHERE user_email = %s ORDER BY created_at ASC",
            (email,),
        )
        rows = c.fetchall()
        
        chat_list = []
        for row in rows:
            chat_list.append({
                "sender": row[0],
                "message": row[1],
                "created_at": row[2].strftime("%d/%m/%Y %H:%M")
            })
            
        return jsonify({"status": "success", "data": chat_list}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 9. API XÓA SẠCH LỊCH SỬ CHATBOT AI
# ==========================================
@user_bp.route("/api/clear_chat_history", methods=["POST"])
def clear_chat_history():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"status": "error", "message": "Thiếu thông tin Email!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute("DELETE FROM chat_history WHERE user_email = %s", (email,))
        conn.commit()
        return jsonify({"status": "success", "message": "Đã xóa sạch lịch sử chat thành công!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi DB: {str(e)}"}), 500
    finally:
        if "conn" in locals():
            conn.close()


# ==========================================
# 10. API PROXY ĐỂ GỌI GEMINI AI BẢO MẬT
# ==========================================
def get_gemini_key():
    import os
    # 1. Lấy từ biến môi trường (Render / Vercel / Local)
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    
    # 2. Lấy từ file cấu hình local (đã cấu hình trong .gitignore để không bị push)
    try:
        possible_paths = ["gemini_key.txt", "../gemini_key.txt", "project_web/backend_v2/gemini_key.txt"]
        for p in possible_paths:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    return f.read().strip()
    except Exception:
        pass
    return None


@user_bp.route("/api/chat_gemini", methods=["POST"])
def chat_gemini():
    try:
        data = request.get_json() or {}
        contents = data.get("contents")
        system_instruction = data.get("systemInstruction")
        
        key = get_gemini_key()
        if not key:
            return jsonify({
                "status": "error", 
                "message": "Chưa cấu hình Gemini API Key trên server. Vui lòng tạo file gemini_key.txt ở thư mục backend hoặc cấu hình biến môi trường GEMINI_API_KEY."
            }), 500
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        
        payload = {
            "contents": contents
        }
        if system_instruction:
            payload["systemInstruction"] = system_instruction
            
        import requests
        headers = {"Content-Type": "application/json"}
        
        # Gọi sang API Google Gemini
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f">> [Gemini Proxy Error] Status: {response.status_code}, Body: {response.text}")
            return jsonify({
                "status": "error",
                "message": f"Google Gemini API trả về lỗi: {response.status_code}",
                "details": response.text
            }), response.status_code
            
        return jsonify({
            "status": "success",
            "data": response.json()
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Lỗi kết nối từ Backend tới Gemini: {str(e)}"
        }), 500


