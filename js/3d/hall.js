// Không gian Chính Điện Tam Bảo: nơi ngồi thiền, gõ mõ tụng kinh, niệm Phật và đảnh lễ
// Toạ độ logic dùng chung với sân chùa (tâm điện ở 800, 550), xem TEMPLE_DATA.hall

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  toX, toZ, std, gold, box, cyl, sphere, plaque, textTexture, woodTexture, makeHangingLantern,
  makeIncenseBurner, makeBuddha, softSpriteTexture
} from './props.js';

const W = 24; // bề ngang điện (đơn vị 3D)
const D = 20; // chiều sâu
const H = 7; // chiều cao trần

export class Hall {
  constructor(renderer) {
    this.layout = window.TEMPLE_DATA.hall;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a0f0a');
    this.scene.fog = new THREE.Fog('#1a0f0a', 18, 40);
    this.labels = [];
    this.candles = [];
    this.lanterns = [];
    this.cushionMeshes = new Map();
    this.soft = softSpriteTexture();

    // Ánh phản chiếu dịu cho đồ thếp vàng
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.buildShell();
    this.buildPillars();
    this.buildAltar();
    this.buildAltarTable();
    this.buildRitualInstruments();
    this.buildCushions();
    this.buildLighting();
    this.buildAtmosphere();
  }

