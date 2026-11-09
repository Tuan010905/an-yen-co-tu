// Nhân vật chibi 3D dựng hoàn toàn bằng hình khối Three.js (không cần file mô hình)
// Gốc toạ độ ở giữa hai bàn chân, mặt nhân vật nhìn về phía +Z. Cao khoảng 1,5 đơn vị (= 60px trên sân)

import * as THREE from 'three';

const SEAT_DROP = 0.3; // Hạ người xuống khi ngồi trên bồ đoàn

function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, ...extra });
}

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function darken(hex, amount) {
  return new THREE.Color(hex).lerp(new THREE.Color('#000000'), amount);
}

// Tiến dần giá trị hiện tại tới đích để chuyển tư thế mềm mại
function approach(current, target, rate, dt) {
  return current + (target - current) * Math.min(1, rate * dt);
}

// Ảnh mặt hoạt hình dùng chung giữa các nhân vật có cùng địa chỉ ảnh
const faceTextures = new Map();
function faceTexture(url) {
  let tex = faceTextures.get(url);
  if (!tex) {
    tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    faceTextures.set(url, tex);
  }
  return tex;
}

const SIZE_SCALE = { nho: 0.8, vua: 1, to: 1.25, rong: 1.35 };

const FACE_SCALE = {
  tron: [1.06, 1.0, 1.0],
  trai_xoan: [0.96, 1.07, 0.98],
  vuong: [1.1, 0.97, 1.0],
  dai: [0.92, 1.14, 0.96]
};

export class Avatar3D {
  constructor(look) {
    this.group = new THREE.Group();
    this.parts = null;
    this.lookKey = '';
    this.pose = { legX: 0, legZ: 0, armLX: 0, armRX: 0, armLZ: 0, armRZ: 0, bodyX: 0, drop: 0, headX: 0 };
    this.setLook(look);
  }

  setLook(look) {
    const key = JSON.stringify([look.outfit && (look.outfit.id || look.outfit.primary), look.hair && look.hair.style,
      look.hairColor, look.skin, look.eyes, look.faceShape, look.glasses, look.accessory, look.tool,
      look.eyeSize, look.mouth, look.nose, look.beard, look.faceTexture]);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.disposeParts();
    this.parts = this.build(look);
    this.group.add(this.parts.root);
  }

  disposeParts() {
    if (!this.parts) return;
    this.group.remove(this.parts.root);
    this.parts.root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.parts = null;
  }

  dispose() {
    this.disposeParts();
  }

