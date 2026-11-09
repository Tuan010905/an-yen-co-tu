// Lịch chùa: giờ Việt Nam (UTC+7) cho mọi người chơi, lịch âm, can chi và các sự kiện chung.
// Thuật toán đổi lịch âm: Hồ Ngọc Đức — bản Python tương ứng ở lunar.py (server dùng để kiểm tra phần thưởng)

const VN_OFFSET_MS = 7 * 3600 * 1000;
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function jdFromDate(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltat;
}

function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  const L = (L0 + DL) * dr;
  return L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
}

const getSunLongitude = (dayNumber, tz) => Math.floor(sunLongitude(dayNumber - 0.5 - tz / 24) / Math.PI * 6);
const getNewMoonDay = (k, tz) => Math.floor(newMoon(k) + 0.5 + tz / 24);

function getLunarMonth11(yy, tz) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, tz);
  if (getSunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
  return nm;
}

function getLeapMonthOffset(a11, tz) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  let last;
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

// Dương lịch -> âm lịch: { day, month, year, leap }
function solarToLunar(dd, mm, yy, tz = 7) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
  let a11 = getLunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, tz);
  }
  const day = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapDiff) {
      month = diff + 10;
      if (diff === leapDiff) leap = true;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { day, month, year: lunarYear, leap };
}

const yearName = y => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
const hourName = h => `Giờ ${CHI[Math.floor((h + 1) / 2) % 12]}`;
const lunarMonthName = m => ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'][m - 1];

// ---------------- Sự kiện chung (phải khớp active_events trong lunar.py) ----------------

const FESTIVALS = {
  '1-1': 'tet', '2-1': 'tet', '3-1': 'tet', '15-1': 'ram_thang_gieng', '15-4': 'phat_dan',
  '15-7': 'vu_lan', '15-8': 'trung_thu', '15-10': 'ram_thang_muoi'
};

const EVENTS = {
  cong_phu_sang: {
    icon: '🔔', name: 'Công Phu Sáng', time: '4:30 – 5:30 mỗi ngày', zone: 'chinh_dien',
    text: 'Chuông công phu đã điểm. Sư Thầy đang dẫn chúng tụng kinh trong Chính Điện, mời bạn vào ngồi gõ mõ cùng.'
  },
  cong_phu_chieu: {
    icon: '🔔', name: 'Công Phu Chiều', time: '17:00 – 18:00 mỗi ngày', zone: 'chinh_dien',
    text: 'Thời kinh chiều đang diễn ra trong Chính Điện. Cùng gõ mõ tụng kinh với mọi người nhé.'
  },
  mung_mot: {
    icon: '🌑', name: 'Lễ Mùng Một (Sóc)', time: 'Ngày mùng 1 âm lịch', zone: 'chinh_dien',
    text: 'Hôm nay mùng Một. Dâng một nén tâm hương đầu tháng để cầu bình an.'
  },
  ram: {
    icon: '🌕', name: 'Lễ Rằm (Vọng)', time: 'Ngày 15 âm lịch', zone: 'chinh_dien',
    text: 'Hôm nay ngày Rằm. Thắp hương lễ Phật, tối nay có Đêm Hoa Đăng bên Hồ Sen.'
  },
  dem_hoa_dang: {
    icon: '🪷', name: 'Đêm Hoa Đăng Rằm', time: '19:00 – 22:00 ngày Rằm', zone: 'ho_sen',
    text: 'Đêm Hoa Đăng đã bắt đầu! Mọi người cùng ra Hồ Sen thả đèn dưới trăng tròn.'
  },
  tet: {
    icon: '🧧', name: 'Tết Nguyên Đán', time: 'Mùng 1 – 3 tháng Giêng', zone: 'chinh_dien', festival: true,
    text: 'Chúc mừng năm mới! Đi chùa đầu xuân, xin lộc, cầu một năm an lành.'
  },
  ram_thang_gieng: {
    icon: '🏮', name: 'Rằm Tháng Giêng (Tết Nguyên Tiêu)', time: '15 tháng Giêng', zone: 'chinh_dien', festival: true,
    text: 'Lễ Thượng Nguyên — "lễ quanh năm không bằng Rằm tháng Giêng". Mời bạn dâng hương cầu an.'
  },
  phat_dan: {
    icon: '🪷', name: 'Đại Lễ Phật Đản', time: '15 tháng Tư', zone: 'chinh_dien', festival: true,
    text: 'Kính mừng Đức Phật đản sinh. Chùa treo cờ Phật giáo và đèn hoa sen, mời bạn vào lễ Phật.'
  },
  vu_lan: {
    icon: '🌹', name: 'Đại Lễ Vu Lan Báo Hiếu', time: '15 tháng Bảy', zone: 'chinh_dien', festival: true,
    text: 'Mùa báo hiếu. Thắp hương và thả hoa đăng tưởng nhớ, tri ân cha mẹ.'
  },
  trung_thu: {
    icon: '🥮', name: 'Tết Trung Thu', time: '15 tháng Tám', zone: 'ho_sen', festival: true,
    text: 'Trăng rằm tháng Tám sáng nhất năm. Chùa treo đèn ông sao, mời ra Hồ Sen ngắm trăng.'
  },
  ram_thang_muoi: {
    icon: '🌾', name: 'Rằm Tháng Mười (Tết Hạ Nguyên)', time: '15 tháng Mười', zone: 'chinh_dien', festival: true,
    text: 'Lễ Hạ Nguyên, mùa gặt mới. Dâng hương tạ ơn trời đất, cầu cho mùa màng bình yên.'
  }
};

