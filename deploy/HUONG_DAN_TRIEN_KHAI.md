# Đưa An Yên Cổ Tự lên mạng

Hướng dẫn này đưa game lên một VPS (máy chủ thuê theo tháng) có tên miền riêng và HTTPS.
Làm lần đầu mất khoảng 30–45 phút. Các lần cập nhật sau chỉ mất 1 phút.

---

## 0. Cần chuẩn bị

| Thứ cần có | Gợi ý | Chi phí tham khảo |
|---|---|---|
| **VPS** chạy **Ubuntu 24.04** (hoặc 22.04), 1 nhân, 1–2 GB RAM | Nhà cung cấp Việt Nam (Vietnix, BizFly Cloud, AZDIGI…) cho người chơi trong nước nhanh nhất; hoặc Vultr / DigitalOcean ở Singapore | khoảng 120–200 nghìn/tháng |
| **Tên miền** | `.com` hoặc `.vn` ở Mắt Bão, PA Vietnam, Tenten, Namecheap… | khoảng 250–350 nghìn/năm (`.com`) |

Khi thuê VPS, bạn sẽ nhận được **địa chỉ IP** (ví dụ `103.12.34.56`) và **mật khẩu root**.

> Giá chỉ để tham khảo; hãy kiểm tra giá hiện tại khi thuê.

---

## 1. Trỏ tên miền về VPS

Vào trang quản lý tên miền (nơi bạn mua), mục **Quản lý DNS**, thêm 2 bản ghi:

| Loại | Tên (Host) | Giá trị | 
|---|---|---|
| A | `@` | IP của VPS |
| A | `www` | IP của VPS |

Đợi 5–30 phút để tên miền nhận IP mới.

---

## 2. Đưa code lên VPS

Mở **Terminal** trên máy Mac, chạy (thay `103.12.34.56` bằng IP VPS của bạn):

```bash
ssh root@103.12.34.56 "mkdir -p /opt/anyen"
```

```bash
cd "/Users/macbook/Documents/Website đi chùa online" && rsync -av --exclude data --exclude backups --exclude tests --exclude .claude --exclude __pycache__ ./ root@103.12.34.56:/opt/anyen/
```

Muốn **giữ tài khoản và dữ liệu** đang có trên máy, chép thêm cơ sở dữ liệu (làm trước bước 3):

```bash
ssh root@103.12.34.56 "mkdir -p /opt/anyen/data" && scp "/Users/macbook/Documents/Website đi chùa online/data/temple.db" root@103.12.34.56:/opt/anyen/data/
```

---

## 3. Chạy script cài đặt

Đăng nhập vào VPS:

```bash
ssh root@103.12.34.56
```

Rồi chạy (thay bằng tên miền thật của bạn):

```bash
sudo bash /opt/anyen/deploy/cai-dat-vps.sh ten-mien-cua-ban.vn
```

Script sẽ tự:
1. Cài Python và **Caddy** (máy chủ web tự xin chứng chỉ HTTPS miễn phí).
2. Tạo tài khoản hệ thống riêng `anyen` để chạy game (an toàn hơn chạy bằng root).
3. Bật game thành **dịch vụ**: tự chạy khi VPS khởi động, tự bật lại nếu bị lỗi.
4. Bật tường lửa, chỉ mở cổng SSH, HTTP, HTTPS.
5. Sao lưu dữ liệu tự động lúc 3:30 sáng mỗi ngày, giữ 14 bản gần nhất.

Thấy dòng `🪷 Xong!` là thành công. Mở `https://ten-mien-cua-ban.vn` để vào chùa.

---

## 4. Cập nhật phiên bản mới

Mỗi khi game có thay đổi, trên máy Mac chạy lại lệnh `rsync` ở bước 2, rồi:

```bash
ssh root@103.12.34.56 "systemctl restart anyen"
```

Người đang chơi sẽ tự kết nối lại sau vài giây, không mất dữ liệu.

---

## 5. Khi cần kiểm tra

| Việc | Lệnh (chạy trên VPS) |
|---|---|
| Game có đang chạy không | `systemctl status anyen` |
| Xem lỗi gần nhất | `journalctl -u anyen -n 50` |
| Khởi động lại game | `systemctl restart anyen` |
| Xem lỗi HTTPS / tên miền | `journalctl -u caddy -n 50` |
| Sao lưu ngay | `sudo -u anyen python3 /opt/anyen/deploy/backup.py --data-dir /opt/anyen/data --out /opt/anyen/backups` |
| Xem các bản sao lưu | `ls -lh /opt/anyen/backups` |

**Khôi phục từ bản sao lưu:**

```bash
systemctl stop anyen && cp /opt/anyen/backups/temple-NGAYGIO.db /opt/anyen/data/temple.db && chown anyen:anyen /opt/anyen/data/temple.db && systemctl start anyen
```

Nên thỉnh thoảng tải một bản sao lưu về máy Mac (phòng khi VPS hỏng):

```bash
scp "root@103.12.34.56:/opt/anyen/backups/temple-*.db" ~/Downloads/
```

---

## 6. Đã cài sẵn những gì để chạy công khai

- **HTTPS** tự động qua Caddy; cookie đăng nhập chỉ gửi qua HTTPS.
- **Lấy đúng IP người chơi** sau Caddy, nên chặn dò mật khẩu chỉ chặn đúng người dò.
- **Lọc nội dung**: từ tục trong chat, điều ước, hoa đăng, lời nguyện bị thay bằng `***`; đường link bị thay bằng `[liên kết]`; tên hiển thị có từ tục bị từ chối. Muốn thêm từ cần lọc, sửa danh sách trong `moderation.py`.
- **Server chỉ nghe ở 127.0.0.1**: người ngoài không vào thẳng cổng 8080 được, mọi truy cập phải qua Caddy.

## 7. Giới hạn hiện tại

- Một VPS nhỏ phục vụ tốt khoảng **vài trăm người cùng lúc**. Đông hơn thì nâng cấu hình VPS.
- Mỗi phòng tối đa 40 người; người thứ 41 tự được chuyển sang phòng kế tiếp.
- Chưa có trang quản trị để ẩn điều ước hay khoá tài khoản xấu; bộ lọc từ ngữ là lớp bảo vệ duy nhất.
- Chưa có chức năng quên mật khẩu.
