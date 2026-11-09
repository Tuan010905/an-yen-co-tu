// Bầu trời theo giờ Việt Nam: màu trời, ánh nắng, hướng mặt trời, sao và trăng (khuyết/tròn theo ngày âm)

import * as THREE from 'three';
import { softSpriteTexture } from './props.js';

// Các mốc trong ngày; giữa hai mốc thì pha trộn dần
// Đêm vẫn đủ sáng để nhìn rõ sân chùa dưới ánh trăng
const NIGHT = { sky: '#3a4f8f', ground: '#1a2238', hemi: 0.62, sun: '#a9bcff', sunI: 0.75, bg: '#101c40', fog: '#16244a', lanterns: 1.4, stars: 1 };
const DAWN = { sky: '#f2b9a4', ground: '#4a3a40', hemi: 0.62, sun: '#ffb07a', sunI: 0.9, bg: '#e3a68f', fog: '#d9a08c', lanterns: 0.9, stars: 0.15 };
const DAY = { sky: '#bfe3f5', ground: '#6b8f5a', hemi: 0.9, sun: '#fff1d6', sunI: 2.2, bg: '#a9d6ec', fog: '#b9dceb', lanterns: 0.25, stars: 0 };
const SUNSET = { sky: '#f7b98a', ground: '#6a4e3a', hemi: 0.7, sun: '#ff9a5a', sunI: 1.5, bg: '#e9a27a', fog: '#e7a77f', lanterns: 0.7, stars: 0 };
const DUSK = { sky: '#6b6aa0', ground: '#2c2838', hemi: 0.55, sun: '#c78aa8', sunI: 0.6, bg: '#4f4f86', fog: '#55558a', lanterns: 1.2, stars: 0.5 };

const KEYS = [
  [0, NIGHT], [4.6, NIGHT], [5.6, DAWN], [7, DAY], [16.3, DAY], [17.6, SUNSET], [18.6, DUSK], [19.4, NIGHT], [24, NIGHT]
];

// Giờ cố định khi người chơi tự chọn khung cảnh thay vì theo giờ thật
export const MODE_HOURS = { day: 12, sunset: 17.6, night: 22 };

const mixColor = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

export function skyState(hours) {
  let i = 0;
  while (i < KEYS.length - 2 && hours >= KEYS[i + 1][0]) i++;
  const [h0, a] = KEYS[i];
  const [h1, b] = KEYS[i + 1];
  const t = h1 > h0 ? Math.min(1, Math.max(0, (hours - h0) / (h1 - h0))) : 0;
  const s = {};
  for (const k of Object.keys(a)) s[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : mixColor(a[k], b[k], t);
  // Mặt trời mọc ở phía đông lúc 6h, lên cao nhất lúc 12h, lặn phía tây lúc 18h; ban đêm ánh trăng chiếu từ trên cao
  const angle = ((hours - 6) / 12) * Math.PI;
  s.daylight = hours > 5.3 && hours < 18.9;
  s.sunPos = s.daylight
    ? new THREE.Vector3(Math.cos(angle) * 22, Math.max(3, Math.sin(angle) * 24), 9)
    : new THREE.Vector3(-10, 20, -8);
  s.period = hours >= 6.5 && hours < 16.8 ? 'day' : hours >= 16.8 && hours < 19 ? 'sunset' : 'night';
  return s;
}

// Mặt trăng vẽ theo pha: ngày 15 tròn, mùng 1 không thấy trăng
function moonTexture(lunarDay) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 30, 64, 64, 64);
  glow.addColorStop(0, 'rgba(255,246,214,0.45)');
  glow.addColorStop(1, 'rgba(255,246,214,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#fff6d6';
  ctx.beginPath();
  ctx.arc(64, 64, 30, 0, Math.PI * 2);
  ctx.fill();
  // Phần tối của trăng: một hình tròn che lệch sang bên theo số ngày tới Rằm
  const phase = ((lunarDay - 1) % 30) / 29.53; // 0 trăng non, 0.5 trăng tròn
  const lit = (1 - Math.cos(phase * Math.PI * 2)) / 2; // phần trăng được chiếu sáng
  const shift = 60 * lit; // lệch càng xa thì phần bị che càng nhỏ
  if (lit < 0.97) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    // Trăng đầu tháng sáng bên phải, cuối tháng sáng bên trái
    ctx.arc(64 + (phase < 0.5 ? -shift : shift), 64, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sao và trăng gắn vào một cảnh ngoài trời
export class NightSky {
  constructor(scene) {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * 85;
      positions[i * 3 + 1] = Math.cos(phi) * 85 + 5;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 85;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      map: softSpriteTexture(), color: '#fffbe8', size: 2.4, transparent: true, opacity: 0, depthWrite: false, fog: false
    }));
    scene.add(this.stars);

    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
    this.moon.scale.set(12, 12, 1);
    // Trăng treo thấp trên nền trời phía bắc, sau Chính Điện, để camera nhìn ngang vẫn thấy
    this.moon.position.set(-22, 20, -75);
    scene.add(this.moon);
    this.moonDay = -1;
  }

  update(state, lunarDay) {
    this.stars.material.opacity = state.stars;
    this.stars.visible = state.stars > 0.02;
    if (lunarDay !== this.moonDay) {
      if (this.moon.material.map) this.moon.material.map.dispose();
      this.moon.material.map = moonTexture(lunarDay);
      this.moon.material.needsUpdate = true;
      this.moonDay = lunarDay;
    }
    // Không thấy trăng quanh mùng 1 và ban ngày
    const visibleMoon = lunarDay > 2 && lunarDay < 29;
    this.moon.material.opacity = visibleMoon ? Math.min(1, state.stars * 1.2) : 0;
    this.moon.visible = this.moon.material.opacity > 0.02;
  }
}

// Áp trạng thái bầu trời vào một cảnh có đèn bán cầu (hemi) và nắng (sun)
export function applySky(scene, refs, state) {
  refs.hemi.color.set(state.sky);
  refs.hemi.groundColor.set(state.ground);
  refs.hemi.intensity = state.hemi;
  refs.sun.color.set(state.sun);
  refs.sun.intensity = state.sunI;
  refs.sun.position.copy(state.sunPos);
  if (!scene.background || !scene.background.isColor) scene.background = new THREE.Color();
  scene.background.set(state.bg);
  if (scene.fog) scene.fog.color.set(state.fog);
}
