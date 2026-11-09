// Bộ dựng hình 3D chính: quản lý không gian (sân chùa / Chính Điện), nhân vật, camera xoay 360°, bảng tên, hiệu ứng
// Giữ cùng giao diện với bộ vẽ 2D cũ (resize, updateCamera, render) để game.js dùng chung

import * as THREE from 'three';
import { Avatar3D } from './avatar.js';
import { Courtyard } from './courtyard.js';
import { Hall } from './hall.js';
import { BellTowerSpace, FortuneSpace, WishTreeSpace, PondSpace, TeaSpace } from './zones.js';
import { toX, toZ, toPxX, toPxY } from './props.js';
import { skyState, applySky, MODE_HOURS } from './sky.js';

const CAMERA_PRESETS = {
  san_chua: { pitch: 0.55, dist: 9, minDist: 3.5, maxDist: 24, exposure: 1.0 },
  chinh_dien: { pitch: 0.45, dist: 5.8, minDist: 2.2, maxDist: 11, exposure: 1.2 },
  gac_chuong: { pitch: 0.32, dist: 9, minDist: 3, maxDist: 16, exposure: 1.0, yaw: 0.35 },
  lau_xin_xam: { pitch: 0.4, dist: 5.5, minDist: 2.2, maxDist: 9, exposure: 1.25 },
  cay_nguyen_uoc: { pitch: 0.3, dist: 9, minDist: 3, maxDist: 18, exposure: 1.0 },
  ho_sen: { pitch: 0.42, dist: 9, minDist: 3, maxDist: 20, exposure: 1.1 },
  thuy_dinh: { pitch: 0.3, dist: 5.5, minDist: 2.2, maxDist: 12, exposure: 1.0 }
};

// Mỗi không gian riêng là một cảnh 3D, chỉ dựng khi người chơi bước vào lần đầu
const SPACE_CLASSES = {
  chinh_dien: Hall,
  gac_chuong: BellTowerSpace,
  lau_xin_xam: FortuneSpace,
  cay_nguyen_uoc: WishTreeSpace,
  ho_sen: PondSpace,
  thuy_dinh: TeaSpace
};

