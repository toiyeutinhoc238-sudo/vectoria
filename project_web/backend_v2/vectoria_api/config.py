import os

HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# Đọc danh sách ALLOWED_ORIGINS từ biến môi trường trên Render
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")

if raw_origins:
    # Chuyển chuỗi "url1,url2" thành một tập hợp (set) và xóa khoảng trắng thừa
    ALLOWED_ORIGINS = {
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    }
else:
    # Danh sách dự phòng khi chạy ở máy nhà (Localhost)
    ALLOWED_ORIGINS = {
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }
