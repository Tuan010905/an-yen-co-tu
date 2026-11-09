"""
Kiểm tra server An Yên Cổ Tự: tài khoản, phòng chơi, đồng bộ, công đức, không gian, ảnh mặt.
Mỗi nhóm test tự bật một server riêng với dữ liệu tạm, không đụng tới data/ thật.

Chạy:  python3 -m unittest discover -s tests -v
"""

import base64
import json
import os
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import zlib
from http.cookiejar import CookieJar

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class TempleServer:
    """Một server chạy trong tiến trình riêng, dữ liệu nằm trong thư mục tạm."""

    def __init__(self, data_dir=None, fake_now=None, env=None):
        self.fake_now = fake_now
        self.extra_env = env or {}
        self.port = free_port()
        self.data_dir = data_dir or tempfile.mkdtemp(prefix="anyen-test-")
        self.base = f"http://127.0.0.1:{self.port}"
        self.proc = None

    def start(self):
        env = {**os.environ, "PORT": str(self.port), "TEMPLE_DATA_DIR": self.data_dir}
        if self.fake_now:
            env["TEMPLE_FAKE_NOW"] = self.fake_now
        env.update(self.extra_env)
        self.proc = subprocess.Popen([sys.executable, os.path.join(ROOT, "server.py")], env=env,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        for _ in range(100):
            try:
                urllib.request.urlopen(self.base + "/", timeout=0.5)
                return self
            except OSError:
                time.sleep(0.05)
        raise RuntimeError("Server không khởi động được: " + self.proc.stderr.read().decode())

    def stop(self):
        if self.proc:
            self.proc.terminate()
            self.proc.wait(timeout=5)
            self.proc = None


class Player:
    """Người chơi giả: có cookie phiên, kết nối SSE và gửi hành động như trình duyệt."""

    def __init__(self, server):
        self.server = server
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
        self.events = []
        self.welcome = None
        self.resp = None

    def api(self, path, body=None, raw=False, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.server.base + path, data=data,
                                     headers={"Content-Type": "application/json", **(headers or {})})
        try:
            r = self.opener.open(req, timeout=5)
            payload = r.read()
            return r.status, (payload if raw else json.loads(payload or b"{}"))
        except urllib.error.HTTPError as e:
            payload = e.read()
            return e.code, (payload if raw else json.loads(payload or b"{}"))

    def register(self, username, password="mat-khau-thu", **extra):
        return self.api("/api/register", {"username": username, "password": password, **extra})

    def connect(self, room="an-yen"):
        self.resp = self.opener.open(f"{self.server.base}/api/stream?room={room}", timeout=10)
        threading.Thread(target=self._read, daemon=True).start()
        deadline = time.time() + 3
        while time.time() < deadline and not (self.welcome or self.events):
            time.sleep(0.02)
        return self

    def _read(self):
        try:
            for raw in self.resp:
                line = raw.decode().strip()
                if line.startswith("data: "):
                    msg = json.loads(line[6:])
                    if msg["type"] == "welcome":
                        self.welcome = msg
                    else:
                        self.events.append(msg)
        except Exception:
            pass

    def act(self, packet):
        return self.api("/api/action", {**packet, "token": self.welcome["token"]})[0]

    def state(self, **player):
        return self.act({"type": "player_state", "player": player})

    def wait_for(self, kind, predicate=lambda e: True, timeout=2):
        deadline = time.time() + timeout
        while time.time() < deadline:
            for e in self.events:
                if e["type"] == kind and predicate(e):
                    return e
            time.sleep(0.02)
        return None

    def close(self):
        if self.resp:
            self.resp.close()


def tiny_png(w, h):
    raw = b"".join(b"\x00" + b"\xcc\x88\x66\xff" * w for _ in range(h))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


class ServerTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = TempleServer().start()

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def setUp(self):
        self.players = []

    def tearDown(self):
        for p in self.players:
            p.close()

    def player(self, username, connect=True, room="an-yen", **extra):
        p = Player(self.server)
        status, _ = p.register(username, **extra)
        self.assertEqual(status, 200)
        if connect:
            p.connect(room)
        self.players.append(p)
        return p


class AccountTests(ServerTestCase):
    def test_register_validation(self):
        p = Player(self.server)
        self.assertEqual(p.register("ab")[0], 400)
        self.assertEqual(p.register("Ten Sai!")[0], 400)
        self.assertEqual(p.register("hop_le", password="123")[0], 400)
        self.assertEqual(p.register("hop_le")[0], 200)
        self.assertEqual(Player(self.server).register("hop_le")[0], 409)

    def test_session_cookie_and_logout(self):
        p = self.player("phien", connect=False)
        self.assertEqual(p.api("/api/me")[0], 200)
        p.api("/api/logout", {})
        self.assertEqual(p.api("/api/me")[0], 401)
        self.assertEqual(p.api("/api/login", {"username": "phien", "password": "sai-roi"})[0], 401)
        self.assertEqual(p.api("/api/login", {"username": "phien", "password": "mat-khau-thu"})[0], 200)

    def test_guest_cannot_join(self):
        guest = Player(self.server).connect()
        self.players.append(guest)
        self.assertIsNone(guest.welcome)
        self.assertEqual(guest.events[0]["type"], "auth_required")

    def test_appearance_is_sanitized(self):
        p = self.player("ngoai_hinh", connect=False, appearance={
            "hairId": "toc_mai", "beard": "rau", "accessory": "hao_quang", "faceId": "99-1", "skinColor": "red"})
        app = p.api("/api/me")[1]["user"]["appearance"]
        self.assertEqual(app["hairId"], "toc_mai")
        self.assertEqual(app["beard"], "rau")
        self.assertEqual(app["accessory"], "non_la", "phụ kiện chưa đủ công đức phải bị khoá")
        self.assertEqual(app["faceId"], "", "người chơi không được tự đặt faceId")
        self.assertEqual(app["skinColor"], "")

    def test_posts_must_be_json(self):
        req = urllib.request.Request(self.server.base + "/api/login", data=b'{"username":"a","password":"b"}',
                                     headers={"Content-Type": "text/plain"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=5)
        self.assertEqual(ctx.exception.code, 415)
        ctx.exception.close()

    def test_files_are_not_exposed(self):
        p = Player(self.server)
        self.assertEqual(p.api("/server.py", raw=True)[0], 404)
        self.assertEqual(p.api("/data/temple.db", raw=True)[0], 404)
        self.assertEqual(p.api("/tests/test_server.py", raw=True)[0], 404)
        self.assertEqual(p.api("/js/game.js", raw=True)[0], 200)


class MultiplayerTests(ServerTestCase):
    def test_identity_comes_from_account(self):
        a = self.player("danh_tinh_a", name="Người A")
        b = self.player("danh_tinh_b")
        a.state(name="Giả Mạo", hairId="toc_dai", x=99999, y="abc", tool="hack")
        e = b.wait_for("player_state", lambda e: e["senderId"] == a.welcome["clientId"])
        self.assertEqual(e["player"]["name"], "Người A")
        self.assertEqual(e["player"]["x"], 1600)
        self.assertEqual(e["player"]["y"], 780)
        self.assertEqual(e["player"]["tool"], "none")

    def test_rooms_are_isolated(self):
        a = self.player("phong_a", room="phong-mot")
        b = self.player("phong_b", room="phong-hai")
        a.state(x=500, y=500)
        time.sleep(0.3)
        self.assertIsNone(b.wait_for("player_state", timeout=0.3))

    def test_sweep_sync_and_merit(self):
        a = self.player("quet_a")
        b = self.player("quet_b")
        item = a.welcome["state"]["groundItems"][0]
        a.state(x=item["x"], y=item["y"], tool="broom")
        a.act({"type": "clean_item", "itemId": item["id"], "x": item["x"], "y": item["y"]})
        self.assertIsNotNone(b.wait_for("item_removed", lambda e: e["itemId"] == item["id"]))
        merit = a.wait_for("merit", lambda e: e["reason"] in ("sweep_leaf", "sweep_trash"))
        self.assertIsNotNone(merit)
        self.assertIsNone(b.wait_for("merit", timeout=0.3), "công đức chỉ gửi riêng người quét")

    def test_sweep_from_far_away_is_rejected(self):
        a = self.player("quet_xa")
        item = a.welcome["state"]["groundItems"][1]
        a.state(x=100, y=100)
        a.act({"type": "clean_item", "itemId": item["id"], "x": 100, "y": 100})
        self.assertIsNotNone(a.wait_for("item_spawned", lambda e: e["item"]["id"] == item["id"]),
                             "server phải trả lại chiếc lá cho người quét hụt")

    def test_wish_bless_once_per_account(self):
        a = self.player("uoc_a")
        b = self.player("uoc_b")
        time.sleep(0.9)
        a.act({"type": "new_wish", "wish": {"text": "  Điều ước \n thử  ", "category": "Hack"}})
        wish = b.wait_for("new_wish")["wish"]
        self.assertEqual(wish["text"], "Điều ước thử")
        self.assertEqual(wish["category"], "Bình an")
        b.act({"type": "bless_wish", "wishId": wish["id"]})
        b.act({"type": "bless_wish", "wishId": wish["id"]})
        time.sleep(0.4)
        blessed = [e for e in a.events if e["type"] == "wish_blessed"]
        self.assertEqual(len(blessed), 1)
        self.assertEqual(blessed[0]["blessings"], 2)

    def test_spam_and_bad_token(self):
        a = self.player("spam")
        codes = [a.act({"type": "chat", "text": f"spam {i}"}) for i in range(5)]
        self.assertIn(429, codes)
        self.assertEqual(a.api("/api/action", {"type": "chat", "text": "x", "token": "sai"})[0], 403)

    def test_player_left(self):
        a = self.player("roi_a")
        b = self.player("roi_b")
        a.close()
        self.assertIsNotNone(b.wait_for("player_left", lambda e: e["senderId"] == a.welcome["clientId"], timeout=3))


class SpaceAndMeritTests(ServerTestCase):
    def test_mo_tap_only_reaches_same_space(self):
        a = self.player("mo_a")
        b = self.player("mo_b")
        a.state(space="chinh_dien", activity="tung_kinh", isSitting=True)
        b.state(space="san_chua")
        time.sleep(0.2)
        a.act({"type": "mo_tap"})
        self.assertIsNone(b.wait_for("mo_tap", timeout=0.4))
        b.state(space="chinh_dien")
        time.sleep(0.2)
        a.act({"type": "mo_tap", "bell": True})
        self.assertTrue(b.wait_for("mo_tap")["bell"])

    def test_all_spaces_and_activities_accepted(self):
        a = self.player("khong_gian_a")
        b = self.player("khong_gian_b")
        for space, activity in [("gac_chuong", "keo_chuong"), ("lau_xin_xam", "quy"), ("cay_nguyen_uoc", ""),
                                ("ho_sen", ""), ("thuy_dinh", "uong_tra"), ("phong_la", "bay")]:
            b.events.clear()
            a.state(space=space, activity=activity)
            e = b.wait_for("player_state")
            expected = ("san_chua", "") if space == "phong_la" else (space, activity)
            self.assertEqual((e["player"]["space"], e["player"]["activity"]), expected)

    def test_cannot_sweep_from_inside_a_space(self):
        a = self.player("quet_trong_dien")
        item = a.welcome["state"]["groundItems"][2]
        a.state(x=item["x"], y=item["y"], space="chinh_dien")
        a.act({"type": "clean_item", "itemId": item["id"], "x": item["x"], "y": item["y"]})
        self.assertIsNone(a.wait_for("item_removed", timeout=0.4))

    def test_merit_cooldowns(self):
        a = self.player("cong_duc")
        for reason in ("meditation", "meditation", "hack", "clean_temple"):
            a.act({"type": "earn", "reason": reason})
            time.sleep(0.1)
        time.sleep(0.3)
        merits = [e for e in a.events if e["type"] == "merit"]
        self.assertEqual([m["reason"] for m in merits], ["meditation"])
        self.assertEqual(a.api("/api/me")[1]["user"]["merit"], 15 + 10)


class FaceImageTests(ServerTestCase):
    def test_upload_fetch_delete(self):
        p = self.player("anh_mat", connect=False)
        url = "data:image/png;base64," + base64.b64encode(tiny_png(128, 128)).decode()
        status, body = p.api("/api/face", {"image": url})
        self.assertEqual(status, 200)
        face_id = body["user"]["appearance"]["faceId"]
        status, data = Player(self.server).api(f"/api/face/{face_id}", raw=True)
        self.assertEqual(status, 200)
        self.assertTrue(data.startswith(b"\x89PNG"))
        self.assertEqual(p.api("/api/profile", {"name": "X", "appearance": {"faceId": "1-1"}})[1]["user"]["appearance"]["faceId"], face_id)
        p.api("/api/face/delete", {})
        self.assertEqual(Player(self.server).api(f"/api/face/{face_id}", raw=True)[0], 404)

    def test_rejects_bad_images(self):
        p = self.player("anh_xau", connect=False)
        big = "data:image/png;base64," + base64.b64encode(tiny_png(600, 600)).decode()
        svg = "data:image/png;base64," + base64.b64encode(b"<svg onload=alert(1)>").decode()
        self.assertEqual(p.api("/api/face", {"image": big})[0], 400)
        self.assertEqual(p.api("/api/face", {"image": svg})[0], 400)
        ok = "data:image/png;base64," + base64.b64encode(tiny_png(64, 64)).decode()
        self.assertEqual(Player(self.server).api("/api/face", {"image": ok})[0], 401, "chưa đăng nhập")


class PersistenceTests(unittest.TestCase):
    def test_data_survives_restart(self):
        data_dir = tempfile.mkdtemp(prefix="anyen-test-")
        server = TempleServer(data_dir).start()
        try:
            p = Player(server)
            p.register("ben_vung")
            p.connect()
            time.sleep(0.9)
            p.act({"type": "new_wish", "wish": {"id": "w_ben_vung", "text": "Nguyện bình an"}})
            p.act({"type": "earn", "reason": "incense"})
            time.sleep(0.3)
            p.close()
        finally:
            server.stop()
        server = TempleServer(data_dir).start()
        try:
            q = Player(server)
            self.assertEqual(q.api("/api/login", {"username": "ben_vung", "password": "mat-khau-thu"})[0], 200)
            self.assertEqual(q.api("/api/me")[1]["user"]["merit"], 15 + 8 + 10, "khởi đầu + treo điều ước + dâng hương")
            q.connect()
            self.assertIn("w_ben_vung", [w["id"] for w in q.welcome["state"]["wishes"]])
            q.close()
        finally:
            server.stop()


class EventRewardTests(unittest.TestCase):
    """Phần thưởng sự kiện chỉ được cộng khi sự kiện đang diễn ra theo giờ Việt Nam."""

    def run_at(self, fake_now, reasons):
        server = TempleServer(fake_now=fake_now).start()
        try:
            p = Player(server)
            p.register("su_kien")
            p.connect()
            for reason in reasons:
                p.act({"type": "earn", "reason": reason})
                time.sleep(0.1)
            time.sleep(0.4)
            got = sorted(e["reason"] for e in p.events if e["type"] == "merit")
            self.assertIsNotNone(p.welcome.get("serverTime"))
            p.close()
            return got
        finally:
            server.stop()

    def test_ordinary_day_gives_no_event_rewards(self):
        # 31/10/2026 12:00 là ngày 22/9 âm lịch, không có lễ, ngoài giờ công phu
        got = self.run_at("2026-10-31T12:00", ["event_cong_phu", "event_le", "event_hoa_dang", "event_dai_le"])
        self.assertEqual(got, [])

    def test_ram_thang_muoi_night(self):
        # 23/11/2026 19:30 là Rằm tháng Mười (Tết Hạ Nguyên) và đang trong Đêm Hoa Đăng
        got = self.run_at("2026-11-23T19:30", ["event_le", "event_hoa_dang", "event_dai_le", "event_dai_le", "event_cong_phu"])
        self.assertEqual(got, ["event_dai_le", "event_hoa_dang", "event_le"], "mỗi loại một lần, không có công phu lúc 19:30")

    def test_cong_phu_window(self):
        got = self.run_at("2026-10-31T04:45", ["event_cong_phu", "event_cong_phu"])
        self.assertEqual(got, ["event_cong_phu"])


class ModerationInServerTests(ServerTestCase):
    def test_chat_and_speech_are_filtered(self):
        a = self.player("loc_a")
        b = self.player("loc_b")
        a.act({"type": "chat", "text": "dm vào https://lua-dao.xyz"})
        e = b.wait_for("chat")
        self.assertEqual(e["text"], "*** vào [liên kết]")
        a.state(speech="vcl")
        e = b.wait_for("player_state", lambda e: e["senderId"] == a.welcome["clientId"])
        self.assertEqual(e["player"]["speech"], "***")

    def test_bad_names_rejected(self):
        p = Player(self.server)
        self.assertEqual(p.register("ten_xau", name="Thằng vcl")[0], 400)
        q = self.player("ten_dep", connect=False)
        self.assertEqual(q.api("/api/profile", {"name": "đồ óc chó", "appearance": {}})[0], 400)


class ProductionModeTests(unittest.TestCase):
    """Chế độ chạy trên VPS sau Caddy: cookie Secure, IP thật lấy từ X-Real-IP."""

    @classmethod
    def setUpClass(cls):
        cls.server = TempleServer(env={"TRUST_PROXY": "1", "COOKIE_SECURE": "1", "HOST": "127.0.0.1"}).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def test_cookie_is_secure(self):
        req = urllib.request.Request(self.server.base + "/api/register", headers={"Content-Type": "application/json"},
                                     data=json.dumps({"username": "cookie_an_toan", "password": "mat-khau-thu"}).encode())
        with urllib.request.urlopen(req, timeout=5) as r:
            cookie = r.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("Secure", cookie)

    def test_throttle_is_per_real_ip(self):
        p = Player(self.server)
        p.register("nguoi_that")
        attacker = {"X-Real-IP": "203.0.113.9"}
        codes = [p.api("/api/login", {"username": "nguoi_that", "password": "sai"}, headers=attacker)[0] for _ in range(12)]
        self.assertIn(429, codes)
        other = {"X-Real-IP": "198.51.100.7"}
        self.assertEqual(p.api("/api/login", {"username": "nguoi_that", "password": "mat-khau-thu"}, headers=other)[0], 200,
                         "người chơi khác không bị chặn lây")


class SpoofedIpTests(ServerTestCase):
    def test_spoofed_ip_header_is_ignored_without_proxy(self):
        p = self.player("gia_ip", connect=False)
        codes = [p.api("/api/login", {"username": "gia_ip", "password": "sai"},
                       headers={"X-Real-IP": f"10.0.0.{i}"})[0] for i in range(12)]
        self.assertIn(429, codes, "không chạy sau proxy thì không được tin X-Real-IP do người dùng tự gửi")


class BruteForceTests(ServerTestCase):
    def test_wrong_passwords_are_throttled_but_correct_login_is_not(self):
        p = self.player("do_mat_khau", connect=False)
        for _ in range(3):
            self.assertEqual(p.api("/api/login", {"username": "do_mat_khau", "password": "mat-khau-thu"})[0], 200)
        codes = [p.api("/api/login", {"username": "do_mat_khau", "password": "sai"})[0] for _ in range(12)]
        self.assertIn(429, codes)


if __name__ == "__main__":
    unittest.main()
