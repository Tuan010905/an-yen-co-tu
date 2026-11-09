#!/usr/bin/env python3
"""
Sao lưu cơ sở dữ liệu An Yên Cổ Tự (an toàn kể cả khi server đang chạy), giữ lại các bản gần nhất.

    python3 deploy/backup.py                      # sao lưu data/temple.db vào backups/
    python3 deploy/backup.py --keep 30            # giữ 30 bản gần nhất (mặc định 14)

Trên VPS, chạy tự động mỗi đêm bằng cron (xem deploy/HUONG_DAN_TRIEN_KHAI.md).
"""

import argparse
import os
import sqlite3
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    parser = argparse.ArgumentParser(description="Sao lưu temple.db")
    parser.add_argument("--data-dir", default=os.environ.get("TEMPLE_DATA_DIR") or os.path.join(ROOT, "data"))
    parser.add_argument("--out", default=os.path.join(ROOT, "backups"))
    parser.add_argument("--keep", type=int, default=14)
    args = parser.parse_args()

    source = os.path.join(args.data_dir, "temple.db")
    if not os.path.exists(source):
        print(f"Không thấy cơ sở dữ liệu: {source}", file=sys.stderr)
        return 1
    os.makedirs(args.out, exist_ok=True)
    target = os.path.join(args.out, f"temple-{datetime.now():%Y%m%d-%H%M%S}.db")

    # Dùng API sao lưu của SQLite: chép nhất quán ngay cả khi server đang ghi
    with sqlite3.connect(source) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    print(f"Đã sao lưu: {target}")

    backups = sorted(f for f in os.listdir(args.out) if f.startswith("temple-") and f.endswith(".db"))
    for old in backups[:-args.keep]:
        os.remove(os.path.join(args.out, old))
        print(f"Đã xoá bản cũ: {old}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
