// Khối dựng dùng chung cho cảnh 3D: quy đổi toạ độ, vật liệu, mái chùa cong, chữ hoành phi, kết cấu gạch gỗ

import * as THREE from 'three';

// 40px trên bản đồ logic = 1 đơn vị 3D. Tâm bản đồ (800, 550) là gốc toạ độ
export const PX = 40;
export const toX = x => (x - 800) / PX;
export const toZ = y => (y - 550) / PX;
export const toPxX = X => X * PX + 800;
export const toPxY = Z => Z * PX + 550;

export function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });
}

export function gold(extra = {}) {
  return new THREE.MeshStandardMaterial({ color: '#d9a93a', roughness: 0.32, metalness: 0.85, ...extra });
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function cyl(rTop, rBottom, h, material, x = 0, y = 0, z = 0, segments = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r, material, x = 0, y = 0, z = 0, ws = 16, hs = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Mái chùa Việt: hai mái dốc, đầu hồi tam giác, viền mái cong vút lên ở bốn góc (đầu đao)
export function makeRoof({ width, depth, height, curl = 0.45, overhang = 0.5, color = '#7d2a1f', trim = '#d9a93a', ridgeRatio = 0.55 }) {
  const group = new THREE.Group();
  const w = width + overhang * 2;
  const d = depth + overhang * 2;
  const rw = (width - depth * 0.4) * ridgeRatio;
  const n = 12;
  const edgeY = t => curl * Math.pow(Math.abs(t * 2 - 1), 3);
  const positions = [];
  const push = (...pts) => pts.forEach(p => positions.push(p.x, p.y, p.z));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  for (const side of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const b0 = V(-w / 2 + w * t0, edgeY(t0), side * d / 2);
      const b1 = V(-w / 2 + w * t1, edgeY(t1), side * d / 2);
      const r0 = V(-rw / 2 + rw * t0, height, 0);
      const r1 = V(-rw / 2 + rw * t1, height, 0);
      push(b0, b1, r1, b0, r1, r0);
    }
  }
  for (const side of [1, -1]) {
    const tip = V(side * rw / 2, height, 0);
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      push(V(side * w / 2, edgeY(t0), -d / 2 + d * t0), V(side * w / 2, edgeY(t1), -d / 2 + d * t1), tip);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, std(color, { side: THREE.DoubleSide, flatShading: true, roughness: 0.7 }));
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Bờ nóc và hai đầu kìm cong
  const trimMat = gold({ roughness: 0.45 });
  const ridge = cyl(0.07, 0.07, rw + 0.2, std('#5a1d15'), 0, height + 0.04, 0, 8);
  ridge.rotation.z = Math.PI / 2;
  group.add(ridge);
  for (const side of [1, -1]) {
    const horn = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 10, Math.PI * 0.9), trimMat);
    horn.position.set(side * (rw / 2 + 0.05), height + 0.2, 0);
    horn.rotation.set(0, side > 0 ? 0 : Math.PI, Math.PI * 0.1);
    group.add(horn);
  }
  // Đầu đao ở bốn góc mái
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 6), trimMat);
      tip.position.set(sx * (w / 2 + 0.05), curl + 0.12, sz * (d / 2 + 0.05));
      tip.rotation.set(sz * -0.75, 0, sx * -0.75);
      group.add(tip);
    }
  }
  // Viền mái màu vàng
  const eaveMat = std(trim, { roughness: 0.6 });
  for (const side of [1, -1]) {
    const eave = box(w * 0.82, 0.05, 0.08, eaveMat, 0, 0.02, side * d / 2, { receive: false });
    group.add(eave);
  }
  return group;
}

// Kết cấu chữ (hoành phi, câu đối, biển tên) vẽ bằng canvas
export function textTexture(text, { width = 512, height = 128, bg = '#5c1912', fg = '#ffd966', border = '#f0c44d', font = 'bold 64px "Be Vietnam Pro", serif', vertical = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(4, width * 0.015);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, width - ctx.lineWidth * 2, height - ctx.lineWidth * 2);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    const words = text.split(' ');
    const step = height / (words.length + 1);
    words.forEach((w, i) => ctx.fillText(w, width / 2, step * (i + 1)));
  } else {
    ctx.fillText(text, width / 2, height / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function plaque(text, w, h, options = {}) {
  const tex = textTexture(text, options);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1 }));
}

