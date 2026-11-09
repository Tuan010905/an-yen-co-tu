// Không gian riêng của các khu trong chùa: Gác Chuông, Lầu Xin Xăm, Cây Nguyện Ước, Hồ Sen, Hiên Trà
// Mỗi khu là một THREE.Scene riêng. Toạ độ logic giống sân chùa (tâm khu ở 800, 550), bố cục xem TEMPLE_DATA.zones

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  toX, toZ, std, gold, box, cyl, sphere, makeRoof, plaque, textTexture, woodTexture, makeHangingLantern,
  makeIncenseBurner, makeBuddha, makeTree, makeBamboo, softSpriteTexture
} from './props.js';
import { NightSky } from './sky.js';

const soft = softSpriteTexture();

function glowSprite(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: soft, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  s.scale.set(size, size, 1);
  return s;
}

function exitPick(x, z, w = 3, d = 1.2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, 0.1, z);
  m.userData.pick = { type: 'door' };
  return m;
}

function setPick(obj, pick) {
  obj.traverse((o) => { if (o.isMesh) o.userData.pick = pick; });
}

// Dãy núi xa mờ trong sương làm phông nền cho các khu ngoài trời
function addMountains(scene, color, radius = 55, seed = 3) {
  let r = seed;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const mat = std(color, { flatShading: true, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
    const h = 10 + rand() * 16;
    const m = new THREE.Mesh(new THREE.ConeGeometry(10 + rand() * 10, h, 5), mat);
    m.position.set(Math.cos(a) * radius, h / 2 - 2, Math.sin(a) * radius);
    m.rotation.y = rand() * Math.PI;
    scene.add(m);
  }
}

function addFireflies(scene, count, area, color = '#ffe48a') {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = 0.5 + Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    map: soft, color, size: 0.18, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  points.userData.base = positions.slice();
  scene.add(points);
  return points;
}

function driftFireflies(points, time) {
  const pos = points.geometry.attributes.position;
  const base = points.userData.base;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, base[i * 3] + Math.sin(time * 0.5 + i) * 0.6);
    pos.setY(i, base[i * 3 + 1] + Math.sin(time * 0.8 + i * 1.7) * 0.3);
    pos.setZ(i, base[i * 3 + 2] + Math.cos(time * 0.4 + i) * 0.6);
  }
  pos.needsUpdate = true;
  points.material.opacity = 0.6 + Math.sin(time * 2) * 0.25;
}

function outdoorLights(scene, { sky, ground, hemi, sun, sunI, bg, fog, fogNear = 30, fogFar = 95, sunPos = [-12, 18, 10], shadow = true }) {
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(fog, fogNear, fogFar);
  const hemiLight = new THREE.HemisphereLight(sky, ground, hemi);
  scene.add(hemiLight);
  const light = new THREE.DirectionalLight(sun, sunI);
  light.position.set(...sunPos);
  if (shadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    const c = light.shadow.camera;
    c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 60;
    light.shadow.bias = -0.0006;
  }
  scene.add(light);
  // Bộ dựng hình dùng để đổi màu trời theo giờ thật
  scene.userData.sky = { hemi: hemiLight, sun: light, night: new NightSky(scene) };
  return light;
}

function groundPlane(scene, color, size = 160) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), std(color));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  scene.add(g);
  return g;
}

function exitLabel(labels, x, z, h = 1.6) {
  labels.push({ text: '⬇ Về Sân Chùa', position: new THREE.Vector3(x, h, z), className: 'place-label' });
}

// =====================================================================
// GÁC ĐẠI HỒNG CHUNG
// =====================================================================
export class BellTowerSpace {
  constructor() {
    this.scene = new THREE.Scene();
    this.labels = [];
    this.waves = [];
    this.strikeStart = -1;
    const z = toZ(530);
    this.bellZ = z;

    outdoorLights(this.scene, { sky: '#cfe6f2', ground: '#6b7f5a', hemi: 0.9, sun: '#fff0d2', sunI: 2.0, bg: '#bcd8e8', fog: '#c6dde8', fogNear: 25, fogFar: 85 });
    groundPlane(this.scene, '#6f8f5e');
    addMountains(this.scene, '#86a39a', 55, 5);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = makeTree({ trunkH: 2.4, trunkR: 0.3, canopy: 1.8, seed: 20 + i, colors: ['#3d6b45', '#4f8256', '#5d9463'] });
      t.position.set(Math.cos(a) * 21, 0, Math.sin(a) * 21);
      this.scene.add(t);
    }

    // Nền đá, bậc lên gác
    const stone = std('#9a9184');
    this.scene.add(box(14.4, 0.6, 14.4, stone, 0, 0.3, 0));
    this.scene.add(box(14.6, 0.08, 14.6, std('#7f776b'), 0, 0.62, 0, { cast: false }));
    for (let i = 0; i < 3; i++) this.scene.add(box(3.2, 0.2, 0.5, std('#b3aa9b'), 0, 0.1 + i * 0.2 - 0.0, 7.6 - i * 0.45));
    this.scene.add(exitPick(0, 7.5, 3.4, 1.6));
    exitLabel(this.labels, 0, 7.4);

    // Cột, xà và mái hai tầng
    const red = std('#8c2318', { roughness: 0.45 });
    for (const x of [-5.8, 5.8]) {
      for (const zz of [-5.8, 5.8]) {
        this.scene.add(cyl(0.32, 0.36, 7.2, red, x, 4.2, zz, 16));
        this.scene.add(cyl(0.5, 0.55, 0.3, stone, x, 0.75, zz, 14));
      }
    }
    const timber = std('#5a2f1c');
    this.scene.add(box(12.4, 0.5, 0.55, timber, 0, 7.15, z));
    this.scene.add(box(12.4, 0.06, 0.6, gold({ roughness: 0.45 }), 0, 6.9, z, { cast: false }));
    for (const zz of [-5.8, 5.8]) this.scene.add(box(12.4, 0.4, 0.45, timber, 0, 7.5, zz));
    const roof1 = makeRoof({ width: 13.2, depth: 13.2, height: 2.4, curl: 0.75, overhang: 0.9, ridgeRatio: 0.25 });
    roof1.position.y = 7.75;
    this.scene.add(roof1);
    const roof2 = makeRoof({ width: 7.5, depth: 7.5, height: 2.0, curl: 0.6, overhang: 0.6, ridgeRatio: 0.2 });
    roof2.position.y = 9.9;
    this.scene.add(roof2);
    this.scene.add(box(7.2, 0.6, 7.2, timber, 0, 9.85, 0));
    for (const x of [-5.4, 5.4]) {
      const l = makeHangingLantern('#d62f2f', true);
      l.position.set(x, 6.3, 5.4);
      this.scene.add(l);
    }

