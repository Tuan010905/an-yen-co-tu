"""Kiểm tra bộ lọc nội dung: lọc từ tục, đường link, nhưng không bắt nhầm câu bình thường."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from moderation import clean_message, is_acceptable_name  # noqa: E402


class ModerationTests(unittest.TestCase):
    def test_normal_sentences_untouched(self):
        for text in [
            "Cầu mong cha mẹ luôn mạnh khỏe, lớn lên bình an",
            "Buổi sáng các bạn đeo nón lá đi chùa",
            "Cho để mình đi trước", "Con chờ để lễ xong", "Thầy cho đệ tử một chén trà",
            "đu đủ chín cây", "Đà Nẵng đẹp lắm", "Hôm nay mùng Một",
        ]:
            self.assertEqual(clean_message(text), text, text)

    def test_profanity_and_links_filtered(self):
        self.assertEqual(clean_message("dm thằng kia"), "*** thằng kia")
        self.assertEqual(clean_message("VCL luôn"), "*** luôn")
        self.assertEqual(clean_message("dmmmmm"), "***")
        self.assertEqual(clean_message("vào https://lua-dao.xyz nhận quà"), "vào [liên kết] nhận quà")
        self.assertEqual(clean_message("ghé www.abc.com nhé"), "ghé [liên kết] nhé")
        self.assertNotIn("chó", clean_message("đồ óc chó"))

    def test_names(self):
        self.assertTrue(is_acceptable_name("Minh Anh"))
        self.assertTrue(is_acceptable_name("Buổi Sáng"))
        self.assertFalse(is_acceptable_name("Thằng vcl"))
        self.assertFalse(is_acceptable_name("abc.com"))


if __name__ == "__main__":
    unittest.main()
