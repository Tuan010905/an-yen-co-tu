"""Kiểm tra lịch âm (lunar.py) với các ngày lễ đã biết và lịch sự kiện chung."""

import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import lunar  # noqa: E402


class LunarTests(unittest.TestCase):
    KNOWN = {
        (22, 1, 2023): (1, 1, 2023, False),   # Tết Quý Mão
        (10, 2, 2024): (1, 1, 2024, False),   # Tết Giáp Thìn
        (29, 1, 2025): (1, 1, 2025, False),   # Tết Ất Tỵ
        (17, 2, 2026): (1, 1, 2026, False),   # Tết Bính Ngọ
        (6, 2, 2027): (1, 1, 2027, False),    # Tết Đinh Mùi
        (12, 2, 2025): (15, 1, 2025, False),  # Rằm tháng Giêng
        (12, 5, 2025): (15, 4, 2025, False),  # Phật Đản
        (6, 9, 2025): (15, 7, 2025, False),   # Vu Lan
        (6, 10, 2025): (15, 8, 2025, False),  # Trung Thu
        (22, 1, 2025): (23, 12, 2024, False), # Ông Công ông Táo
        (25, 7, 2025): (1, 6, 2025, True),    # Mùng 1 tháng 6 nhuận
    }

    def test_known_dates(self):
        for solar, expected in self.KNOWN.items():
            self.assertEqual(lunar.solar_to_lunar(*solar), expected, solar)

    def test_events(self):
        at = lambda s: lunar.active_events(datetime.fromisoformat(s).replace(tzinfo=lunar.VN_TZ))
        self.assertEqual(at("2026-10-31T12:00"), set())
        self.assertEqual(at("2026-10-31T04:30"), {"cong_phu_sang"})
        self.assertEqual(at("2026-10-31T17:59"), {"cong_phu_chieu"})
        self.assertEqual(at("2026-11-23T19:30"), {"ram", "dem_hoa_dang", "ram_thang_muoi"})
        self.assertEqual(at("2026-11-09T08:00"), {"mung_mot"})
        self.assertIn("tet", at("2027-02-07T09:00"))
        self.assertIn("phat_dan", at("2027-05-20T09:00"))


if __name__ == "__main__":
    unittest.main()