    this.buildBell(z);
    this.buildStriker(z);
    this.labels.push({ text: '🔔 Đại Hồng Chung', position: new THREE.Vector3(0, 7.9, z), className: 'place-label' });
  }

  buildBell(z) {
    const bronze = new THREE.MeshStandardMaterial({ color: '#6f5a2c', roughness: 0.38, metalness: 0.9 });
    const patina = new THREE.MeshStandardMaterial({ color: '#4f6b55', roughness: 0.6, metalness: 0.5 });
    const bell = new THREE.Group();
    bell.position.set(0, 6.9, z);
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const r = 1.0 + Math.pow(t, 2.4) * 0.75 + (t > 0.92 ? (t - 0.92) * 2.2 : 0);
      pts.push(new THREE.Vector2(r, -t * 3.3));
    }
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), bronze);
    body.material.side = THREE.DoubleSide;
    body.castShadow = true;
    bell.add(body);
    bell.add(cyl(1.0, 1.0, 0.12, bronze, 0, 0, 0, 40));
    // Vành trang trí và dải cánh sen quanh thân chuông
    for (const y of [-0.5, -1.55, -2.85]) {
      const r = 1.0 + Math.pow(-y / 3.3, 2.4) * 0.75;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.05, 8, 48), patina);
      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      bell.add(ring);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const petal = sphere(0.16, patina, Math.cos(a) * 1.62, -2.6, Math.sin(a) * 1.62, 8, 6);
      petal.scale.set(0.6, 1.2, 0.35);
      petal.lookAt(new THREE.Vector3(Math.cos(a) * 5, -2.6, Math.sin(a) * 5).add(bell.position));
      bell.add(petal);
    }
    // Núm chuông chia ô ở bốn mặt
    for (let side = 0; side < 4; side++) {
      const a0 = (side / 4) * Math.PI * 2 + Math.PI / 4;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const a = a0 + (col - 1) * 0.16;
          const y = -0.8 - row * 0.25;
          const r = 1.0 + Math.pow(-y / 3.3, 2.4) * 0.75 + 0.03;
          bell.add(sphere(0.045, patina, Math.cos(a) * r, y, Math.sin(a) * r, 6, 6));
        }
      }
    }
    // Quai bồ lao trên đỉnh
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 8, 20), bronze);
    loop.position.y = 0.3;
    bell.add(loop);
    // Điểm gõ hình hoa sen
    const target = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), patina);
    target.position.set(1.55, -2.35, 0);
    target.rotation.y = Math.PI / 2;
    bell.add(target);
    setPick(bell, { type: 'bell' });
    this.scene.add(bell);
    this.bell = bell;
  }

  buildStriker(z) {
    this.ropeLen = 2.7;
    this.anchors = [2.25, 4.65];
    this.strikerZ = z;
    const ropeMat = std('#a8865a');
    this.ropes = this.anchors.map((x) => {
      const g = new THREE.Group();
      g.position.set(x, 6.9, z);
      const rope = cyl(0.025, 0.025, this.ropeLen, ropeMat, 0, -this.ropeLen / 2, 0, 6);
      g.add(rope);
      this.scene.add(g);
      return g;
    });
    const log = new THREE.Group();
    const wood = std('#7a5636', { roughness: 0.8 });
    const trunk = cyl(0.26, 0.26, 2.6, wood, 0, 0, 0, 16);
    trunk.rotation.z = Math.PI / 2;
    log.add(trunk);
    const capMat = std('#5a3e26');
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), capMat);
      cap.position.x = s * 1.3;
      cap.rotation.y = s * Math.PI / 2;
      log.add(cap);
    }
    // Dây kéo buông xuống cho người thỉnh chuông
    const pull = cyl(0.02, 0.02, 1.6, std('#c62828'), 1.3, -0.8, 0, 6);
    log.add(pull);
    log.add(sphere(0.06, std('#c62828'), 1.3, -1.62, 0, 8, 8));
    setPick(log, { type: 'log' });
    this.scene.add(log);
    this.log = log;
    this.setSwing(0);
  }

  setSwing(theta) {
    const dx = Math.sin(theta) * this.ropeLen;
    const dy = -Math.cos(theta) * this.ropeLen;
    this.ropes.forEach((r) => { r.rotation.z = theta; });
    this.log.position.set((this.anchors[0] + this.anchors[1]) / 2 + dx, 6.9 + dy, this.strikerZ);
  }

  // Một lần thỉnh chuông: kéo lùi lấy đà, buông cho chày đánh vào chuông, chuông rung và toả sóng âm
  event(name) {
    if (name === 'strike') this.strikeStart = this.time || 0;
  }

  update(dt, time) {
    this.time = time;
    let theta = 0;
    if (this.strikeStart >= 0) {
      const t = time - this.strikeStart;
      if (t < 0.8) theta = (t / 0.8) * 0.5;
      else if (t < 1.1) theta = 0.5 - ((t - 0.8) / 0.3) * 0.72;
      else {
        if (!this.hitDone) {
          this.hitDone = true;
          this.ring = 1;
          this.spawnWaves();
        }
        theta = -0.22 * Math.exp(-(t - 1.1) * 2.2) * Math.cos((t - 1.1) * 5);
        if (t > 4) {
          this.strikeStart = -1;
          this.hitDone = false;
        }
      }
    }
    this.setSwing(theta);
    this.ring = Math.max(0, (this.ring || 0) - dt * 0.25);
    this.bell.rotation.z = Math.sin(time * 9) * 0.012 * this.ring;

    for (const w of this.waves) {
      w.age += dt;
      const k = w.age / 2.4;
      w.mesh.scale.setScalar(1 + k * 4);
      w.mesh.material.opacity = Math.max(0, 0.45 * (1 - k));
    }
    this.waves = this.waves.filter((w) => {
      if (w.age < 2.4) return true;
      this.scene.remove(w.mesh);
      w.mesh.geometry.dispose();
      w.mesh.material.dispose();
      return false;
    });
  }

  spawnWaves() {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.03, 6, 64),
        new THREE.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0.45, depthWrite: false }));
      m.position.set(0, 5.2 - i * 0.9, this.bellZ);
      m.rotation.x = Math.PI / 2;
      this.scene.add(m);
      this.waves.push({ mesh: m, age: -i * 0.25 });
    }
  }

  faceYaw(char, X) {
    if (char.activity === 'keo_chuong') return -Math.PI / 2;
    return undefined;
  }

  clampCamera(pos) {
    pos.y = Math.min(pos.y, 7.0);
  }
}