class TempleCalendar {
  constructor() {
    this.serverOffset = 0; // chênh lệch đồng hồ máy người chơi so với server (ms)
    this.events = EVENTS;
    this.lightMode = 'auto'; // 'auto' theo giờ thật, hoặc 'day' | 'sunset' | 'night' do người chơi chọn
    try {
      const saved = localStorage.getItem('an_yen_light_mode');
      if (['auto', 'day', 'sunset', 'night'].includes(saved)) this.lightMode = saved;
    } catch (e) {}
  }

  setServerTime(ms) {
    if (typeof ms === 'number') this.serverOffset = ms - Date.now();
  }

  setLightMode(mode) {
    this.lightMode = mode;
    try {
      localStorage.setItem('an_yen_light_mode', mode);
    } catch (e) {}
  }

  // Giờ Việt Nam hiện tại (dùng các hàm getUTC* trên mốc đã cộng 7 tiếng)
  vnDate(ms = Date.now() + this.serverOffset) {
    return new Date(ms + VN_OFFSET_MS);
  }

  info(ms) {
    const d = this.vnDate(ms);
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    const lunar = solarToLunar(day, month, year);
    return {
      day, month, year, hours,
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      weekday: WEEKDAYS[d.getUTCDay()],
      lunar,
      lunarYearName: yearName(lunar.year),
      hourName: hourName(d.getUTCHours())
    };
  }

  activeEventIds(ms) {
    // Gọi mỗi khung hình nên nhớ kết quả trong 15 giây
    if (ms === undefined) {
      const bucket = Math.floor((Date.now() + this.serverOffset) / 15000);
      if (this.cache && this.cache.bucket === bucket) return this.cache.ids;
      const ids = this.activeEventIds(Date.now() + this.serverOffset);
      this.cache = { bucket, ids };
      return ids;
    }
    const i = this.info(ms);
    const minutes = i.hour * 60 + i.minute;
    const ids = [];
    if (minutes >= 270 && minutes < 330) ids.push('cong_phu_sang');
    if (minutes >= 1020 && minutes < 1080) ids.push('cong_phu_chieu');
    if (i.lunar.day === 1) ids.push('mung_mot');
    if (i.lunar.day === 15) {
      ids.push('ram');
      if (minutes >= 1140 && minutes < 1320) ids.push('dem_hoa_dang');
    }
    const fest = !i.lunar.leap && FESTIVALS[`${i.lunar.day}-${i.lunar.month}`];
    if (fest) ids.push(fest);
    return ids;
  }

  isActive(id) {
    return this.activeEventIds().includes(id);
  }

  // Lễ lớn đang diễn ra (để trang trí sân chùa)
  festival() {
    return this.activeEventIds().find(id => EVENTS[id].festival) || null;
  }

  // Các ngày lễ sắp tới trong ~400 ngày: Rằm, mùng Một gần nhất và các đại lễ
  upcoming(limit = 8) {
    const out = [];
    const seen = new Set();
    const now = this.vnDate();
    const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    for (let n = 0; n < 400 && out.length < limit; n++) {
      const d = new Date(base + n * 86400000);
      const dd = d.getUTCDate();
      const mm = d.getUTCMonth() + 1;
      const yy = d.getUTCFullYear();
      const l = solarToLunar(dd, mm, yy);
      const fest = !l.leap && FESTIVALS[`${l.day}-${l.month}`];
      const ids = [];
      if (fest && !(fest === 'tet' && l.day > 1)) ids.push(fest);
      if (l.day === 15 && !seen.has('ram')) ids.push('ram');
      if (l.day === 1 && !seen.has('mung_mot') && fest !== 'tet') ids.push('mung_mot');
      for (const id of ids) {
        if (id === 'ram' || id === 'mung_mot') seen.add(id);
        out.push({
          id, ...EVENTS[id], daysAway: n,
          solar: `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yy}`,
          lunar: `${l.day}/${l.month}${l.leap ? ' nhuận' : ''}`
        });
      }
    }
    return out.slice(0, limit);
  }

  // Dòng ngắn hiện trên HUD
  shortLabel() {
    const i = this.info();
    const hh = String(i.hour).padStart(2, '0');
    const mm = String(i.minute).padStart(2, '0');
    const special = i.lunar.day === 15 ? 'Rằm' : i.lunar.day === 1 ? 'Mùng Một' : `${i.lunar.day}/${i.lunar.month}`;
    return `🕰️ ${hh}:${mm} • ${special}`;
  }

  // Mô tả ngày âm đầy đủ
  lunarText(i = this.info()) {
    const dayText = i.lunar.day <= 10 ? `mùng ${i.lunar.day}` : `ngày ${i.lunar.day}`;
    return `${dayText} tháng ${lunarMonthName(i.lunar.month)}${i.lunar.leap ? ' (nhuận)' : ''} năm ${i.lunarYearName}`;
  }
}

window.TempleCalendarUtils = { solarToLunar, yearName, hourName, lunarMonthName, EVENTS };
window.templeCalendar = new TempleCalendar();
