#!/usr/bin/env python3
"""
Server Multiplayer Thời Gian Thực cho Web Game "An Yên Cổ Tự - Đi Chùa Online"
Chạy trực tiếp bằng Python chuẩn trên macOS/Linux/Windows (không cần cài thêm thư viện ngoài):
    python3 server.py
Mặc định mở tại: http://localhost:8080  (vào phòng khác: http://localhost:8080/?room=ten-phong)

Server lo:
- Tài khoản (tên đăng nhập + mật khẩu băm scrypt), phiên đăng nhập bằng cookie, hồ sơ nhân vật
- Công đức: chỉ server được cộng, có thời gian chờ và giới hạn mỗi ngày để chống gian lận
- Trạng thái chung của từng phòng (lá rụng, điều ước, hoa đăng, lượt chúc phúc), lưu trong data/temple.db
"""

import base64
import binascii
import hashlib
import hmac
import json
import math
import os
import queue
import random
import re
import secrets
import select
import socket
import sqlite3
import struct
import threading
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import lunar
from moderation import clean_message, is_acceptable_name

PORT = int(os.environ.get("PORT", 8080))
# Khi chạy sau Caddy trên VPS: HOST=127.0.0.1 (chỉ Caddy truy cập được), TRUST_PROXY=1, COOKIE_SECURE=1
HOST = os.environ.get("HOST", "0.0.0.0")
TRUST_PROXY = os.environ.get("TRUST_PROXY") == "1"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE") == "1"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
# Có thể đổi thư mục dữ liệu (vd: khi chạy test) bằng biến môi trường TEMPLE_DATA_DIR
DATA_DIR = os.environ.get("TEMPLE_DATA_DIR") or os.path.join(ROOT_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "temple.db")

DEFAULT_ROOM = "an-yen"
MAX_PLAYERS_PER_ROOM = 40
MAX_WISHES = 200
MAX_LANTERNS = 40
MAX_GROUND_ITEMS = 24
MAX_BODY_BYTES = 4096
SWEEP_REACH = 90  # Khoảng cách tối đa (px) từ người chơi tới chiếc lá được phép quét
MAX_POSITION_DRIFT = 250  # Độ lệch tối đa (px) giữa vị trí gửi kèm và vị trí server biết gần nhất

# Gửi tín hiệu giữ kết nối thường xuyên để phát hiện người đã đóng tab nhanh (nhân vật biến mất sau vài giây)
HEARTBEAT_SECONDS = 5

SESSION_COOKIE = "anyen_session"
SESSION_DAYS = 30
AUTH_ATTEMPTS_PER_MINUTE = 10

# Chỉ phục vụ các file của game, không để lộ server.py hay thư mục data/
PUBLIC_FILES = {"/", "/index.html"}
PUBLIC_PREFIXES = ("/css/", "/js/", "/assets/")

ROOM_RE = re.compile(r"^[a-z0-9-]{1,24}$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,20}$")
COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
WISH_CATEGORIES = {"Tình duyên", "Gia đạo", "Sự nghiệp", "Sức khỏe", "Bình an"}
TOOLS = {"none", "broom", "food"}

# Bộ id ngoại hình phải khớp với js/data.js
OUTFITS = {"ao_lam", "ao_dai_sen", "ao_ba_ba", "phap_phuc_ngoc", "ao_dai_vang", "phap_phuc_bach_lien"}
HAIRS = {"toc_ngan", "toc_bui", "toc_dai", "toc_duoi_ngua", "cao_troc", "toc_mai", "toc_ngang_vai"}
HAIR_COLORS = {"den", "nau", "hat_de", "bac"}
SKINS = {"da_sang", "da_trang_hong", "da_banh_mat", "da_ngam", "da_nau"}
EYES = {"tron", "cuoi", "lim_dim"}
FACE_SHAPES = {"tron", "trai_xoan", "vuong", "dai"}
GLASSES = {"none", "kinh_tron", "kinh_vuong"}
EYE_SIZES = {"nho", "vua", "to"}
MOUTHS = {"nho", "vua", "rong"}
NOSES = {"nho", "vua", "to"}
BEARDS = {"none", "ria", "rau"}
# Ảnh mặt hoạt hình (PNG nhỏ, đã xử lý trên máy người chơi). Ảnh gốc không bao giờ được gửi lên
MAX_FACE_BYTES = 60 * 1024
MAX_FACE_SIZE = 256
ACCESSORY_MIN_MERIT = {"none": 0, "non_la": 0, "trang_hat": 0, "hoa_sen": 20, "long_den": 50, "hao_quang": 100}
DEFAULT_APPEARANCE = {
    "outfitId": "ao_lam", "hairId": "toc_ngan", "hairColorId": "den",
    "skinId": "da_sang", "eyesId": "tron", "faceShape": "tron", "glasses": "none",
    "eyeSize": "vua", "mouth": "vua", "nose": "nho", "beard": "none", "faceId": "",
    "skinColor": "", "hairColor": "", "accessory": "non_la",
}
# Không gian trong chùa và việc người chơi đang làm (để người khác thấy đúng tư thế)
SPACES = {"san_chua", "chinh_dien", "gac_chuong", "lau_xin_xam", "cay_nguyen_uoc", "ho_sen", "thuy_dinh"}
ACTIVITIES = {"", "thien", "tung_kinh", "niem_phat", "chap_tay", "lay", "quy", "uong_tra", "keo_chuong"}
TITLES = [
    (400, "Hộ Pháp An Yên"), (200, "Bậc Thiện Tri Thức"), (100, "Tâm Sen Thanh Tịnh"),
    (50, "Phật Tử Chăm Chỉ"), (20, "Người Gieo Hạt Lành"), (0, "Khách Thập Phương"),
]

