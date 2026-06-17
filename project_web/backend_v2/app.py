import eventlet
eventlet.monkey_patch()

from flask import Flask, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_socketio import join_room, leave_room

from vectoria_api.routes import register_blueprints
from vectoria_api.config import HOST, PORT, DEBUG
from vectoria_api.explainers import init_explainers

# Import module contact
from vectoria_api.routes.contact import contact_bp

# [BƯỚC 1] IMPORT MODULE USER VÀO ĐÂY
from vectoria_api.routes.user import user_bp
from vectoria_api.routes.matrix import matrix_bp

# Tạo instance global cho SocketIO
socketio = SocketIO()

rooms_state = {}


def create_app():
    print(">> FORCE UPDATE VERCEL V1")
    app = Flask(__name__)

    # Cấu hình CORS
    CORS(app)

    # Nạp explainers
    init_explainers()

    # Đăng ký các routes cũ của sếp
    register_blueprints(app)

    # Đăng ký Route Liên hệ
    app.register_blueprint(contact_bp)

    # [BƯỚC 2 QUAN TRỌNG NHẤT] GẮN API USER VÀO APP
    # Phải có dòng này thì Flask mới nhận diện được đường dẫn /api/get_history
    app.register_blueprint(user_bp)
    
    # Đăng ký Route Tính toán Ma trận mới
    app.register_blueprint(matrix_bp)
    socketio.init_app(app, cors_allowed_origins="*")
    return app


# Tạo instance global
app = create_app()


@socketio.on("join")
def on_join(data):
    room = data["room"]
    name = data.get("name", "Ẩn danh")
    sid = request.sid  # Lấy ID duy nhất của kết nối này

    join_room(room)

    # Nếu phòng chưa tồn tại, người đầu tiên vào sẽ làm Owner (Chủ phòng)
    if room not in rooms_state:
        rooms_state[room] = {"owner": sid, "members": {}}

    # Thêm người này vào danh sách thành viên
    rooms_state[room]["members"][sid] = {"name": name, "muted": False, "blocked": False}

    print(f">> {name} ({sid}) đã chui vào phòng: {room}")
    emit("status", {"msg": f"{name} đã tham gia phòng."}, room=room)

    # [QUAN TRỌNG]: Phát bản đồ quyền lực cho toàn bộ phòng
    emit("permission_update", rooms_state[room], room=room)


@socketio.on("mouse_move")
def handle_mouse_move(data):
    # Lấy mã phòng từ gói tin gửi lên
    room = data.get("room")
    # CHỈ phát lại tọa độ chuột cho những người CÙNG PHÒNG
    emit("mouse_update", data, room=room, include_self=False)


@socketio.on("sync_action")
def handle_sync_action(data):
    room = data.get("room")
    emit("action_update", data, room=room, include_self=False)


# [THÊM MỚI]: Xử lý lệnh từ Chủ phòng (Khóa thao tác, Nhượng quyền)
@socketio.on("admin_control")
def handle_admin(data):
    room = data.get("room")
    if room not in rooms_state:
        return

    # CHỈ XỬ LÝ NẾU NGƯỜI GỬI LỆNH ĐÚNG LÀ CHỦ PHÒNG
    if request.sid == rooms_state[room]["owner"]:
        target_sid = data["target_sid"]
        action = data["action"]  # 'block', 'transfer'

        if action == "transfer":
            rooms_state[room]["owner"] = target_sid
        elif action == "block":
            # data['value'] sẽ là True (Cấm) hoặc False (Mở)
            rooms_state[room]["members"][target_sid]["blocked"] = data["value"]

        # Báo cáo lại cho cả phòng biết sự thay đổi
        emit("permission_update", rooms_state[room], room=room)


# [BỔ SUNG]: DỌN RÁC KHI USER F5 HOẶC TẮT TRÌNH DUYỆT
@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    
    # Quét qua tất cả các phòng xem thanh niên này đang trốn ở đâu
    for room, state in list(rooms_state.items()):
        if sid in state["members"]:
            name = state["members"][sid]["name"]
            
            # 1. Đuổi cổ bóng ma khỏi phòng
            del state["members"][sid]
            print(f">> {name} ({sid}) đã ngắt kết nối / rời phòng {room}")

            # 2. Xử lý hậu quả
            if len(state["members"]) == 0:
                # Nếu phòng trống trơn -> Đập bỏ phòng luôn cho nhẹ RAM
                del rooms_state[room]
                print(f">> Phòng {room} đã giải tán vì không còn ai.")
            else:
                # Nếu người rời đi là CHỦ PHÒNG -> Ép nhượng quyền cho người kế tiếp
                if state["owner"] == sid:
                    new_owner_sid = list(state["members"].keys())[0]
                    state["owner"] = new_owner_sid
                    print(f">> Chủ phòng rớt mạng. Tự động trao quyền cho {state['members'][new_owner_sid]['name']}")
                
                # 3. Báo cáo lại bản đồ quyền lực cho những người còn sống sót trong phòng
                emit("permission_update", rooms_state[room], room=room)
            
            # Đã tìm thấy và xử lý xong thì thoát vòng lặp
            break

if __name__ == "__main__":
    print(f">> Server đang chạy tại: http://{HOST}:{PORT}")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
