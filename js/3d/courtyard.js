// Sân chùa 3D. Bố cục giữ đúng toạ độ logic của bản 2D (TempleWorld) để server và luật chơi không đổi

import * as THREE from 'three';
import {
  toX, toZ, std, gold, box, cyl, sphere, makeRoof, plaque, brickTexture, makeHangingLantern,
  makeIncenseBurner, makeTree, makeBamboo, softSpriteTexture
} from './props.js';
import { NightSky, applySky, skyState } from './sky.js';

// Khu vực có vật cản (logic px): người chơi không đi xuyên qua được
export const COURTYARD_OBSTACLES = [
  { type: 'rect', left: 600, right: 1000, top: 100, bottom: 285 }, // Chính Điện
  { type: 'rect', left: 482, right: 578, top: 200, bottom: 285 }, // Gác chuông
  { type: 'rect', left: 1196, right: 1304, top: 300, bottom: 372 }, // Lầu xin xăm
  { type: 'circle', x: 800, y: 545, r: 42 }, // Gốc bồ đề
  { type: 'circle', x: 1270, y: 650, r: 36 }, // Cây nguyện ước
  { type: 'circle', x: 800, y: 357, r: 26 } // Đỉnh hương
];

// Bấm vào công trình = bấm vào điểm tương tác của nó (vào khu, thắp hương, lấy chổi...)
function pickAs(obj, hotspotId) {
  obj.traverse((o) => { if (o.isMesh) o.userData.pick = { type: 'hotspot', id: hotspotId }; });
}

export class Courtyard {
  constructor(world) {
    this.world = world;
    this.scene = new THREE.Scene();
    this.pickables = [];
    this.lanterns = [];
    this.swaying = [];
    this.itemMeshes = new Map();
    this.lanternMeshes = new Map();
    this.koiMeshes = [];
    this.pelletMeshes = [];
    this.catMeshes = new Map();
    this.labels = [];
    this.soft = softSpriteTexture();

    this.buildLights();
    this.buildGround();
    this.buildPond();
    this.buildSanctuary();
    this.buildBellTower();
    this.buildFortunePavilion();
    this.buildTeaPavilion();
    this.buildGate();
    this.buildBroomRack();
    this.buildIncenseBurner();
    this.buildTrees();
    this.buildHotspotRings();
    this.nightSky = new NightSky(this.scene);
    this.applySkyState(skyState(12), 15);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#bfe3f5', '#6b8f5a', 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.2);
    this.sun.position.set(-14, 22, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = -24; s.right = 24; s.top = 18; s.bottom = -18; s.near = 1; s.far = 70;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog('#b9dceb', 40, 90);
  }

  // Trời sáng tối theo giờ: màu trời, nắng, sao, trăng; lồng đèn sáng dần khi chiều tối
  applySkyState(state, lunarDay) {
    applySky(this.scene, { hemi: this.hemi, sun: this.sun }, state);
    this.nightSky.update(state, lunarDay);
    for (const lantern of this.lanterns) {
      lantern.userData.body.material.emissiveIntensity = state.lanterns;
      if (lantern.userData.light) lantern.userData.light.intensity = Math.max(0, (state.lanterns - 0.3) * 1.4);
    }
  }

  // Trang trí sân chùa trong các đại lễ: dây cờ / lồng đèn / đèn ông sao căng quanh sân
  setFestival(id) {
    if (id === this.festivalId) return;
    this.festivalId = id;
    if (this.festivalGroup) {
      this.scene.remove(this.festivalGroup);
      this.festivalGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.festivalGroup = null;
    }
    const styles = {
      phat_dan: { type: 'flag', colors: ['#0058a8', '#ffd200', '#e0201f', '#ffffff', '#ff7f00'] },
      tet: { type: 'lantern', colors: ['#d62f2f', '#f2c14e'], blossoms: true },
      ram_thang_gieng: { type: 'lantern', colors: ['#d62f2f', '#ff9f1c'] },
      vu_lan: { type: 'lantern', colors: ['#f6a5c0', '#ffffff', '#e8467c'] },
      trung_thu: { type: 'star', colors: ['#ffd166', '#e63946'] },
      ram_thang_muoi: { type: 'lantern', colors: ['#d62f2f', '#f2c14e'] }
    };
    const style = styles[id];
    if (!style) return;

    const g = new THREE.Group();
    const corners = [[500, 320], [1100, 320], [500, 860], [1100, 860]];
    const postMat = std('#7a2a1e');
    for (const [x, y] of corners) g.add(cyl(0.07, 0.09, 3.6, postMat, toX(x), 1.8, toZ(y), 8));
    const strings = [[[500, 320], [1100, 320]], [[500, 320], [500, 860]], [[1100, 320], [1100, 860]], [[500, 860], [1100, 860]]];
    const ropeMat = new THREE.LineBasicMaterial({ color: '#5a3a1e' });
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.08 : 0.2;
      const a2 = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(a2) * r, Math.sin(a2) * r);
      else starShape.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
    }
    starShape.closePath();
    const flagShape = new THREE.Shape();
    flagShape.moveTo(-0.17, 0);
    flagShape.lineTo(0.17, 0);
    flagShape.lineTo(0, -0.42);
    flagShape.closePath();