// =====================================================================
// LẦU XIN XĂM
// =====================================================================
export class FortuneSpace {
  constructor(webgl) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1c100a');
    this.scene.fog = new THREE.Fog('#1c100a', 14, 30);
    this.labels = [];
    this.candles = [];
    const W = 14;
    const D = 12;
    const H = 5.2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: woodTexture(4, 3, '#5e3620'), roughness: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const lacquer = std('#6e1b13', { roughness: 0.55 });
    const timber = std('#4a2716');
    const wall = (w, x, z, rot) => {
      const g = new THREE.Group();
      g.add(box(w, 2.2, 0.25, lacquer, 0, 1.1, 0));
      g.add(box(w, H - 2.2, 0.25, timber, 0, 2.2 + (H - 2.2) / 2, 0));
      g.add(box(w, 0.1, 0.28, gold({ roughness: 0.5 }), 0, 2.2, 0, { cast: false }));
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.scene.add(g);
    };
    wall(W, 0, -D / 2, 0);
    wall(D, -W / 2, 0, Math.PI / 2);
    wall(D, W / 2, 0, Math.PI / 2);
    wall((W - 3) / 2, -(W + 3) / 4, D / 2, 0);
    wall((W - 3) / 2, (W + 3) / 4, D / 2, 0);
    this.scene.add(box(3, H - 3.4, 0.25, timber, 0, 3.4 + (H - 3.4) / 2, D / 2));
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4), new THREE.MeshBasicMaterial({ color: '#fbe6b8' }));
    doorGlow.position.set(0, 1.7, D / 2 + 0.15);
    doorGlow.rotation.y = Math.PI;
    this.scene.add(doorGlow);
    this.scene.add(exitPick(0, D / 2 - 0.5, 3, 1));
    exitLabel(this.labels, 0, D / 2 - 0.5, 3.8);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#3a1e12'));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    this.scene.add(ceiling);
    for (let z = -D / 2 + 1.5; z < D / 2; z += 2.5) this.scene.add(box(W, 0.3, 0.3, timber, 0, H - 0.2, z, { cast: false }));

    const pmrem = new THREE.PMREMGenerator(webgl);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.buildAltar();
    this.buildTable();
    this.buildDrawers(W);
    this.buildCouplets(W);

    this.scene.add(new THREE.HemisphereLight('#ffd9a8', '#2a140a', 0.7));
    const spot = new THREE.SpotLight('#ffe2a8', 40, 16, 0.6, 0.6, 1.5);
    spot.position.set(0, 4.8, 0.5);
    spot.target.position.set(0, 1.8, -5);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    this.scene.add(spot, spot.target);
    const fill = new THREE.PointLight('#ffcf8a', 5, 12, 2);
    fill.position.set(0, 3, 3.5);
    this.scene.add(fill);
    for (const x of [-3.5, 3.5]) {
      const l = makeHangingLantern('#c62828', true);
      l.position.set(x, 4.3, -0.5);
      l.scale.setScalar(1.2);
      this.scene.add(l);
    }
  }

  buildAltar() {
    const lacquer = std('#7a1f16', { roughness: 0.4 });
    this.scene.add(box(6, 1.1, 1.4, lacquer, 0, 0.55, -5.1));
    this.scene.add(box(6.1, 0.08, 1.5, gold({ roughness: 0.4 }), 0, 1.12, -5.1, { cast: false }));
    this.scene.add(box(5, 3.6, 0.15, std('#5c1410'), 0, 2.9, -5.85));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.4 }));
    disc.position.set(0, 2.95, -5.75);
    this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 48), gold());
    ring.position.set(0, 2.95, -5.74);
    this.scene.add(ring);
    const quanAm = makeBuddha(0.62, { color: '#f4efe4', lotusColor: '#f2b8c6' });
    quanAm.position.set(0, 1.15, -5.1);
    this.scene.add(quanAm);
    this.labels.push({ text: '🙏 Quán Thế Âm Bồ Tát', position: new THREE.Vector3(0, 4.6, -5.1), className: 'place-label subtle' });
    for (const s of [-1, 1]) {
      const stand = new THREE.Group();
      stand.position.set(s * 2.3, 1.15, -4.8);
      stand.add(cyl(0.04, 0.06, 0.5, gold(), 0, 0.25, 0, 10));
      stand.add(cyl(0.06, 0.06, 0.32, std('#c62828'), 0, 0.66, 0, 10));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
      flame.position.y = 0.9;
      stand.add(flame);
      const glow = glowSprite('#ffb347', 0.6);
      glow.position.y = 0.9;
      stand.add(glow);
      const light = new THREE.PointLight('#ffb35c', 2.2, 6, 2);
      light.position.y = 1;
      stand.add(light);
      this.scene.add(stand);
      this.candles.push({ flame, light, seed: Math.random() * 10 });
    }
  }

  buildTable() {
    const z = toZ(432);
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    g.add(box(5.4, 0.95, 1.5, std('#8a2219', { roughness: 0.35 }), 0, 0.48, 0));
    g.add(box(5.55, 0.08, 1.6, gold({ roughness: 0.4 }), 0, 0.98, 0));
    const burner = makeIncenseBurner(0.45);
    burner.position.set(0, 1.0, -0.2);
    g.add(burner);
    setPick(g, { type: 'altar' });
    this.scene.add(g);
    this.tableZ = z;

    // Ống xăm tre và các que xăm
    const tube = new THREE.Group();
    tube.position.set(-0.9, 1.02, z + 0.1);
    tube.add(cyl(0.2, 0.18, 0.62, std('#b5793a', { roughness: 0.55 }), 0, 0.31, 0, 18));
    for (const y of [0.12, 0.5]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 20), std('#8a2219'));
      band.position.y = y;
      band.rotation.x = Math.PI / 2;
      tube.add(band);
    }
    const stickMat = std('#e3c48a');
    const tipMat = std('#c62828');
    this.sticks = new THREE.Group();
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.13;
      const stick = new THREE.Group();
      stick.add(box(0.025, 0.75, 0.012, stickMat, 0, 0, 0, { receive: false }));
      stick.add(box(0.027, 0.08, 0.014, tipMat, 0, 0.34, 0, { receive: false }));
      stick.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
      stick.rotation.set((Math.random() - 0.5) * 0.25, 0, (Math.random() - 0.5) * 0.25);
      this.sticks.add(stick);
    }
    tube.add(this.sticks);
    setPick(tube, { type: 'altar' });
    this.scene.add(tube);
    this.tube = tube;
    this.labels.push({ text: '🎋 Ống Xăm', position: new THREE.Vector3(-0.9, 2.3, z + 0.1), className: 'place-label subtle' });

    // Que xăm rút ra (ẩn cho tới khi lắc)
    const drawn = new THREE.Group();
    drawn.add(box(0.03, 0.75, 0.014, stickMat));
    drawn.add(box(0.032, 0.08, 0.016, tipMat, 0, 0.34, 0));
    drawn.visible = false;
    this.scene.add(drawn);
    this.drawnStick = drawn;

    // Đôi keo âm dương: mặt phẳng (ngửa) và mặt cong (úp)
    this.keos = [-1, 1].map((s) => {
      const keo = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#a3241a', { roughness: 0.35 }));
      dome.castShadow = true;
      keo.add(dome);
      const flat = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), std('#d9a067', { roughness: 0.6 }));
      flat.rotation.x = Math.PI / 2;
      keo.add(flat);
      keo.scale.set(1, 0.5, 0.55);
      keo.userData.rest = new THREE.Vector3(0.6 + s * 0.25, 1.04, z + 0.25);
      keo.position.copy(keo.userData.rest);
      setPick(keo, { type: 'altar' });
      this.scene.add(keo);
      return keo;
    });
    this.labels.push({ text: '☯️ Keo Âm Dương', position: new THREE.Vector3(0.6, 1.9, z + 0.25), className: 'place-label subtle' });

    // Chiếu quỳ
    const mat = window.TEMPLE_DATA.zones.lau_xin_xam.mat;
    const kneel = box(1.2, 0.12, 0.9, std('#9e2a22', { roughness: 0.9 }), toX(mat.x), 0.06, toZ(mat.y));
    kneel.userData.pick = { type: 'mat' };
    this.scene.add(kneel);
  }

  buildDrawers(W) {
    // Tủ thuốc quẻ: các ngăn nhỏ đánh số, mỗi ngăn đựng một lá quẻ
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a2716';
    ctx.fillRect(0, 0, 512, 512);
    const cols = 6;
    const rows = 8;
    let n = 1;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = 8 + col * 83;
        const y = 8 + r * 62;
        ctx.fillStyle = '#7a3a22';
        ctx.fillRect(x, y, 76, 54);
        ctx.strokeStyle = '#c99b52';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, 70, 48);
        ctx.fillStyle = '#f5d48a';
        ctx.font = 'bold 18px "Be Vietnam Pro", serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(n++), x + 38, y + 25);
        ctx.fillStyle = '#c99b52';
        ctx.beginPath();
        ctx.arc(x + 38, y + 40, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const cabinet = box(0.6, 3.2, 3.4, std('#3a1e12'), W / 2 - 0.45, 1.7, -2.5);
    this.scene.add(cabinet);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    front.position.set(W / 2 - 0.76, 1.7, -2.5);
    front.rotation.y = -Math.PI / 2;
    this.scene.add(front);
    this.labels.push({ text: '📜 Tủ Lá Quẻ', position: new THREE.Vector3(W / 2 - 0.8, 3.6, -2.5), className: 'place-label subtle' });
  }

  buildCouplets(W) {
    const pairs = [['Thành', 'tâm', 'cầu', 'tất', 'ứng'], ['Thiện', 'nguyện', 'sự', 'giai', 'thành']];
    pairs.forEach((words, i) => {
      const p = plaque(words.join(' '), 0.45, 2.6, {
        width: 128, height: 768, vertical: true, bg: '#2a1308', fg: '#f5c54a', border: '#c99b52', font: 'bold 82px "Be Vietnam Pro", serif'
      });
      p.position.set(-W / 2 + 0.16, 2.6, -3 + i * 3);
      p.rotation.y = Math.PI / 2;
      this.scene.add(p);
    });
  }

  event(name, data) {
    if (name === 'keo') {
      // Thánh Đài: một ngửa một úp. Tiếu Đài: hai ngửa. Âm Đài: hai úp
      const faces = data.outcome === 'thanh' ? [true, false] : data.outcome === 'tieu' ? [true, true] : [false, false];
      const zMat = toZ(window.TEMPLE_DATA.zones.lau_xin_xam.mat.y);
      this.keos.forEach((keo, i) => {
        keo.userData.anim = {
          start: this.time,
          from: new THREE.Vector3(i ? 0.15 : -0.15, 1.3, zMat - 0.2),
          to: new THREE.Vector3(i ? 0.35 : -0.3, 0.05, zMat - 0.95 + i * 0.12),
          flatUp: faces[i],
          spin: 3 + Math.random() * 2
        };
      });
    } else if (name === 'xam') {
      this.shakeStart = this.time;
      this.drawnStick.visible = false;
      this.keos.forEach((keo) => {
        keo.userData.anim = null;
        keo.position.copy(keo.userData.rest);
        keo.rotation.set(0, 0, 0);
      });
    }
  }

  update(dt, time) {
    this.time = time;
    for (const c of this.candles) {
      const f = 0.85 + Math.sin(time * 13 + c.seed) * 0.1;
      c.light.intensity = 2.2 * f;
      c.flame.scale.y = f;
    }

    for (const keo of this.keos) {
      const a = keo.userData.anim;
      if (!a) continue;
      const k = Math.min(1, (time - a.start) / 0.9);
      keo.position.lerpVectors(a.from, a.to, k);
      keo.position.y += Math.sin(k * Math.PI) * 1.1 + (k >= 1 ? 0 : 0);
      if (k < 1) {
        keo.rotation.set(k * a.spin * Math.PI * 2, k * 2, 0);
      } else {
        keo.position.y = a.flatUp ? 0.1 : 0.05;
        keo.rotation.set(a.flatUp ? Math.PI : 0, 0.4, 0);
      }
    }

    // Lắc ống xăm rồi một que bật ra rơi xuống
    if (this.shakeStart !== undefined && this.shakeStart >= 0) {
      const t = time - this.shakeStart;
      if (t < 0.65) {
        this.tube.rotation.x = Math.sin(t * 40) * 0.25;
        this.sticks.position.y = Math.abs(Math.sin(t * 40)) * 0.05;
      } else {
        this.tube.rotation.x = -0.5 * Math.max(0, 1 - (t - 0.65) * 3);
        this.sticks.position.y = 0;
        const k = Math.min(1, (t - 0.65) / 0.7);
        const from = new THREE.Vector3(-0.9, 1.9, this.tableZ + 0.3);
        const to = new THREE.Vector3(-0.5, 0.03, toZ(window.TEMPLE_DATA.zones.lau_xin_xam.mat.y) - 0.7);
        this.drawnStick.visible = true;
        this.drawnStick.position.lerpVectors(from, to, k);
        this.drawnStick.position.y += Math.sin(k * Math.PI) * 0.6;
        this.drawnStick.rotation.set(0, 0.6, k * Math.PI / 2);
        if (t > 1.6) this.shakeStart = -1;
      }
    }
  }

  faceYaw(char) {
    if (char.activity === 'quy') return Math.PI;
    return undefined;
  }

  clampCamera(pos) {
    pos.x = Math.max(-6.6, Math.min(6.6, pos.x));
    pos.z = Math.max(-5.6, Math.min(5.7, pos.z));
    pos.y = Math.min(4.7, pos.y);
  }
}

