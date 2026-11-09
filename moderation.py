"""
Lọc nội dung người chơi gửi lên (chat, điều ước, hoa đăng, lời nguyện, tên hiển thị).

- Từ tục được thay bằng *** trong lời nói; tên hiển thị chứa từ tục thì bị từ chối.
- Đường link bị thay bằng "[liên kết]" để tránh quảng cáo, lừa đảo.

Tiếng Việt bỏ dấu rất dễ trùng chữ bình thường (lồn/lớn, buồi/buổi, cặc/các, đéo/đeo),
nên những từ đó chỉ bị bắt khi viết đúng dấu; các kiểu viết tắt không dấu (dm, vcl...) thì luôn bị bắt.
Muốn thêm từ: thêm vào một trong hai danh sách dưới đây.
"""

import re
import unicodedata

# So khớp sau khi viết thường, giữ nguyên dấu
WITH_DIACRITICS = {
    "lồn", "buồi", "cặc", "đụ", "địt", "đĩ", "đéo", "đếch", "cứt",
    "đcm", "đm", "đmm", "đkm", "đjt",
}

# So khớp sau khi bỏ dấu (viết tắt, teencode, tiếng Anh)
WITHOUT_DIACRITICS = {
    "dm", "dmm", "dcm", "dcmm", "dkm", "dmcs", "vcl", "vkl", "vcc", "vl", "clm", "cmm", "cl", "loz", "lozz",
    "djt", "dit", "ditme", "dume", "duma", "vailon", "vailoz", "occho", "ocho",
    "fuck", "fucking", "fck", "fuk", "shit", "bitch", "dick", "pussy", "cunt", "asshole",
}

# Cụm từ, so khớp sau khi bỏ khoảng trắng: có dấu (tránh bắt nhầm "cho để", "con chờ để")
PHRASES_WITH_DIACRITICS = {"chóđẻ", "ócchó", "địtmẹ", "đụmẹ", "mẹmàyđĩ"}
# và vài kiểu viết không dấu gần như không bao giờ xuất hiện trong câu bình thường
PHRASES_WITHOUT_DIACRITICS = {"dimemay", "dumemay", "ditconme", "duconme"}

URL_RE = re.compile(r"(https?://\S+|www\.\S+|\b[\w-]+\.(com|net|org|vn|io|xyz|info|top|me|link)\b\S*)", re.IGNORECASE)
WORD_RE = re.compile(r"\w+", re.UNICODE)


def strip_accents(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.replace("đ", "d").replace("Đ", "D")


def squash_repeats(word):
    """'dmmmm' -> 'dmm', 'fuuuck' -> 'fuuck': chống kéo dài chữ để lách bộ lọc."""
    return re.sub(r"(.)\1{2,}", r"\1\1", word)


def _is_bad_word(word):
    lower = unicodedata.normalize("NFC", word).lower()
    if lower in WITH_DIACRITICS or squash_repeats(lower) in WITH_DIACRITICS:
        return True
    plain = strip_accents(lower)
    # Từ có dấu thật thì chỉ xét ở danh sách có dấu (để "buổi", "các" không bị bắt nhầm)
    if plain != lower and plain not in {"dm", "dmm", "dcm", "dkm"}:
        return False
    return plain in WITHOUT_DIACRITICS or squash_repeats(plain) in WITHOUT_DIACRITICS


def _has_bad_phrase(text):
    compact = re.sub(r"[\W_]+", "", unicodedata.normalize("NFC", text).lower())
    plain = strip_accents(compact)
    return any(p in compact for p in PHRASES_WITH_DIACRITICS) or any(p in plain for p in PHRASES_WITHOUT_DIACRITICS)


def clean_message(text):
    """Thay link và từ tục trong một lời nói. Trả về chuỗi đã lọc."""
    if not text:
        return text
    text = URL_RE.sub("[liên kết]", text)
    text = WORD_RE.sub(lambda m: "***" if _is_bad_word(m.group(0)) else m.group(0), text)
    if _has_bad_phrase(text):
        return "🙏 (lời nói đã được ẩn)"
    return text


def is_acceptable_name(name):
    """Tên hiển thị không được có từ tục hay đường link."""
    if not name or URL_RE.search(name) or _has_bad_phrase(name):
        return False
    return not any(_is_bad_word(w) for w in WORD_RE.findall(name))