# Công đức: (số hạt sen, thời gian chờ giữa 2 lần tính bằng giây, giới hạn mỗi ngày hoặc None)
REWARDS = {
    "greeting": (2, 10, 50),
    "pet_cat": (3, 8, 60),
    "fish_food": (3, 5, 60),
    "tea": (4, 30, 30),
    "dharma_talk": (5, 25, 15),
    "incense": (10, 60, 20),
    "wooden_fish": (1, 0.4, 300),
    "bell": (3, 10, 60),
    "fortune": (5, 20, 20),
    "love_blessing": (5, 20, 20),
    "wish": (8, 20, 20),
    "bless": (2, 0, 100),
    "lantern": (8, 20, 20),
    "sweep_leaf": (2, 0, None),
    "sweep_trash": (3, 0, None),
    "clean_temple": (15, 0, None),
    "meditation": (10, 170, 12),
    "sutra_complete": (20, 100, 10),
    "bow": (3, 15, 40),
    # Sự kiện chung: chỉ được cộng khi sự kiện đang diễn ra thật (xem EVENT_REQUIREMENTS)
    "event_cong_phu": (20, 1800, 2),
    "event_le": (15, 0, 1),
    "event_hoa_dang": (15, 0, 1),
    "event_dai_le": (30, 0, 1),
}
FESTIVAL_EVENTS = set(lunar.FESTIVALS.values())
EVENT_REQUIREMENTS = {
    "event_cong_phu": lambda active: bool(active & {"cong_phu_sang", "cong_phu_chieu"}),
    "event_le": lambda active: bool(active & {"mung_mot", "ram"}),
    "event_hoa_dang": lambda active: "dem_hoa_dang" in active,
    "event_dai_le": lambda active: bool(active & FESTIVAL_EVENTS),
}
# Những việc client được tự báo; các việc còn lại server tự cộng khi xử lý hành động tương ứng
CLIENT_EARNABLE = {
    "greeting", "pet_cat", "fish_food", "tea", "dharma_talk", "incense", "wooden_fish", "bell", "fortune", "love_blessing",
    "meditation", "sutra_complete", "bow", *EVENT_REQUIREMENTS.keys(),
}

# Giới hạn tần suất: tối đa 20 gói tin/giây (dồn tối đa 40), và 1 lời chat/điều ước mỗi 0,8 giây
RATE_PER_SECOND = 20
RATE_BURST = 40
SOCIAL_COOLDOWN = 0.8
SOCIAL_TYPES = {"chat", "incense_lit", "new_wish", "new_lantern"}

state_lock = threading.RLock()
rooms = {}
clients_by_token = {}
merit_limits = {}  # user_id -> {reason: [lần cuối, ngày, số lần trong ngày]}
auth_attempts = {}  # ip -> [thời điểm các lần thử]
db = None


def clean_text(value, limit):
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]


def clamp_number(value, low, high, default):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number):
        return default
    return max(low, min(high, number))


def clean_id(value, prefix):
    if isinstance(value, str) and ID_RE.match(value):
        return value
    return prefix + secrets.token_hex(4)


def now_ms():
    return int(time.time() * 1000)


def title_for(merit):
    return next(title for minimum, title in TITLES if merit >= minimum)


# ======================= CƠ SỞ DỮ LIỆU & TÀI KHOẢN =======================