  build(look) {
    const outfit = look.outfit || { primary: '#6b8cae', secondary: '#4a6b8c', trim: '#d6e4f0' };
    const skinMat = toon(look.skin || '#ffe3c9');
    const clothMat = toon(outfit.primary);
    const clothDark = toon(outfit.secondary || darken(outfit.primary, 0.25));
    const trimMat = toon(outfit.trim || '#ffffff');
    const hairMat = toon(look.hairColor || '#2c221e');
    const darkMat = toon('#2a1c14');

    const root = new THREE.Group();
    const lift = new THREE.Group(); // Phần được hạ xuống khi ngồi
    root.add(lift);

    // --- Chân ---
    const hips = new THREE.Group();
    hips.position.y = 0.42;
    lift.add(hips);
    const legGeo = new THREE.CapsuleGeometry(0.085, 0.22, 4, 10);
    const footGeo = new THREE.SphereGeometry(0.095, 12, 10);
    const legs = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0, 0);
      pivot.add(mesh(legGeo, clothDark, 0, -0.2, 0));
      const foot = mesh(footGeo, darkMat, 0, -0.36, 0.03);
      foot.scale.set(1, 0.6, 1.35);
      pivot.add(foot);
      hips.add(pivot);
      return pivot;
    });

    // --- Thân & áo ---
    const body = new THREE.Group();
    body.position.y = 0.42;
    lift.add(body);
    const torso = mesh(new THREE.CylinderGeometry(0.2, 0.29, 0.52, 18), clothMat, 0, 0.26, 0);
    body.add(torso);
    // Vạt áo dài / áo tràng buông xuống quá gối
    const isLongRobe = /ao_dai|phap_phuc/.test(outfit.id || '') || !outfit.id;
    if (isLongRobe) {
      const skirt = mesh(new THREE.CylinderGeometry(0.27, 0.33, 0.3, 18, 1, true), clothMat, 0, -0.1, 0);
      skirt.material.side = THREE.DoubleSide;
      body.add(skirt);
    }
    // Cổ áo chữ V và đường viền vạt áo
    const collarGeo = new THREE.BoxGeometry(0.035, 0.2, 0.02);
    [-1, 1].forEach((side) => {
      const c = mesh(collarGeo, trimMat, side * 0.05, 0.43, 0.215);
      c.rotation.z = side * 0.45;
      c.rotation.x = -0.18;
      body.add(c);
    });
    const hem = mesh(new THREE.TorusGeometry(0.285, 0.018, 6, 24), trimMat, 0, isLongRobe ? -0.25 : 0.01, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(isLongRobe ? 1.15 : 1, isLongRobe ? 1.15 : 1, 1);
    body.add(hem);
    const belt = mesh(new THREE.TorusGeometry(0.255, 0.022, 6, 24), clothDark, 0, 0.1, 0);
    belt.rotation.x = Math.PI / 2;
    body.add(belt);

    // --- Tay ---
    const armGeo = new THREE.CapsuleGeometry(0.07, 0.24, 4, 10);
    const handGeo = new THREE.SphereGeometry(0.075, 12, 10);
    const arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.25, 0.46, 0);
      const sleeve = mesh(armGeo, clothMat, 0, -0.17, 0);
      pivot.add(sleeve);
      const hand = mesh(handGeo, skinMat, 0, -0.36, 0);
      pivot.add(hand);
      body.add(pivot);
      return { pivot, hand };
    });

    // --- Đầu ---
    const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10), skinMat, 0, 0.55, 0);
    body.add(neck);
    const head = new THREE.Group();
    head.position.y = 0.88;
    body.add(head);
    const face = FACE_SCALE[look.faceShape] || FACE_SCALE.tron;
    const skull = mesh(new THREE.SphereGeometry(0.33, 28, 22), skinMat);
    skull.scale.set(...face);
    head.add(skull);
    const fz = 0.33 * face[2]; // mặt trước của đầu
    [-1, 1].forEach((side) => {
      const ear = mesh(new THREE.SphereGeometry(0.06, 10, 8), skinMat, side * 0.33 * face[0], -0.02, 0);
      ear.scale.set(0.6, 1, 0.8);
      head.add(ear);
    });

    this.buildFace(head, look, fz, face, hairMat);
    this.buildHair(head, look, face, hairMat);
    if (look.glasses && look.glasses !== 'none') this.buildGlasses(head, look.glasses, fz);

    // --- Phụ kiện ---
    const extras = {};
    this.buildAccessory(look.accessory, { head, body, arms, extras });
    this.buildTool(look.tool, arms);

    // Mõ nhỏ và dùi mõ: chỉ hiện khi đang ngồi tụng kinh
    const moSet = new THREE.Group();
    const mo = mesh(new THREE.SphereGeometry(0.13, 16, 12), toon('#8a3b1e'), 0, 0.09, 0.42);
    mo.scale.set(1.1, 0.75, 1);
    moSet.add(mo);
    const moSlit = mesh(new THREE.BoxGeometry(0.18, 0.012, 0.02), darkMat, 0, 0.1, 0.55);
    moSet.add(moSlit);
    const moCushion = mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.04, 16), toon('#b33a2c'), 0, 0.02, 0.42);
    moSet.add(moCushion);
    moSet.visible = false;
    root.add(moSet);
    const mallet = new THREE.Group();
    mallet.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), toon('#6e4726'), 0, -0.1, 0));
    mallet.add(mesh(new THREE.SphereGeometry(0.035, 8, 8), toon('#c9a26a'), 0, -0.22, 0));
    mallet.visible = false;
    arms[1].hand.add(mallet);

    // Tràng hạt cầm tay khi niệm Phật
    const beads = new THREE.Group();
    const beadGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const beadMat = toon('#5a3418');
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      beads.add(mesh(beadGeo, beadMat, Math.cos(a) * 0.09, Math.sin(a) * 0.09 - 0.07, 0));
    }
    beads.visible = false;
    arms[0].hand.add(beads);

    // Chén trà cầm tay ở hiên trà
    const cup = new THREE.Group();
    cup.add(mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.07, 12), toon('#f3ead8'), 0, -0.07, 0.04));
    cup.add(mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.01, 12), toon('#9bbf6a'), 0, -0.04, 0.04));
    cup.visible = false;
    arms[1].hand.add(cup);

    return { root, lift, hips, legs, body, arms, head, moSet, mallet, beads, cup, extras };
  }

  buildFace(head, look, fz, face, hairMat) {
    const eyeY = -0.02;

    // Có ảnh mặt hoạt hình: dán lên mặt trước của đầu thay cho mắt, mũi, miệng vẽ sẵn
    if (look.faceTexture) {
      const decal = new THREE.Mesh(
        new THREE.SphereGeometry(0.336, 32, 24, Math.PI / 2 - 0.82, 1.64, Math.PI * 0.3, Math.PI * 0.52),
        new THREE.MeshToonMaterial({ map: faceTexture(look.faceTexture), transparent: true, alphaTest: 0.08 })
      );
      decal.scale.set(...face);
      decal.position.y = -0.03;
      head.add(decal);
      this.buildBeard(head, look, fz, hairMat, eyeY);
      return;
    }

    const ink = toon('#2b1d14');
    const eyeX = 0.115 * face[0];
    const es = SIZE_SCALE[look.eyeSize] || 1;
    [-1, 1].forEach((side) => {
      let eye;
      if (look.eyes === 'cuoi') {
        eye = mesh(new THREE.TorusGeometry(0.04 * es, 0.012, 6, 12, Math.PI), ink, side * eyeX, eyeY - 0.01, fz - 0.02);
      } else if (look.eyes === 'lim_dim') {
        eye = mesh(new THREE.CapsuleGeometry(0.01, 0.06 * es, 2, 6), ink, side * eyeX, eyeY - 0.01, fz - 0.015);
        eye.rotation.z = Math.PI / 2;
      } else {
        eye = mesh(new THREE.SphereGeometry(0.045 * es, 12, 10), ink, side * eyeX, eyeY, fz - 0.03);
        eye.scale.set(0.85, 1.1, 0.5);
        const shine = mesh(new THREE.SphereGeometry(0.013 * es, 6, 6), toon('#ffffff'), side * eyeX + 0.015 * es, eyeY + 0.02 * es, fz - 0.005);
        head.add(shine);
      }
      head.add(eye);

      const brow = mesh(new THREE.CapsuleGeometry(0.012, 0.06, 2, 6), hairMat, side * eyeX, eyeY + 0.1 + (es - 1) * 0.04, fz - 0.03);
      brow.rotation.z = Math.PI / 2 + side * 0.12;
      head.add(brow);

      const blush = mesh(new THREE.SphereGeometry(0.045, 10, 8), toon('#f4a3a3', { transparent: true, opacity: 0.65 }),
        side * 0.19 * face[0], eyeY - 0.08, fz - 0.06);
      blush.scale.set(1, 0.6, 0.3);
      head.add(blush);
    });

    // Sống mũi nhỏ cùng màu da
    const ns = SIZE_SCALE[look.nose] || 0.8;
    const nose = mesh(new THREE.SphereGeometry(0.03 * ns, 10, 8), toon(look.skin || '#ffe3c9'), 0, eyeY - 0.06, fz - 0.005);
    nose.scale.set(1, 0.8, 0.7);
    head.add(nose);

    const ms = SIZE_SCALE[look.mouth] || 1;
    const mouth = mesh(new THREE.TorusGeometry(0.03 * ms, 0.009, 6, 12, Math.PI), toon('#9b4a3a'), 0, eyeY - 0.12, fz - 0.03);
    mouth.rotation.z = Math.PI;
    head.add(mouth);
    this.buildBeard(head, look, fz, hairMat, eyeY);
  }

  buildBeard(head, look, fz, hairMat, eyeY) {
    if (look.beard === 'ria' || look.beard === 'rau') {
      const ria = mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), hairMat, 0, eyeY - 0.095, fz - 0.015);
      ria.rotation.z = Math.PI / 2;
      head.add(ria);
    }
    if (look.beard === 'rau') {
      const rau = mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), hairMat, 0, -0.1, fz - 0.17);
      rau.scale.set(1.1, 0.9, 0.75);
      head.add(rau);
    }
  }

  buildHair(head, look, face, hairMat) {
    const style = look.hair ? look.hair.style : 'short';
    if (style === 'bald') return;

    // Mũ tóc: nửa trên của khối cầu, nghiêng về sau để phủ gáy nhiều hơn trán
    const cap = mesh(new THREE.SphereGeometry(0.35, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat, 0, 0.015, -0.01);
    cap.scale.set(face[0], face[1], face[2]);
    cap.rotation.x = -0.32;
    head.add(cap);
    // Mái tóc trước trán
    const fringe = mesh(new THREE.SphereGeometry(0.2, 16, 10), hairMat, 0, 0.19 * face[1], 0.2 * face[2]);
    fringe.scale.set(1.45 * face[0], 0.45, 0.6);
    fringe.rotation.x = 0.35;
    head.add(fringe);

    if (style === 'bangs') {
      // Mái dày phủ xuống tới chân mày
      const bang = mesh(new THREE.SphereGeometry(0.22, 18, 10), hairMat, 0, 0.12 * face[1], 0.22 * face[2]);
      bang.scale.set(1.4 * face[0], 0.55, 0.6);
      bang.rotation.x = 0.55;
      head.add(bang);
    } else if (style === 'bob') {
      // Tóc ôm hai bên má, dài ngang cằm
      const back = mesh(new THREE.SphereGeometry(0.35, 20, 14), hairMat, 0, -0.12, -0.08);
      back.scale.set(1.08 * face[0], 1.05, 0.9);
      head.add(back);
      [-1, 1].forEach((side) => {
        const lock = mesh(new THREE.SphereGeometry(0.13, 12, 10), hairMat, side * 0.3 * face[0], -0.17, 0.05);
        lock.scale.set(0.6, 1.4, 0.9);
        head.add(lock);
      });
    } else if (style === 'bun') {
      head.add(mesh(new THREE.SphereGeometry(0.13, 16, 12), hairMat, 0, 0.33 * face[1], -0.12));
      const pin = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), toon('#c99b52'), 0, 0.35 * face[1], -0.12);
      pin.rotation.z = Math.PI / 2.4;
      head.add(pin);
    } else if (style === 'long') {
      const back = mesh(new THREE.SphereGeometry(0.34, 20, 14), hairMat, 0, -0.22, -0.16);
      back.scale.set(1.0 * face[0], 1.35, 0.55);
      head.add(back);
      [-1, 1].forEach((side) => {
        const lock = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), hairMat, side * 0.29 * face[0], -0.2, 0.02);
        head.add(lock);
      });
    } else if (style === 'ponytail') {
      head.add(mesh(new THREE.SphereGeometry(0.05, 8, 8), toon('#c0392b'), 0, 0.06, -0.35));
      const tail = mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 10), hairMat, 0, -0.14, -0.42);
      tail.rotation.x = 0.35;
      head.add(tail);
    }
  }

  buildGlasses(head, kind, fz) {
    const frame = toon('#3b2a20');
    const sides = kind === 'kinh_vuong' ? 4 : 18;
    [-1, 1].forEach((side) => {
      const ring = mesh(new THREE.TorusGeometry(0.075, 0.012, 6, sides), frame, side * 0.12, -0.02, fz + 0.005);
      if (kind === 'kinh_vuong') ring.rotation.z = Math.PI / 4;
      head.add(ring);
      const arm = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.3), frame, side * 0.2, -0.01, fz - 0.15);
      head.add(arm);
    });
    head.add(mesh(new THREE.BoxGeometry(0.07, 0.012, 0.012), frame, 0, -0.005, fz + 0.01));
  }

  buildAccessory(id, { head, body, arms }) {
    if (id === 'non_la') {
      const hat = new THREE.Group();
      const cone = mesh(new THREE.ConeGeometry(0.58, 0.32, 40, 1, true), toon('#ead29a', { side: THREE.DoubleSide }));
      hat.add(cone);
      const rim = mesh(new THREE.TorusGeometry(0.575, 0.012, 6, 40), toon('#bfa065'), 0, -0.16, 0);
      rim.rotation.x = Math.PI / 2;
      hat.add(rim);
      hat.position.set(0, 0.42, -0.02);
      hat.rotation.x = -0.12;
      head.add(hat);
    } else if (id === 'trang_hat') {
      const beadGeo = new THREE.SphereGeometry(0.026, 8, 8);
      const mat = toon('#6e4726');
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        body.add(mesh(beadGeo, mat, Math.cos(a) * 0.2, 0.42 - (Math.sin(a) + 1) * 0.11, Math.sin(a) * 0.1 + 0.12));
      }
    } else if (id === 'hoa_sen') {
      const lotus = new THREE.Group();
      const petal = new THREE.SphereGeometry(0.05, 8, 8);
      const mat = toon('#ff8fb8');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = mesh(petal, mat, Math.cos(a) * 0.045, 0.03, Math.sin(a) * 0.045);
        p.scale.set(0.6, 1.3, 0.6);
        p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        lotus.add(p);
      }
      lotus.add(mesh(new THREE.SphereGeometry(0.025, 8, 8), toon('#ffd166'), 0, 0.05, 0));
      lotus.position.set(0, -0.08, 0.05);
      arms[0].hand.add(lotus);
    } else if (id === 'long_den') {
      const lantern = new THREE.Group();
      lantern.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), toon('#5a3a1e'), 0, -0.1, 0));
      const shade = mesh(new THREE.SphereGeometry(0.09, 14, 12), toon('#e63946', { emissive: '#661111' }), 0, -0.26, 0);
      shade.scale.set(1, 1.15, 1);
      lantern.add(shade);
      lantern.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), toon('#ffd166'), 0, -0.16, 0));
      lantern.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), toon('#ffd166'), 0, -0.36, 0));
      arms[0].hand.add(lantern);
    } else if (id === 'hao_quang') {
      const halo = mesh(new THREE.TorusGeometry(0.46, 0.025, 8, 48),
        new THREE.MeshBasicMaterial({ color: '#ffd75a', transparent: true, opacity: 0.85 }), 0, 0.05, -0.3);
      head.add(halo);
      const glow = mesh(new THREE.CircleGeometry(0.46, 40),
        new THREE.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0.25, side: THREE.DoubleSide }), 0, 0.05, -0.31);
      head.add(glow);
    }
  }

  buildTool(tool, arms) {
    if (tool === 'broom') {
      const broom = new THREE.Group();
      broom.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), toon('#ba924c'), 0, -0.2, 0));
      broom.add(mesh(new THREE.ConeGeometry(0.13, 0.28, 10), toon('#dfc17a'), 0, -0.7, 0));
      broom.rotation.x = 0.35;
      arms[1].hand.add(broom);
    } else if (tool === 'food') {
      arms[1].hand.add(mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), toon('#e8b968'), 0, -0.08, 0.04));
    }
  }

  // state: { moving, sitting, activity, sweeping, tapAge (giây kể từ tiếng mõ gần nhất), activityAge }
  update(dt, time, state) {
    const p = this.parts;
    if (!p) return;
    const pose = this.pose;
    const t = time;

    const target = { legX: 0, legZ: 0, armLX: 0, armRX: 0, armLZ: -0.08, armRZ: 0.08, bodyX: 0, drop: 0, headX: 0 };
    let walkSwing = 0;
    let bob = 0;

    if (state.activity === 'quy') {
      // Quỳ trước án: gối chạm đất, hai tay chắp trước ngực
      target.drop = 0.36;
      target.legX = 1.45;
      target.armLX = -1.2; target.armRX = -1.2;
      target.armLZ = 0.62; target.armRZ = -0.62;
      target.bodyX = 0.12;
      target.headX = 0.12;
    } else if (state.activity === 'keo_chuong') {
      // Hai tay nắm dây kéo chày kình: lùi người lấy đà rồi đẩy tới
      const phase = Math.min(1, (state.activityAge || 0) / 1.6);
      const pull = phase < 0.55 ? phase / 0.55 : 1 - (phase - 0.55) / 0.45;
      target.armLX = -1.35 + pull * 0.4; target.armRX = -1.35 + pull * 0.4;
      target.armLZ = 0.25; target.armRZ = -0.25;
      target.bodyX = -pull * 0.25 + (1 - pull) * 0.12;
    } else if (state.sitting) {
      target.drop = SEAT_DROP;
      target.legX = -1.45;
      target.legZ = 0.38;
      if (state.activity === 'thien') {
        // Tay đặt trong lòng, kết ấn thiền định
        target.armLX = -0.55; target.armRX = -0.55;
        target.armLZ = 0.55; target.armRZ = -0.55;
        target.headX = 0.12;
        bob = Math.sin(t * 1.1) * 0.006; // nhịp thở chậm
      } else if (state.activity === 'tung_kinh') {
        // Tay trái chắp trước ngực, tay phải cầm dùi gõ mõ
        target.armLX = -1.1; target.armLZ = 0.6;
        const hit = Math.max(0, 1 - (state.tapAge || 9) / 0.18);
        target.armRX = -0.95 + hit * 0.35;
        target.armRZ = -0.1;
        target.headX = 0.08;
      } else if (state.activity === 'uong_tra') {
        // Tay trái để trong lòng, tay phải thỉnh thoảng nâng chén trà lên miệng
        target.armLX = -0.5; target.armLZ = 0.35;
        const sip = (state.activityAge || 0) % 7;
        const lift = sip > 4.5 && sip < 6.3 ? 1 : 0;
        target.armRX = -0.9 - lift * 1.0;
        target.armRZ = -(0.25 + lift * 0.35);
        target.headX = 0.05 - lift * 0.12;
      } else if (state.activity === 'niem_phat') {
        target.armLX = -1.15; target.armRX = -1.15;
        target.armLZ = 0.62; target.armRZ = -0.62;
        target.headX = 0.1;
      } else {
        target.armLX = -0.45; target.armRX = -0.45;
        target.armLZ = 0.3; target.armRZ = -0.3;
      }
    } else if (state.activity === 'chap_tay') {
      target.armLX = -1.2; target.armRX = -1.2;
      target.armLZ = 0.62; target.armRZ = -0.62;
      target.headX = 0.15;
    } else if (state.activity === 'lay') {
      // Lạy Phật: chắp tay, cúi người xuống rồi đứng lên theo nhịp
      const phase = (state.activityAge || 0) % 3;
      const bow = phase < 1.4 ? Math.sin((phase / 1.4) * Math.PI) : 0;
      target.armLX = -1.2 + bow * 0.4; target.armRX = -1.2 + bow * 0.4;
      target.armLZ = 0.62; target.armRZ = -0.62;
      target.bodyX = bow * 0.95;
      target.legX = -bow * 0.9;
      target.drop = bow * 0.22;
      target.headX = 0.2;
    } else if (state.moving) {
      walkSwing = Math.sin(t * 10);
      bob = Math.abs(Math.cos(t * 10)) * 0.04;
      target.legX = walkSwing * 0.6;
      target.armLX = -walkSwing * 0.55;
      target.armRX = state.sweeping ? -0.6 + Math.sin(t * 14) * 0.5 : walkSwing * 0.55;
    } else {
      bob = Math.sin(t * 2) * 0.008;
      if (state.sweeping) target.armRX = -0.6 + Math.sin(t * 14) * 0.5;
    }

    const rate = state.moving ? 30 : 9;
    for (const k of Object.keys(target)) pose[k] = approach(pose[k], target[k], rate, dt);
    // Khi đi bộ thì vung chân tay ngay theo nhịp, không cần làm mềm
    if (state.moving && !state.sitting) {
      pose.legX = target.legX;
      pose.armLX = target.armLX;
      pose.armRX = target.armRX;
    }

    p.lift.position.y = -pose.drop + bob;
    p.legs[0].rotation.set(state.moving && !state.sitting ? pose.legX : pose.legX, 0, -pose.legZ);
    p.legs[1].rotation.set(state.moving && !state.sitting ? -pose.legX : pose.legX, 0, pose.legZ);
    p.body.rotation.x = pose.bodyX;
    p.arms[0].pivot.rotation.set(pose.armLX, 0, pose.armLZ);
    p.arms[1].pivot.rotation.set(pose.armRX, 0, pose.armRZ);
    p.head.rotation.x = pose.headX;

    const chanting = state.sitting && state.activity === 'tung_kinh';
    p.moSet.visible = chanting;
    p.mallet.visible = chanting;
    p.beads.visible = state.activity === 'niem_phat';
    p.cup.visible = state.activity === 'uong_tra';
  }
}
