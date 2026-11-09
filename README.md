# 🪷 An Yên Cổ Tự — Đi Chùa Online

Ngôi chùa Việt 3D trên trình duyệt, nhiều người chơi cùng lúc: thắp hương, ngồi thiền, gõ mõ tụng kinh,
thả hoa đăng, xin xăm, treo điều ước và đón Rằm, mùng Một cùng mọi người — theo đúng giờ và lịch âm Việt Nam.

## Có gì trong chùa

- **Sân chùa 3D** và 6 không gian riêng: Chính Điện, Gác Đại Hồng Chung, Lầu Xin Xăm, Cây Nguyện Ước & Miếu Nguyệt Lão, Hồ Sen, Hiên Trà Thủy Đình.
- **Chính Điện**: ngồi thiền theo hơi thở, tụng Bát Nhã Tâm Kinh bằng cách gõ từng chữ (mỗi chữ một tiếng mõ), niệm Phật 108 biến, thỉnh chuông, đảnh lễ.
- **Nhân vật chibi 3D** xoay 360°, có thể tạo từ ảnh chân dung (nhận diện ngay trên máy, ảnh gốc không gửi đi).
- **Thời gian thực**: trời sáng tối theo giờ Việt Nam, trăng khuyết tròn theo ngày âm.
- **Lịch âm & sự kiện chung**: công phu sáng/chiều, Rằm, mùng Một, Đêm Hoa Đăng, Tết, Phật Đản, Vu Lan, Trung Thu…
- **Nhiều người chơi**: phòng chơi, chat, tiếng mõ chung trong điện, tài khoản và công đức lưu trên server, lọc từ ngữ xấu.

## Chạy thử trên máy

Chỉ cần Python 3.10 trở lên, không cần cài thêm thư viện:

```bash
python3 server.py
```

Mở <http://localhost:8080>, tạo tài khoản và vào chùa.

## Công nghệ

| Phần | Dùng gì |
|---|---|
| Giao diện | HTML, CSS, JavaScript |
| Đồ hoạ 3D | [Three.js](https://threejs.org) |
| Âm thanh | Web Audio API (tổng hợp bằng code, không dùng file nhạc) |
| Tạo nhân vật từ ảnh | [MediaPipe](https://ai.google.dev/edge/mediapipe) chạy trong trình duyệt |
| Server | Python (`http.server`), REST + Server-Sent Events |
| Dữ liệu | SQLite |
| Lịch âm | Thuật toán Hồ Ngọc Đức (`lunar.py`, `js/calendar.js`) |

## Kiểm thử

```bash
python3 -m unittest discover -s tests -v
```

## Đưa lên mạng

Xem hướng dẫn từng bước bằng tiếng Việt: [deploy/HUONG_DAN_TRIEN_KHAI.md](deploy/HUONG_DAN_TRIEN_KHAI.md).
