import sqlite3
import os
import requests
import threading
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
import base64
import psycopg2


contact_bp = Blueprint("contact", __name__)

# --- CẤU HÌNH ---
# Link Google Script của bạn
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEDUGk1_-QxGbZXzEv-k5oVE6XIQWeCBWzZp83g7bfBbGIGwxOANLYrxm-8bSV9-6Bhg/exec"





DB_URL = "postgresql://neondb_owner:npg_RnDGSQ9kuUp6@ep-icy-scene-anyf8auc.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

# 2. HÀM KHỞI TẠO BẢNG (Chạy 1 lần để tạo cấu trúc)
def init_postgres_db():
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()
        print(">> [Database] Bảng PostgreSQL đã sẵn sàng.")
    except Exception as e:
        print(f">> [Database Error] {e}")

# 3. HÀM LƯU TIN NHẮN VÀO DB
def save_to_postgres(name, email, message):
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        # Dùng %s để chống SQL Injection (Hacker chèn mã độc)
        c.execute(
            "INSERT INTO feedbacks (name, email, message) VALUES (%s, %s, %s)",
            (name, email, message)
        )
        conn.commit()
        conn.close()
        print(">> [PostgreSQL] Đã lưu Data thành công!")
    except Exception as e:
        print(f">> [PostgreSQL Error] Lỗi lưu Data: {e}")

init_postgres_db()

# --- HÀM 1: GỬI MAIL AUTO-REPLY CHO KHÁCH ---
def send_auto_reply(user_email, user_name, user_message):
    try:
        api_key = os.getenv("RESEND_API_KEY")
        html_content = f"""
        <div style="background-color: #f8fafc; 
                    background-image: linear-gradient(rgba(58, 120, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(58, 120, 255, 0.05) 1px, transparent 1px); 
                    background-size: 20px 20px; 
                    padding: 50px 20px; 
                    font-family: 'Inter', Arial, sans-serif; 
                    color: #1e293b;">
            
            <div style="max-width: 500px; 
                        margin: 0 auto; 
                        background-color: #ffffff; 
                        border-radius: 16px; 
                        overflow: hidden; 
                        box-shadow: 0 10px 40px -10px rgba(58, 120, 255, 0.15); 
                        border: 1px solid #e2e8f0;">
                
                <div style="height: 6px; background: linear-gradient(90deg, #3a78ff, #60a5fa);"></div>
                
                <div style="padding: 35px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h2 style="color: #3a78ff; margin: 0; font-size: 22px; font-weight: 700;">Vectoria Support</h2>
                    </div>

                    <p style="font-size: 15px; margin-bottom: 10px;">Xin chào <strong>{user_name}</strong>,</p>
                    <p style="font-size: 15px; line-height: 1.5;">Cảm ơn bạn đã liên hệ với chúng tôi. Hệ thống đã ghi nhận tin nhắn của bạn thành công.</p>
                    
                    <p style="font-size: 14px; font-weight: 600; margin-top: 25px; margin-bottom: 8px;">Nội dung bạn gửi:</p>
                    
                    <div style="background-color: #f8fafc; 
                                border-left: 4px solid #3a78ff; 
                                padding: 15px; 
                                border-radius: 0 8px 8px 0; 
                                font-size: 14px; 
                                color: #64748b; 
                                font-style: italic;">
                        "{user_message}"
                    </div>

                    <p style="font-size: 15px; margin-top: 25px;">Đội ngũ hỗ trợ sẽ xem xét và phản hồi trong thời gian sớm nhất.</p>

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
                        Trân trọng,<br>
                        <strong>Đội ngũ Vectoria</strong>
                    </p>
                </div>
            </div>
        </div>
        """
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": "Vectoria Support <support@vectoria.io.vn>",
            "to": [user_email],
            "subject": "Cảm ơn bạn đã liên hệ với Vectoria!",
            "html": html_content,
        }
        response = requests.post("https://api.resend.com/emails", headers=headers, json=payload)
        print(f">> [Mail API - User] Trạng thái: {response.status_code}")

    except Exception as e:
        print(f">> [Mail API - User Error] {e}")