// =====================================================================
// CÂY NGUYỆN ƯỚC & MIẾU NGUYỆT LÃO
// =====================================================================
const CATEGORY_COLORS = {
  'Tình duyên': '#e8467c', 'Gia đạo': '#e0a526', 'Sự nghiệp': '#3a7bd5', 'Sức khỏe': '#3fa45a', 'Bình an': '#d62f2f'
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export class WishTreeSpace {
  constructor() {
    this.scene = new THREE.Scene();
    this.labels = [];
    this.tags = new Map();
    this.flying = [];
    this.initialized = false;

    outdoorLights(this.scene, { sky: '#ffd2a8', ground: '#5a4a3a', hemi: 0.75, sun: '#ffb070', sunI: 1.7, bg: '#e8b088', fog: '#e2a984', fogNear: 25, fogFar: 80, sunPos: [-16, 10, -8] });
    groundPlane(this.scene, '#6d8a55');
    addMountains(this.scene, '#a3796e', 50, 9);

    const tz = toZ(500);
    this.treeZ = tz;
    // Sân đá tròn quanh gốc cây và lối đi
    this.scene.add(cyl(4.6, 4.7, 0.1, std('#b5a891'), 0, 0.05, tz, 48));
    this.scene.add(box(2.2, 0.06, 8, std('#b5a891'), 0, 0.03, 6.5, { cast: false }));
    this.scene.add(exitPick(0, 8, 3, 1.4));
    exitLabel(this.labels, 0, 7.9);

    const tree = makeTree({ trunkH: 3.6, trunkR: 0.75, canopy: 3.6, seed: 31, colors: ['#3e6b48', '#4c8057', '#5b9467', '#6aa46f'] });
    tree.position.set(0, 0, tz);
    this.scene.add(tree);
    this.leaves = tree.userData.leaves;
    setPick(tree.children[0], { type: 'tree' });
    tree.children.forEach((c) => { if (c !== this.leaves) setPick(c, { type: 'tree' }); });
    this.scene.add(cyl(1.2, 1.35, 0.35, std('#9e3b33'), 0, 0.17, tz, 28));
    this.labels.push({ text: '🧧 Cây Nguyện Ước', position: new THREE.Vector3(0, 8.6, tz), className: 'place-label' });

    // Đèn đá quanh sân
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const post = new THREE.Group();
      post.position.set(Math.cos(a) * 5.4, 0, tz + Math.sin(a) * 5.4);
      const stone = std('#8f877a');
      post.add(box(0.4, 0.9, 0.4, stone, 0, 0.45, 0));
      post.add(box(0.6, 0.45, 0.6, std('#fff1c4', { emissive: '#ffcf6a', emissiveIntensity: 0.9 }), 0, 1.12, 0));
      post.add(box(0.8, 0.12, 0.8, stone, 0, 1.4, 0));
      post.add(cyl(0.02, 0.3, 0.3, stone, 0, 1.6, 0, 4));
      const light = new THREE.PointLight('#ffc46b', 1.4, 5, 2);
      light.position.y = 1.2;
      post.add(light);
      this.scene.add(post);
    }

    this.buildShrine();
    this.fireflies = addFireflies(this.scene, 70, { x: 18, y: 5, z: 16 });
  }

  buildShrine() {
    const g = new THREE.Group();
    g.position.set(toX(560), 0, toZ(395));
    g.add(box(2.6, 0.5, 1.8, std('#8f877a'), 0, 0.25, 0));
    g.add(box(2.2, 1.9, 1.4, std('#7a1f16', { roughness: 0.5 }), 0, 1.45, -0.1));
    const roof = makeRoof({ width: 2.4, depth: 1.8, height: 0.7, curl: 0.3, overhang: 0.3, ridgeRatio: 0.4 });
    roof.position.y = 2.4;
    g.add(roof);
    const niche = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), new THREE.MeshBasicMaterial({ color: '#ffcf8a' }));
    niche.position.set(0, 1.45, 0.61);
    g.add(niche);
    const statue = makeBuddha(0.32, { color: '#f0e2c8', lotusColor: '#e8467c' });
    statue.position.set(0, 0.85, 0.75);
    g.add(statue);
    // Cuộn chỉ đỏ se duyên
    for (const s of [-1, 1]) {
      const spool = cyl(0.12, 0.12, 0.18, std('#d62f2f'), s * 0.75, 0.6, 0.85, 14);
      spool.rotation.x = Math.PI / 2;
      g.add(spool);
    }
    const thread = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.01, 4, 40, Math.PI), std('#e63946'));
    thread.position.set(0, 0.6, 0.95);
    thread.rotation.z = Math.PI;
    g.add(thread);
    const sign = plaque('NGUYỆT LÃO', 1.4, 0.32, { width: 512, height: 112, font: 'bold 64px "Be Vietnam Pro", serif' });
    sign.position.set(0, 2.2, 0.62);
    g.add(sign);
    setPick(g, { type: 'shrine' });
    this.scene.add(g);
    this.labels.push({ text: '💞 Miếu Nguyệt Lão', position: new THREE.Vector3(toX(560), 3.6, toZ(395)), className: 'place-label subtle' });
  }

  slotFor(id) {
    const h1 = hash(id);
    const h2 = hash(id + 'r');
    const h3 = hash(id + 'y');
    const a = h1 * Math.PI * 2;
    const r = 1.6 + h2 * 2.4;
    return new THREE.Vector3(Math.cos(a) * r, 3.5 + h3 * 1.6, this.treeZ + Math.sin(a) * r);
  }

  makeTag(wish) {
    const g = new THREE.Group();
    const color = CATEGORY_COLORS[wish.category] || '#d62f2f';
    g.add(cyl(0.006, 0.006, 0.7, std('#3a2618'), 0, -0.35, 0, 3));
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.55), std(color, { side: THREE.DoubleSide }));
    ribbon.position.set(0.06, -0.85, 0);
    g.add(ribbon);
    const tag = box(0.2, 0.3, 0.025, std('#e6c48a'), 0, -0.85, 0, { receive: false });
    g.add(tag);
    const knot = sphere(0.035, std(color), 0, -0.68, 0, 6, 6);
    g.add(knot);
    setPick(g, { type: 'wish', id: wish.id });
    g.userData.phase = hash(wish.id) * 10;
    return g;
  }

  sync(world, localPlayer) {
    const list = world.wishes.slice(0, 60);
    const ids = new Set(list.map(w => w.id));
    for (const wish of list) {
      if (this.tags.has(wish.id)) continue;
      const tag = this.makeTag(wish);
      const slot = this.slotFor(wish.id);
      tag.position.copy(slot);
      this.scene.add(tag);
      this.tags.set(wish.id, tag);
      // Điều ước mới treo trong lúc đang ở đây: bay từ chỗ người chơi lên cành cây
      if (this.initialized) {
        const from = new THREE.Vector3(toX(localPlayer.x), 1.4, toZ(localPlayer.y));
        const sparkle = glowSprite('#ffd27a', 0.9);
        this.scene.add(sparkle);
        this.flying.push({ tag, from, to: slot, start: this.time || 0, sparkle });
      }
    }
    for (const [id, tag] of this.tags) {
      if (!ids.has(id)) {
        this.scene.remove(tag);
        this.tags.delete(id);
      }
    }
    this.initialized = true;
  }

  update(dt, time, ctx) {
    this.time = time;
    this.sync(ctx.world, ctx.localPlayer);
    this.leaves.rotation.z = Math.sin(time * 0.6) * 0.015;
    for (const tag of this.tags.values()) {
      tag.rotation.z = Math.sin(time * 1.5 + tag.userData.phase) * 0.12;
      tag.rotation.y = Math.sin(time * 0.7 + tag.userData.phase) * 0.4;
    }
    this.flying = this.flying.filter((f) => {
      const k = Math.min(1, (time - f.start) / 1.6);
      const e = 1 - Math.pow(1 - k, 3);
      f.tag.position.lerpVectors(f.from, f.to, e);
      f.tag.position.y += Math.sin(k * Math.PI) * 1.2;
      f.sparkle.position.copy(f.tag.position);
      f.sparkle.material.opacity = 0.9 * (1 - k);
      if (k < 1) return true;
      this.scene.remove(f.sparkle);
      return false;
    });
    driftFireflies(this.fireflies, time);
  }
}

