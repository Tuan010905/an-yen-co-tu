"""
Lịch âm Việt Nam và các sự kiện chung của chùa (giờ Việt Nam, UTC+7).
Thuật toán đổi lịch: Hồ Ngọc Đức (https://www.informatik.uni-leipzig.de/~duc/amlich/), bản JavaScript tương ứng ở js/calendar.js.
Server dùng để kiểm tra một phần thưởng sự kiện có đang diễn ra thật không.
"""

import math
import os
from datetime import datetime, timedelta, timezone

VN_TZ = timezone(timedelta(hours=7))
TIME_ZONE = 7


def jd_from_date(dd, mm, yy):
    a = (14 - mm) // 12
    y = yy + 4800 - a
    m = mm + 12 * a - 3
    jd = dd + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    if jd < 2299161:
        jd = dd + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083
    return jd


def new_moon(k):
    T = k / 1236.85
    T2 = T * T
    T3 = T2 * T
    dr = math.pi / 180
    jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
    jd1 += 0.00033 * math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr)
    M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3
    Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3
    F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3
    C1 = (0.1734 - 0.000393 * T) * math.sin(M * dr) + 0.0021 * math.sin(2 * dr * M)
    C1 = C1 - 0.4068 * math.sin(Mpr * dr) + 0.0161 * math.sin(dr * 2 * Mpr)
    C1 = C1 - 0.0004 * math.sin(dr * 3 * Mpr)
    C1 = C1 + 0.0104 * math.sin(dr * 2 * F) - 0.0051 * math.sin(dr * (M + Mpr))
    C1 = C1 - 0.0074 * math.sin(dr * (M - Mpr)) + 0.0004 * math.sin(dr * (2 * F + M))
    C1 = C1 - 0.0004 * math.sin(dr * (2 * F - M)) - 0.0006 * math.sin(dr * (2 * F + Mpr))
    C1 = C1 + 0.0010 * math.sin(dr * (2 * F - Mpr)) + 0.0005 * math.sin(dr * (2 * Mpr + M))
    if T < -11:
        deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    else:
        deltat = -0.000278 + 0.000265 * T + 0.000262 * T2
    return jd1 + C1 - deltat


def sun_longitude(jdn):
    T = (jdn - 2451545.0) / 36525
    T2 = T * T
    dr = math.pi / 180
    M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2
    L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
    DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * math.sin(dr * M)
    DL += (0.019993 - 0.000101 * T) * math.sin(dr * 2 * M) + 0.000290 * math.sin(dr * 3 * M)
    L = (L0 + DL) * dr
    return L - math.pi * 2 * math.floor(L / (math.pi * 2))


def get_sun_longitude(day_number, tz):
    return int(math.floor(sun_longitude(day_number - 0.5 - tz / 24) / math.pi * 6))


def get_new_moon_day(k, tz):
    return int(math.floor(new_moon(k) + 0.5 + tz / 24))


def get_lunar_month11(yy, tz):
    off = jd_from_date(31, 12, yy) - 2415021
    k = int(math.floor(off / 29.530588853))
    nm = get_new_moon_day(k, tz)
    if get_sun_longitude(nm, tz) >= 9:
        nm = get_new_moon_day(k - 1, tz)
    return nm


def get_leap_month_offset(a11, tz):
    k = int(math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5))
    i = 1
    arc = get_sun_longitude(get_new_moon_day(k + i, tz), tz)
    while True:
        last = arc
        i += 1
        arc = get_sun_longitude(get_new_moon_day(k + i, tz), tz)
        if arc == last or i >= 14:
            break
    return i - 1


def solar_to_lunar(dd, mm, yy, tz=TIME_ZONE):
    """Trả về (ngày âm, tháng âm, năm âm, có phải tháng nhuận)."""
    day_number = jd_from_date(dd, mm, yy)
    k = int(math.floor((day_number - 2415021.076998695) / 29.530588853))
    month_start = get_new_moon_day(k + 1, tz)
    if month_start > day_number:
        month_start = get_new_moon_day(k, tz)
    a11 = get_lunar_month11(yy, tz)
    b11 = a11
    if a11 >= month_start:
        lunar_year = yy
        a11 = get_lunar_month11(yy - 1, tz)
    else:
        lunar_year = yy + 1
        b11 = get_lunar_month11(yy + 1, tz)
    lunar_day = day_number - month_start + 1
    diff = int(math.floor((month_start - a11) / 29))
    leap = False
    lunar_month = diff + 11
    if b11 - a11 > 365:
        leap_diff = get_leap_month_offset(a11, tz)
        if diff >= leap_diff:
            lunar_month = diff + 10
            if diff == leap_diff:
                leap = True
    if lunar_month > 12:
        lunar_month -= 12
    if lunar_month >= 11 and diff < 4:
        lunar_year -= 1
    return lunar_day, lunar_month, lunar_year, leap


# ---------------- Sự kiện chung (phải khớp EVENTS trong js/calendar.js) ----------------

FESTIVALS = {
    (1, 1): "tet", (2, 1): "tet", (3, 1): "tet",
    (15, 1): "ram_thang_gieng", (15, 4): "phat_dan", (15, 7): "vu_lan",
    (15, 8): "trung_thu", (15, 10): "ram_thang_muoi",
}


def vn_now():
    # Chỉ dùng khi chạy test: TEMPLE_FAKE_NOW="2026-11-23T19:30" (giờ Việt Nam)
    fake = os.environ.get("TEMPLE_FAKE_NOW")
    if fake:
        return datetime.fromisoformat(fake).replace(tzinfo=VN_TZ)
    return datetime.now(VN_TZ)


def active_events(now=None):
    """Tập id các sự kiện đang diễn ra theo giờ Việt Nam."""
    now = now or vn_now()
    minutes = now.hour * 60 + now.minute
    lday, lmonth, _, leap = solar_to_lunar(now.day, now.month, now.year)
    events = set()
    if 4 * 60 + 30 <= minutes < 5 * 60 + 30:
        events.add("cong_phu_sang")
    if 17 * 60 <= minutes < 18 * 60:
        events.add("cong_phu_chieu")
    if lday == 1:
        events.add("mung_mot")
    if lday == 15:
        events.add("ram")
        if 19 * 60 <= minutes < 22 * 60:
            events.add("dem_hoa_dang")
    if not leap and (lday, lmonth) in FESTIVALS:
        events.add(FESTIVALS[(lday, lmonth)])
    return events