def init_db():
    global db
    os.makedirs(DATA_DIR, exist_ok=True)
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            appearance TEXT NOT NULL,
            merit INTEGER NOT NULL DEFAULT 15,
            mindfulness INTEGER NOT NULL DEFAULT 68,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rooms (
            name TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
    """)
    # Thêm cột ảnh mặt cho cơ sở dữ liệu cũ
    columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
    if "face_image" not in columns:
        db.execute("ALTER TABLE users ADD COLUMN face_image BLOB")
        db.execute("ALTER TABLE users ADD COLUMN face_version INTEGER NOT NULL DEFAULT 0")
    db.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
    db.commit()


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2 ** 14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        _, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=2 ** 14, r=8, p=1)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except ValueError:
        return False


def user_from_row(row):
    appearance = {**DEFAULT_APPEARANCE, **json.loads(row["appearance"])}
    return {
        "id": row["id"],
        "username": row["username"],
        "name": row["name"],
        "appearance": appearance,
        "merit": row["merit"],
        "mindfulness": row["mindfulness"],
    }


def public_user(user):
    return {**{k: v for k, v in user.items() if k != "id"}, "title": title_for(user["merit"])}


def load_user(user_id):
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return user_from_row(row) if row else None


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
               (token, user_id, int(time.time()) + SESSION_DAYS * 86400))
    db.commit()
    return token


def user_for_session(token):
    if not token:
        return None
    row = db.execute("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
                     (token, int(time.time()))).fetchone()
    return load_user(row["user_id"]) if row else None


def sanitize_appearance(raw, merit, current=None):
    """Giá trị nào không hợp lệ (hoặc phụ kiện chưa mở khóa) thì giữ nguyên lựa chọn hiện tại."""
    raw = raw if isinstance(raw, dict) else {}
    result = dict(current or DEFAULT_APPEARANCE)
    for key, allowed in (("outfitId", OUTFITS), ("hairId", HAIRS), ("hairColorId", HAIR_COLORS),
                         ("skinId", SKINS), ("eyesId", EYES), ("faceShape", FACE_SHAPES), ("glasses", GLASSES),
                         ("eyeSize", EYE_SIZES), ("mouth", MOUTHS), ("nose", NOSES), ("beard", BEARDS)):
        if raw.get(key) in allowed:
            result[key] = raw[key]
    # Màu da / màu tóc lấy từ ảnh: mã màu hợp lệ hoặc chuỗi rỗng (dùng màu chọn sẵn)
    for key in ("skinColor", "hairColor"):
        value = raw.get(key)
        if value == "" or (isinstance(value, str) and COLOR_RE.match(value)):
            result[key] = value
    # faceId chỉ do server đặt khi tải ảnh mặt lên, người chơi không tự sửa được
    result["faceId"] = (current or {}).get("faceId", "")
    accessory = raw.get("accessory")
    if accessory in ACCESSORY_MIN_MERIT and merit >= ACCESSORY_MIN_MERIT[accessory]:
        result["accessory"] = accessory
    return result


def allow_auth_attempt(ip):
    """Chỉ những lần thử sai mới bị tính, để người đăng nhập đúng không bao giờ bị chặn."""
    now = time.time()
    auth_attempts[ip] = [t for t in auth_attempts.get(ip, []) if now - t < 60]
    return len(auth_attempts[ip]) < AUTH_ATTEMPTS_PER_MINUTE


def record_auth_failure(ip):
    auth_attempts.setdefault(ip, []).append(time.time())


def grant_merit(client, reason):
    """Cộng công đức cho người chơi nếu chưa vượt thời gian chờ / giới hạn ngày, rồi báo riêng cho họ."""
    amount, cooldown, daily_cap = REWARDS[reason]
    user = client.user
    now = time.time()
    today = lunar.vn_now().strftime("%Y-%m-%d")  # giới hạn mỗi ngày tính theo giờ Việt Nam
    record = merit_limits.setdefault(user["id"], {}).setdefault(reason, [0.0, today, 0])
    if record[1] != today:
        record[1], record[2] = today, 0
    if now - record[0] < cooldown or (daily_cap is not None and record[2] >= daily_cap):
        return
    record[0] = now
    record[2] += 1

    merit = user["merit"] + amount
    mindfulness = min(100, user["mindfulness"] + max(1, round(amount * 1.2)))
    db.execute("UPDATE users SET merit = ?, mindfulness = ? WHERE id = ?", (merit, mindfulness, user["id"]))
    db.commit()
    for c in all_clients_of(user["id"]):
        c.user["merit"] = merit
        c.user["mindfulness"] = mindfulness
    client.send(json.dumps({
        "type": "merit", "reason": reason, "amount": amount,
        "total": merit, "mindfulness": mindfulness, "title": title_for(merit),
    }, ensure_ascii=False))


def all_clients_of(user_id):
    return [c for c in clients_by_token.values() if c.user["id"] == user_id]


# ======================= PHÒNG CHƠI =======================

class Client:
    def __init__(self, room, user):
        self.id = "p_" + secrets.token_hex(4)
        self.token = secrets.token_urlsafe(16)
        self.user = user
        self.room = room
        self.queue = queue.Queue(maxsize=300)
        self.player = None
        self.allowance = RATE_BURST
        self.last_refill = time.monotonic()
        self.last_social = 0.0

    @property
    def blesser_id(self):
        return "u_" + str(self.user["id"])

    def allow(self, packet_type):
        now = time.monotonic()
        self.allowance = min(RATE_BURST, self.allowance + (now - self.last_refill) * RATE_PER_SECOND)
        self.last_refill = now
        if self.allowance < 1:
            return False
        if packet_type in SOCIAL_TYPES:
            if now - self.last_social < SOCIAL_COOLDOWN:
                return False
            self.last_social = now
        self.allowance -= 1
        return True

    def send(self, message):
        try:
            self.queue.put_nowait(message)
        except queue.Full:
            pass


class Room:
    def __init__(self, name):
        self.name = name
        self.clients = {}
        self.ground_items = {}
        self.wishes = []
        self.lanterns = []
        self.load()
        for _ in range(18):
            self.spawn_item("leaf")
        for _ in range(5):
            self.spawn_item("trash")

    def load(self):
        row = db.execute("SELECT data FROM rooms WHERE name = ?", (self.name,)).fetchone()
        if row:
            data = json.loads(row["data"])
            self.wishes = data.get("wishes", [])[:MAX_WISHES]
            self.lanterns = data.get("lanterns", [])[-MAX_LANTERNS:]

    def save(self):
        data = json.dumps({"wishes": self.wishes, "lanterns": self.lanterns}, ensure_ascii=False)
        db.execute("INSERT INTO rooms (name, data) VALUES (?, ?) "
                   "ON CONFLICT(name) DO UPDATE SET data = excluded.data", (self.name, data))
        db.commit()

    def spawn_item(self, forced_type=None):
        item_type = forced_type or ("leaf" if random.random() < 0.78 else "trash")
        if item_type == "leaf":
            sub_type = "bodhi_gold" if random.random() < 0.65 else "bodhi_amber"
        else:
            sub_type = "paper" if random.random() < 0.5 else "bottle"
        item = {
            "id": "item_" + secrets.token_hex(4),
            "type": item_type,
            "subType": sub_type,
            "x": round(540 + random.random() * 620),
            "y": round(410 + random.random() * 440),
            "rotation": round(random.random() * math.pi * 2, 2),
            "scale": round(0.85 + random.random() * 0.35, 2),
        }
        self.ground_items[item["id"]] = item
        return item

    def broadcast(self, message, exclude=None):
        payload = json.dumps(message, ensure_ascii=False)
        for client in self.clients.values():
            if client is not exclude:
                client.send(payload)

    def broadcast_space(self, space, message, exclude=None):
        payload = json.dumps(message, ensure_ascii=False)
        for client in self.clients.values():
            if client is not exclude and client.player and client.player["space"] == space:
                client.send(payload)

    def public_wish(self, wish, blesser_id):
        result = {k: v for k, v in wish.items() if k != "blessedBy"}
        result["blessedByMe"] = blesser_id in wish.get("blessedBy", [])
        return result

    def snapshot_for(self, client):
        return {
            "groundItems": list(self.ground_items.values()),
            "wishes": [self.public_wish(w, client.blesser_id) for w in self.wishes],
            "lanterns": self.lanterns,
        }


def get_room(name):
    room = rooms.get(name)
    if room is None:
        room = rooms[name] = Room(name)
    return room


def suggest_room(name):
    base = re.sub(r"-\d+$", "", name)[:20]
    for i in range(2, 100):
        candidate = f"{base}-{i}"
        room = rooms.get(candidate)
        if room is None or len(room.clients) < MAX_PLAYERS_PER_ROOM:
            return candidate
    return base + "-" + secrets.token_hex(2)


def build_player(client, raw):
    """Tên, danh hiệu và ngoại hình lấy từ tài khoản; client chỉ được gửi vị trí và trạng thái."""
    if not isinstance(raw, dict):
        raw = {}
    user = client.user
    return {
        "id": client.id,
        "name": user["name"],
        "title": title_for(user["merit"]),
        **user["appearance"],
        "tool": raw.get("tool") if raw.get("tool") in TOOLS else "none",
        "x": round(clamp_number(raw.get("x"), 0, 1600, 800)),
        "y": round(clamp_number(raw.get("y"), 0, 1100, 780)),
        "dir": -1 if raw.get("dir") == -1 else 1,
        "isMoving": bool(raw.get("isMoving")),
        "isSitting": bool(raw.get("isSitting")),
        "space": raw.get("space") if raw.get("space") in SPACES else "san_chua",
        "activity": raw.get("activity") if raw.get("activity") in ACTIVITIES else "",
        "speech": clean_message(clean_text(raw.get("speech"), 120)),
    }


def handle_action(client, packet):
    room = client.room
    kind = packet.get("type")
    author = client.user["name"]
    title = title_for(client.user["merit"])

    if kind == "player_state":
        client.player = build_player(client, packet.get("player"))
        room.broadcast({"type": "player_state", "senderId": client.id, "player": client.player}, exclude=client)

    elif kind == "mo_tap":
        # Tiếng mõ chỉ vang tới những người đang ở cùng không gian
        space = client.player["space"] if client.player else "san_chua"
        room.broadcast_space(space, {"type": "mo_tap", "senderId": client.id,
                                     "bell": bool(packet.get("bell"))}, exclude=client)

    elif kind == "earn":
        reason = packet.get("reason")
        requirement = EVENT_REQUIREMENTS.get(reason)
        if reason in CLIENT_EARNABLE and (requirement is None or requirement(lunar.active_events())):
            grant_merit(client, reason)

    elif kind == "chat":
        text = clean_message(clean_text(packet.get("text"), 100))
        if text:
            room.broadcast({
                "type": "chat", "senderId": client.id, "author": author, "title": title,
                "text": text, "isEmote": bool(packet.get("isEmote")),
            }, exclude=client)

    elif kind == "clean_item":
        item = room.ground_items.get(packet.get("itemId"))
        if item is None or (client.player and client.player["space"] != "san_chua"):
            return
        # Gói quét có thể tới trước gói vị trí mới nhất, nên client gửi kèm vị trí lúc quét.
        # Vị trí đó chỉ được tin nếu không quá xa vị trí server biết gần nhất.
        x = clamp_number(packet.get("x"), 0, 1600, -9999)
        y = clamp_number(packet.get("y"), 0, 1100, -9999)
        known = client.player or {"x": x, "y": y}
        too_far = (
            math.hypot(item["x"] - x, item["y"] - y) > SWEEP_REACH
            or math.hypot(known["x"] - x, known["y"] - y) > MAX_POSITION_DRIFT
        )
        if too_far:
            # Trả lại chiếc lá cho người vừa quét hụt để hai bên không bị lệch nhau
            client.send(json.dumps({"type": "item_spawned", "item": item}, ensure_ascii=False))
            return
        del room.ground_items[item["id"]]
        room.broadcast({"type": "item_removed", "itemId": item["id"], "itemType": item["type"], "by": client.id})
        grant_merit(client, "sweep_leaf" if item["type"] == "leaf" else "sweep_trash")
        if not room.ground_items:
            room.broadcast({"type": "blessing_rain", "by": client.id})
            grant_merit(client, "clean_temple")

    elif kind == "incense_lit":
        wish = clean_message(clean_text(packet.get("wish"), 120))
        if wish:
            room.broadcast({"type": "incense_lit", "senderId": client.id, "author": author, "wish": wish}, exclude=client)

    elif kind == "new_wish":
        raw = packet.get("wish") if isinstance(packet.get("wish"), dict) else {}
        text = clean_message(clean_text(raw.get("text"), 120))
        if not text:
            return
        category = raw.get("category") if raw.get("category") in WISH_CATEGORIES else "Bình an"
        wish = {
            "id": clean_id(raw.get("id"), "w_"),
            "author": author,
            "title": title,
            "category": category,
            "text": text,
            "blessings": 1,
            "createdAt": now_ms(),
            "blessedBy": [client.blesser_id],
        }
        room.wishes.insert(0, wish)
        del room.wishes[MAX_WISHES:]
        room.save()
        room.broadcast({"type": "new_wish", "senderId": client.id, "wish": room.public_wish(wish, None)}, exclude=client)
        grant_merit(client, "wish")

    elif kind == "bless_wish":
        wish = next((w for w in room.wishes if w["id"] == packet.get("wishId")), None)
        if wish is None or client.blesser_id in wish["blessedBy"]:
            return
        wish["blessedBy"].append(client.blesser_id)
        wish["blessings"] += 1
        room.save()
        room.broadcast({"type": "wish_blessed", "wishId": wish["id"], "blessings": wish["blessings"], "by": client.id})
        grant_merit(client, "bless")

    elif kind == "new_lantern":
        raw = packet.get("lantern") if isinstance(packet.get("lantern"), dict) else {}
        color = raw.get("color") if isinstance(raw.get("color"), str) and COLOR_RE.match(raw["color"]) else "#ff7eb3"
        lantern = {
            "id": clean_id(raw.get("id"), "lan_"),
            "author": author,
            "color": color,
            "text": clean_message(clean_text(raw.get("text"), 90)) or "Nguyện cầu bình an",
            "x": round(clamp_number(raw.get("x"), 205, 405, 300)),
            "y": round(clamp_number(raw.get("y"), 575, 770, 670)),
            "createdAt": now_ms(),
        }
        room.lanterns.append(lantern)
        del room.lanterns[:-MAX_LANTERNS]
        room.save()
        room.broadcast({"type": "new_lantern", "senderId": client.id, "lantern": lantern}, exclude=client)
        grant_merit(client, "lantern")


def world_ticker():
    """Thỉnh thoảng cho lá bồ đề rụng thêm trên sân của các phòng đang có người."""
    while True:
        time.sleep(1)
        with state_lock:
            for room in rooms.values():
                if room.clients and len(room.ground_items) < MAX_GROUND_ITEMS and random.random() < 0.25:
                    item = room.spawn_item("leaf")
                    room.broadcast({"type": "item_spawned", "item": item})


# ======================= HTTP =======================

class TempleMultiplayerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def log_message(self, format, *args):
        # Giữ log gọn gàng
        pass

    def end_headers(self):
        # Luôn kiểm tra lại file mới để người chơi không bị kẹt bản JS cũ sau khi cập nhật
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, status, body, cookie=None):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(data)

    def session_token(self):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        morsel = cookie.get(SESSION_COOKIE)
        return morsel.value if morsel else None

    def session_cookie(self, token, max_age):
        secure = "; Secure" if COOKIE_SECURE else ""
        return f"{SESSION_COOKIE}={token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax{secure}"

    def client_ip(self):
        """IP thật của người chơi. Sau Caddy mọi yêu cầu đều đến từ 127.0.0.1, nên đọc X-Real-IP do Caddy gắn vào."""
        direct = self.client_address[0]
        if TRUST_PROXY and direct in ("127.0.0.1", "::1"):
            real = self.headers.get("X-Real-IP", "").strip()
            if real:
                return real
        return direct

    def read_json(self, limit=MAX_BODY_BYTES):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0 or length > limit:
            return None
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            return None
        return body if isinstance(body, dict) else None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/stream":
            self.handle_sse(parse_qs(parsed.query))
            return
        if parsed.path.startswith("/api/face/"):
            self.handle_face_get(parsed.path[len("/api/face/"):])
            return
        if parsed.path == "/api/me":
            with state_lock:
                user = user_for_session(self.session_token())
            if user:
                self.send_json(200, {"ok": True, "user": public_user(user)})
            else:
                self.send_json(401, {"ok": False})
            return
        if parsed.path == "/api/merit-board":
            with state_lock:
                rows = db.execute(
                    "SELECT name, merit, mindfulness FROM users ORDER BY merit DESC, id ASC LIMIT 10"
                ).fetchall()
            leaders = [
                {
                    "rank": idx + 1,
                    "name": r["name"],
                    "merit": r["merit"],
                    "mindfulness": r["mindfulness"],
                    "title": title_for(r["merit"]),
                }
                for idx, r in enumerate(rows)
            ]
            self.send_json(200, {"ok": True, "leaders": leaders})
            return
        if parsed.path in PUBLIC_FILES or parsed.path.startswith(PUBLIC_PREFIXES):
            return super().do_GET()
        self.send_error(404)

    def do_HEAD(self):
        self.send_error(405)

    def do_POST(self):
        path = urlparse(self.path).path
        routes = {
            "/api/action": self.handle_action_post,
            "/api/register": self.handle_register,
            "/api/login": self.handle_login,
            "/api/logout": self.handle_logout,
            "/api/profile": self.handle_profile,
            "/api/face": self.handle_face_upload,
            "/api/face/delete": self.handle_face_delete,
        }
        handler = routes.get(path)
        if handler is None:
            self.send_error(404)
            return
        # Chỉ nhận JSON: trình duyệt không cho trang web lạ gửi kiểu này kèm cookie mà không hỏi trước
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            self.send_json(415, {"ok": False, "error": "Dữ liệu gửi lên phải là JSON."})
            return
        body = self.read_json(limit=MAX_FACE_BYTES * 2 if path == "/api/face" else MAX_BODY_BYTES)
        if body is None:
            self.send_json(400, {"ok": False, "error": "Dữ liệu gửi lên không hợp lệ."})
            return
        handler(body)

    def handle_register(self, body):
        username = str(body.get("username", "")).strip().lower()
        password = body.get("password") if isinstance(body.get("password"), str) else ""
        name = clean_text(body.get("name"), 18) or username
        if not USERNAME_RE.match(username):
            self.send_json(400, {"ok": False, "error": "Tên đăng nhập gồm 3–20 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới."})
            return
        if not is_acceptable_name(name) or not is_acceptable_name(username):
            self.send_json(400, {"ok": False, "error": "Tên này chưa phù hợp nơi cửa chùa, bạn chọn tên khác nhé."})
            return
        if not 6 <= len(password) <= 72:
            self.send_json(400, {"ok": False, "error": "Mật khẩu cần từ 6 đến 72 ký tự."})
            return
        with state_lock:
            if not allow_auth_attempt(self.client_ip()):
                self.send_json(429, {"ok": False, "error": "Bạn thử quá nhiều lần, hãy đợi một phút rồi thử lại."})
                return
        password_hash = hash_password(password)  # Băm ngoài khóa vì scrypt khá chậm
        appearance = sanitize_appearance(body.get("appearance"), 0)
        with state_lock:
            try:
                cur = db.execute(
                    "INSERT INTO users (username, password_hash, name, appearance, created_at) VALUES (?, ?, ?, ?, ?)",
                    (username, password_hash, name, json.dumps(appearance), int(time.time())))
                db.commit()
            except sqlite3.IntegrityError:
                record_auth_failure(self.client_ip())
                self.send_json(409, {"ok": False, "error": "Tên đăng nhập này đã có người dùng."})
                return
            token = create_session(cur.lastrowid)
            user = load_user(cur.lastrowid)
        self.send_json(200, {"ok": True, "user": public_user(user)},
                       cookie=self.session_cookie(token, SESSION_DAYS * 86400))

    def handle_login(self, body):
        username = str(body.get("username", "")).strip().lower()
        password = body.get("password") if isinstance(body.get("password"), str) else ""
        with state_lock:
            if not allow_auth_attempt(self.client_ip()):
                self.send_json(429, {"ok": False, "error": "Bạn thử quá nhiều lần, hãy đợi một phút rồi thử lại."})
                return
            row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if row is None or not verify_password(password, row["password_hash"]):
            with state_lock:
                record_auth_failure(self.client_ip())
            self.send_json(401, {"ok": False, "error": "Sai tên đăng nhập hoặc mật khẩu."})
            return
        with state_lock:
            token = create_session(row["id"])
        self.send_json(200, {"ok": True, "user": public_user(user_from_row(row))},
                       cookie=self.session_cookie(token, SESSION_DAYS * 86400))

    def handle_logout(self, body):
        token = self.session_token()
        if token:
            with state_lock:
                db.execute("DELETE FROM sessions WHERE token = ?", (token,))
                db.commit()
        self.send_json(200, {"ok": True}, cookie=self.session_cookie("", 0))

    def handle_profile(self, body):
        with state_lock:
            user = user_for_session(self.session_token())
            if user is None:
                self.send_json(401, {"ok": False, "error": "Bạn cần đăng nhập lại."})
                return
            name = clean_text(body.get("name"), 18) or user["name"]
            if not is_acceptable_name(name):
                self.send_json(400, {"ok": False, "error": "Tên này chưa phù hợp nơi cửa chùa, bạn chọn tên khác nhé."})
                return
            appearance = sanitize_appearance(body.get("appearance"), user["merit"], user["appearance"])
            db.execute("UPDATE users SET name = ?, appearance = ? WHERE id = ?",
                       (name, json.dumps(appearance), user["id"]))
            db.commit()
            user.update(name=name, appearance=appearance)
            for c in all_clients_of(user["id"]):
                c.user.update(name=name, appearance=appearance)
        self.send_json(200, {"ok": True, "user": public_user(user)})

    def set_face(self, user, png_bytes):
        """Lưu (hoặc xoá khi png_bytes là None) ảnh mặt, rồi đổi faceId để mọi người tải bản mới."""
        row = db.execute("SELECT face_version FROM users WHERE id = ?", (user["id"],)).fetchone()
        version = (row["face_version"] or 0) + 1
        face_id = f"{user['id']}-{version}" if png_bytes else ""
        appearance = {**user["appearance"], "faceId": face_id}
        db.execute("UPDATE users SET face_image = ?, face_version = ?, appearance = ? WHERE id = ?",
                   (png_bytes, version, json.dumps(appearance), user["id"]))
        db.commit()
        user["appearance"] = appearance
        for c in all_clients_of(user["id"]):
            c.user["appearance"] = appearance
        return user

    def handle_face_upload(self, body):
        data_url = body.get("image") if isinstance(body.get("image"), str) else ""
        prefix = "data:image/png;base64,"
        try:
            png = base64.b64decode(data_url[len(prefix):], validate=True) if data_url.startswith(prefix) else b""
        except (ValueError, binascii.Error):
            png = b""
        # Chỉ nhận PNG nhỏ: kiểm tra chữ ký, kích thước file và kích thước ảnh trong phần IHDR
        valid = png.startswith(b"\x89PNG\r\n\x1a\n") and len(png) <= MAX_FACE_BYTES and png[12:16] == b"IHDR"
        if valid:
            width, height = struct.unpack(">II", png[16:24])
            valid = 0 < width <= MAX_FACE_SIZE and 0 < height <= MAX_FACE_SIZE
        if not valid:
            self.send_json(400, {"ok": False, "error": "Ảnh khuôn mặt không hợp lệ."})
            return
        with state_lock:
            user = user_for_session(self.session_token())
            if user is None:
                self.send_json(401, {"ok": False, "error": "Bạn cần đăng nhập lại."})
                return
            user = self.set_face(user, png)
        self.send_json(200, {"ok": True, "user": public_user(user)})

    def handle_face_delete(self, body):
        with state_lock:
            user = user_for_session(self.session_token())
            if user is None:
                self.send_json(401, {"ok": False, "error": "Bạn cần đăng nhập lại."})
                return
            user = self.set_face(user, None)
        self.send_json(200, {"ok": True, "user": public_user(user)})

    def handle_face_get(self, face_id):
        match = re.match(r"^([0-9]+)-([0-9]+)$", face_id)
        row = None
        if match:
            with state_lock:
                row = db.execute("SELECT face_image, face_version FROM users WHERE id = ?", (int(match.group(1)),)).fetchone()
        if not row or not row["face_image"] or row["face_version"] != int(match.group(2)):
            self.send_error(404)
            return
        data = bytes(row["face_image"])
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def handle_action_post(self, packet):
        with state_lock:
            client = clients_by_token.get(packet.get("token"))
            if client is None:
                status = 403
            elif not client.allow(packet.get("type")):
                status = 429
            else:
                handle_action(client, packet)
                status = 200
        self.send_json(status, {"ok": status == 200})

    def peer_closed(self):
        """Trình duyệt đã đóng kết nối chưa (đóng tab, mất mạng). Kiểm tra mỗi giây để người rời đi biến mất nhanh."""
        try:
            readable, _, _ = select.select([self.connection], [], [], 0)
            return bool(readable) and self.connection.recv(1, socket.MSG_PEEK) == b""
        except (OSError, ValueError):
            return True

    def handle_sse(self, params):
        room_name = (params.get("room") or [DEFAULT_ROOM])[0].lower()
        if not ROOM_RE.match(room_name):
            room_name = DEFAULT_ROOM

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        with state_lock:
            user = user_for_session(self.session_token())
            if user is None:
                self.wfile.write(b'data: {"type": "auth_required"}\n\n')
                return
            room = get_room(room_name)
            if len(room.clients) >= MAX_PLAYERS_PER_ROOM:
                full = {"type": "room_full", "room": room_name, "suggest": suggest_room(room_name)}
                self.wfile.write(f"data: {json.dumps(full)}\n\n".encode("utf-8"))
                return

            client = Client(room, user)
            client.send(json.dumps({
                "type": "welcome",
                "clientId": client.id,
                "token": client.token,
                "room": room_name,
                "serverTime": now_ms(),
                "user": public_user(user),
                "state": room.snapshot_for(client),
                "players": [c.player for c in room.clients.values() if c.player],
            }, ensure_ascii=False))
            room.clients[client.id] = client
            clients_by_token[client.token] = client

        try:
            last_write = time.monotonic()
            while not self.peer_closed():
                try:
                    msg = client.queue.get(timeout=1)
                    self.wfile.write(f"data: {msg}\n\n".encode("utf-8"))
                except queue.Empty:
                    if time.monotonic() - last_write < HEARTBEAT_SECONDS:
                        continue
                    # Heartbeat giữ kết nối
                    self.wfile.write(b": keep-alive\n\n")
                last_write = time.monotonic()
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with state_lock:
                room.clients.pop(client.id, None)
                clients_by_token.pop(client.token, None)
                room.broadcast({"type": "player_left", "senderId": client.id})


if __name__ == "__main__":
    init_db()
    threading.Thread(target=world_ticker, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), TempleMultiplayerHandler)
    print(f"🪷 An Yên Cổ Tự (Đi Chùa Online) đang chạy tại: http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã đóng cổng chùa bình an.")