// =====================================================================
// HỒ SEN PHÓNG SINH
// =====================================================================
export class PondSpace {
  constructor() {
    this.scene = new THREE.Scene();
    this.labels = [];
    const cfg = window.TEMPLE_DATA.zones.ho_sen;
    this.cfg = cfg;
    this.k = cfg.pond.r / 142; // hồ trên sân (bán kính ~142px) phóng to thành hồ lớn
    this.center = { x: toX(cfg.pond.x), z: toZ(cfg.pond.y) };
    this.R = cfg.pond.r / 40;
    this.lanternMeshes = new Map();
    this.koiMeshes = [];
    this.pellets = [];
    this.seenAt = new Map();

    outdoorLights(this.scene, { sky: '#8796c8', ground: '#2c3348', hemi: 0.6, sun: '#ffb27a', sunI: 1.0, bg: '#4f5d8f', fog: '#56649a', fogNear: 22, fogFar: 75, sunPos: [-18, 8, -14] });
    groundPlane(this.scene, '#4f6e4a');
    addMountains(this.scene, '#3e4a72', 50, 13);

    const { x: cx, z: cz } = this.center;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(this.R + 0.1, 0.35, 8, 72), std('#7f786c', { flatShading: true }));
    rim.position.set(cx, 0.05, cz);
    rim.rotation.x = Math.PI / 2;
    rim.receiveShadow = true;
    this.scene.add(rim);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(this.R, 64), std('#13303a'));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(cx, -0.25, cz);
    this.scene.add(bed);
    this.water = new THREE.Mesh(new THREE.CircleGeometry(this.R, 64),
      new THREE.MeshStandardMaterial({ color: '#2a5d78', roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.82 }));
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(cx, 0.02, cz);
    this.water.userData.pick = { type: 'water' };
    this.scene.add(this.water);

    this.buildLotus();
    this.buildPier();
    this.buildShore();
    this.fireflies = addFireflies(this.scene, 60, { x: 22, y: 3, z: 20 });
    this.labels.push({ text: '🪷 Hồ Sen Phóng Sinh', position: new THREE.Vector3(cx, 4.2, cz - this.R + 1), className: 'place-label' });
  }

  // Đổi toạ độ hồ trên sân (dùng cho cá, thức ăn, hoa đăng) sang toạ độ 3D của hồ lớn
  pondTo3D(x, y) {
    return { X: toX(this.cfg.pond.x + (x - 300) * this.k), Z: toZ(this.cfg.pond.y + (y - 675) * this.k) };
  }

  buildLotus() {
    const { x: cx, z: cz } = this.center;
    const pad = std('#3f8554', { side: THREE.DoubleSide });
    const petal = std('#f78fb3');
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * (this.R - 1.6);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (Math.abs(x) < 1.2 && z > cz + 2) continue; // chừa lối bến gỗ
      const size = 0.35 + rand() * 0.35;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(size, 20, 0.3, Math.PI * 1.85), pad);
      leaf.rotation.set(-Math.PI / 2, 0, rand() * 6);
      leaf.position.set(x, 0.04, z);
      this.scene.add(leaf);
      if (rand() < 0.35) {
        const f = new THREE.Group();
        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const m = sphere(0.12, petal, Math.cos(pa) * 0.1, 0.12, Math.sin(pa) * 0.1, 8, 6);
          m.scale.set(0.6, 1.4, 0.6);
          m.rotation.set(Math.sin(pa) * 0.6, 0, -Math.cos(pa) * 0.6);
          f.add(m);
        }
        f.add(sphere(0.06, std('#ffd166'), 0, 0.17, 0, 8, 6));
        f.position.set(x, 0.04, z);
        this.scene.add(f);
      }
    }
  }

  buildPier() {
    const p = this.cfg.pier;
    const left = toX(p.left);
    const right = toX(p.right);
    const top = toZ(p.top);
    const bottom = toZ(p.bottom) + 1.2;
    const wood = std('#8c5a36', { roughness: 0.8 });
    const length = bottom - top;
    const deck = new THREE.Group();
    for (let z = top; z < bottom; z += 0.3) deck.add(box(right - left + 0.3, 0.08, 0.26, wood, 0, 0.28, z + 0.13));
    setPick(deck, { type: 'ground' });
    this.scene.add(deck);
    const postMat = std('#5c381e');
    for (let z = top; z <= bottom; z += 1.4) {
      for (const x of [left - 0.1, right + 0.1]) {
        this.scene.add(cyl(0.07, 0.07, 1.2, postMat, x, 0.2, z, 6));
      }
    }
    for (const x of [left - 0.1, right + 0.1]) this.scene.add(box(0.06, 0.06, length, postMat, x, 0.8, top + length / 2));
    // Cột đèn cuối bến
    const lampPost = new THREE.Group();
    lampPost.position.set(right + 0.1, 0, top);
    lampPost.add(cyl(0.06, 0.06, 2.2, postMat, 0, 1.1, 0, 6));
    const lamp = makeHangingLantern('#e8743b', true);
    lamp.position.set(-0.35, 2.0, 0);
    lamp.scale.setScalar(0.8);
    lampPost.add(lamp);
    lampPost.add(box(0.5, 0.05, 0.05, postMat, -0.2, 2.2, 0));
    this.scene.add(lampPost);
    this.pierTip = new THREE.Vector3(0, 0.08, top - 0.4);
    this.labels.push({ text: '🕯️ Bến Thả Hoa Đăng', position: new THREE.Vector3(0, 2.6, top), className: 'place-label subtle' });
  }

  buildShore() {
    const { x: cx, z: cz } = this.center;
    const willow = makeTree({ trunkH: 2.6, trunkR: 0.35, canopy: 2.4, seed: 41, colors: ['#4f7d3a', '#5f8f45', '#6e9e50'] });
    willow.position.set(cx - this.R - 2.2, 0, cz - 2);
    this.scene.add(willow);
    const willow2 = makeTree({ trunkH: 2.4, trunkR: 0.3, canopy: 2.0, seed: 43, colors: ['#4f7d3a', '#5f8f45'] });
    willow2.position.set(cx + this.R + 2.4, 0, cz + 1);
    this.scene.add(willow2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      if (Math.sin(a) > 0.75) continue;
      const b = makeBamboo(50 + i);
      b.position.set(cx + Math.cos(a) * (this.R + 4.5), 0, cz + Math.sin(a) * (this.R + 4.5));
      this.scene.add(b);
    }
    // Đèn đá bên bờ
    for (const s of [-1, 1]) {
      const post = new THREE.Group();
      post.position.set(s * 2.2, 0, toZ(this.cfg.pier.bottom) + 0.6);
      const stone = std('#8f877a');
      post.add(box(0.35, 0.8, 0.35, stone, 0, 0.4, 0));
      post.add(box(0.5, 0.4, 0.5, std('#fff1c4', { emissive: '#ffcf6a', emissiveIntensity: 1 }), 0, 1.0, 0));
      post.add(box(0.7, 0.1, 0.7, stone, 0, 1.25, 0));
      const light = new THREE.PointLight('#ffc46b', 1.5, 6, 2);
      light.position.y = 1.0;
      post.add(light);
      this.scene.add(post);
    }
    this.scene.add(box(2.0, 0.05, 6, std('#a89f91'), 0, 0.02, toZ(this.cfg.pier.bottom) + 3, { cast: false }));
    this.scene.add(exitPick(0, toZ(this.cfg.exit.y), 3, 1.4));
    exitLabel(this.labels, 0, toZ(this.cfg.exit.y));
  }

  makeLantern(color) {
    const g = new THREE.Group();
    const mat = std(color || '#ff7eb3', { emissive: color || '#ff7eb3', emissiveIntensity: 0.6 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = sphere(0.16, mat, Math.cos(a) * 0.17, 0.08, Math.sin(a) * 0.17, 8, 6);
      p.scale.set(0.55, 1.25, 0.55);
      p.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(p);
    }
    g.add(cyl(0.05, 0.05, 0.12, new THREE.MeshBasicMaterial({ color: '#fff7d0' }), 0, 0.18, 0, 8));
    const flame = glowSprite('#ffd27a', 1.4, 0.85);
    flame.position.y = 0.25;
    g.add(flame);
    const reflection = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20),
      new THREE.MeshBasicMaterial({ map: soft, color: '#ffbf6a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = 0.01;
    g.add(reflection);
    return g;
  }

  update(dt, time, ctx) {
    const world = ctx.world;
    const now = Date.now();

    // Hoa đăng: đèn mới thả trôi từ cuối bến ra chỗ của nó
    const ids = new Set();
    for (const l of world.lanterns) {
      ids.add(l.id);
      let m = this.lanternMeshes.get(l.id);
      if (!m) {
        m = this.makeLantern(l.color);
        this.scene.add(m);
        this.lanternMeshes.set(l.id, m);
        if (!this.seenAt.has(l.id)) this.seenAt.set(l.id, l.createdAt && now - l.createdAt < 8000 ? now : 0);
      }
      const target = this.pondTo3D(l.x, l.y);
      const born = this.seenAt.get(l.id);
      const k = born ? Math.min(1, (now - born) / 6000) : 1;
      const e = 1 - Math.pow(1 - k, 2);
      const bob = Math.sin(time * 1.4 + l.x) * 0.03;
      m.position.set(
        this.pierTip.x + (target.X - this.pierTip.x) * e + Math.sin(time * 0.3 + l.y) * 0.15,
        0.06 + bob,
        this.pierTip.z + (target.Z - this.pierTip.z) * e + Math.cos(time * 0.25 + l.x) * 0.15
      );
    }
    for (const [id, m] of this.lanternMeshes) {
      if (!ids.has(id)) {
        this.scene.remove(m);
        this.lanternMeshes.delete(id);
      }
    }

    // Cá Koi (phóng to theo hồ lớn)
    world.koiFish.forEach((fish, i) => {
      let m = this.koiMeshes[i];
      if (!m) {
        m = new THREE.Group();
        const body = sphere(0.36, std(fish.color, { roughness: 0.35 }), 0, 0, 0, 14, 10);
        body.scale.set(1, 0.42, 0.4);
        m.add(body);
        m.add(sphere(0.12, std(fish.spotColor), 0.08, 0.08, 0, 8, 6));
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 6), std(fish.color));
        tail.rotation.z = Math.PI / 2;
        tail.position.x = -0.5;
        tail.scale.z = 0.3;
        m.add(tail);
        m.userData.tail = tail;
        this.scene.add(m);
        this.koiMeshes[i] = m;
      }
      const p = this.pondTo3D(fish.x, fish.y);
      m.position.set(p.X, -0.08, p.Z);
      m.rotation.y = -fish.angle;
      m.userData.tail.rotation.y = Math.sin(fish.tailPhase) * 0.5;
    });

    while (this.pellets.length < world.fishFoodPellet.length) {
      const s = sphere(0.07, std('#e8b968'), 0, 0.04, 0, 6, 6);
      this.scene.add(s);
      this.pellets.push(s);
    }
    this.pellets.forEach((s, i) => {
      const pellet = world.fishFoodPellet[i];
      s.visible = !!pellet;
      if (pellet) {
        const p = this.pondTo3D(pellet.x, pellet.y);
        s.position.set(p.X, 0.04, p.Z);
      }
    });

    this.water.material.color.setHSL(0.56, 0.45, 0.3 + Math.sin(time * 0.6) * 0.02);
    driftFireflies(this.fireflies, time);
  }

  // Điểm bấm trên mặt hồ lớn đổi về toạ độ hồ trên sân (để thả thức ăn cho cá)
  toPondCoords(x, y) {
    let px = 300 + (x - this.cfg.pond.x) / this.k;
    let py = 675 + (y - this.cfg.pond.y) / this.k;
    const d = Math.hypot(px - 300, py - 675);
    if (d > 115) {
      px = 300 + (px - 300) * 115 / d;
      py = 675 + (py - 675) * 115 / d;
    }
    return { x: px, y: py };
  }
}