// Gạch Bát Tràng đỏ cho sân chùa
export function brickTexture(repeatX, repeatY) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a65c45';
  ctx.fillRect(0, 0, 256, 256);
  const size = 64;
  for (let y = 0; y < 256; y += size) {
    for (let x = 0; x < 256; x += size) {
      const shade = 0.9 + Math.random() * 0.2;
      ctx.fillStyle = `rgb(${Math.round(184 * shade)}, ${Math.round(107 * shade)}, ${Math.round(82 * shade)})`;
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Sàn gỗ lim bóng trong Chính Điện
export function woodTexture(repeatX, repeatY, base = '#5b3420') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  const plankW = 64;
  for (let x = 0; x < 512; x += plankW) {
    const shade = 0.85 + Math.random() * 0.25;
    const col = new THREE.Color(base).multiplyScalar(shade);
    ctx.fillStyle = `#${col.getHexString()}`;
    ctx.fillRect(x + 1, 0, plankW - 2, 512);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const gx = x + 8 + Math.random() * (plankW - 16);
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 6, 170, gx - 6, 340, gx + 3, 512);
      ctx.stroke();
    }
    const cut = Math.random() * 512;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, cut, plankW, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Đốm sáng mềm dùng cho khói hương, quầng đèn
export function softSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Lồng đèn đỏ treo hiên / treo trần
export function makeHangingLantern(color = '#d62f2f', withLight = false) {
  const g = new THREE.Group();
  g.add(cyl(0.01, 0.01, 0.6, std('#3a2618'), 0, 0.3, 0, 4));
  const body = sphere(0.22, std(color, { emissive: color, emissiveIntensity: 0.35, roughness: 0.6 }), 0, -0.1, 0, 18, 14);
  body.scale.set(1, 1.2, 1);
  g.add(body);
  const capMat = gold();
  g.add(cyl(0.12, 0.12, 0.05, capMat, 0, 0.16, 0, 12));
  g.add(cyl(0.12, 0.12, 0.05, capMat, 0, -0.36, 0, 12));
  g.add(cyl(0.02, 0.05, 0.25, std('#c62828'), 0, -0.5, 0, 6));
  g.userData.body = body;
  if (withLight) {
    const light = new THREE.PointLight('#ffb36b', 0.8, 5, 2);
    light.position.y = -0.1;
    g.add(light);
    g.userData.light = light;
  }
  return g;
}

// Đỉnh hương / bát hương có chân hương cháy đỏ
export function makeIncenseBurner(scale = 1) {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.4, metalness: 0.75 });
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.18 + Math.sin(t * Math.PI) * 0.22, t * 0.42));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), bronze);
  bowl.position.y = 0.25;
  bowl.castShadow = true;
  g.add(bowl);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(cyl(0.04, 0.03, 0.28, bronze, Math.cos(a) * 0.22, 0.14, Math.sin(a) * 0.22, 8));
  }
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), bronze);
    ear.position.set(s * 0.38, 0.6, 0);
    ear.rotation.y = Math.PI / 2;
    g.add(ear);
  }
  const ash = cyl(0.3, 0.3, 0.02, std('#cfc6b5'), 0, 0.66, 0, 20);
  g.add(ash);
  const tipMat = new THREE.MeshBasicMaterial({ color: '#ff6a1a' });
  const stickMat = std('#b23a2a');
  for (let i = 0; i < 9; i++) {
    const x = (Math.random() - 0.5) * 0.3;
    const z = (Math.random() - 0.5) * 0.2;
    const h = 0.35 + Math.random() * 0.12;
    g.add(cyl(0.008, 0.008, h, stickMat, x, 0.66 + h / 2, z, 4));
    g.add(sphere(0.016, tipMat, x, 0.66 + h, z, 6, 6));
  }
  g.scale.setScalar(scale);
  return g;
}

// Cây tán tròn gồm nhiều khối lá
export function makeTree({ trunkH = 2.2, trunkR = 0.3, canopy = 2.2, colors = ['#3b6e38', '#498245', '#5b9654', '#6ead5c'], seed = 1 }) {
  const g = new THREE.Group();
  const bark = std('#5c4028');
  const trunk = cyl(trunkR * 0.75, trunkR, trunkH, bark, 0, trunkH / 2, 0, 10);
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const root = cyl(0.04, trunkR * 0.45, 0.6, bark, Math.cos(a) * trunkR, 0.15, Math.sin(a) * trunkR, 6);
    root.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(root);
  }
  const leaves = new THREE.Group();
  let r = seed;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const dist = i === 0 ? 0 : canopy * (0.35 + rand() * 0.4);
    const size = canopy * (0.45 + rand() * 0.25);
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1),
      std(colors[i % colors.length], { flatShading: true }));
    blob.position.set(Math.cos(a) * dist, trunkH + canopy * 0.35 + rand() * canopy * 0.5, Math.sin(a) * dist);
    blob.castShadow = true;
    blob.receiveShadow = true;
    leaves.add(blob);
  }
  g.add(leaves);
  g.userData.leaves = leaves;
  return g;
}