    for (const [[x1, y1], [x2, y2]] of strings) {
      const a3 = new THREE.Vector3(toX(x1), 3.5, toZ(y1));
      const b3 = new THREE.Vector3(toX(x2), 3.5, toZ(y2));
      const len = a3.distanceTo(b3);
      const pointAt = (t) => a3.clone().lerp(b3, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 0.9, 0));
      const pts = [];
      for (let i = 0; i <= 24; i++) pts.push(pointAt(i / 24));
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
      const count = Math.floor(len / 0.75);
      for (let i = 1; i < count; i++) {
        const p = pointAt(i / count);
        const color = style.colors[i % style.colors.length];
        let item;
        if (style.type === 'flag') {
          item = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), std(color, { side: THREE.DoubleSide }));
          item.lookAt(item.position.clone().add(new THREE.Vector3(b3.z - a3.z, 0, a3.x - b3.x)));
        } else if (style.type === 'star') {
          item = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.04, bevelEnabled: false }),
            std(color, { emissive: color, emissiveIntensity: 0.6 }));
          item.position.y -= 0.25;
        } else {
          item = sphere(0.15, std(color, { emissive: color, emissiveIntensity: 0.5 }), 0, -0.22, 0, 12, 10);
          item.scale.y = 1.2;
        }
        const holder = new THREE.Group();
        holder.position.copy(p);
        holder.add(item);
        g.add(holder);
      }
    }
    // Tết: hai cây hoa đào hai bên lối vào
    if (style.blossoms) {
      for (const x of [700, 900]) {
        const tree = makeTree({ trunkH: 1.6, trunkR: 0.18, canopy: 1.2, seed: x, colors: ['#f7a8c4', '#fbc6d8', '#f48fb1'] });
        tree.position.set(toX(x), 0, toZ(985));
        g.add(tree);
      }
    }
    this.scene.add(g);
    this.festivalGroup = g;
  }

  label(text, x, y, height, className = 'place-label') {
    this.labels.push({ text, position: new THREE.Vector3(toX(x), height, toZ(y)), className });
  }

  buildGround() {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), std('#678f5c'));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Tường bao rêu phong, chừa lối Cổng Tam Quan
    const wallMat = std('#8a8174');
    const capMat = std('#6e2a20');
    const wall = (x1, y1, x2, y2) => {
      const len = Math.hypot(toX(x2) - toX(x1), toZ(y2) - toZ(y1));
      const cx = (toX(x1) + toX(x2)) / 2;
      const cz = (toZ(y1) + toZ(y2)) / 2;
      const horizontal = y1 === y2;
      const w = box(horizontal ? len : 0.4, 1.3, horizontal ? 0.4 : len, wallMat, cx, 0.65, cz);
      const cap = box(horizontal ? len + 0.2 : 0.7, 0.14, horizontal ? 0.7 : len + 0.2, capMat, cx, 1.36, cz);
      this.scene.add(w, cap);
    };
    wall(60, 60, 1540, 60);
    wall(60, 60, 60, 1040);
    wall(1540, 60, 1540, 1040);
    wall(60, 1040, 660, 1040);
    wall(940, 1040, 1540, 1040);

    // Sân gạch Bát Tràng và viền đá xanh
    const court = new THREE.Mesh(new THREE.BoxGeometry(16, 0.06, 14.25), std('#ffffff', { map: brickTexture(8, 7) }));
    court.position.set(toX(800), 0.03, toZ(595));
    court.receiveShadow = true;
    this.scene.add(court);
    const border = std('#8c857b');
    this.scene.add(box(16.4, 0.08, 0.2, border, toX(800), 0.04, toZ(310)));
    this.scene.add(box(16.4, 0.08, 0.2, border, toX(800), 0.04, toZ(880)));
    this.scene.add(box(0.2, 0.08, 14.25, border, toX(480), 0.04, toZ(595)));
    this.scene.add(box(0.2, 0.08, 14.25, border, toX(1120), 0.04, toZ(595)));

    // Đường lát đá
    const stone = std('#b3aa9b');
    const path = (x, y, w, h) => {
      const m = box(w / 40, 0.05, h / 40, stone, toX(x + w / 2), 0.025, toZ(y + h / 2), { cast: false });
      this.scene.add(m);
    };
    path(1115, 345, 160, 54);
    path(1115, 625, 160, 54);
    path(1215, 355, 60, 310);
    path(320, 345, 165, 54);
    path(425, 635, 65, 54);
    path(745, 875, 110, 165);

    // Đá tròn chạm hoa sen dưới gốc bồ đề
    const lotusStone = cyl(1.85, 1.9, 0.08, std('#c9b99d'), toX(800), 0.06, toZ(540), 40);
    this.scene.add(lotusStone);

    const bamboo = [
      [130, 150], [190, 130], [1410, 150], [1460, 200], [1440, 840],
      [1380, 890], [150, 890], [220, 920], [630, 930], [970, 930]
    ];
    bamboo.forEach(([x, y], i) => {
      const b = makeBamboo(i + 3);
      b.position.set(toX(x), 0, toZ(y));
      this.scene.add(b);
    });
  }

  buildPond() {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 48), std('#878176'));
    rim.scale.set(7.75 / 2 * 1.02, 1, 7.75 / 2 * 1.02);
    rim.position.set(toX(300), 0.1, toZ(675));
    rim.receiveShadow = true;
    pickAs(rim, 'ho_sen');
    this.scene.add(rim);
    this.water = new THREE.Mesh(new THREE.CircleGeometry(1, 48),
      new THREE.MeshStandardMaterial({ color: '#2f7f95', roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.86 }));
    this.water.rotation.x = -Math.PI / 2;
    this.water.scale.set(3.55, 3.55, 1);
    this.water.position.set(toX(300), 0.24, toZ(675));
    pickAs(this.water, 'ho_sen');
    this.scene.add(this.water);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(3.55, 48), std('#1d4a52'));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(toX(300), 0.13, toZ(675));
    pickAs(bed, 'ho_sen');
    this.scene.add(bed);

    const lotuses = [
      [210, 585, 20, true], [245, 615, 15, false], [375, 580, 22, true],
      [350, 745, 21, true], [225, 765, 17, false], [295, 660, 19, true]
    ];
    const pad = std('#3f8554', { side: THREE.DoubleSide });
    const petal = std('#f78fb3');
    for (const [x, y, r, flower] of lotuses) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(r / 40, 20, 0.3, Math.PI * 1.85), pad);
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.set(toX(x), 0.26, toZ(y));
      this.scene.add(leaf);
      if (flower) {
        const f = new THREE.Group();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const p = sphere(0.09, petal, Math.cos(a) * 0.08, 0.08, Math.sin(a) * 0.08, 8, 6);
          p.scale.set(0.6, 1.4, 0.6);
          p.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
          f.add(p);
        }
        f.add(sphere(0.05, std('#ffd166'), 0, 0.12, 0, 8, 6));
        f.position.set(toX(x), 0.26, toZ(y));
        this.scene.add(f);
      }
    }

    // Cầu gỗ nhỏ bên hồ
    const bridge = box(68 / 40, 0.12, 52 / 40, std('#8c5a36'), toX(454), 0.3, toZ(661));
    pickAs(bridge, 'ho_sen');
    this.scene.add(bridge);
    for (const s of [-1, 1]) {
      this.scene.add(box(68 / 40, 0.06, 0.06, std('#5c381e'), toX(454), 0.65, toZ(661) + s * 0.6));
      for (const px of [430, 478]) this.scene.add(cyl(0.04, 0.04, 0.4, std('#5c381e'), toX(px), 0.45, toZ(661) + s * 0.6, 6));
    }

    // Đàn cá Koi
    const koiGeo = new THREE.SphereGeometry(0.2, 12, 8);
    const tailGeo = new THREE.ConeGeometry(0.12, 0.22, 6);
    for (const fish of this.world.koiFish) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(koiGeo, std(fish.color, { roughness: 0.4 }));
      body.scale.set(1, 0.45, 0.42);
      g.add(body);
      const spot = sphere(0.07, std(fish.spotColor), 0.05, 0.05, 0, 8, 6);
      g.add(spot);
      const tail = new THREE.Mesh(tailGeo, std(fish.color));
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.28;
      tail.scale.z = 0.3;
      g.add(tail);
      g.userData.tail = tail;
      this.scene.add(g);
      this.koiMeshes.push(g);
    }
    this.label('🪷 Hồ Sen & Hoa Đăng', 300, 520, 1.4);
  }

  buildSanctuary() {
    const g = new THREE.Group();
    g.position.set(toX(800), 0, toZ(200));
    const stone = std('#9e9689');
    g.add(box(10.4, 0.55, 5.2, stone, 0, 0.275, 0));
    // Bậc tam cấp
    for (let i = 0; i < 3; i++) g.add(box(3.6 - i * 0.2, 0.18, 0.4, std('#b5ada0'), 0, 0.09 + i * 0.18, 2.75 - i * 0.35));
    // Thân điện: vách gỗ, cửa bức bàn
    const wallMat = std('#6b3a22');
    g.add(box(9.2, 3.0, 3.8, wallMat, 0, 2.05, -0.3));
    const doorMat = std('#8a2a1c', { roughness: 0.55 });
    for (let i = -2; i <= 2; i++) {
      const door = box(1.4, 2.4, 0.1, doorMat, i * 1.6, 1.75, 1.62);
      g.add(door);
      g.add(box(1.1, 1.0, 0.04, std('#c99b52'), i * 1.6, 2.25, 1.68, { cast: false }));
    }
    // Cửa giữa mở hé, ánh đèn bên trong hắt ra
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ color: '#ffcf7a' }));
    glow.position.set(0, 1.75, 1.69);
    g.add(glow);
    // Hàng cột lim đỏ và lồng đèn
    const pillarMat = std('#8c2318', { roughness: 0.5 });
    for (const px of [-4.4, -2.4, 2.4, 4.4]) {
      g.add(cyl(0.18, 0.2, 3.1, pillarMat, px, 2.1, 2.1, 12));
      g.add(cyl(0.3, 0.3, 0.12, stone, px, 0.6, 2.1, 12));
      const lantern = makeHangingLantern('#d62f2f', px === -2.4 || px === 2.4);
      lantern.position.set(px * 0.5 + (px > 0 ? 1 : -1) * 0.2, 2.9, 2.2);
      g.add(lantern);
      this.lanterns.push(lantern);
    }
    // Hai tầng mái cong
    const roof1 = makeRoof({ width: 10.2, depth: 5.2, height: 1.4, curl: 0.5, overhang: 0.6 });
    roof1.position.y = 3.55;
    g.add(roof1);
    const roof2 = makeRoof({ width: 7.2, depth: 3.2, height: 1.5, curl: 0.45, overhang: 0.4 });
    roof2.position.y = 4.95;
    g.add(roof2);
    g.add(box(7.6, 0.5, 3.0, wallMat, 0, 4.85, -0.2));
    // Hoành phi
    const sign = plaque('AN YÊN CỔ TỰ', 3.2, 0.7, { width: 1024, height: 224, font: 'bold 120px "Be Vietnam Pro", serif' });
    sign.position.set(0, 4.05, 2.62);
    g.add(sign);
    pickAs(g, 'chinh_dien');
    this.scene.add(g);
    this.label('🛕 Chính Điện Tam Bảo', 800, 255, 7.4);
  }

  buildBellTower() {
    const g = new THREE.Group();
    g.position.set(toX(530), 0, toZ(242));
    const wood = std('#7a2a1e');
    g.add(box(2.4, 0.3, 2.2, std('#8c7f70'), 0, 0.15, 0));
    for (const [x, z] of [[-0.95, -0.85], [0.95, -0.85], [-0.95, 0.85], [0.95, 0.85]]) g.add(cyl(0.1, 0.12, 2.6, wood, x, 1.6, z, 10));
    const roof = makeRoof({ width: 2.4, depth: 2.2, height: 1.0, curl: 0.35, overhang: 0.35, ridgeRatio: 0.3 });
    roof.position.y = 2.9;
    g.add(roof);
    g.add(box(2.2, 0.12, 0.12, wood, 0, 2.75, 0));
    const bronze = new THREE.MeshStandardMaterial({ color: '#b07b2c', roughness: 0.35, metalness: 0.85 });
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(0.28 + Math.pow(t, 2.2) * 0.32, 1 - t));
    }
    const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), bronze);
    bell.position.set(0, 1.55, 0);
    bell.castShadow = true;
    g.add(bell);
    g.add(cyl(0.1, 0.1, 0.18, bronze, 0, 2.62, 0, 8));
    const striker = cyl(0.06, 0.06, 1.4, std('#8c6a3e'), 0.9, 1.9, 0, 8);
    striker.rotation.z = Math.PI / 2;
    g.add(striker);
    this.bellMesh = bell;
    pickAs(g, 'gac_chuong');
    this.scene.add(g);
    this.label('🔔 Gác Chuông & Mõ', 530, 242, 4.6);
  }

  buildFortunePavilion() {
    const g = new THREE.Group();
    g.position.set(toX(1250), 0, toZ(336));
    g.add(box(2.9, 0.3, 2.2, std('#8a5a36'), 0, 0.15, 0));
    const wood = std('#7a2a1e');
    for (const [x, z] of [[-1.25, -0.9], [1.25, -0.9], [-1.25, 0.9], [1.25, 0.9]]) g.add(cyl(0.1, 0.1, 2.4, wood, x, 1.5, z, 10));
    const roof = makeRoof({ width: 2.9, depth: 2.2, height: 1.1, curl: 0.4, overhang: 0.4, ridgeRatio: 0.4 });
    roof.position.y = 2.7;
    g.add(roof);
    g.add(box(1.3, 0.6, 0.7, std('#ba8550'), 0, 0.6, 0.2));
    const tube = cyl(0.14, 0.14, 0.45, std('#d94848'), 0, 1.12, 0.2, 14);
    g.add(tube);
    for (let i = 0; i < 9; i++) {
      const stick = box(0.025, 0.4, 0.01, std('#e8c27a'), (Math.random() - 0.5) * 0.15, 1.38, 0.2 + (Math.random() - 0.5) * 0.1);
      stick.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(stick);
    }
    pickAs(g, 'lau_xin_xam');
    this.scene.add(g);
    this.label('🎋 Lầu Xin Xăm', 1250, 336, 4.3);
  }

  buildTeaPavilion() {
    const g = new THREE.Group();
    g.position.set(toX(320), 0, toZ(365));
    const floor = box(3.75, 0.3, 2.75, std('#7c5032'), 0, 0.15, 0);
    g.add(floor);
    const wood = std('#5c381e');
    for (const [x, z] of [[-1.7, -1.2], [1.7, -1.2], [-1.7, 1.2], [1.7, 1.2]]) g.add(cyl(0.08, 0.08, 2.3, wood, x, 1.45, z, 8));
    const roof = makeRoof({ width: 3.75, depth: 2.75, height: 1.0, curl: 0.35, overhang: 0.35, color: '#5f3b26', ridgeRatio: 0.35 });
    roof.position.y = 2.6;
    g.add(roof);
    g.add(box(1.3, 0.35, 0.9, std('#59341c'), 0, 0.48, 0));
    const pot = sphere(0.16, std('#75b89f', { roughness: 0.3 }), 0, 0.78, 0, 14, 10);
    pot.scale.y = 0.85;
    g.add(pot);
    for (const [x, z] of [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]]) g.add(cyl(0.05, 0.04, 0.07, std('#f3ead8'), x, 0.7, z, 8));
    for (const s of this.world.teaSeats) {
      g.add(cyl(0.3, 0.32, 0.12, std('#d9b978'), toX(s.x) - toX(320), 0.36, toZ(s.y) - toZ(365), 16));
    }
    pickAs(g, 'thuy_dinh');
    this.scene.add(g);
    this.label('🍵 Hiên Trà Tâm Giao', 320, 365, 3.9);
  }

  buildGate() {
    const g = new THREE.Group();
    g.position.set(toX(800), 0, toZ(1040));
    const stone = std('#8c8375');
    const red = std('#d46548');
    for (const px of [-3.25, -1.3, 1.3, 3.25]) {
      g.add(box(0.5, 2.8, 0.5, stone, px, 1.4, 0));
      g.add(box(0.3, 1.6, 0.52, red, px, 1.4, 0, { cast: false }));
    }
    const roofMain = makeRoof({ width: 2.6, depth: 1.0, height: 0.8, curl: 0.3, overhang: 0.3, ridgeRatio: 0.6 });
    roofMain.position.y = 3.3;
    g.add(roofMain);
    g.add(box(2.7, 0.5, 0.6, stone, 0, 3.05, 0));
    for (const s of [-1, 1]) {
      const r = makeRoof({ width: 2.0, depth: 0.9, height: 0.6, curl: 0.25, overhang: 0.25, ridgeRatio: 0.6 });
      r.position.set(s * 2.27, 2.85, 0);
      g.add(r);
      g.add(box(1.95, 0.35, 0.55, stone, s * 2.27, 2.65, 0));
    }
    const sign = plaque('CỔNG TAM QUAN', 2.0, 0.42, { width: 768, height: 160, font: 'bold 80px "Be Vietnam Pro", serif' });
    sign.position.set(0, 3.05, 0.31);
    g.add(sign);
    this.scene.add(g);
  }

  buildBroomRack() {
    const g = new THREE.Group();
    g.position.set(toX(1030), 0, toZ(350));
    g.add(box(1.4, 0.15, 0.4, std('#7a5230'), 0, 0.7, -0.2));
    g.add(box(0.1, 0.8, 0.1, std('#7a5230'), -0.65, 0.4, -0.2));
    g.add(box(0.1, 0.8, 0.1, std('#7a5230'), 0.65, 0.4, -0.2));
    for (const x of [-0.35, 0, 0.35]) {
      const stick = cyl(0.025, 0.025, 1.3, std('#c9a259'), x, 0.85, -0.05, 6);
      stick.rotation.x = -0.2;
      g.add(stick);
      g.add(cyl(0.02, 0.16, 0.35, std('#dfc17a'), x, 0.18, 0.05, 8));
    }
    const basket = cyl(0.3, 0.24, 0.55, std('#b58d4b'), 1.0, 0.28, 0, 12);
    g.add(basket);
    pickAs(g, 'ke_choi');
    this.scene.add(g);
    this.label('🧹 Kệ Chổi Công Quả', 1030, 350, 2.0);
  }

  buildIncenseBurner() {
    const burner = makeIncenseBurner(1.3);
    burner.position.set(toX(800), 0, toZ(357));
    pickAs(burner, 'dinh_huong');
    this.scene.add(burner);
  }

  buildTrees() {
    const bodhi = makeTree({ trunkH: 2.4, trunkR: 0.42, canopy: 2.6, seed: 7 });
    bodhi.position.set(toX(800), 0, toZ(540));
    this.scene.add(bodhi);
    this.swaying.push(bodhi.userData.leaves);

    const wish = makeTree({ trunkH: 2.0, trunkR: 0.32, canopy: 2.0, seed: 11, colors: ['#3e6b48', '#4c8057', '#5b9467'] });
    wish.position.set(toX(1270), 0, toZ(650));
    pickAs(wish, 'cay_nguyen_uoc');
    this.scene.add(wish);
    this.swaying.push(wish.userData.leaves);
    const base = cyl(1.0, 1.1, 0.25, std('#9e3b33'), toX(1270), 0.12, toZ(650), 24);
    pickAs(base, 'cay_nguyen_uoc');
    this.scene.add(base);
    // Dải lụa đỏ và thẻ gỗ ước nguyện đung đưa
    this.ribbons = [];
    const ribbonMat = std('#e63946', { side: THREE.DoubleSide });
    const tagMat = std('#ffd166');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 1.2 + (i % 3) * 0.3;
      const ribbon = new THREE.Group();
      ribbon.position.set(toX(1270) + Math.cos(a) * r, 2.6 + (i % 2) * 0.3, toZ(650) + Math.sin(a) * r);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.8), ribbonMat);
      strip.position.y = -0.4;
      ribbon.add(strip);
      const tag = box(0.16, 0.22, 0.03, tagMat, 0, -0.85, 0, { receive: false });
      ribbon.add(tag);
      this.scene.add(ribbon);
      this.ribbons.push(ribbon);
    }
    this.wishLabel = { text: '', position: new THREE.Vector3(toX(1270), 5.4, toZ(650)), className: 'place-label' };
    this.labels.push(this.wishLabel);
  }

  buildHotspotRings() {
    this.hotspotRings = new Map();
    const geo = new THREE.RingGeometry(0.55, 0.68, 40);
    for (const hs of this.world.hotspots) {
      const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, opacity: 0.3, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(toX(hs.x), 0.09, toZ(hs.y + 12));
      ring.userData.pick = { type: 'hotspot', id: hs.id };
      this.scene.add(ring);
      this.hotspotRings.set(hs.id, ring);
    }
  }

  // Đồng bộ các vật thể thay đổi theo thời gian thực (lá rụng, hoa đăng, cá, mèo)
  sync(dt, time, activeHotspot) {
    const world = this.world;

    // Lá rụng & rác trên sân
    const seen = new Set();
    for (const item of world.groundItems) {
      seen.add(item.id);
      if (!this.itemMeshes.has(item.id)) {
        const m = item.type === 'leaf' ? this.makeLeaf(item) : this.makeTrash(item);
        m.position.set(toX(item.x), 0.08, toZ(item.y));
        m.rotation.y = item.rotation || 0;
        this.scene.add(m);
        this.itemMeshes.set(item.id, m);
      }
    }
    for (const [id, m] of this.itemMeshes) {
      if (!seen.has(id)) {
        this.scene.remove(m);
        this.itemMeshes.delete(id);
      }
    }

    // Đèn hoa đăng trên hồ
    const lanternIds = new Set();
    for (const l of world.lanterns) {
      lanternIds.add(l.id);
      let m = this.lanternMeshes.get(l.id);
      if (!m) {
        m = this.makeLotusLantern(l.color);
        this.scene.add(m);
        this.lanternMeshes.set(l.id, m);
      }
      m.position.set(toX(l.x), 0.27 + Math.sin(time * 1.6 + l.x) * 0.03, toZ(l.y));
    }
    for (const [id, m] of this.lanternMeshes) {
      if (!lanternIds.has(id)) {
        this.scene.remove(m);
        this.lanternMeshes.delete(id);
      }
    }

    // Cá Koi
    world.koiFish.forEach((fish, i) => {
      const m = this.koiMeshes[i];
      if (!m) return;
      m.position.set(toX(fish.x), 0.19, toZ(fish.y));
      m.rotation.y = -fish.angle;
      m.userData.tail.rotation.y = Math.sin(fish.tailPhase) * 0.5;
    });

    // Thức ăn cá
    while (this.pelletMeshes.length < world.fishFoodPellet.length) {
      const p = sphere(0.05, std('#e8b968'), 0, 0.26, 0, 6, 6);
      this.scene.add(p);
      this.pelletMeshes.push(p);
    }
    this.pelletMeshes.forEach((p, i) => {
      const pellet = world.fishFoodPellet[i];
      p.visible = !!pellet;
      if (pellet) p.position.set(toX(pellet.x), 0.26, toZ(pellet.y));
    });

    // Mèo chùa
    for (const cat of world.cats) {
      let m = this.catMeshes.get(cat.id);
      if (!m) {
        m = this.makeCat(cat);
        this.scene.add(m);
        this.catMeshes.set(cat.id, m);
      }
      const prevX = m.position.x;
      const prevZ = m.position.z;
      m.position.set(toX(cat.x), 0, toZ(cat.y));
      const dx = m.position.x - prevX;
      const dz = m.position.z - prevZ;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) m.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      m.userData.tail.rotation.z = 0.6 + Math.sin(time * 4) * 0.35;
      m.userData.body.scale.y = cat.state === 'sleep' ? 0.75 : 1;
      m.userData.mood = cat.moodText;
    }

    // Lá cây, dải lụa đung đưa
    for (const leaves of this.swaying) leaves.rotation.z = Math.sin(time * 0.8) * 0.02;
    this.ribbons.forEach((r, i) => { r.rotation.x = Math.sin(time * 2 + i) * 0.18; });
    this.wishLabel.text = `🧧 Cây Nguyện Ước (${world.wishes.length} điều ước)`;

    // Vòng sáng điểm tương tác
    const pulse = 1 + Math.sin(time * 3.5) * 0.08;
    for (const [id, ring] of this.hotspotRings) {
      const active = activeHotspot && activeHotspot.id === id;
      ring.material.opacity = active ? 0.9 : 0.3;
      ring.material.color.set(active ? '#ffd966' : '#fff1c4');
      ring.scale.setScalar(active ? pulse * 1.1 : pulse);
    }

    // Mặt nước lấp lánh
    this.water.material.color.setHSL(0.53, 0.5, 0.36 + Math.sin(time * 0.7) * 0.02);
  }

  makeLeaf(item) {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.18);
    shape.bezierCurveTo(0.16, -0.05, 0.14, 0.12, 0, 0.1);
    shape.bezierCurveTo(-0.14, 0.12, -0.16, -0.05, 0, -0.18);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape),
      std(item.subType === 'bodhi_gold' ? '#e8b948' : '#d98236', { side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    const g = new THREE.Group();
    g.add(m);
    g.scale.setScalar(item.scale || 1);
    m.receiveShadow = true;
    return g;
  }

  makeTrash(item) {
    if (item.subType === 'paper') {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), std('#e6e1d6', { flatShading: true }));
      m.castShadow = true;
      return m;
    }
    const g = new THREE.Group();
    const bottle = cyl(0.06, 0.06, 0.32, std('#8ecae6', { transparent: true, opacity: 0.8, roughness: 0.2 }), 0, 0.06, 0, 10);
    bottle.rotation.z = Math.PI / 2;
    g.add(bottle);
    const cap = cyl(0.035, 0.035, 0.06, std('#e63946'), 0.19, 0.06, 0, 8);
    cap.rotation.z = Math.PI / 2;
    g.add(cap);
    return g;
  }

  makeLotusLantern(color) {
    const g = new THREE.Group();
    const mat = std(color || '#ff7eb3', { emissive: color || '#ff7eb3', emissiveIntensity: 0.4 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = sphere(0.1, mat, Math.cos(a) * 0.11, 0.05, Math.sin(a) * 0.11, 8, 6);
      p.scale.set(0.6, 1.2, 0.6);
      p.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(p);
    }
    g.add(sphere(0.06, new THREE.MeshBasicMaterial({ color: '#fff3b0' }), 0, 0.12, 0, 8, 6));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.soft, color: '#ffd27a', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(0.9, 0.9, 1);
    glow.position.y = 0.12;
    g.add(glow);
    return g;
  }

  makeCat(cat) {
    const g = new THREE.Group();
    const fur = new THREE.MeshToonMaterial({ color: cat.color });
    const stripe = new THREE.MeshToonMaterial({ color: cat.stripe });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), fur);
    body.scale.set(1.5, 0.85, 0.9);
    body.position.y = 0.2;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fur);
    head.position.set(0.3, 0.34, 0);
    head.castShadow = true;
    g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), stripe);
      ear.position.set(0.3, 0.5, s * 0.08);
      g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: '#222' }));
      eye.position.set(0.44, 0.37, s * 0.06);
      g.add(eye);
    }
    const tail = new THREE.Group();
    tail.position.set(-0.3, 0.25, 0);
    const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.3, 4, 6), stripe);
    tailMesh.position.y = 0.17;
    tail.add(tailMesh);
    g.add(tail);
    g.userData = { tail, body, pick: { type: 'cat', id: cat.id } };
    body.userData.pick = { type: 'cat', id: cat.id };
    head.userData.pick = { type: 'cat', id: cat.id };
    return g;
  }
}