// =====================================================================
// HIÊN TRÀ THỦY ĐÌNH
// =====================================================================
export class TeaSpace {
  constructor() {
    this.scene = new THREE.Scene();
    this.labels = [];
    this.cfg = window.TEMPLE_DATA.zones.thuy_dinh;
    this.steam = [];
    this.monkSpeech = '';
    this.monkSpeechUntil = 0;

    outdoorLights(this.scene, { sky: '#d6e8e2', ground: '#4d6a5a', hemi: 0.85, sun: '#fff0d6', sunI: 1.6, bg: '#c4dcd6', fog: '#c4dcd6', fogNear: 14, fogFar: 60 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(60, 64),
      new THREE.MeshStandardMaterial({ color: '#3f7d82', roughness: 0.12, metalness: 0.3 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.4;
    this.scene.add(water);
    this.waterMesh = water;
    addMountains(this.scene, '#8fb0a8', 45, 17);
    let seed = 3;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const pad = std('#3f8554', { side: THREE.DoubleSide });
    for (let i = 0; i < 50; i++) {
      const a = rand() * Math.PI * 2;
      const r = 7 + rand() * 12;
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.35 + rand() * 0.4, 18, 0.3, Math.PI * 1.85), pad);
      leaf.rotation.set(-Math.PI / 2, 0, rand() * 6);
      leaf.position.set(Math.cos(a) * r, -0.38, Math.sin(a) * r);
      this.scene.add(leaf);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const b = makeBamboo(60 + i);
      b.position.set(Math.cos(a) * 22, -0.4, Math.sin(a) * 22);
      this.scene.add(b);
    }

    this.buildPavilion();
    this.buildTeaSet();
    this.buildRain();
  }

  buildPavilion() {
    const deckMat = std('#ffffff', { map: woodTexture(3, 2, '#7c5032'), roughness: 0.6 });
    this.scene.add(box(11, 0.4, 8, deckMat, 0, -0.2, 0));
    // Cầu gỗ dẫn vào bờ
    const bridge = std('#7c5032');
    this.scene.add(box(1.8, 0.2, 9, bridge, 0, -0.1, 8.5));
    const post = std('#5c381e');
    for (const x of [-5.3, 5.3]) {
      for (const z of [-3.8, 3.8]) this.scene.add(cyl(0.14, 0.14, 3.6, post, x, 1.8, z, 10));
    }
    this.scene.add(cyl(0.14, 0.14, 3.6, post, 0, 1.8, -3.8, 10));
    for (const x of [-5.3, 5.3]) this.scene.add(cyl(0.14, 0.14, 3.6, post, x, 1.8, 0, 10));
    // Lan can, chừa lối vào phía nam
    const rail = std('#6b4428');
    this.scene.add(box(10.8, 0.08, 0.08, rail, 0, 0.75, -3.85));
    for (const x of [-5.35, 5.35]) this.scene.add(box(0.08, 0.08, 7.7, rail, x, 0.75, 0));
    for (const s of [-1, 1]) this.scene.add(box(4.2, 0.08, 0.08, rail, s * 3.25, 0.75, 3.85));
    for (let x = -5; x <= 5; x += 0.6) this.scene.add(box(0.05, 0.75, 0.05, rail, x, 0.38, -3.85));
    const roof = makeRoof({ width: 11, depth: 8, height: 1.8, curl: 0.6, overhang: 0.7, color: '#5f3b26', ridgeRatio: 0.45 });
    roof.position.y = 3.55;
    this.scene.add(roof);
    this.scene.add(box(10.8, 0.25, 7.8, std('#4a2e1c'), 0, 3.5, 0));
    // Lồng đèn và chuông gió dưới hiên
    this.chimes = [];
    for (const x of [-4.6, 4.6]) {
      const l = makeHangingLantern('#d62f2f', true);
      l.position.set(x, 2.9, 3.4);
      this.scene.add(l);
      const chime = new THREE.Group();
      chime.position.set(x * 0.5, 3.3, 3.6);
      for (let i = 0; i < 5; i++) {
        const tube = cyl(0.02, 0.02, 0.3 + i * 0.06, gold({ roughness: 0.3 }), (i - 2) * 0.07, -0.3 - i * 0.03, 0, 6);
        chime.add(tube);
      }
      this.scene.add(chime);
      this.chimes.push(chime);
    }
    this.scene.add(exitPick(0, 4.6, 2, 1.2));
    exitLabel(this.labels, 0, 4.6, 1.4);
  }

  buildTeaSet() {
    const t = this.cfg.table;
    const g = new THREE.Group();
    g.position.set(toX(t.x), 0, toZ(t.y));
    g.add(box(2.8, 0.4, 1.6, std('#59341c', { roughness: 0.5 }), 0, 0.2, 0));
    g.add(box(1.0, 0.03, 0.6, std('#8a5a36'), 0, 0.42, 0));
    // Ấm trà sen
    const pot = new THREE.Group();
    pot.position.set(0, 0.43, 0);
    const body = sphere(0.18, std('#6aa38c', { roughness: 0.25 }), 0, 0.15, 0, 18, 14);
    body.scale.y = 0.85;
    pot.add(body);
    pot.add(cyl(0.07, 0.09, 0.05, std('#6aa38c'), 0, 0.3, 0, 12));
    pot.add(sphere(0.03, std('#c99b52'), 0, 0.35, 0, 6, 6));
    const spout = cyl(0.025, 0.04, 0.2, std('#6aa38c'), 0.2, 0.18, 0, 8);
    spout.rotation.z = -1.0;
    pot.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), std('#6aa38c'));
    handle.position.set(-0.19, 0.17, 0);
    handle.rotation.z = Math.PI / 2;
    pot.add(handle);
    g.add(pot);
    this.pot = pot;
    // Chén trà trước mỗi chỗ ngồi
    this.cups = new Map();
    const seats = [...this.cfg.seats, { id: 'monk', ...this.cfg.monkSeat }];
    for (const seat of seats) {
      const dx = toX(seat.x) - toX(t.x);
      const dz = toZ(seat.y) - toZ(t.y);
      const len = Math.hypot(dx, dz);
      const cup = new THREE.Group();
      void len;
      cup.position.set(Math.max(-1.2, Math.min(1.2, dx * 0.55)), 0.43, Math.max(-0.65, Math.min(0.65, dz * 0.55)));
      cup.add(cyl(0.065, 0.045, 0.07, std('#f3ead8'), 0, 0.035, 0, 12));
      cup.add(cyl(0.056, 0.056, 0.01, std('#a8c46a'), 0, 0.06, 0, 12));
      g.add(cup);
      this.cups.set(seat.id, cup);
    }
    // Bình hoa sen nhỏ
    const vase = cyl(0.06, 0.08, 0.2, std('#2f5f8a'), -0.9, 0.5, -0.3, 10);
    g.add(vase);
    g.add(sphere(0.07, std('#f6a5c0'), -0.9, 0.7, -0.3, 8, 8));
    this.scene.add(g);
    this.tableGroup = g;

    // Bồ đoàn quanh bàn trà
    const cushionMat = std('#d9b978');
    for (const seat of seats) {
      const c = cyl(0.34, 0.36, 0.16, cushionMat, toX(seat.x), 0.08, toZ(seat.y), 20);
      if (seat.id !== 'monk') c.userData.pick = { type: 'tea_seat', id: seat.id };
      this.scene.add(c);
    }
    this.labels.push({ text: '🍵 Bàn Trà Tâm Giao', position: new THREE.Vector3(toX(t.x), 1.6, toZ(t.y)), className: 'place-label subtle' });
  }

