#!/usr/bin/env bash
# Cài An Yên Cổ Tự lên VPS Ubuntu 22.04 / 24.04 mới (chạy một lần, chạy lại cũng không sao).
# Cách dùng (trên VPS, code đã nằm ở /opt/anyen):
#     sudo bash /opt/anyen/deploy/cai-dat-vps.sh ten-mien-cua-ban.vn
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/anyen

if [ -z "$DOMAIN" ]; then
  echo "Cách dùng: sudo bash $APP_DIR/deploy/cai-dat-vps.sh ten-mien-cua-ban.vn"
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "Hãy chạy bằng quyền root (thêm sudo ở đầu lệnh)."
  exit 1
fi
if [ ! -f "$APP_DIR/server.py" ]; then
  echo "Chưa thấy code ở $APP_DIR. Hãy đưa code lên trước (xem HUONG_DAN_TRIEN_KHAI.md, bước 2)."
  exit 1
fi

echo "==> 1/6 Cài Python và công cụ cần thiết"
apt-get update -y
apt-get install -y python3 curl gnupg ufw debian-keyring debian-archive-keyring apt-transport-https

echo "==> 2/6 Cài Caddy (máy chủ web có HTTPS tự động)"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> 3/6 Tạo tài khoản hệ thống riêng cho game (không chạy bằng root)"
id anyen >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin anyen
mkdir -p "$APP_DIR/data" "$APP_DIR/backups"
chown -R anyen:anyen "$APP_DIR/data" "$APP_DIR/backups"

echo "==> 4/6 Bật dịch vụ game và cấu hình Caddy cho $DOMAIN"
install -m 644 "$APP_DIR/deploy/anyen.service" /etc/systemd/system/anyen.service
sed "s/ten-mien-cua-ban\.vn/$DOMAIN/g" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload
systemctl enable anyen
systemctl restart anyen
systemctl enable caddy
systemctl restart caddy

echo "==> 5/6 Tường lửa: chỉ mở SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> 6/6 Sao lưu tự động lúc 3:30 sáng mỗi ngày (giữ 14 bản)"
cat > /etc/cron.d/anyen-backup <<CRON
30 3 * * * anyen /usr/bin/python3 $APP_DIR/deploy/backup.py --data-dir $APP_DIR/data --out $APP_DIR/backups --keep 14 >> $APP_DIR/backups/backup.log 2>&1
CRON
chmod 644 /etc/cron.d/anyen-backup

sleep 2
if systemctl is-active --quiet anyen; then
  echo ""
  echo "🪷 Xong! Mở https://$DOMAIN để vào chùa."
  echo "   (Lần đầu Caddy cần khoảng 1 phút để xin chứng chỉ HTTPS.)"
else
  echo "Server chưa chạy được. Xem lỗi bằng: journalctl -u anyen -n 50"
  exit 1
fi