const TEA_TABLE = { x: 320, y: 365 };

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class TempleRenderer3D {
  constructor(canvas, world) {
    this.is3D = true;
    this.canvas = canvas;
    this.world = world;
    this.space = 'san_chua';
    this.onClick = null;

    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.cam = { yaw: 0, pitch: 0.6, dist: 11, target: new THREE.Vector3(), ready: false };
    this.raycaster = new THREE.Raycaster();
    this.occluder = new THREE.Raycaster();
    this.faded = new Set();
    this.frameNo = 0;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.courtyard = new Courtyard(world);
    this.spaces = {};
    this.appliedTime = null;

    this.characters = new Map();
    this.particleState = new WeakMap();
    this.pools = { smoke: [], falling_leaf: [], lotus_petal: [], ripple: [] };
    this.lastFrame = performance.now();
    this.elapsed = 0;

    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'world-labels';
    document.body.appendChild(this.labelLayer);
    this.placeLabelEls = new Map();
    this.floatEls = new Map();

    this.initPointer();
    this.applyCameraPreset();
  }

  get currentSpace() {
    return this.space === 'san_chua' ? this.courtyard : this.spaces[this.space];
  }

  get scene() {
    return this.currentSpace.scene;
  }

  get cameraYaw() {
    return this.cam.yaw;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.webgl.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Vật nằm giữa camera và nhân vật (tán cây, mái, cột) được làm mờ để luôn thấy nhân vật
  updateOcclusion() {
    if (++this.frameNo % 3) return;
    const from = this.cam.target;
    const dir = this.camera.position.clone().sub(from);
    const len = dir.length();
    this.occluder.set(from, dir.normalize());
    this.occluder.camera = this.camera; // các đốm sáng (Sprite) cần biết camera khi dò tia
    this.occluder.near = 0.7;
    this.occluder.far = Math.max(0.8, len - 0.2);
    const blocking = new Set();
    for (const hit of this.occluder.intersectObjects(this.scene.children, true)) {
      if (hit.object.isMesh && !Array.isArray(hit.object.material)) blocking.add(hit.object);
    }
    for (const mesh of blocking) {
      if (this.faded.has(mesh)) continue;
      mesh.userData.solidMaterial = mesh.material;
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.22;
      mesh.material.depthWrite = false;
      this.faded.add(mesh);
    }
    for (const mesh of this.faded) {
      if (!blocking.has(mesh)) this.unfade(mesh);
    }
  }

  unfade(mesh) {
    mesh.material.dispose();
    mesh.material = mesh.userData.solidMaterial;
    delete mesh.userData.solidMaterial;
    this.faded.delete(mesh);
  }

  setSpace(space) {
    for (const mesh of [...this.faded]) this.unfade(mesh);
    if (space !== 'san_chua' && !this.spaces[space]) this.spaces[space] = new SPACE_CLASSES[space](this.webgl, this.world);
    this.space = space;
    this.applyCameraPreset();
    for (const el of this.placeLabelEls.values()) el.remove();
    this.placeLabelEls.clear();
  }

  applyCameraPreset() {
    const preset = CAMERA_PRESETS[this.space];
    this.cam.pitch = preset.pitch;
    this.cam.dist = preset.dist;
    this.cam.yaw = preset.yaw || 0;
    this.cam.ready = false;
    this.webgl.toneMappingExposure = preset.exposure;
  }

  rotateCamera(deltaYaw) {
    this.cam.yaw += deltaYaw;
  }

  pulseInstrument(kind) {
    if (this.spaces.chinh_dien) this.spaces.chinh_dien.pulseInstrument(kind);
  }

  // Gửi sự kiện tới không gian hiện tại (thỉnh chuông, gieo keo, rót trà...)
  spaceEvent(name, data = {}) {
    const space = this.currentSpace;
    if (space && space.event) space.event(name, data);
  }

  // ---------------- Điều khiển camera & bấm chọn ----------------

  initPointer() {
    const pointers = new Map();
    let downPos = null;
    let dragged = false;
    let pinchDist = 0;

    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downPos = { x: e.clientX, y: e.clientY };
        dragged = false;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        dragged = true;
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) this.zoom(pinchDist / d);
        pinchDist = d;
        return;
      }
      if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) dragged = true;
      if (dragged) {
        this.cam.yaw -= dx * 0.006;
        this.cam.pitch = Math.max(0.06, Math.min(1.35, this.cam.pitch + dy * 0.004));
      }
    });

    const end = (e) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (e.type === 'pointerup' && wasSingle && !dragged && this.onClick) {
        const pt = this.screenToWorld(e.clientX, e.clientY);
        if (pt) this.onClick(pt);
      }
      if (pointers.size === 0) downPos = null;
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(1 + Math.sign(e.deltaY) * Math.min(0.25, Math.abs(e.deltaY) * 0.0015));
    }, { passive: false });
  }

  zoom(factor) {
    const preset = CAMERA_PRESETS[this.space];
    this.cam.dist = Math.max(preset.minDist, Math.min(preset.maxDist, this.cam.dist * factor));
  }

  // Trả về toạ độ logic (px) nơi người chơi bấm, kèm vật được bấm (bồ đoàn, mõ, chuông, mèo, cửa...)
  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !obj.userData.pick) obj = obj.parent;
      if (obj && obj.userData.pick) {
        return { x: toPxX(hit.point.x), y: toPxY(hit.point.z), pick: obj.userData.pick };
      }
    }
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, point)) return null;
    return { x: toPxX(point.x), y: toPxY(point.z), pick: null };
  }

  updateCamera(x, y) {
    const target = new THREE.Vector3(toX(x), 1.15, toZ(y));
    if (!this.cam.ready) {
      this.cam.target.copy(target);
      this.cam.ready = true;
    } else {
      this.cam.target.lerp(target, 0.12);
    }
    const { yaw, pitch, dist } = this.cam;
    const pos = new THREE.Vector3(
      this.cam.target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      this.cam.target.y + Math.sin(pitch) * dist,
      this.cam.target.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    const space = this.currentSpace;
    if (space.clampCamera) space.clampCamera(pos);
    pos.y = Math.max(0.4, pos.y);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.cam.target);
    this.updateOcclusion();
  }

  // ---------------- Nhân vật ----------------

  lookOf(char) {
    return {
      outfit: char.outfit,
      hair: char.hair,
      hairColor: char.hairColor || (char.hair && char.hair.color),
      skin: char.skin,
      eyes: char.eyes || (char.hair && char.hair.style === 'bald' ? 'lim_dim' : 'tron'),
      eyeSize: char.eyeSize,
      mouth: char.mouth,
      nose: char.nose,
      faceShape: char.faceShape || 'tron',
      glasses: char.glasses || 'none',
      beard: char.beard || 'none',
      faceTexture: char.faceTexture || '',
      accessory: char.accessory,
      tool: char.tool
    };
  }

  syncCharacter(key, char, scene, now, seen, opts = {}) {
    seen.add(key);
    let entry = this.characters.get(key);
    if (!entry) {
      entry = { avatar: new Avatar3D(this.lookOf(char)), yaw: Math.PI, el: null, lastX: null, lastZ: null };
      this.characters.set(key, entry);
    } else {
      entry.avatar.setLook(this.lookOf(char));
    }
    const group = entry.avatar.group;
    if (group.parent !== scene) scene.add(group);

    const X = toX(char.x);
    const Z = toZ(char.y);
    if (entry.lastX !== null) {
      const dx = X - entry.lastX;
      const dz = Z - entry.lastZ;
      if (Math.hypot(dx, dz) > 0.004) entry.targetYaw = Math.atan2(dx, dz);
    }
    entry.lastX = X;
    entry.lastZ = Z;
    const space = this.currentSpace;
    const spaceYaw = space.faceYaw ? space.faceYaw(char, X, Z) : undefined;
    if (spaceYaw !== undefined) {
      entry.targetYaw = spaceYaw;
    } else if (char.isSitting && this.space === 'san_chua') {
      entry.targetYaw = Math.atan2(toX(TEA_TABLE.x) - X, toZ(TEA_TABLE.y) - Z);
    }
    if (opts.faceYaw !== undefined) entry.targetYaw = opts.faceYaw;
    if (entry.targetYaw !== undefined) entry.yaw += shortestAngle(entry.yaw, entry.targetYaw) * Math.min(1, this.dt * 10);
    group.position.set(X, 0, Z);
    group.rotation.y = entry.yaw;

    entry.avatar.update(this.dt, this.elapsed, {
      moving: char.isMoving,
      sitting: char.isSitting,
      activity: char.activity || '',
      sweeping: char.isSweeping,
      tapAge: char.lastTap ? (now - char.lastTap) / 1000 : 99,
      activityAge: char.activityStart ? (now - char.activityStart) / 1000 : 0
    });

    this.updateNameTag(entry, char, opts.isLocal);
  }

  updateNameTag(entry, char, isLocal) {
    if (!entry.el) {
      entry.el = document.createElement('div');
      entry.el.className = 'name-tag' + (isLocal ? ' local' : '');
      entry.el.innerHTML = '<div class="speech"></div><div class="title"></div><div class="name"></div>';
      this.labelLayer.appendChild(entry.el);
    }
    const head = entry.avatar.group.position.clone();
    head.y += char.isSitting ? 1.75 : 2.05;
    const screen = this.project(head);
    if (!screen) {
      entry.el.style.display = 'none';
      return;
    }
    entry.el.style.display = '';
    entry.el.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`;
    const dist = this.camera.position.distanceTo(head);
    entry.el.style.opacity = dist > 26 ? 0 : dist > 18 ? (26 - dist) / 8 : 1;
    const speech = char.speech && char.speechTimer > 0 ? char.speech : '';
    if (entry.el.dataset.name !== char.name) {
      entry.el.querySelector('.name').textContent = char.name || '';
      entry.el.dataset.name = char.name || '';
    }
    if (entry.el.dataset.title !== (char.title || '')) {
      entry.el.querySelector('.title').textContent = char.title ? `« ${char.title} »` : '';
      entry.el.dataset.title = char.title || '';
    }
    if (entry.el.dataset.speech !== speech) {
      const bubble = entry.el.querySelector('.speech');
      bubble.textContent = speech;
      bubble.style.display = speech ? '' : 'none';
      entry.el.dataset.speech = speech;
    }
  }

  project(vec) {
    const v = vec.clone().project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }

  // Bầu trời theo giờ Việt Nam (hoặc khung cảnh người chơi tự chọn), cập nhật 2 lần mỗi giây
  updateSky(now, force = false) {
    if (!force && now - (this.lastSkyAt || 0) < 500 && this.lastSkySpace === this.space) return;
    this.lastSkyAt = now;
    this.lastSkySpace = this.space;
    const cal = window.templeCalendar;
    const info = cal ? cal.info() : { hours: 12, lunar: { day: 15 } };
    const mode = cal ? cal.lightMode : 'auto';
    const hours = mode === 'auto' ? info.hours : MODE_HOURS[mode];
    const state = skyState(hours);
    this.world.timeOfDay = state.period; // bản 2D dự phòng vẫn đọc giá trị này
    if (this.space === 'san_chua') {
      this.courtyard.applySkyState(state, info.lunar.day);
      if (cal && now - (this.lastFestivalAt || 0) > 5000) {
        this.lastFestivalAt = now;
        this.courtyard.setFestival(cal.festival());
      }
    } else {
      const refs = this.currentSpace.scene.userData.sky;
      if (refs) {
        applySky(this.currentSpace.scene, refs, state);
        refs.night.update(state, info.lunar.day);
      }
    }
  }

  // ---------------- Vẽ một khung hình ----------------

  render(localPlayer, remotePlayers, activeHotspot) {
    const now = performance.now();
    this.dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.elapsed += this.dt;

    this.updateSky(now);

    const scene = this.scene;
    const seen = new Set();
    const wall = Date.now();

    if (this.space === 'san_chua') {
      this.courtyard.sync(this.dt, this.elapsed, activeHotspot);
      for (const npc of this.world.npcs) this.syncCharacter('npc_' + npc.id, npc, scene, wall, seen);
      this.syncCourtyardParticles();
    } else {
      const space = this.currentSpace;
      const ctx = { world: this.world, localPlayer, remotePlayers };
      space.update(this.dt, this.elapsed, ctx);
      if (space.npcs) {
        for (const npc of space.npcs(ctx)) this.syncCharacter(npc.key, npc.char, scene, wall, seen);
      }
    }

    for (const [id, p] of remotePlayers) {
      if ((p.space || 'san_chua') === this.space) this.syncCharacter('remote_' + id, p, scene, wall, seen);
    }
    this.syncCharacter('local', localPlayer, scene, wall, seen, { isLocal: true });

    // Nhân vật không còn ở không gian này: cất khỏi cảnh; người chơi đã rời phòng: giải phóng hẳn
    for (const [key, entry] of this.characters) {
      if (seen.has(key)) continue;
      entry.avatar.group.removeFromParent();
      if (entry.el) entry.el.style.display = 'none';
      if (key.startsWith('remote_') && !remotePlayers.has(key.slice(7))) {
        entry.avatar.dispose();
        if (entry.el) entry.el.remove();
        this.characters.delete(key);
      }
    }

    this.syncPlaceLabels();
    this.syncFloatingTexts();
    this.webgl.render(scene, this.camera);
  }

  syncPlaceLabels() {
    const labels = this.currentSpace.labels;
    for (const label of labels) {
      let el = this.placeLabelEls.get(label);
      if (!el) {
        el = document.createElement('div');
        el.className = label.className;
        this.labelLayer.appendChild(el);
        this.placeLabelEls.set(label, el);
      }
      if (el.textContent !== label.text) el.textContent = label.text;
      const screen = this.project(label.position);
      const dist = this.camera.position.distanceTo(label.position);
      if (!screen || dist > 30) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
      el.style.opacity = dist > 22 ? (30 - dist) / 8 : 1;
    }
  }

  // Chữ "+công đức" bay lên: dùng HTML cho chữ tiếng Việt rõ nét
  syncFloatingTexts() {
    const alive = new Set();
    for (const pt of this.world.particles) {
      if (pt.type !== 'floating_text') continue;
      alive.add(pt);
      let st = this.particleState.get(pt);
      if (!st) {
        st = { x: pt.x, y: pt.y + 48, born: this.elapsed };
        this.particleState.set(pt, st);
      }
      let el = this.floatEls.get(pt);
      if (!el) {
        el = document.createElement('div');
        el.className = 'float-text';
        el.textContent = pt.text;
        this.labelLayer.appendChild(el);
        this.floatEls.set(pt, el);
      }
      const rise = (this.elapsed - st.born) * 0.9;
      const screen = this.project(new THREE.Vector3(toX(st.x), 2.3 + rise, toZ(st.y)));
      if (!screen) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      el.style.opacity = Math.max(0, Math.min(1, pt.alpha));
      el.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
    }
    for (const [pt, el] of this.floatEls) {
      if (!alive.has(pt)) {
        el.remove();
        this.floatEls.delete(pt);
      }
    }
  }

  // Khói hương, lá rơi, cánh sen, gợn nước trên sân chùa (lấy từ hệ hạt của TempleWorld)
  syncCourtyardParticles() {
    const used = { smoke: 0, falling_leaf: 0, lotus_petal: 0, ripple: 0 };
    const scene = this.courtyard.scene;
    const soft = this.courtyard.soft;
    const make = {
      smoke: () => new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: '#ece6dc', transparent: true, depthWrite: false })),
      falling_leaf: () => new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), new THREE.MeshLambertMaterial({ color: '#f2c14e', side: THREE.DoubleSide, transparent: true })),
      lotus_petal: () => new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshLambertMaterial({ color: '#ff8fab', side: THREE.DoubleSide, transparent: true })),
      ripple: () => {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        return m;
      }
    };

    for (const pt of this.world.particles) {
      const pool = this.pools[pt.type];
      if (!pool) continue;
      let st = this.particleState.get(pt);
      if (!st) {
        st = { y0: pt.y, x0: pt.x };
        this.particleState.set(pt, st);
      }
      const i = used[pt.type]++;
      if (!pool[i]) {
        pool[i] = make[pt.type]();
        scene.add(pool[i]);
      }
      const obj = pool[i];
      obj.visible = true;
      const alpha = Math.max(0, Math.min(1, pt.alpha));
      if (pt.type === 'smoke') {
        const h = 1.25 + (st.y0 - pt.y) / 40 * 1.3;
        obj.position.set(toX(pt.x), h, toZ(357));
        const s = pt.radius / 14;
        obj.scale.set(s, s, 1);
        obj.material.opacity = alpha * 0.7;
      } else if (pt.type === 'falling_leaf' || pt.type === 'lotus_petal') {
        const start = pt.type === 'falling_leaf' ? 4.8 : 6;
        const h = Math.max(0.05, start - (pt.y - st.y0) / 40 * 1.6);
        obj.position.set(toX(pt.x), h, toZ(st.y0) + (pt.y - st.y0) / 80);
        obj.rotation.set(this.elapsed * 2 + pt.x, this.elapsed + pt.y * 0.01, 0);
        obj.material.opacity = alpha;
      } else if (pt.type === 'ripple') {
        obj.position.set(toX(pt.x), 0.27, toZ(pt.y));
        const s = 0.05 + (35 - pt.life) * 0.012;
        obj.scale.set(s, s, s);
        obj.material.opacity = alpha;
      }
    }
    for (const type of Object.keys(this.pools)) {
      const pool = this.pools[type];
      for (let i = used[type]; i < pool.length; i++) pool[i].visible = false;
    }
  }

  createPreview(canvas) {
    return new AvatarPreview(canvas);
  }
}

// Xem trước nhân vật trong bảng tạo nhân vật: kéo để xoay 360°, tự xoay chậm khi không chạm
export class AvatarPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.setSize(canvas.width, canvas.height, false);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, canvas.width / canvas.height, 0.1, 50);
    this.camera.position.set(0, 1.15, 3.7);
    this.camera.lookAt(0, 0.88, 0);
    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#8a6a4a', 1.4));
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd27a', 1.0);
    rim.position.set(-3, 2, -3);
    this.scene.add(rim);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 40), new THREE.MeshStandardMaterial({ color: '#c9a46a', roughness: 0.6 }));
    base.position.y = -0.04;
    this.scene.add(base);

    this.avatar = null;
    this.yaw = 0.4;
    this.autoSpin = true;
    this.running = false;
    this.initDrag();
  }

  initDrag() {
    let last = null;
    let resumeTimer = null;
    this.canvas.style.touchAction = 'none';
    this.canvas.style.cursor = 'grab';
    this.canvas.addEventListener('pointerdown', (e) => {
      last = e.clientX;
      this.autoSpin = false;
      clearTimeout(resumeTimer);
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'grabbing';
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (last === null) return;
      this.yaw += (e.clientX - last) * 0.012;
      last = e.clientX;
    });
    const end = () => {
      last = null;
      this.canvas.style.cursor = 'grab';
      resumeTimer = setTimeout(() => { this.autoSpin = true; }, 2500);
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  setLook(look) {
    if (!this.avatar) {
      this.avatar = new Avatar3D(look);
      this.scene.add(this.avatar.group);
    } else {
      this.avatar.setLook(look);
    }
    this.start();
  }

  setYaw(yaw) {
    this.yaw = yaw;
    this.autoSpin = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    let lastT = performance.now();
    const tick = (t) => {
      // Dừng khi bảng tạo nhân vật đã đóng để không tốn pin
      if (!this.canvas.isConnected || this.canvas.offsetParent === null) {
        this.running = false;
        return;
      }
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      if (this.autoSpin) this.yaw += dt * 0.6;
      this.avatar.group.rotation.y = this.yaw;
      this.avatar.update(dt, t / 1000, { moving: false, sitting: false, activity: '' });
      this.webgl.render(this.scene, this.camera);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