# --- HÀM 2: GỬI MAIL THÔNG BÁO VỀ CHO ADMIN (LARK MAIL) ĐÃ LÀM ĐẸP ---
def send_notification_to_admin(user_email, user_name, user_message):
    try:
        api_key = os.getenv("RESEND_API_KEY")
        admin_email = "support@vectoria.io.vn" 
        
        # Lấy giờ máy chủ (UTC) cộng thêm 7 tiếng để ra giờ Việt Nam
        vn_time = datetime.now(timezone.utc) + timedelta(hours=7)
        current_time = vn_time.strftime("%d/%m/%Y %H:%M:%S")

        # HTML tối giản, rành mạch, không màu mè
        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
            <p><strong>Người gửi:</strong> {user_name} &lt;{user_email}&gt;</p>
            <p><strong>Thời gian:</strong> {current_time}</p>
            <p><strong>Nội dung:</strong></p>
            <div style="background-color: #f9f9f9; border-left: 3px solid #ccc; padding: 10px 15px; white-space: pre-wrap;">{user_message}</div>
        </div>
        """
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": "Vectoria System <system@vectoria.io.vn>", 
            "to": [admin_email],
            "reply_to": user_email, 
            "subject": f"[Hỗ trợ mới] Tin nhắn từ {user_name}",
            "html": html_content,
        }
        
        response = requests.post("https://api.resend.com/emails", headers=headers, json=payload)
        print(f">> [Mail API - Admin] Trạng thái: {response.status_code}")

    except Exception as e:
        print(f">> [Mail API - Admin Error] {e}")


# --- HÀM GỬI SANG GOOGLE (QUAN TRỌNG) ---
def send_to_google_direct(payload):
    try:
        print(f">> [Google] Đang gửi dữ liệu...")
        response = requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=10)
        print(f">> [Google] Kết quả: {response.text}")
    except Exception as e:
        print(f">> [Google Error] {e}")


# --- 3. API CHÍNH ---
@contact_bp.route("/api/contact", methods=["POST"])
def handle_contact():
    try:
        # A. Lấy dữ liệu
        user_name = request.form.get("user_name", "Ẩn danh")
        user_email = request.form.get("user_email", "")
        message = request.form.get("message", "")
        uploaded_file = request.files.get("attachment")

        file_payload = None
        file_name_str = ""

        # B. Xử lý File
        if uploaded_file:
            try:
                file_name_str = uploaded_file.filename
                file_content = uploaded_file.read()
                file_b64 = base64.b64encode(file_content).decode("utf-8")
                file_payload = {
                    "name": file_name_str,
                    "mimeType": uploaded_file.content_type,
                    "data": file_b64,
                }
            except Exception as e:
                print(f">> [File Error] {e}")

        full_msg = str(message) + (f"\n[📎 {file_name_str}]" if file_name_str else "")

        # C. Chuẩn bị gói tin gửi Google
        google_json = {
            "name": user_name,
            "email": user_email,
            "message": full_msg,
            "file": file_payload,
            "send_email": False,  
        }

        # D. Gửi sang Google
        send_to_google_direct(google_json)

        # E. XỬ LÝ GỬI 2 EMAIL ĐỒNG THỜI (BẰNG THREADING CHO NHANH)
        if user_email and "@" in user_email:
            # Bắn mail cho Khách
            threading.Thread(
                target=send_auto_reply, args=(user_email, user_name, message)
            ).start()
            
            # Bắn mail về cho Admin (Lark)
            threading.Thread(
                target=send_notification_to_admin, args=(user_email, user_name, full_msg)
            ).start()

            # LƯU VÀO DATABASE POSTGRESQL (LUỒNG MỚI)
            threading.Thread(target=save_to_postgres, args=(user_name, user_email, full_msg)).start()

        return jsonify({"status": "success", "message": "Đã gửi thành công"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500