  buildRain() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#d8ecf2', size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  // Sư Thầy ngồi uống trà; khi được mời giảng thì nói một câu
  npcs(ctx) {
    const monk = ctx.world.npcs.find(n => n.id === 'su_thay');
    const s = this.cfg.monkSeat;
    const speaking = Date.now() < this.monkSpeechUntil;
    return [{
      key: 'tea_monk',
      char: { ...monk, x: s.x, y: s.y, isMoving: false, isSitting: true, activity: 'uong_tra', activityStart: 1000, tool: 'none',
        speech: speaking ? this.monkSpeech : '', speechTimer: speaking ? 100 : 0 }
    }];
  }

  event(name, data) {
    if (name === 'pour') {
      this.pourStart = this.time;
      this.pourSeat = data.seatId;
    } else if (name === 'monk_say') {
      this.monkSpeech = data.text;
      this.monkSpeechUntil = Date.now() + 7000;
    }
  }

  update(dt, time) {
    this.time = time;
    // Rót trà: nhấc ấm, nghiêng về phía chén rồi đặt xuống; hơi trà bốc lên từ chén
    if (this.pourStart !== undefined && this.pourStart >= 0) {
      const t = time - this.pourStart;
      const cup = this.cups.get(this.pourSeat);
      if (t < 2.2 && cup) {
        const k = t < 0.5 ? t / 0.5 : t > 1.7 ? (2.2 - t) / 0.5 : 1;
        this.pot.position.set(cup.position.x * 0.55 * k, 0.43 + 0.25 * k, cup.position.z * 0.55 * k);
        this.pot.rotation.y = Math.atan2(-cup.position.z, cup.position.x);
        this.pot.rotation.z = -0.6 * k;
        if (t > 0.6 && t < 1.6 && Math.random() < 0.4) this.spawnSteam(cup);
      } else {
        this.pot.position.set(0, 0.43, 0);
        this.pot.rotation.set(0, 0, 0);
        this.pourStart = -1;
      }
    }
    if (Math.random() < 0.05) this.spawnSteam(this.pot, 0.4);
    this.steam = this.steam.filter((s) => {
      s.age += dt;
      const k = s.age / 2.5;
      s.sprite.position.y += dt * 0.25;
      s.sprite.position.x += Math.sin(time + s.seed) * dt * 0.05;
      s.sprite.scale.setScalar(0.12 + k * 0.4);
      s.sprite.material.opacity = 0.35 * Math.sin(Math.min(1, k) * Math.PI);
      if (k < 1) return true;
      this.scene.remove(s.sprite);
      return false;
    });
    for (const c of this.chimes) c.rotation.z = Math.sin(time * 1.3) * 0.08;

    // Mưa rơi khi bật tiếng "Mưa Hiên Chùa"
    const raining = window.zenAudio && window.zenAudio.isRainPlaying;
    this.rain.visible = !!raining;
    if (raining) {
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 9;
        // Không mưa dưới mái hiên
        if (y < -0.4 || (Math.abs(pos.getX(i)) < 6 && Math.abs(pos.getZ(i)) < 4.6 && y < 3.6)) y = 12;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }

  spawnSteam(obj, scale = 1) {
    const world = new THREE.Vector3();
    obj.getWorldPosition(world);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    sprite.position.copy(world).add(new THREE.Vector3(0, 0.15 * scale + 0.1, 0));
    this.scene.add(sprite);
    this.steam.push({ sprite, age: 0, seed: Math.random() * 10 });
  }

  faceYaw(char, X, Z) {
    if (char.isSitting) return Math.atan2(toX(this.cfg.table.x) - X, toZ(this.cfg.table.y) - Z);
    return undefined;
  }

  clampCamera(pos) {
    if (Math.abs(pos.x) < 6.2 && Math.abs(pos.z) < 4.8) pos.y = Math.min(pos.y, 3.2);
  }
}