  buildShell() {
    const floorTex = woodTexture(6, 5, '#5b3420');
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: floorTex, roughness: 0.42, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Thảm đỏ lối giữa từ cửa vào tới bàn thờ
    const runner = box(2.2, 0.02, 13.2, std('#8c1d18', { roughness: 0.95 }), 0, 0.01, 3.3, { cast: false });
    this.scene.add(runner);
    for (const s of [-1, 1]) this.scene.add(box(0.08, 0.025, 13.2, gold({ roughness: 0.5 }), s * 1.06, 0.012, 3.3, { cast: false }));

    // Vách: chân tường sơn son, phần trên gỗ, cửa sổ chấn song
    const lacquer = std('#6e1b13', { roughness: 0.55 });
    const timber = std('#4a2716', { roughness: 0.8 });
    const wall = (w, x, z, rotY) => {
      const g = new THREE.Group();
      g.add(box(w, 2.6, 0.3, lacquer, 0, 1.3, 0));
      g.add(box(w, H - 2.6, 0.3, timber, 0, 2.6 + (H - 2.6) / 2, 0));
      g.add(box(w, 0.12, 0.34, gold({ roughness: 0.5 }), 0, 2.6, 0));
      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      this.scene.add(g);
      return g;
    };
    wall(W, 0, -D / 2, 0);
    const left = wall(D, -W / 2, 0, Math.PI / 2);
    const right = wall(D, W / 2, 0, Math.PI / 2);
    for (const side of [left, right]) {
      for (const z of [-5, 0, 5]) this.addWindow(side, z);
    }
    // Vách trước có cửa chính
    const frontL = wall((W - 3.4) / 2, -(W + 3.4) / 4, D / 2, 0);
    const frontR = wall((W - 3.4) / 2, (W + 3.4) / 4, D / 2, 0);
    void frontL; void frontR;
    this.scene.add(box(3.4, H - 4.2, 0.3, timber, 0, 4.2 + (H - 4.2) / 2, D / 2));
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), new THREE.MeshBasicMaterial({ color: '#fbe6b8' }));
    doorGlow.position.set(0, 2.1, D / 2 + 0.2);
    doorGlow.rotation.y = Math.PI;
    this.scene.add(doorGlow);
    for (const s of [-1, 1]) {
      const leaf = box(1.6, 4.2, 0.12, std('#8a2a1c', { roughness: 0.5 }), s * 2.4, 2.1, D / 2 - 0.5);
      leaf.rotation.y = s * 0.9;
      this.scene.add(leaf);
    }
    const doorPick = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    doorPick.position.set(0, 2.1, D / 2 - 0.1);
    doorPick.rotation.y = Math.PI;
    doorPick.userData.pick = { type: 'door' };
    this.scene.add(doorPick);
    this.labels.push({ text: '🚪 Ra Sân Chùa', position: new THREE.Vector3(0, 4.6, D / 2 - 0.4), className: 'place-label' });

    // Trần gỗ, xà ngang thếp viền
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#3a1e12'));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    this.scene.add(ceiling);
    for (let z = -D / 2 + 2; z < D / 2; z += 3) {
      this.scene.add(box(W, 0.35, 0.35, timber, 0, H - 0.25, z, { cast: false }));
      this.scene.add(box(W, 0.05, 0.37, gold({ roughness: 0.5 }), 0, H - 0.43, z, { cast: false }));
    }
  }

  addWindow(wallGroup, offset) {
    const frame = std('#3a1e12');
    const g = new THREE.Group();
    g.position.set(offset, 4.4, 0);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), new THREE.MeshBasicMaterial({ color: '#ffe7b0' }));
    pane.position.z = 0.16;
    g.add(pane);
    const pane2 = pane.clone();
    pane2.position.z = -0.16;
    pane2.rotation.y = Math.PI;
    g.add(pane2);
    for (let i = -2; i <= 2; i++) {
      g.add(box(0.06, 1.8, 0.36, frame, i * 0.45, 0, 0, { cast: false }));
    }
    for (let j = -1; j <= 1; j++) g.add(box(2.2, 0.06, 0.36, frame, 0, j * 0.6, 0, { cast: false }));
    g.add(box(2.4, 0.12, 0.4, frame, 0, 0.95, 0, { cast: false }));
    g.add(box(2.4, 0.12, 0.4, frame, 0, -0.95, 0, { cast: false }));
    wallGroup.add(g);
  }

  buildPillars() {
    const red = std('#8c2318', { roughness: 0.45 });
    const stone = std('#8f877a');
    const couplets = [
      ['Tâm', 'tịnh', 'tức', 'Phật', 'độ'], ['Từ', 'bi', 'hỷ', 'xả', 'tâm'],
      ['Tâm', 'an', 'vạn', 'sự', 'an'], ['Phúc', 'huệ', 'song', 'tu', 'hành']
    ];
    let ci = 0;
    for (const x of [-8, 8]) {
      for (const z of [-5.5, -1.5, 2.5, 6.5]) {
        this.scene.add(cyl(0.34, 0.36, H, red, x, H / 2, z, 20));
        this.scene.add(cyl(0.55, 0.6, 0.35, stone, x, 0.17, z, 16));
        this.scene.add(cyl(0.42, 0.36, 0.25, gold({ roughness: 0.4 }), x, H - 0.55, z, 16));
        // Câu đối trên hai hàng cột phía trước, hướng vào lối giữa
        if (z === -5.5 || z === -1.5) {
          const words = couplets[ci++ % couplets.length];
          const panel = plaque(words.join(' '), 0.42, 2.6, {
            width: 128, height: 768, vertical: true, bg: '#2a1308', fg: '#f5c54a', border: '#c99b52',
            font: 'bold 82px "Be Vietnam Pro", serif'
          });
          panel.position.set(x - Math.sign(x) * 0.37, 3.4, z);
          panel.rotation.y = -Math.sign(x) * Math.PI / 2;
          this.scene.add(panel);
        }
      }
    }
  }

  buildAltar() {
    const lacquer = std('#7a1f16', { roughness: 0.4 });
    const trim = gold({ roughness: 0.4 });
    // Ba cấp Phật đài
    this.scene.add(box(13, 0.7, 4.4, lacquer, 0, 0.35, -7.8));
    this.scene.add(box(13.1, 0.08, 4.5, trim, 0, 0.72, -7.8, { cast: false }));
    this.scene.add(box(8, 0.8, 3.2, lacquer, 0, 1.1, -8.3));
    this.scene.add(box(8.1, 0.08, 3.3, trim, 0, 1.52, -8.3, { cast: false }));
    this.scene.add(box(4.2, 0.6, 2.4, lacquer, 0, 1.8, -8.6));
    this.scene.add(box(4.3, 0.08, 2.5, trim, 0, 2.12, -8.6, { cast: false }));

    // Hậu bối: vách đỏ viền vàng, vầng hào quang rực lửa sau tượng
    this.scene.add(box(9, 6.4, 0.2, std('#5c1410', { roughness: 0.6 }), 0, 3.6, -9.75));
    this.scene.add(box(9.2, 0.15, 0.25, trim, 0, 6.8, -9.7));
    this.scene.add(box(0.15, 6.4, 0.25, trim, -4.6, 3.6, -9.7));
    this.scene.add(box(0.15, 6.4, 0.25, trim, 4.6, 3.6, -9.7));
    const halo = new THREE.Group();
    halo.position.set(0, 4.7, -9.55);
    halo.add(new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.08, 10, 64), trim));
    halo.add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 48), trim));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.88, 64),
      new THREE.MeshBasicMaterial({ color: '#ffcf6a', transparent: true, opacity: 0.35 }));
    disc.position.z = -0.02;
    halo.add(disc);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), trim);
      flame.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, 0);
      flame.rotation.z = a - Math.PI / 2;
      halo.add(flame);
    }
    this.scene.add(halo);
    this.halo = halo;
    const haloGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.soft, color: '#ffcf6a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    haloGlow.scale.set(7, 7, 1);
    haloGlow.position.set(0, 4.7, -9.4);
    this.scene.add(haloGlow);
    this.haloGlow = haloGlow;

    // Tượng Phật Thích Ca ngồi giữa, hai bên Bồ Tát Quan Âm và Địa Tạng
    const buddha = makeBuddha(1.15);
    buddha.position.set(0, 2.16, -8.6);
    this.scene.add(buddha);
    const quanAm = makeBuddha(0.55, { color: '#f4efe4', lotusColor: '#f2b8c6' });
    quanAm.position.set(-3.1, 1.56, -8.2);
    this.scene.add(quanAm);
    const diaTang = makeBuddha(0.55);
    diaTang.position.set(3.1, 1.56, -8.2);
    this.scene.add(diaTang);
    this.labels.push({ text: 'Đức Bổn Sư Thích Ca Mâu Ni', position: new THREE.Vector3(0, 7.2, -8.6), className: 'place-label subtle' });

    // Hoành phi trên cao
    const sign = plaque('ĐẠI HÙNG BẢO ĐIỆN', 5, 0.8, { width: 1024, height: 164, font: 'bold 92px "Be Vietnam Pro", serif' });
    sign.position.set(0, 6.35, -5.6);
    sign.rotation.x = 0.12;
    this.scene.add(sign);
    this.scene.add(box(5.2, 0.12, 0.12, std('#3a1e12'), 0, 6.9, -5.65, { cast: false }));
  }

  buildAltarTable() {
    const g = new THREE.Group();
    g.position.set(0, 0, -5.4);
    const lacquer = std('#8a2219', { roughness: 0.35 });
    const trim = gold({ roughness: 0.35 });
    g.add(box(5.6, 1.05, 1.5, lacquer, 0, 0.53, 0));
    g.add(box(5.75, 0.1, 1.6, trim, 0, 1.08, 0));
    g.add(box(5.0, 0.6, 0.02, trim, 0, 0.55, 0.76, { cast: false }));
    g.add(box(4.8, 0.5, 0.03, lacquer, 0, 0.55, 0.78, { cast: false }));

    // Bát hương giữa bàn thờ, khói hương bay lên
    const burner = makeIncenseBurner(0.75);
    burner.position.set(0, 1.12, 0);
    g.add(burner);
    this.smokeOrigin = new THREE.Vector3(0, 1.12 + 0.95, -5.4);

    // Đôi chân nến
    for (const s of [-1, 1]) {
      const stand = new THREE.Group();
      stand.position.set(s * 2.3, 1.13, 0);
      stand.add(cyl(0.16, 0.22, 0.08, trim, 0, 0.04, 0, 14));
      stand.add(cyl(0.04, 0.06, 0.55, trim, 0, 0.32, 0, 10));
      stand.add(cyl(0.13, 0.08, 0.06, trim, 0, 0.62, 0, 14));
      stand.add(cyl(0.07, 0.07, 0.4, std('#c62828', { roughness: 0.6 }), 0, 0.85, 0, 12));
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
      flame.position.y = 1.15;
      stand.add(flame);
      const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.soft, color: '#ffb347', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      flameGlow.scale.set(0.7, 0.7, 1);
      flameGlow.position.y = 1.15;
      stand.add(flameGlow);
      const light = new THREE.PointLight('#ffb35c', 3, 7, 2);
      light.position.y = 1.3;
      stand.add(light);
      g.add(stand);
      this.candles.push({ flame, glow: flameGlow, light, base: 3, seed: Math.random() * 10 });
    }

    // Bình sen hai bên
    for (const s of [-1, 1]) {
      const vase = new THREE.Group();
      vase.position.set(s * 1.4, 1.13, -0.2);
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push(new THREE.Vector2(0.1 + Math.sin(t * Math.PI) * 0.12 + (t > 0.85 ? (t - 0.85) * 0.5 : 0), t * 0.5));
      }
      vase.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 18), new THREE.MeshStandardMaterial({ color: '#2f5f8a', roughness: 0.25, metalness: 0.1 })));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const h = 0.6 + (i % 2) * 0.25;
        const stem = cyl(0.012, 0.012, h, std('#3f7a3f'), Math.cos(a) * 0.05, 0.5 + h / 2, Math.sin(a) * 0.05, 4);
        stem.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
        vase.add(stem);
        const bud = sphere(0.08, std(i % 2 ? '#f6a5c0' : '#fbe3ea'), Math.cos(a) * 0.15, 0.5 + h, Math.sin(a) * 0.15, 8, 8);
        bud.scale.y = 1.4;
        vase.add(bud);
      }
      g.add(vase);
    }

    // Mâm ngũ quả
    const fruitColors = ['#f2c14e', '#e85d3a', '#7cb342', '#fb8c00', '#d84315'];
    for (const s of [-1, 1]) {
      const plate = new THREE.Group();
      plate.position.set(s * 0.75, 1.13, 0.35);
      plate.add(cyl(0.3, 0.18, 0.06, trim, 0, 0.03, 0, 18));
      plate.add(cyl(0.06, 0.08, 0.12, trim, 0, -0.03, 0, 10));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.15;
        plate.add(sphere(0.08, std(fruitColors[i % 5], { roughness: 0.5 }), Math.cos(a) * r, 0.13 + (i === 0 ? 0.08 : 0), Math.sin(a) * r, 10, 8));
      }
      g.add(plate);
    }
    this.scene.add(g);

    // Ba tấm chiếu lạy trước bàn thờ
    for (const mat of this.layout.prostrationMats) {
      const m = box(0.9, 0.04, 1.4, std('#9e2a22', { roughness: 0.9 }), toX(mat.x), 0.02, toZ(mat.y));
      this.scene.add(m);
      this.scene.add(box(0.94, 0.045, 0.06, gold({ roughness: 0.5 }), toX(mat.x), 0.022, toZ(mat.y) + 0.7, { cast: false }));
    }
  }

  buildRitualInstruments() {
    const L = this.layout;
    const red = std('#8a2219', { roughness: 0.4 });
    const cushionMat = std('#b33a2c', { roughness: 0.8 });

    // Mõ lớn: thân gỗ sơn son thếp vàng, đặt trên gối đỏ và kệ thấp
    const mo = new THREE.Group();
    mo.position.set(toX(L.mo.x), 0, toZ(L.mo.y));
    mo.add(box(1.5, 0.45, 1.3, red, 0, 0.22, 0));
    mo.add(box(1.55, 0.06, 1.35, gold({ roughness: 0.4 }), 0, 0.46, 0, { cast: false }));
    const pillow = cyl(0.62, 0.65, 0.16, cushionMat, 0, 0.56, 0, 24);
    mo.add(pillow);
    const moMat = new THREE.MeshStandardMaterial({ color: '#7a2a14', roughness: 0.3, metalness: 0.15 });
    const body = sphere(0.55, moMat, 0, 1.0, 0, 28, 20);
    body.scale.set(1.25, 0.82, 1.1);
    mo.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 40), gold({ roughness: 0.35 }));
    band.position.y = 1.0;
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.12, 1, 1);
    mo.add(band);
    const slit = box(0.9, 0.05, 0.08, std('#1c0b05'), 0, 1.02, 0.6, { cast: false });
    mo.add(slit);
    // Hai đầu cá chạm nổi
    for (const s of [-1, 1]) {
      const eye = sphere(0.07, gold({ roughness: 0.35 }), s * 0.42, 1.18, 0.42, 10, 8);
      mo.add(eye);
    }
    const mallet = new THREE.Group();
    mallet.add(cyl(0.025, 0.025, 0.7, std('#6e4726'), 0, 0, 0, 8));
    mallet.add(sphere(0.07, std('#c9a26a'), 0, -0.38, 0, 10, 8));
    mallet.position.set(0.55, 0.72, 0.45);
    mallet.rotation.set(1.3, 0, 0.4);
    mo.add(mallet);
    this.moBody = body;
    this.moMallet = mallet;
    mo.traverse(o => { if (o.isMesh) o.userData.pick = { type: 'mo' }; });
    this.scene.add(mo);
    this.labels.push({ text: '🪵 Mõ Lớn', position: new THREE.Vector3(toX(L.mo.x), 2.2, toZ(L.mo.y)), className: 'place-label subtle' });

    // Chuông gia trì (chuông bát) bằng đồng
    const bell = new THREE.Group();
    bell.position.set(toX(L.bell.x), 0, toZ(L.bell.y));
    bell.add(box(1.3, 0.45, 1.3, red, 0, 0.22, 0));
    bell.add(box(1.35, 0.06, 1.35, gold({ roughness: 0.4 }), 0, 0.46, 0, { cast: false }));
    bell.add(cyl(0.6, 0.62, 0.16, cushionMat, 0, 0.56, 0, 24));
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector2(0.18 + Math.sin(t * Math.PI * 0.55) * 0.4, t * 0.5));
    }
    pts.push(new THREE.Vector2(0.52, 0.5));
    const bronze = new THREE.MeshStandardMaterial({ color: '#b5873a', roughness: 0.22, metalness: 0.9, side: THREE.DoubleSide });
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), bronze);
    bowl.position.y = 0.64;
    bowl.castShadow = true;
    bell.add(bowl);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 8, 40), bronze);
    lip.position.y = 1.14;
    lip.rotation.x = Math.PI / 2;
    bell.add(lip);
    const striker = cyl(0.03, 0.03, 0.8, std('#5a3418'), 0.6, 0.75, 0.3, 8);
    striker.rotation.set(1.2, 0, -0.5);
    bell.add(striker);
    this.bellBowl = bowl;
    bell.traverse(o => { if (o.isMesh) o.userData.pick = { type: 'bell' }; });
    this.scene.add(bell);
    this.labels.push({ text: '🔔 Chuông Gia Trì', position: new THREE.Vector3(toX(L.bell.x), 2.0, toZ(L.bell.y)), className: 'place-label subtle' });

    // Vòng sáng nhắc chỗ có thể tương tác
    this.instrumentRings = [L.mo, L.bell].map((p) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.15, 48),
        new THREE.MeshBasicMaterial({ color: '#ffd966', transparent: true, opacity: 0.25, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(toX(p.x), 0.02, toZ(p.y));
      this.scene.add(ring);
      return ring;
    });

    // Bàn kinh nhỏ trước chỗ Sư Thầy ngồi
    const desk = new THREE.Group();
    desk.position.set(toX(L.monkSeat.x) + 0.9, 0, toZ(L.monkSeat.y) + 0.1);
    desk.add(box(0.8, 0.35, 0.55, red, 0, 0.18, 0));
    const book = new THREE.Group();
    book.position.y = 0.4;
    for (const s of [-1, 1]) {
      const page = box(0.28, 0.02, 0.38, std('#f3e7c9'), s * 0.15, 0, 0, { cast: false });
      page.rotation.z = s * -0.15;
      book.add(page);
    }
    desk.add(book);
    desk.rotation.y = -0.5;
    this.scene.add(desk);
  }

  buildCushions() {
    const matMat = std('#6b4428', { roughness: 0.95 });
    const cushionMat = std('#d39b2a', { roughness: 0.85 });
    const seamMat = std('#8a5a14');
    for (const seat of this.layout.cushions) {
      const g = new THREE.Group();
      g.position.set(toX(seat.x), 0, toZ(seat.y));
      g.add(box(1.15, 0.04, 1.15, matMat, 0, 0.02, 0));
      const c = cyl(0.36, 0.4, 0.2, cushionMat, 0, 0.14, 0, 24);
      g.add(c);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 6, 24), seamMat);
      seam.rotation.x = Math.PI / 2;
      seam.position.y = 0.14;
      g.add(seam);
      g.traverse(o => { if (o.isMesh) o.userData.pick = { type: 'cushion', id: seat.id }; });
      this.scene.add(g);
      this.cushionMeshes.set(seat.id, g);
    }
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight('#ffd9a8', '#2a140a', 0.55));
    // Ánh đèn rọi tượng Phật
    const spot = new THREE.SpotLight('#ffe2a8', 60, 22, 0.5, 0.6, 1.5);
    spot.position.set(0, 6.6, -2.5);
    spot.target.position.set(0, 3.5, -8.6);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0008;
    this.scene.add(spot, spot.target);
    // Nắng xiên qua cửa sổ
    const sunIn = new THREE.DirectionalLight('#ffe7c2', 0.8);
    sunIn.position.set(-12, 9, 4);
    this.scene.add(sunIn);
    const fill = new THREE.PointLight('#ffcf8a', 6, 16, 2);
    fill.position.set(0, 3, 8);
    this.scene.add(fill);

    // Lồng đèn treo dọc lối giữa
    for (const z of [-3, 1.5, 6]) {
      for (const x of [-3.2, 3.2]) {
        const lantern = makeHangingLantern('#c62828', z !== 6);
        lantern.position.set(x, 5.6, z);
        lantern.scale.setScalar(1.4);
        this.scene.add(lantern);
        this.lanterns.push(lantern);
      }
    }
  }

  buildAtmosphere() {
    // Vệt nắng xuyên qua chấn song cửa sổ
    const shaftTex = (() => {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 256;
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, 'rgba(255,236,190,0.55)');
      grad.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.5 });
    for (const z of [-5, 0, 5]) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 7), shaftMat);
      shaft.position.set(-9.2, 2.6, z);
      shaft.rotation.set(0, Math.PI / 2, -0.62);
      this.scene.add(shaft);
    }

    // Bụi bay lơ lửng trong ánh sáng
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * W * 0.9;
      positions[i * 3 + 1] = Math.random() * H;
      positions[i * 3 + 2] = (Math.random() - 0.5) * D * 0.9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      map: this.soft, color: '#ffe2a8', size: 0.08, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.scene.add(this.dust);

    // Khói hương: các đốm mờ bay lên và tan dần
    this.smoke = [];
    const smokeMat = new THREE.SpriteMaterial({ map: this.soft, color: '#e9e1d4', transparent: true, opacity: 0.0, depthWrite: false });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(smokeMat.clone());
      s.userData.age = Math.random() * 5;
      this.scene.add(s);
      this.smoke.push(s);
    }
  }

  // Sư Thầy ngồi dẫn chúng: tụng theo khi có người đang gõ mõ
  npcs(ctx) {
    const { localPlayer, remotePlayers, world } = ctx;
    const others = [...remotePlayers.values()].filter(p => p.space === 'chinh_dien');
    const cal = window.templeCalendar;
    const congPhu = cal && (cal.isActive('cong_phu_sang') || cal.isActive('cong_phu_chieu'));
    const chanting = congPhu || localPlayer.activity === 'tung_kinh' || others.some(p => p.activity === 'tung_kinh');
    const monk = world.npcs.find(n => n.id === 'su_thay');
    const seat = this.layout.monkSeat;
    const lastTap = Math.max(localPlayer.lastTap || 0, (cal && cal.monkTap) || 0, ...others.map(p => p.lastTap || 0));
    return [{
      key: 'hall_monk',
      char: { ...monk, x: seat.x, y: seat.y, isMoving: false, isSitting: true, speech: '', speechTimer: 0, tool: 'none',
        activity: chanting ? 'tung_kinh' : 'thien', lastTap }
    }];
  }

  faceYaw(char) {
    const facesAltar = char.isSitting || ['lay', 'thien', 'tung_kinh', 'niem_phat'].includes(char.activity);
    return facesAltar ? Math.PI : undefined;
  }

  clampCamera(pos) {
    pos.x = Math.max(-11.4, Math.min(11.4, pos.x));
    pos.z = Math.max(-9.4, Math.min(9.75, pos.z));
    pos.y = Math.min(6.4, pos.y);
  }

  // Thỉnh chuông / gõ mõ: rung nhẹ để thấy được tiếng vang
  pulseInstrument(kind) {
    if (kind === 'mo') this.moPulse = 1;
    if (kind === 'bell') this.bellPulse = 1;
  }

  update(dt, time) {
    for (const c of this.candles) {
      const flicker = 0.85 + Math.sin(time * 13 + c.seed) * 0.08 + Math.sin(time * 23 + c.seed * 2) * 0.06;
      c.light.intensity = c.base * flicker;
      c.flame.scale.set(1, flicker, 1);
      c.glow.material.opacity = 0.6 + flicker * 0.2;
    }
    this.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(time * 0.6 + i) * 0.03; });
    this.haloGlow.material.opacity = 0.45 + Math.sin(time * 0.8) * 0.08;

    // Bụi trôi chậm
    const pos = this.dust.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + dt * 0.06;
      if (y > H) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(time * 0.3 + i) * dt * 0.03);
    }
    pos.needsUpdate = true;

    // Khói hương
    for (const s of this.smoke) {
      s.userData.age += dt;
      const life = 5;
      if (s.userData.age > life) s.userData.age -= life;
      const k = s.userData.age / life;
      s.position.set(
        this.smokeOrigin.x + Math.sin(time * 0.7 + k * 6) * 0.25 * k,
        this.smokeOrigin.y + k * 3.2,
        this.smokeOrigin.z + Math.cos(time * 0.5 + k * 5) * 0.15 * k
      );
      const size = 0.25 + k * 1.1;
      s.scale.set(size, size, 1);
      s.material.opacity = Math.sin(k * Math.PI) * 0.32;
    }

    // Mõ và chuông rung khi được gõ
    this.moPulse = Math.max(0, (this.moPulse || 0) - dt * 6);
    this.moBody.scale.set(1.25 * (1 + this.moPulse * 0.04), 0.82 * (1 - this.moPulse * 0.05), 1.1);
    this.bellPulse = Math.max(0, (this.bellPulse || 0) - dt * 1.2);
    this.bellBowl.rotation.y = Math.sin(time * 40) * 0.01 * this.bellPulse;
    this.bellBowl.position.x = Math.sin(time * 55) * 0.006 * this.bellPulse;

    const glow = 0.2 + Math.sin(time * 3) * 0.08;
    for (const r of this.instrumentRings) r.material.opacity = glow;
  }
}