// Thân trúc
export function makeBamboo(seed = 1) {
  const g = new THREE.Group();
  const stem = std('#5f8f3e');
  let r = seed;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 6; i++) {
    const h = 2.4 + rand() * 1.6;
    const x = (rand() - 0.5) * 0.9;
    const z = (rand() - 0.5) * 0.9;
    const c = cyl(0.05, 0.06, h, stem, x, h / 2, z, 6);
    c.rotation.z = (rand() - 0.5) * 0.15;
    g.add(c);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rand() * 0.2, 0), std('#4e8745', { flatShading: true }));
    leaf.position.set(x, h, z);
    leaf.scale.y = 1.5;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

// Pháp khí: tượng Phật ngồi kiết già trên tòa sen, dựng bằng hình khối, thếp vàng
export function makeBuddha(scale = 1, { color = null, lotusColor = '#e7a0a8' } = {}) {
  const g = new THREE.Group();
  const gilt = color
    ? new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15 })
    : gold({ roughness: 0.28 });
  const lotusMat = new THREE.MeshStandardMaterial({ color: lotusColor, roughness: 0.5, metalness: 0.2 });

  // Tòa sen hai tầng cánh
  for (let tier = 0; tier < 2; tier++) {
    const count = 16 - tier * 4;
    const radius = 1.15 - tier * 0.2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + tier * 0.2;
      const petal = sphere(0.32, lotusMat, Math.cos(a) * radius, 0.35 + tier * 0.22, Math.sin(a) * radius, 12, 10);
      petal.scale.set(0.55, 0.9, 0.35);
      petal.rotation.set(0, -a + Math.PI / 2, 0);
      petal.rotateX(-0.5);
      g.add(petal);
    }
  }
  g.add(cyl(1.05, 1.2, 0.45, gilt, 0, 0.3, 0, 32));

  // Thân Phật
  const legs = sphere(0.9, gilt, 0, 0.9, 0.1, 24, 16);
  legs.scale.set(1.15, 0.38, 0.75);
  g.add(legs);
  const torso = cyl(0.48, 0.66, 1.1, gilt, 0, 1.45, 0, 24);
  g.add(torso);
  const robe = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24, Math.PI * 1.2), gilt);
  robe.position.set(0.05, 1.55, 0.25);
  robe.rotation.set(0.4, 0.2, -1.1);
  g.add(robe);
  // Hai tay kết ấn thiền định trong lòng
  for (const s of [1, -1]) {
    const arm = cyl(0.13, 0.15, 0.85, gilt, s * 0.55, 1.35, 0.25, 12);
    arm.rotation.set(-0.9, 0, s * 0.55);
    g.add(arm);
  }
  const hands = sphere(0.22, gilt, 0, 1.08, 0.55, 14, 10);
  hands.scale.set(1.4, 0.45, 0.8);
  g.add(hands);
  // Đầu, tai dài, nhục kế và lọn tóc xoắn ốc
  g.add(cyl(0.16, 0.2, 0.2, gilt, 0, 2.05, 0, 14));
  const head = sphere(0.42, gilt, 0, 2.42, 0, 28, 20);
  head.scale.set(0.95, 1.08, 0.95);
  g.add(head);
  for (const s of [1, -1]) {
    const ear = sphere(0.1, gilt, s * 0.4, 2.32, 0, 10, 8);
    ear.scale.set(0.45, 1.9, 0.7);
    g.add(ear);
  }
  g.add(sphere(0.2, gilt, 0, 2.85, -0.02, 14, 10));
  const curlGeo = new THREE.SphereGeometry(0.05, 6, 6);
  for (let i = 0; i < 46; i++) {
    const phi = Math.acos(1 - (i / 46) * 0.9);
    const theta = i * 2.4;
    const c = new THREE.Mesh(curlGeo, gilt);
    c.position.set(Math.sin(phi) * Math.cos(theta) * 0.41, 2.42 + Math.cos(phi) * 0.45, Math.sin(phi) * Math.sin(theta) * 0.41 - 0.02);
    if (c.position.z > 0.25 && c.position.y < 2.75) continue; // chừa vầng trán
    g.add(c);
  }
  // Nét mặt hiền từ: mắt khép hờ, ấn đường
  const ink = std('#5a3b12', { roughness: 0.6 });
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI), ink);
    eye.position.set(s * 0.15, 2.44, 0.38);
    eye.rotation.z = Math.PI;
    g.add(eye);
  }
  g.add(sphere(0.025, std('#f5e3a1', { emissive: '#f5e3a1', emissiveIntensity: 0.5 }), 0, 2.56, 0.4, 8, 8));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 12, Math.PI), ink);
  smile.position.set(0, 2.25, 0.39);
  smile.rotation.z = Math.PI;
  g.add(smile);

  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
