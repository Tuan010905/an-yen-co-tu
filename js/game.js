// Bộ điều khiển chính của Game "An Yên Cổ Tự - Đi Chùa Online"

// Những việc thiện client tự báo lên server; các việc còn lại (treo điều ước, quét lá...) server tự cộng khi xử lý
const CLIENT_REPORTED_MERIT = new Set([
  'greeting', 'pet_cat', 'fish_food', 'tea', 'dharma_talk', 'incense', 'wooden_fish', 'bell', 'fortune', 'love_blessing',
  'meditation', 'sutra_complete', 'bow', 'event_cong_phu', 'event_le', 'event_hoa_dang', 'event_dai_le'
]);

class TempleGame {
  constructor() {
    this.canvas = document.getElementById('templeCanvas');
    this.world = new window.TempleWorld();
    // Dùng bộ vẽ 3D nếu trình duyệt hỗ trợ, nếu không thì quay về bộ vẽ 2D
    const Renderer = window.TempleRenderer3D || window.TempleRenderer;
    this.renderer = new Renderer(this.canvas, this.world);
    document.body.classList.toggle('is-3d', !!this.renderer.is3D);
    this.network = window.templeNetwork;
    this.account = window.templeAccount;
    this.audio = window.zenAudio;
    this.calendar = window.templeCalendar;
    this.knownEvents = null; // sự kiện đang diễn ra ở lần kiểm tra trước
    this.dismissedEvents = new Set();
    this.eventClaims = new Set(); // phần thưởng sự kiện đã nhận trong ngày (để không gửi lặp)

    // Thông tin người chơi chính (outfit, hair, hairColor, skin, eyes, accessory được suy ra từ appearance)
    this.player = {
      name: 'Thiện Tâm',
      title: 'Khách Thập Phương',
      appearance: { ...window.TEMPLE_DATA.defaultAppearance },
      tool: 'none', // 'none' | 'broom' | 'food'
      merit: 15,    // Điểm Công Đức (Hạt Sen)
      mindfulness: 68, // Thanh Tâm Tịnh (0 - 100%)
      x: 800,
      y: 680,
      dir: 1,
      speed: 3.3,
      isMoving: false,
      isSitting: false,
      isSweeping: false,
      space: 'san_chua', // 'san_chua' | 'chinh_dien'
      activity: '', // '' | 'thien' | 'tung_kinh' | 'niem_phat' | 'chap_tay' | 'lay'
      activityStart: 0,
      lastTap: 0,
      seatId: null,
      speech: '',
      speechTimer: 0,
      walkTarget: null,
      onArrive: null
    };

    this.keys = {};
    this.activeHotspot = null;
    this.xinKeoPassed = false;
    this.selectedLanternColor = '#ff7eb3';
    // Lá/rác đã quét nhưng chờ server xác nhận ai quét trước
    this.pendingCleans = new Map();
    // true khi chơi bằng tài khoản trên server: công đức & hồ sơ do server giữ
    this.isOnlineAccount = false;
    this.characterDraft = null;
    this.meritStats = this.loadMeritStats();

    this.applyAppearance(this.player.appearance);
    this.hallPractice = new window.HallPractice(this);
    this.initEventListeners();
    this.initNetworkCallbacks();
    this.updateHUD();
    this.renderWishesList();

    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    // Vòng lặp đồng bộ vị trí Multiplayer (tối đa 10 lần/giây, chỉ gửi khi có thay đổi)
    setInterval(() => {
      this.network.sendPlayerState(this.player);
    }, 100);
    setInterval(() => this.updateHUD(), 1000);
    setInterval(() => this.checkEvents(), 10000);
    setTimeout(() => this.checkEvents(), 1500);

    requestAnimationFrame(() => this.gameLoop());
    this.start();
  }

  // Có server: bắt đăng nhập rồi mới vào phòng. Không có server: chơi ngoại tuyến bằng hồ sơ trên máy
  async start() {
    const result = await this.account.check();
    if (result.status === 'offline') {
      this.loadSavedProfile();
      this.network.connect({ offline: true });
      return;
    }

    let user = result.user;
    let isNew = false;
    if (result.status === 'guest') {
      ({ user, isNew } = await this.account.waitForLogin());
    }
    this.isOnlineAccount = true;
    this.applyUser(user);
    this.network.connect();
    if (isNew) this.openModal('characterModal');
  }

  applyUser(user) {
    this.player.name = user.name;
    this.player.merit = user.merit;
    this.player.mindfulness = user.mindfulness;
    this.player.title = user.title;
    this.applyAppearance(user.appearance);
    this.updateHUD();
  }

  applyAppearance(appearance) {
    this.player.appearance = { ...window.TEMPLE_DATA.defaultAppearance, ...appearance };
    Object.assign(this.player, window.TEMPLE_DATA.resolveAppearance(this.player.appearance));
  }

  loadSavedProfile() {
    try {
      const saved = localStorage.getItem('an_yen_co_tu_profile');
      if (saved) {
        const data = JSON.parse(saved);
        this.player.name = data.name || this.player.name;
        this.player.merit = typeof data.merit === 'number' ? data.merit : 15;
        this.player.mindfulness = typeof data.mindfulness === 'number' ? data.mindfulness : 68;
        // Hồ sơ cũ chỉ có outfitId / hairId / accessory ở ngoài
        this.applyAppearance(data.appearance || {
          outfitId: data.outfitId,
          hairId: data.hairId,
          accessory: data.accessory
        });
        this.recalculateTitle();
        this.updateHUD();
      }
    } catch (e) {}
  }

  saveProfile() {
    if (this.isOnlineAccount) return;
    try {
      localStorage.setItem('an_yen_co_tu_profile', JSON.stringify({
        name: this.player.name,
        merit: this.player.merit,
        mindfulness: this.player.mindfulness,
        appearance: this.player.appearance
      }));
    } catch (e) {}
  }

  recalculateTitle() {
    let best = window.TEMPLE_DATA.titles[0].title;
    for (const t of window.TEMPLE_DATA.titles) {
      if (this.player.merit >= t.minMerit) {
        best = t.title;
      }
    }
    this.player.title = best;
  }

  loadMeritStats() {
    try {
      const raw = localStorage.getItem('an_yen_co_tu_stats');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { incense: 0, sweep: 0, meditation: 0, sutra: 0, bell: 0, lantern: 0, wish: 0, dharma: 0 };
  }

  recordMeritStat(reason) {
    if (!this.meritStats) this.meritStats = this.loadMeritStats();
    const map = {
      incense: 'incense',
      sweep_leaf: 'sweep',
      sweep_trash: 'sweep',
      clean_temple: 'sweep',
      meditation: 'meditation',
      sutra_complete: 'sutra',
      bell: 'bell',
      lantern: 'lantern',
      wish: 'wish',
      bless: 'wish',
      dharma_talk: 'dharma',
      tea: 'dharma'
    };
    const key = map[reason];
    if (key) {
      this.meritStats[key] = (this.meritStats[key] || 0) + 1;
      try {
        localStorage.setItem('an_yen_co_tu_stats', JSON.stringify(this.meritStats));
      } catch (e) {}
    }
  }

  // Ghi nhận một việc thiện. Có tài khoản: server quyết định có cộng hay không rồi báo lại qua gói "merit"
  earnMerit(reason, x, y) {
    if (this.isOnlineAccount) {
      if (this.network.serverConnected && CLIENT_REPORTED_MERIT.has(reason)) {
        this.network.sendEarn(reason);
      }
      return;
    }
    this.recordMeritStat(reason);
    const reward = window.TEMPLE_DATA.meritRewards[reason];
    if (reward) this.addMerit(reward.amount, reward.label, x, y);
  }

  onServerMerit(packet) {
    this.recordMeritStat(packet.reason);
    this.player.merit = packet.total;
    this.player.mindfulness = packet.mindfulness;
    this.player.title = packet.title;
    this.updateHUD();
    const reward = window.TEMPLE_DATA.meritRewards[packet.reason];
    this.showFloatingText(`${reward ? reward.label : 'Công đức'} (+${packet.amount} 🪷)`);
  }

  // Chỉ dùng khi chơi ngoại tuyến
  addMerit(amount, reasonText, x, y) {
    this.player.merit += amount;
    this.player.mindfulness = Math.min(100, this.player.mindfulness + Math.max(1, Math.round(amount * 1.2)));
    this.recalculateTitle();
    this.saveProfile();
    this.updateHUD();
    this.showFloatingText(`${reasonText} (+${amount} 🪷)`, x, y);
  }

  showFloatingText(text, x, y) {
    this.world.addParticle({
      type: 'floating_text',
      text,
      x: x || this.player.x,
      y: (y || this.player.y) - 48,
      vy: -0.75,
      color: '#ffd966',
      alpha: 1,
      life: 75
    });
  }

  say(text, isEmote = false) {
    this.player.speech = text;
    this.player.speechTimer = 260;
    this.network.sendChat(this.player.name, this.player.title, text, isEmote);
    this.appendChatLog(this.player.name, this.player.title, text);
  }

  appendChatLog(author, title, text) {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const item = document.createElement('div');
    item.className = 'chat-msg';
    item.innerHTML = `<span class="chat-author">${this.escapeHtml(author)}</span> <span class="chat-title">(${this.escapeHtml(title || 'Phật Tử')})</span>: <span class="chat-text">${this.escapeHtml(text)}</span>`;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  initNetworkCallbacks() {
    this.network.onWelcomeCallback = (packet) => {
      this.pendingCleans.clear();
      this.calendar.setServerTime(packet.serverTime);
      if (packet.user) this.applyUser(packet.user);
      this.world.applyServerState(packet.state);
      this.renderWishesList();
      this.updateHUD();
    };

    this.network.onMeritCallback = (packet) => this.onServerMerit(packet);
    this.network.onMoTapCallback = (packet) => this.onRemoteTap(packet);

    this.network.onChatCallback = (author, title, text) => {
      this.appendChatLog(author, title, text);
    };

    this.network.onWorldEventCallback = (packet) => {
      const isMine = packet.by === this.network.clientId;
      switch (packet.type) {
        case 'item_removed': {
          // Công đức quét lá do server cộng và báo qua gói "merit"
          this.world.removeGroundItem(packet.itemId);
          this.pendingCleans.delete(packet.itemId);
          this.updateHUD();
          break;
        }
        case 'item_spawned':
          this.pendingCleans.delete(packet.item.id);
          this.world.addGroundItem(packet.item);
          this.updateHUD();
          break;
        case 'blessing_rain':
          this.world.triggerBlessingRain();
          this.showToast('🌸 Mưa Hoa Đại Cát! Sân chùa sạch tinh tươm, phước lành lan tỏa khắp muôn nơi!');
          break;
        case 'incense_lit':
          this.showToast(`🪔 ${packet.author} vừa dâng hương nguyện cầu: "${packet.wish}"`);
          break;
        case 'wish_blessed': {
          const wish = this.world.wishes.find(w => w.id === packet.wishId);
          if (wish) {
            wish.blessings = packet.blessings;
            if (isMine) wish.blessedByMe = true;
            this.renderWishesList();
          }
          break;
        }
      }
    };

    this.network.onWishAddedCallback = (wish) => {
      this.world.wishes.unshift(wish);
      this.renderWishesList();
      this.showToast(`🧧 ${wish.author} vừa treo một điều ước mới lên Cây Nguyện Ước!`);
    };

    this.network.onLanternAddedCallback = (lantern) => {
      this.world.addLantern(lantern);
      this.showToast(`🪷 ${lantern.author} vừa thả một Đèn Hoa Đăng xuống Hồ Sen!`);
    };
  }

  // Bảng nghi thức mở trong một khu riêng nằm gọn bên cạnh, không chặn việc đi lại
  isModalOpen() {
    return !!document.querySelector('.modal-backdrop.open:not(.as-side)');
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(m => this.closeModal(m.id));
        this.hallPractice.closeSutra();
        this.hallPractice.closeMeditationSetup();
        this.hideWishCard();
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (this.isModalOpen()) return;

      const key = e.key.toLowerCase();
      this.keys[key] = true;

      if (this.player.space === 'chinh_dien') {
        this.handleHallKey(e, key);
        return;
      }
      if (this.player.space !== 'san_chua') {
        this.handleZoneKey(e, key);
        return;
      }

      if (key === '1') this.setTool('none');
      if (key === '2') this.setTool(this.player.tool === 'broom' ? 'none' : 'broom');
      if (key === '3') this.setTool(this.player.tool === 'food' ? 'none' : 'food');
      if (key === 'g') this.performGreeting();
      if (key === 'h') this.openModal('incenseModal');
      if (key === 'm') this.openZone('gac_chuong');
      if (key === 'x') this.openZone('lau_xin_xam');
      if (key === 'c') this.openZone('cay_nguyen_uoc');
      if (key === 'l') this.openZone('ho_sen');
      if (key === 't') this.openZone('thuy_dinh');
      if (key === 'v') this.openModal('dharmaModal');
      if (key === 'p') this.openModal('meritModal');
      if (key === 'e' || key === ' ') {
        if (this.activeHotspot) {
          e.preventDefault();
          this.triggerHotspot(this.activeHotspot);
        } else if (this.player.tool === 'food') {
          e.preventDefault();
          this.useFoodTool();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Chuyển cửa sổ khi đang giữ phím thì sẽ không nhận được keyup, nên thả hết phím
    window.addEventListener('blur', () => {
      this.keys = {};
    });

    // Click ra vùng tối bên ngoài để đóng bảng
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('pointerdown', (e) => {
        if (e.target === backdrop) this.closeModal(backdrop.id);
      });
    });

    // Bấm trên bản đồ để đi tới hoặc tương tác. Bộ vẽ 3D tự phân biệt bấm với kéo xoay camera
    this.canvas.addEventListener('pointerdown', () => this.audio.init());
    if (this.renderer.is3D) {
      this.renderer.onClick = (pt) => this.handleWorldClick(pt);
    } else {
      this.canvas.addEventListener('pointerdown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.handleWorldClick({
          x: e.clientX - rect.left + this.renderer.camera.x,
          y: e.clientY - rect.top + this.renderer.camera.y,
          pick: null
        });
      });
    }

    // Điện thoại: thu gọn bảng nhạc và khung chat thành nút bấm
    document.getElementById('audioToggleBtn').addEventListener('click', (e) => {
      e.currentTarget.closest('.audio-panel').classList.toggle('expanded');
    });
    document.getElementById('chatToggleBtn').addEventListener('click', () => {
      document.body.classList.toggle('chat-open');
    });

    // Nút gửi chat
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (text) {
          this.say(text);
          input.value = '';
        }
      });
    }
  }

  handleWorldClick(pt) {
    if (this.isModalOpen() || !pt) return;
    if (this.player.space === 'chinh_dien') {
      this.handleHallClick(pt);
      return;
    }
    if (this.player.space !== 'san_chua') {
      this.handleZoneClick(pt);
      return;
    }
    const { x: worldX, y: worldY, pick } = pt;

    // Mèo Chùa
    const pickedCat = pick && pick.type === 'cat' ? this.world.cats.find(c => c.id === pick.id) : null;
    const nearCat = pickedCat || this.world.cats.find(cat => Math.hypot(worldX - cat.x, worldY - cat.y) < 32);
    if (nearCat) {
      this.petCat(nearCat);
      return;
    }

    // Bấm vào Sư Thầy Tuệ Tâm trên sân chùa để Vấn Đạo
    const monk = this.world.npcs.find(n => n.id === 'su_thay');
    if (monk && Math.hypot(worldX - monk.x, worldY - monk.y) < 38) {
      monk.speech = 'A Di Đà Phật! Mời thí chủ chia sẻ tâm tư cùng Bần tăng 🙏';
      monk.speechTimer = 260;
      this.openModal('dharmaModal');
      return;
    }

    // Đang cầm thức ăn và bấm vào Hồ Sen
    if (this.player.tool === 'food' && worldX >= 155 && worldX <= 445 && worldY >= 530 && worldY <= 820) {
      this.dropFishFood(worldX, worldY);
      return;
    }

    // Điểm tương tác: đứng gần thì làm ngay, ở xa thì đi tới rồi làm
    const pickedHs = pick && pick.type === 'hotspot' ? this.world.hotspots.find(h => h.id === pick.id) : null;
    const hs = pickedHs || this.world.hotspots.find(h => Math.hypot(worldX - h.x, worldY - h.y) < 55);
    if (hs) {
      const distToPlayer = Math.hypot(this.player.x - hs.x, this.player.y - hs.y);
      if (distToPlayer <= hs.radius + 45) this.triggerHotspot(hs);
      else this.walkTo(hs.x, hs.y + 40, () => this.triggerHotspot(hs));
      return;
    }

    this.walkTo(worldX, worldY);
  }

  // Đi tới một điểm, tới nơi thì làm việc onArrive (nếu có)
  walkTo(x, y, onArrive = null) {
    const bounds = this.currentBounds();
    this.player.isSitting = false;
    this.player.walkProgress = null;
    this.player.walkTarget = {
      x: Math.max(bounds.left, Math.min(bounds.right, x)),
      y: Math.max(bounds.top, Math.min(bounds.bottom, y))
    };
    this.player.onArrive = onArrive;
  }

  currentBounds() {
    if (this.player.space === 'chinh_dien') return window.TEMPLE_DATA.hall.bounds;
    const zone = window.TEMPLE_DATA.zones[this.player.space];
    if (zone) return zone.bounds;
    return { left: 90, right: this.world.width - 90, top: 165, bottom: this.world.height - 85 };
  }

  // ---------------- Chính Điện ----------------

  hallHotspots() {
    const L = window.TEMPLE_DATA.hall;
    return [
      { id: 'hall_door', type: 'leave_hall', x: L.door.x, y: L.door.y, radius: L.door.radius, actionLabel: '🚪 Ra Sân Chùa [E / Click]' },
      { id: 'hall_mo', type: 'big_mo', x: L.mo.x, y: L.mo.y + 50, radius: L.mo.radius, actionLabel: '🪵 Gõ Mõ Lớn [E / Space]' },
      { id: 'hall_bell', type: 'hall_bell', x: L.bell.x, y: L.bell.y + 50, radius: L.bell.radius, actionLabel: '🔔 Thỉnh Chuông Gia Trì [E / Space]' }
    ];
  }

  handleHallKey(e, key) {
    const practice = this.hallPractice;
    if (key === ' ' || key === 'e') {
      e.preventDefault();
      if (practice.mode === 'kinh') practice.tap();
      else if (this.activeHotspot) this.triggerHotspot(this.activeHotspot);
      else if (this.player.isSitting) practice.tap();
    }
    if (key === 'g') this.performGreeting();
    if (key === 'b') practice.ringBell();
  }

  handleHallClick(pt) {
    const L = window.TEMPLE_DATA.hall;
    const practice = this.hallPractice;
    const pick = pt.pick;
    if (pick && pick.type === 'cushion') {
      practice.goSit(pick.id);
      return;
    }
    if (pick && pick.type === 'door') {
      this.walkTo(L.door.x, L.door.y - 20, () => this.leaveHall());
      return;
    }
    if (pick && (pick.type === 'mo' || pick.type === 'bell')) {
      const spot = pick.type === 'mo' ? L.mo : L.bell;
      const act = () => (pick.type === 'mo' ? this.tapBigMo() : practice.ringBell());
      if (Math.hypot(this.player.x - spot.x, this.player.y - spot.y - 50) <= spot.radius) act();
      else this.walkTo(spot.x, spot.y + 60, act);
      return;
    }
    // Đang ngồi tụng kinh mà bấm vào khoảng trống: coi như một tiếng mõ
    if (practice.mode === 'kinh') {
      practice.tap();
      return;
    }
    this.walkTo(pt.x, pt.y);
  }

  tapBigMo() {
    this.player.lastTap = Date.now();
    this.audio.playWoodenFish(0.8, 1.2);
    if (this.renderer.pulseInstrument) this.renderer.pulseInstrument('mo');
    this.network.sendMoTap(false);
    this.earnMerit('wooden_fish');
    this.claimCongPhu();
  }

  enterHall() {
    this.enterSpace('chinh_dien');
  }

  leaveHall() {
    this.leaveSpace();
  }

  // Đi tới một khu: bản 3D thì vào không gian riêng, bản 2D thì mở bảng nghi thức như cũ
  openZone(spaceId) {
    if (this.renderer.is3D) {
      if (this.player.space !== spaceId) this.enterSpace(spaceId);
      return;
    }
    const fallback = {
      chinh_dien: () => this.openModal('incenseModal'),
      gac_chuong: () => this.openModal('woodenFishModal'),
      lau_xin_xam: () => this.openModal('fortuneModal'),
      cay_nguyen_uoc: () => this.openModal('wishingTreeModal'),
      ho_sen: () => this.openModal('lanternModal'),
      thuy_dinh: () => this.sitAtTeaHouse()
    };
    if (fallback[spaceId]) fallback[spaceId]();
  }

  enterSpace(spaceId) {
    if (!this.renderer.is3D) {
      this.openZone(spaceId);
      return;
    }
    this.fadeSpace(() => {
      this.cleanupSpace();
      const isHall = spaceId === 'chinh_dien';
      const cfg = isHall ? window.TEMPLE_DATA.hall : window.TEMPLE_DATA.zones[spaceId];
      const p = this.player;
      p.space = spaceId;
      p.x = cfg.spawn.x;
      p.y = cfg.spawn.y;
      p.walkTarget = null;
      p.onArrive = null;
      this.setTool('none', true);
      this.renderer.setSpace(spaceId);
      document.body.classList.add('in-space');
      document.body.classList.toggle('in-hall', isHall);
      if (isHall) {
        this.hallPractice.show();
        this.audio.startHallAmbience();
        this.audio.playSingingBowl(0.6);
        this.showToast('🛕 Bạn đã bước vào Chính Điện. Hãy chọn một bồ đoàn để ngồi thiền hoặc tụng kinh.');
      } else {
        this.showSpacePanel(spaceId);
        this.audio.playZitherNote(392, 0.12);
      }
    });
  }

  leaveSpace() {
    const from = this.player.space;
    if (from === 'san_chua') return;
    const back = from === 'chinh_dien' ? { x: 800, y: 340 } : window.TEMPLE_DATA.zones[from].returnTo;
    this.fadeSpace(() => {
      this.cleanupSpace();
      const p = this.player;
      p.space = 'san_chua';
      p.x = back.x;
      p.y = back.y;
      p.walkTarget = null;
      p.onArrive = null;
      this.renderer.setSpace('san_chua');
      document.body.classList.remove('in-space', 'in-hall');
    });
  }

  // Dọn dẹp khi rời một khu: đứng dậy, đóng bảng bên cạnh, tắt âm nền
  cleanupSpace() {
    const p = this.player;
    if (p.space === 'chinh_dien') {
      this.hallPractice.hide();
      this.audio.stopHallAmbience();
    }
    this.hideSpacePanel();
    this.hideWishCard();
    document.querySelectorAll('.modal-backdrop.as-side').forEach(m => this.closeModal(m.id));
    p.isSitting = false;
    p.seatId = null;
    p.activity = '';
  }

  fadeSpace(swap) {
    // Bấm liên tiếp khi đang chuyển cảnh thì bỏ qua, tránh chuyển hai lần
    if (this.fading) return;
    this.fading = true;
    const fade = document.getElementById('spaceFade');
    fade.classList.add('visible');
    setTimeout(() => {
      try {
        swap();
      } finally {
        this.fading = false;
        setTimeout(() => fade.classList.remove('visible'), 80);
      }
    }, 420);
  }

  // ---------------- Các khu riêng: Gác Chuông, Lầu Xăm, Cây Ước, Hồ Sen, Hiên Trà ----------------

  zoneHotspots(zone) {
    return [
      ...zone.hotspots,
      { id: 'zone_exit', type: 'leave_space', x: zone.exit.x, y: zone.exit.y, radius: zone.exit.radius, actionLabel: '⬇ Về Sân Chùa [E / Click]' }
    ];
  }

  handleZoneKey(e, key) {
    if (key === ' ' || key === 'e') {
      e.preventDefault();
      if (this.activeHotspot) this.triggerHotspot(this.activeHotspot);
    }
    if (key === 'g') this.performGreeting();
  }

  handleZoneClick(pt) {
    const zone = window.TEMPLE_DATA.zones[this.player.space];
    const pick = pt.pick || {};
    switch (pick.type) {
      case 'door':
        this.walkTo(zone.exit.x, zone.exit.y - 10, () => this.leaveSpace());
        return;
      case 'bell':
      case 'log':
        this.doZoneAction('strike_bell');
        return;
      case 'altar':
      case 'mat':
        this.doZoneAction('kneel_fortune');
        return;
      case 'tree':
        this.doZoneAction('hang_wish');
        return;
      case 'shrine':
        this.doZoneAction('love_thread');
        return;
      case 'wish':
        this.showWishCard(pick.id);
        return;
      case 'tea_seat':
        this.sitAtTeaSeat(pick.id);
        return;
      case 'water':
        this.feedFishAt(pt);
        return;
    }
    this.walkTo(pt.x, pt.y);
  }

  // Hành động gắn với một điểm đứng (dây chuông, chiếu quỳ, gốc cây...): ở xa thì đi tới rồi mới làm
  doZoneAction(id) {
    const zone = window.TEMPLE_DATA.zones[this.player.space];
    if (!zone) return;
    const hs = zone.hotspots.find(h => h.type === id);
    if (hs && Math.hypot(this.player.x - hs.x, this.player.y - hs.y) > hs.radius) {
      this.walkTo(hs.x, hs.y, () => this.doZoneAction(id));
      return;
    }
    switch (id) {
      case 'strike_bell': return this.strikeBell();
      case 'greet': return this.performGreeting();
      case 'kneel_fortune': return this.kneelForFortune();
      case 'stand': return this.standUp();
      case 'hang_wish': return this.openModal('wishingTreeModal');
      case 'love_thread':
        this.openModal('wishingTreeModal');
        return this.drawLoveBlessing();
      case 'release_lantern': return this.openModal('lanternModal');
      case 'feed_fish': return this.feedFishAt({ x: 800, y: 590 });
      case 'pour_tea': return this.pourTea();
      case 'listen': return this.listenToMonk();
      case 'dharma_talk': return this.openModal('dharmaModal');
      case 'leave': return this.leaveSpace();
    }
  }

  standUp() {
    this.player.isSitting = false;
    this.player.seatId = null;
    this.player.activity = '';
  }

  // Gác chuông: kéo chày kình, khoảng 1 giây sau chày chạm chuông thì chuông ngân
  strikeBell() {
    const now = Date.now();
    if (now < (this.bellBusyUntil || 0)) return;
    this.bellBusyUntil = now + 3600;
    this.player.activity = 'keo_chuong';
    this.player.activityStart = now;
    this.renderer.spaceEvent('strike');
    this.network.sendMoTap(true);
    setTimeout(() => {
      this.audio.playTempleBell(true);
      this.earnMerit('bell');
      const verses = window.TEMPLE_DATA.zones.gac_chuong.verses;
      this.bellCount = (this.bellCount || 0) + 1;
      const verse = verses[(this.bellCount - 1) % verses.length];
      this.setSpaceStatus(`🔔 Tiếng chuông thứ ${this.bellCount} — “${verse}”`);
    }, 1100);
    setTimeout(() => {
      if (this.player.activity === 'keo_chuong') this.player.activity = '';
    }, 1700);
  }

  // Tiếng mõ / chuông của người khác trong cùng không gian
  onRemoteTap(packet) {
    const p = this.network.remotePlayers.get(packet.senderId);
    if (p) p.lastTap = Date.now();
    if (this.player.space === 'chinh_dien') {
      this.hallPractice.onRemoteTap(packet);
    } else if (this.player.space === 'gac_chuong' && packet.bell) {
      this.renderer.spaceEvent('strike');
      setTimeout(() => this.audio.playTempleBell(true, 0.5), 1100);
    }
  }

  kneelForFortune() {
    const mat = window.TEMPLE_DATA.zones.lau_xin_xam.mat;
    this.player.x = mat.x;
    this.player.y = mat.y;
    this.player.walkTarget = null;
    this.player.activity = 'quy';
    this.player.activityStart = Date.now();
    this.openModal('fortuneModal');
  }

  seatTaken(space, seat) {
    for (const p of this.network.remotePlayers.values()) {
      if (p.space === space && p.isSitting && Math.hypot(p.targetX - seat.x, p.targetY - seat.y) < 20) return true;
    }
    return false;
  }

  sitAtTeaSeat(seatId) {
    const zone = window.TEMPLE_DATA.zones.thuy_dinh;
    const seat = zone.seats.find(s => s.id === seatId);
    if (!seat) return;
    if (this.seatTaken('thuy_dinh', seat)) {
      this.showToast('Chỗ này đã có người ngồi, bạn chọn bồ đoàn khác nhé 🍵');
      return;
    }
    this.walkTo(seat.x, seat.y, () => {
      const p = this.player;
      p.x = seat.x;
      p.y = seat.y;
      p.isSitting = true;
      p.seatId = seat.id;
      p.activity = 'uong_tra';
      p.activityStart = Date.now();
      this.pourTea();
    });
  }

  pourTea() {
    const zone = window.TEMPLE_DATA.zones.thuy_dinh;
    if (!this.player.isSitting) {
      const free = zone.seats.filter(s => !this.seatTaken('thuy_dinh', s));
      free.sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
      if (free.length) this.sitAtTeaSeat(free[0].id);
      else this.showToast('Bàn trà đã kín chỗ, bạn chờ một chút nhé 🍵');
      return;
    }
    this.renderer.spaceEvent('pour', { seatId: this.player.seatId });
    this.audio.playZitherNote(523.25, 0.16);
    this.earnMerit('tea');
    this.setSpaceStatus('🍵 Hương trà sen thoang thoảng. Hãy chậm rãi nhấp từng ngụm và lắng nghe tiếng nước.');
  }

  listenToMonk() {
    const quotes = window.TEMPLE_DATA.monkQuotes;
    const text = quotes[Math.floor(Math.random() * quotes.length)];
    this.renderer.spaceEvent('monk_say', { text });
    this.appendChatLog('Sư Thầy Tuệ Tâm', 'Trụ Trì An Yên Cổ Tự', text);
    this.audio.playSingingBowl(0.35);
  }

  // Hồ sen: bấm xuống mặt hồ để rải thức ăn đúng chỗ đó
  feedFishAt(pt) {
    const space = this.renderer.currentSpace;
    if (!space || !space.toPondCoords) return;
    const pier = window.TEMPLE_DATA.zones.ho_sen.pier;
    if (pt.x >= pier.left && pt.x <= pier.right && pt.y >= pier.top) {
      this.walkTo(pt.x, pt.y);
      return;
    }
    const c = space.toPondCoords(pt.x, pt.y);
    this.dropFishFood(c.x, c.y);
  }

  showSpacePanel(spaceId) {
    const zone = window.TEMPLE_DATA.zones[spaceId];
    const panel = document.getElementById('spacePanel');
    if (!zone || !panel) return;
    document.getElementById('spaceTitle').textContent = zone.name;
    this.setSpaceStatus(zone.intro);
    const actions = document.getElementById('spaceActions');
    actions.innerHTML = '';
    for (const action of [...zone.actions, { id: 'leave', label: '⬇ Về Sân Chùa' }]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dock-btn';
      btn.textContent = action.label;
      if (action.key) {
        const k = document.createElement('span');
        k.className = 'dock-key';
        k.textContent = action.key;
        btn.appendChild(k);
      }
      btn.addEventListener('click', () => this.doZoneAction(action.id));
      actions.appendChild(btn);
    }
    panel.hidden = false;
  }

  hideSpacePanel() {
    const panel = document.getElementById('spacePanel');
    if (panel) panel.hidden = true;
  }

  setSpaceStatus(text) {
    const el = document.getElementById('spaceStatus');
    if (el) el.textContent = text;
  }

  // Thẻ gỗ trên Cây Nguyện Ước: bấm để đọc và chúc phúc
  showWishCard(wishId) {
    const w = this.world.wishes.find(x => x.id === wishId);
    const card = document.getElementById('wishCard');
    if (!w || !card) return;
    card.querySelector('.wish-cat-tag').textContent = w.category;
    card.querySelector('.wish-author').textContent = `${w.author} • ${this.formatWishTime(w)}`;
    card.querySelector('.wish-body').textContent = `“${w.text}”`;
    this.bindBlessButton(card.querySelector('.bless-btn'), w);
    card.hidden = false;
    this.audio.playZitherNote(659.25, 0.1);
  }

  hideWishCard() {
    const card = document.getElementById('wishCard');
    if (card) card.hidden = true;
  }

  // Bảng tạo nhân vật chỉnh trên một bản nháp; chỉ khi bấm Hoàn Tất mới áp dụng và lưu
  initCharacterModalUI() {
    this.characterDraft = { ...this.player.appearance };
    this.renderCharacterOptions();

    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) nameInput.value = this.player.name;

    const accountEl = document.getElementById('characterAccount');
    const logoutBtn = document.getElementById('logoutBtn');
    const user = this.account.user;
    if (accountEl) accountEl.textContent = this.isOnlineAccount && user ? `Tài khoản: ${user.username}` : 'Đang chơi ngoại tuyến';
    if (logoutBtn) logoutBtn.hidden = !this.isOnlineAccount;
    const errorEl = document.getElementById('characterSaveError');
    if (errorEl) errorEl.textContent = '';
    const photoStatus = document.getElementById('photoStatus');
    if (photoStatus) photoStatus.textContent = 'Ảnh gốc chỉ được xử lý ngay trên máy bạn, không gửi lên server.';
    // Mặt hoạt hình: chỉ dùng khi người chơi đồng ý (đánh dấu ô bên dưới sau khi chọn ảnh)
    this.pendingFace = null;
    this.removeFace = false;
    document.getElementById('faceConsent').hidden = true;
    document.getElementById('useFaceToggle').checked = false;
    this.updateRemoveFaceButton();
    this.bindPhotoInput();
    this.renderCharacterPreview();
  }

  updateRemoveFaceButton() {
    const btn = document.getElementById('removeFaceBtn');
    if (btn) btn.hidden = !(this.characterDraft.faceId || this.characterDraft.faceLocal);
  }

  renderCharacterOptions() {
    const data = window.TEMPLE_DATA;
    const draft = this.characterDraft;
    const swatch = color => `<span class="swatch" style="background:${color}"></span>`;
    // Chọn màu có sẵn thì bỏ màu lấy từ ảnh / màu tự chọn
    const clear = field => () => { draft[field] = ''; return true; };

    this.buildChoiceChips('skinOptions', 'skinId', data.skinTones, s => `${swatch(s.color)} ${s.name}`, clear('skinColor'));
    this.buildChoiceChips('faceShapeOptions', 'faceShape', data.faceShapes, f => f.name);
    this.buildChoiceChips('eyesOptions', 'eyesId', data.eyes, e => e.name);
    this.buildChoiceChips('eyeSizeOptions', 'eyeSize', data.eyeSizes, e => e.name);
    this.buildChoiceChips('noseOptions', 'nose', data.noses, n => n.name);
    this.buildChoiceChips('mouthOptions', 'mouth', data.mouths, m => m.name);
    this.buildChoiceChips('beardOptions', 'beard', data.beards, b => b.name);
    this.buildChoiceChips('glassesOptions', 'glasses', data.glasses, g => g.name);
    this.buildChoiceChips('hairOptions', 'hairId', data.hairs, h => h.name);
    this.buildChoiceChips('hairColorOptions', 'hairColorId', data.hairColors, c => `${swatch(c.color)} ${c.name}`, clear('hairColor'));
    this.buildChoiceChips('outfitOptions', 'outfitId', data.outfits, o => `<span class="color-dot" style="background:${o.primary}"></span> ${o.name}`);
    this.buildChoiceChips('accessoryOptions', 'accessory', data.accessories, (acc) => {
      const locked = this.player.merit < acc.minMerit;
      return `${acc.icon} ${acc.name}` + (locked ? ` <small>(Cần ${acc.minMerit} 🪷)</small>` : '');
    }, (acc) => {
      if (this.player.merit >= acc.minMerit) return true;
      this.showToast(`Cần tích đủ ${acc.minMerit} Công Đức 🪷 để mở khóa ${acc.name}!`);
      return false;
    });

    // Ô chọn màu tự do cho da và tóc
    const resolved = data.resolveAppearance(draft);
    for (const [id, field, value] of [['skinColorPicker', 'skinColor', resolved.skin], ['hairColorPicker', 'hairColor', resolved.hairColor]]) {
      const input = document.getElementById(id);
      if (!input) continue;
      input.value = value;
      input.oninput = () => {
        draft[field] = input.value;
        const chips = document.getElementById(field === 'skinColor' ? 'skinOptions' : 'hairColorOptions');
        chips.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        this.renderCharacterPreview();
      };
    }
  }

  buildChoiceChips(containerId, field, items, labelFor, canSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const overridden = (field === 'skinId' && this.characterDraft.skinColor) || (field === 'hairColorId' && this.characterDraft.hairColor);
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-chip' + (!overridden && this.characterDraft[field] === item.id ? ' active' : '');
      btn.innerHTML = labelFor(item);
      btn.onclick = () => {
        if (canSelect && !canSelect(item)) return;
        this.characterDraft[field] = item.id;
        container.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        if (field === 'skinId' || field === 'hairColorId') this.renderCharacterOptions();
        this.renderCharacterPreview();
      };
      container.appendChild(btn);
    }
  }

  renderCharacterPreview() {
    const canvas = document.getElementById('characterPreview');
    if (!canvas || !this.characterDraft) return;
    const look = { ...window.TEMPLE_DATA.resolveAppearance(this.characterDraft), tool: 'none', dir: 1 };
    if (window.AvatarPreview3D) {
      if (!this.avatarPreview) this.avatarPreview = new window.AvatarPreview3D(canvas);
      this.avatarPreview.setLook(look);
      return;
    }
    this.renderer.drawCharacterPreview(canvas, look);
  }

  // Tạo nhân vật từ ảnh chân dung (xử lý trên máy bằng MediaPipe)
  bindPhotoInput() {
    const input = document.getElementById('photoInput');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';

    document.getElementById('useFaceToggle').addEventListener('change', (e) => {
      if (e.target.checked && this.pendingFace) {
        this.characterDraft.faceLocal = this.pendingFace;
        this.removeFace = false;
      } else {
        delete this.characterDraft.faceLocal;
      }
      this.updateRemoveFaceButton();
      this.renderCharacterPreview();
    });
    document.getElementById('removeFaceBtn').addEventListener('click', () => {
      delete this.characterDraft.faceLocal;
      this.characterDraft.faceId = '';
      this.removeFace = true;
      document.getElementById('useFaceToggle').checked = false;
      this.updateRemoveFaceButton();
      this.renderCharacterPreview();
    });
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      const status = document.getElementById('photoStatus');
      const thumb = document.getElementById('photoThumb');
      const button = document.getElementById('photoButton');
      if (!window.analyzePhotoForAvatar) {
        status.textContent = 'Trình duyệt chưa tải được bộ nhận diện khuôn mặt, bạn kiểm tra mạng rồi thử lại.';
        return;
      }
      button.setAttribute('disabled', '');
      try {
        const result = await window.analyzePhotoForAvatar(file, (msg) => { status.textContent = msg; });
        Object.assign(this.characterDraft, result.appearance);
        this.pendingFace = result.faceImage;
        const consent = document.getElementById('faceConsent');
        consent.hidden = false;
        if (document.getElementById('useFaceToggle').checked) this.characterDraft.faceLocal = this.pendingFace;
        if (thumb.dataset.url) URL.revokeObjectURL(thumb.dataset.url);
        thumb.src = result.thumbnailUrl;
        thumb.dataset.url = result.thumbnailUrl;
        thumb.hidden = false;
        status.textContent = `✨ Đã tạo nhân vật từ ảnh: ${result.summary}. Bạn vẫn có thể chỉnh thêm bên dưới.`;
        this.renderCharacterOptions();
        this.renderCharacterPreview();
        if (this.avatarPreview) this.avatarPreview.setYaw(0);
      } catch (err) {
        status.textContent = err.message || 'Không nhận diện được ảnh này, bạn thử ảnh khác nhé.';
      } finally {
        button.removeAttribute('disabled');
      }
    });
  }

  async saveCharacterCustomization() {
    const nameInput = document.getElementById('playerNameInput');
    const name = (nameInput && nameInput.value.trim().slice(0, 18)) || this.player.name;
    const saveBtn = document.getElementById('characterSaveBtn');
    const errorEl = document.getElementById('characterSaveError');

    if (this.isOnlineAccount) {
      saveBtn.disabled = true;
      try {
        // Mặt hoạt hình: tải lên khi người chơi đã đồng ý, hoặc xoá khi người chơi bấm xoá
        if (this.characterDraft.faceLocal) await this.account.uploadFace(this.characterDraft.faceLocal);
        else if (this.removeFace) await this.account.deleteFace();
        const { faceLocal, ...appearance } = this.characterDraft;
        void faceLocal;
        this.applyUser(await this.account.saveProfile(name, appearance));
      } catch (err) {
        errorEl.textContent = err.message || 'Không lưu được hồ sơ, bạn thử lại nhé.';
        return;
      } finally {
        saveBtn.disabled = false;
      }
    } else {
      this.player.name = name;
      this.applyAppearance(this.characterDraft);
      this.saveProfile();
      this.updateHUD();
    }

    this.closeModal('characterModal');
    this.audio.playTempleBell(false);
    this.say('A Di Đà Phật! Hoan hỷ chào chư vị đồng tu 🙏');
  }

  async logout() {
    await this.account.logout();
    window.location.reload();
  }

  setTool(toolName, silent = false) {
    this.player.tool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    if (silent) return;
    if (toolName === 'broom') {
      this.showToast('🧹 Đã cầm Chổi Tre! Hãy đi dạo quanh sân để quét lá vàng và dọn rác tích Công Đức.');
    } else if (toolName === 'food') {
      this.showToast('🌾 Đã cầm Túi Thức Ăn! Hãy lại gần Hồ Sen hoặc click vào Mèo Chùa để cho ăn.');
    }
  }

  performGreeting() {
    this.audio.playTempleBell(false);
    const greetings = [
      'A Di Đà Phật! Chúc đạo hữu ngày mới an lành 🙏',
      'Tâm an vạn sự an, hoan hỷ gặp gỡ nơi cửa Phật 🪷',
      'Chắp tay kính lễ, nguyện cầu bình an cho muôn loài 🙏'
    ];
    const msg = greetings[Math.floor(Math.random() * greetings.length)];
    this.say(msg, true);
    // Chắp tay chào trong giây lát (khi đang đứng)
    if (!this.player.isSitting && !this.player.activity) {
      this.player.activity = 'chap_tay';
      this.player.activityStart = Date.now();
      clearTimeout(this.greetTimer);
      this.greetTimer = setTimeout(() => {
        if (this.player.activity === 'chap_tay') this.player.activity = '';
      }, 2500);
    }
    this.earnMerit('greeting');

    // Các NPC đứng gần cũng chắp tay đáp lễ
    for (const npc of this.world.npcs) {
      if (Math.hypot(npc.x - this.player.x, npc.y - this.player.y) < 180) {
        setTimeout(() => {
          npc.speech = `A Di Đà Phật! Chào thí chủ ${this.player.name} 🙏`;
          npc.speechTimer = 220;
        }, 450);
      }
    }
  }

  petCat(cat) {
    this.audio.playZitherNote(587.33, 0.18);
    cat.state = 'idle';
    cat.moodText = 'Meow~ 💗';
    cat.timer = 180;
    this.earnMerit('pet_cat', cat.x, cat.y);
  }

  useFoodTool() {
    // Nếu đứng gần Hồ Sen thì rải thức ăn cho cá Koi
    if (this.player.x < 540 && this.player.y > 480 && this.player.y < 850) {
      this.dropFishFood(260 + Math.random() * 120, 620 + Math.random() * 120);
      return;
    }
    // Nếu đứng gần Mèo chùa
    for (const cat of this.world.cats) {
      if (Math.hypot(cat.x - this.player.x, cat.y - this.player.y) < 110) {
        this.petCat(cat);
        return;
      }
    }
    this.showToast('Hãy lại gần Hồ Sen (bên trái) hoặc Mèo Chùa trên sân để cho ăn nhé!');
  }

  dropFishFood(x, y) {
    this.audio.playSweepSound();
    for (let i = 0; i < 4; i++) {
      this.world.fishFoodPellet.push({
        x: x + (Math.random() - 0.5) * 36,
        y: y + (Math.random() - 0.5) * 36,
        eaten: false
      });
    }
    if (this.player.space === 'san_chua') this.earnMerit('fish_food', x, y);
    else this.earnMerit('fish_food');
  }

  triggerHotspot(hs) {
    if (!hs) return;
    switch (hs.type) {
      case 'incense':
        this.openModal('incenseModal');
        break;
      case 'wooden_fish':
        this.openModal('woodenFishModal');
        break;
      case 'fortune':
        this.openModal('fortuneModal');
        break;
      case 'wishing_tree':
        this.openModal('wishingTreeModal');
        break;
      case 'lotus_pond':
        this.openModal('lanternModal');
        break;
      case 'tea_house':
        this.sitAtTeaHouse();
        break;
      case 'broom_rack':
        this.setTool(this.player.tool === 'broom' ? 'none' : 'broom');
        break;
      case 'enter_hall':
        this.enterHall();
        break;
      case 'enter_space':
        this.openZone(hs.space);
        break;
      case 'leave_hall':
      case 'leave_space':
        this.leaveSpace();
        break;
      case 'strike_bell':
      case 'kneel_fortune':
      case 'hang_wish':
      case 'love_thread':
      case 'release_lantern':
        this.doZoneAction(hs.type);
        break;
      case 'big_mo':
        this.tapBigMo();
        break;
      case 'hall_bell':
        this.hallPractice.ringBell();
        break;
    }
  }

  sitAtTeaHouse() {
    // Chọn 1 đệm ngồi bàn trà
    const seat = this.world.teaSeats[Math.floor(Math.random() * this.world.teaSeats.length)];
    this.player.x = seat.x;
    this.player.y = seat.y;
    this.player.walkTarget = null;
    this.player.isSitting = true;
    this.audio.playZitherNote(523.25, 0.2);
    this.say('Mời chư vị đồng tu cùng thưởng chén trà sen thanh tịnh 🍵');
    this.earnMerit('tea', seat.x, seat.y);
  }

  // === CÁC NGHI THỨC TÂM LINH TRONG MODAL ===

  // 1. Thắp Hương Chính Điện
  submitIncensePrayer() {
    const input = document.getElementById('incenseWishInput');
    const typeSelect = document.getElementById('incenseTypeSelect');
    const wish = (input && input.value.trim()) || 'Cầu mong gia đình bình an, tâm luôn sáng trong';
    const incenseName = typeSelect ? typeSelect.value : 'Hương Trầm Bình An';

    this.audio.playTempleBell(true);
    this.earnMerit('incense', 800, 340);
    if (this.calendar.isActive('mung_mot') || this.calendar.isActive('ram')) this.earnEventMerit('event_le');
    if (this.calendar.festival()) this.earnEventMerit('event_dai_le');
    this.say(`🙏 Dâng ${incenseName}: "${wish}"`);

    // Thêm khói hương dày lên Đỉnh Hương
    for (let i = 0; i < 18; i++) {
      this.world.addParticle({
        type: 'smoke',
        x: 800 + (Math.random() - 0.5) * 26,
        y: 340,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.8 - Math.random() * 0.6,
        radius: 6 + Math.random() * 6,
        alpha: 0.7,
        life: 110
      });
    }

    this.network.sendIncense(this.player.name, wish);

    if (input) input.value = '';
    this.closeModal('incenseModal');
    this.showToast('🪔 Khói hương trầm đã quyện bay lên Chính Điện Tam Bảo.');
  }

  // 2. Gõ Mõ Tịnh Tâm & Thỉnh Chuông
  tapWoodenFish() {
    this.audio.playWoodenFish(1.0);
    this.claimCongPhu();
    const fishBtn = document.getElementById('woodenFishVisual');
    if (fishBtn) {
      fishBtn.classList.remove('pop-anim');
      void fishBtn.offsetWidth;
      fishBtn.classList.add('pop-anim');
    }

    const chants = ['Công Đức +1 🪷', 'Tâm Tịnh +1 ✨', 'Buông Bỏ Phiền Não', 'An Nhiên Tự Tại', 'A Di Đà Phật 🙏'];
    const msg = chants[Math.floor(Math.random() * chants.length)];

    const rippleBox = document.getElementById('moRippleContainer');
    if (rippleBox) {
      const span = document.createElement('div');
      span.className = 'mo-floating-label';
      span.textContent = msg;
      rippleBox.appendChild(span);
      setTimeout(() => span.remove(), 1100);
    }

    this.earnMerit('wooden_fish');
  }

  ringGreatBell() {
    this.audio.playTempleBell(true);
    this.earnMerit('bell');
    this.showToast('🔔 Tiếng Đại Hồng Chung ngân vang khắp chốn thiền môn...');
  }

  // 3. Xin Keo & Lắc Ống Xăm
  throwYinYangBlocks() {
    this.audio.playWoodenFish(1.3);
    const statusEl = document.getElementById('xinKeoStatus');
    const shakeBtn = document.getElementById('shakeFortuneBtn');

    // Khoảng 2/3 được Thánh Đài (1 Úp - 1 Ngửa), còn lại chia đều Tiếu Đài và Âm Đài
    const roll = Math.random();
    this.xinKeoPassed = roll < 0.66;
    if (shakeBtn) shakeBtn.disabled = !this.xinKeoPassed;
    if (this.player.space === 'lau_xin_xam') {
      this.renderer.spaceEvent('keo', { outcome: this.xinKeoPassed ? 'thanh' : roll < 0.83 ? 'tieu' : 'am' });
    }
    if (!statusEl) return;

    if (this.xinKeoPassed) {
      statusEl.innerHTML = '☯️ <strong>Nhất Âm Nhất Dương (Thánh Đài)!</strong> Chư Phật đã chứng giám lòng thành, mời bạn lắc ống xăm.';
      statusEl.className = 'keo-result success';
    } else if (roll < 0.83) {
      statusEl.innerHTML = '🌕 <strong>Hai đài cùng ngửa (Tiếu Đài)!</strong> Tâm còn đôi chút vướng bận, hãy hít thở sâu và thành tâm gieo lại nhé.';
      statusEl.className = 'keo-result retry';
    } else {
      statusEl.innerHTML = '🌑 <strong>Hai đài cùng úp (Âm Đài)!</strong> Chưa phải lúc, hãy tĩnh tâm khấn lại rồi gieo thêm lần nữa.';
      statusEl.className = 'keo-result retry';
    }
  }

  drawFortuneStick() {
    if (!this.xinKeoPassed) {
      this.showToast('☯️ Hãy Gieo Đài Âm Dương và được Thánh Đài trước khi lắc ống xăm nhé.');
      return;
    }
    this.xinKeoPassed = false;
    if (this.player.space === 'lau_xin_xam') this.renderer.spaceEvent('xam');
    const shakeBtn = document.getElementById('shakeFortuneBtn');
    if (shakeBtn) shakeBtn.disabled = true;
    const statusEl = document.getElementById('xinKeoStatus');
    if (statusEl) {
      statusEl.innerHTML = '🙏 Muốn xin quẻ khác, hãy thành tâm gieo đài lại từ đầu.';
      statusEl.className = 'keo-result retry';
    }

    this.audio.playBambooShake();
    const box = document.getElementById('fortuneResultCard');
    const cylinder = document.getElementById('bambooCylinderVisual');
    if (cylinder) {
      cylinder.classList.add('shake-anim');
      setTimeout(() => cylinder.classList.remove('shake-anim'), 650);
    }

    setTimeout(() => {
      this.audio.playTempleBell(false);
      const fortunes = window.TEMPLE_DATA.fortunes;
      const picked = fortunes[Math.floor(Math.random() * fortunes.length)];

      if (box) {
        box.style.display = 'block';
        box.innerHTML = `
          <div class="fortune-header">
            <span class="fortune-num">${picked.number}</span>
            <span class="fortune-rank" style="background:${picked.badgeColor}">${picked.rank}</span>
          </div>
          <h4 class="fortune-title">${picked.title}</h4>
          <div class="fortune-poem">
            ${picked.poem.map(line => `<p>${line}</p>`).join('')}
          </div>
          <div class="fortune-details">
            <p><strong>📜 Giải nghĩa:</strong> ${picked.meaning}</p>
            <p><strong>💼 Công danh & Sự nghiệp:</strong> ${picked.career}</p>
            <p><strong>💕 Tình duyên & Gia đạo:</strong> ${picked.love}</p>
            <p class="fortune-advice"><strong>🌱 Lời khuyên Sư Thầy:</strong> ${picked.advice}</p>
          </div>
        `;
      }
      this.earnMerit('fortune');
    }, 600);
  }

  // 4. Cầu Duyên & Treo Thẻ Ước Nguyện
  drawLoveBlessing() {
    this.audio.playZitherNote(659.25, 0.2);
    const list = window.TEMPLE_DATA.loveBlessings;
    const item = list[Math.floor(Math.random() * list.length)];
    const box = document.getElementById('loveBlessingBox');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = `
        <div class="love-ribbon-badge">🧧 Đã nhận: ${item.ribbon}</div>
        <h4>${item.title}</h4>
        <pre class="love-poem">${item.poem}</pre>
        <p>${item.message}</p>
      `;
    }
    this.earnMerit('love_blessing');
  }

  hangNewWish() {
    const textInput = document.getElementById('wishTextInput');
    const catSelect = document.getElementById('wishCategorySelect');
    const text = textInput ? textInput.value.trim() : '';
    if (!text) {
      this.showToast('Bạn hãy viết lời ước nguyện trước khi treo lên cây nhé!');
      return;
    }

    const newWish = {
      id: 'w_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      author: this.player.name,
      title: this.player.title,
      category: catSelect ? catSelect.value : 'Tình duyên',
      text,
      blessings: 1,
      createdAt: Date.now(),
      blessedByMe: true
    };

    this.world.wishes.unshift(newWish);
    this.network.sendWish(newWish);
    this.renderWishesList();
    this.audio.playTempleBell(false);
    this.earnMerit('wish', 1270, 645);
    this.say(`🧧 Vừa gửi điều ước [${newWish.category}] lên Cây Nguyện Ước!`);

    if (textInput) textInput.value = '';
  }

  renderWishesList() {
    const container = document.getElementById('wishesListContainer');
    if (!container) return;
    container.innerHTML = '';

    this.world.wishes.slice(0, 12).forEach((w) => {
      const card = document.createElement('div');
      card.className = 'wish-card';
      card.innerHTML = `
        <div class="wish-card-top">
          <span class="wish-cat-tag">${this.escapeHtml(w.category)}</span>
          <span class="wish-author">${this.escapeHtml(w.author)} • <small>${this.escapeHtml(this.formatWishTime(w))}</small></span>
        </div>
        <p class="wish-body">“${this.escapeHtml(w.text)}”</p>
        <div class="wish-footer">
          <button type="button" class="bless-btn"></button>
        </div>
      `;
      this.bindBlessButton(card.querySelector('.bless-btn'), w);
      container.appendChild(card);
    });
  }

  bindBlessButton(btn, w) {
    btn.textContent = w.blessedByMe ? `🙏 Đã chúc phúc (${w.blessings})` : `🙏 Chắp tay chúc phúc (${w.blessings})`;
    btn.disabled = !!w.blessedByMe;
    btn.onclick = () => {
      w.blessings++;
      w.blessedByMe = true;
      btn.textContent = `🙏 Đã chúc phúc (${w.blessings})`;
      btn.disabled = true;
      if (!w.seed) this.network.sendBlessWish(w.id);
      this.audio.playZitherNote(523.25, 0.14);
      this.earnMerit('bless');
    };
  }

  formatWishTime(wish) {
    if (!wish.createdAt) return wish.time || '';
    const minutes = Math.floor((Date.now() - wish.createdAt) / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }

  // 5. Thả Đèn Hoa Đăng xuống Hồ Sen
  releaseLotusLantern() {
    const input = document.getElementById('lanternWishInput');
    const text = (input && input.value.trim()) || 'Nguyện cầu bình an và hạnh phúc';

    const lantern = {
      id: 'lan_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      author: this.player.name,
      color: this.selectedLanternColor,
      text,
      x: Math.round(205 + Math.random() * 200),
      y: Math.round(575 + Math.random() * 195),
      createdAt: Date.now()
    };

    this.world.addLantern(lantern);
    this.network.sendLantern(lantern);

    // Chuyển sang khung cảnh Đêm Hoa Đăng nếu người chơi muốn ngắm đèn rực rỡ
    this.audio.playTempleBell(false);
    this.earnMerit('lantern', lantern.x, lantern.y);
    if (this.calendar.isActive('dem_hoa_dang')) this.earnEventMerit('event_hoa_dang');
    if (this.calendar.festival()) this.earnEventMerit('event_dai_le');
    this.say(`🪷 Thả đèn hoa đăng: "${text}"`);

    if (input) input.value = '';
    this.closeModal('lanternModal');
  }

  // Thay đổi Thời Gian Ngày / Hoàng Hôn / Đêm Hoa Đăng
  // ---------------- Lịch chùa & sự kiện chung ----------------

  // Phần thưởng sự kiện: mỗi loại chỉ gửi một lần mỗi ngày (server vẫn tự kiểm tra sự kiện có đang diễn ra)
  earnEventMerit(reason) {
    const i = this.calendar.info();
    const key = `${reason}:${i.year}-${i.month}-${i.day}:${reason === 'event_cong_phu' ? (i.hour < 12 ? 'sang' : 'chieu') : ''}`;
    if (this.eventClaims.has(key)) return;
    this.eventClaims.add(key);
    this.earnMerit(reason);
  }

  // Gõ mõ trong Chính Điện đúng giờ công phu
  claimCongPhu() {
    if (this.player.space !== 'chinh_dien') return;
    if (this.calendar.isActive('cong_phu_sang') || this.calendar.isActive('cong_phu_chieu')) this.earnEventMerit('event_cong_phu');
  }

  // Kiểm tra sự kiện mới bắt đầu: báo cho người chơi, công phu thì điểm chuông
  checkEvents() {
    const ids = this.calendar.activeEventIds();
    const firstCheck = this.knownEvents === null;
    const started = ids.filter(id => !(this.knownEvents || []).includes(id));
    this.knownEvents = ids;
    if (!started.length) return;
    const priority = id => (this.calendar.events[id].festival ? 0 : id === 'dem_hoa_dang' ? 1 : id.startsWith('cong_phu') ? 2 : 3);
    const show = started.filter(id => !this.dismissedEvents.has(this.eventKey(id))).sort((a, b) => priority(a) - priority(b))[0];
    if (show) this.showEventBanner(show);
    if (!firstCheck && started.some(id => id.startsWith('cong_phu'))) this.tollBell();
    if (document.getElementById('calendarModal').classList.contains('open')) this.renderCalendar();
  }

  eventKey(id) {
    const i = this.calendar.info();
    return `${id}:${i.year}-${i.month}-${i.day}`;
  }

  // Ba hồi chuông báo giờ công phu
  tollBell() {
    [0, 3200, 6400].forEach(ms => setTimeout(() => this.audio.playTempleBell(true, 0.8), ms));
  }

  showEventBanner(id) {
    const ev = this.calendar.events[id];
    const banner = document.getElementById('eventBanner');
    if (!ev || !banner) return;
    banner.querySelector('.event-icon').textContent = ev.icon;
    banner.querySelector('.event-name').textContent = ev.name;
    banner.querySelector('.event-text').textContent = ev.text;
    const go = banner.querySelector('.event-go');
    const zoneName = ev.zone === 'chinh_dien' ? 'Chính Điện' : window.TEMPLE_DATA.zones[ev.zone].name;
    go.textContent = `Đến ${zoneName}`;
    go.hidden = this.player.space === ev.zone;
    go.onclick = () => {
      this.hideEventBanner(id);
      this.openZone(ev.zone);
    };
    banner.querySelector('.event-close').onclick = () => this.hideEventBanner(id);
    banner.hidden = false;
  }

  hideEventBanner(id) {
    this.dismissedEvents.add(this.eventKey(id));
    document.getElementById('eventBanner').hidden = true;
  }

  // Bảng Lịch Chùa: hôm nay, sự kiện đang diễn ra, khung cảnh, thời khoá, ngày lễ sắp tới
  renderCalendar() {
    const cal = this.calendar;
    const i = cal.info();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('calToday').textContent = `${i.weekday}, ${pad(i.day)}/${pad(i.month)}/${i.year} • ${pad(i.hour)}:${pad(i.minute)} (${i.hourName})`;
    document.getElementById('calLunar').textContent = `Âm lịch: ${cal.lunarText(i)}`;

    const active = document.getElementById('calActive');
    active.innerHTML = '';
    const ids = cal.activeEventIds();
    if (!ids.length) {
      const p = document.createElement('p');
      p.className = 'cal-empty';
      p.textContent = 'Hôm nay không có lễ. Chùa vẫn mở cửa đón mọi người, mời bạn thắp hương và ngồi thiền.';
      active.appendChild(p);
    }
    for (const id of ids) {
      const ev = cal.events[id];
      const row = document.createElement('div');
      row.className = 'cal-event active';
      row.innerHTML = '<span class="cal-icon"></span><div><strong></strong><p></p></div><button type="button" class="choice-chip">Đến nơi</button>';
      row.querySelector('.cal-icon').textContent = ev.icon;
      row.querySelector('strong').textContent = ev.name;
      row.querySelector('p').textContent = ev.text;
      row.querySelector('button').onclick = () => {
        this.closeModal('calendarModal');
        this.openZone(ev.zone);
      };
      active.appendChild(row);
    }

    document.querySelectorAll('[data-light]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.light === cal.lightMode);
      btn.onclick = () => {
        cal.setLightMode(btn.dataset.light);
        this.renderCalendar();
        this.updateHUD();
      };
    });

    const upcoming = document.getElementById('calUpcoming');
    upcoming.innerHTML = '';
    for (const ev of cal.upcoming(7)) {
      const row = document.createElement('div');
      row.className = 'cal-event';
      row.innerHTML = '<span class="cal-icon"></span><div><strong></strong><p></p></div><span class="cal-when"></span>';
      row.querySelector('.cal-icon').textContent = ev.icon;
      row.querySelector('strong').textContent = ev.name;
      row.querySelector('p').textContent = `${ev.solar} • âm lịch ${ev.lunar}`;
      row.querySelector('.cal-when').textContent = ev.daysAway === 0 ? 'Hôm nay' : ev.daysAway === 1 ? 'Ngày mai' : `còn ${ev.daysAway} ngày`;
      upcoming.appendChild(row);
    }
  }

  openModal(modalId) {
    this.audio.init();
    this.keys = {};
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.toggle('as-side', this.player.space !== 'san_chua' && modalId !== 'characterModal');
      el.classList.add('open');
      if (modalId === 'characterModal') {
        this.initCharacterModalUI();
      }
      if (modalId === 'calendarModal') this.renderCalendar();
      if (modalId === 'dharmaModal') this.renderDharmaModal();
      if (modalId === 'meritModal') this.renderMeritModal();
    }
  }

  // ---------------- Vấn Đạo Sư Thầy Tuệ Tâm ----------------

  renderDharmaModal() {
    const listEl = document.getElementById('dharmaTopicList');
    if (!listEl) return;
    listEl.innerHTML = '';
    const talks = window.TEMPLE_DATA.dharmaTalks || [];
    talks.forEach((topic) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-chip';
      btn.style.justifyContent = 'flex-start';
      btn.textContent = topic.label;
      btn.onclick = () => {
        listEl.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.selectDharmaTopic(topic);
      };
      listEl.appendChild(btn);
    });
  }

  selectDharmaTopic(topic) {
    this.audio.playSingingBowl(0.8);
    if (this.player.space === 'thuy_dinh' && this.renderer.spaceEvent) {
      this.renderer.spaceEvent('monk_say', { text: topic.title });
    }
    const card = document.getElementById('dharmaResultCard');
    if (card) {
      card.style.display = 'block';
      card.innerHTML = `
        <div class="fortune-header">
          <span class="fortune-num">🪷 Sư Thầy Tuệ Tâm Khai Thị</span>
          <span class="fortune-rank" style="background:#8c5a36">+5 🪷</span>
        </div>
        <h4 class="fortune-title">${this.escapeHtml(topic.title)}</h4>
        <div class="fortune-poem">
          ${topic.verse.map(line => `<p>${this.escapeHtml(line)}</p>`).join('')}
        </div>
        <div class="fortune-details">
          <p><strong>📜 Lời Thầy khuyên:</strong> ${this.escapeHtml(topic.teaching)}</p>
        </div>
        <button type="button" id="dharmaActionBtn" class="primary-action-btn" style="margin-top:10px;">
          ${this.escapeHtml(topic.practiceLabel)}
        </button>
      `;
      const actionBtn = card.querySelector('#dharmaActionBtn');
      if (actionBtn) {
        actionBtn.onclick = () => this.runDharmaPractice(topic.practiceAction);
      }
    }
    this.earnMerit('dharma_talk');
  }

  runDharmaPractice(action) {
    this.closeModal('dharmaModal');
    switch (action) {
      case 'meditate':
        this.enterHall();
        setTimeout(() => this.hallPractice.handleAction('meditate'), 550);
        break;
      case 'chant_tu_bi':
        this.enterHall();
        setTimeout(() => this.hallPractice.handleAction('tu_bi'), 550);
        break;
      case 'lantern':
        this.openZone('ho_sen');
        setTimeout(() => this.openModal('lanternModal'), 550);
        break;
      case 'sweep':
        if (this.player.space !== 'san_chua') this.leaveSpace();
        setTimeout(() => this.setTool('broom'), 450);
        break;
      case 'incense':
        if (this.player.space !== 'san_chua') this.leaveSpace();
        setTimeout(() => this.openModal('incenseModal'), 450);
        break;
    }
  }

  // ---------------- Sổ Vàng Công Đức & Thành Tựu ----------------

  async renderMeritModal() {
    const merit = this.player.merit;
    const titles = window.TEMPLE_DATA.titles;
    let nextTitle = null;
    for (const t of titles) {
      if (t.minMerit > merit) {
        nextTitle = t;
        break;
      }
    }

    const progEl = document.getElementById('meritProgressSection');
    if (progEl) {
      const pct = nextTitle ? Math.min(100, Math.round((merit / nextTitle.minMerit) * 100)) : 100;
      progEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span style="font-size:12px;color:#6b4a2e;">Danh hiệu hiện tại:</span>
            <h4 style="color:#8c2318;font-size:17px;">« ${this.escapeHtml(this.player.title)} »</h4>
          </div>
          <div style="text-align:right;">
            <span style="font-size:20px;font-weight:800;color:#b57c1e;">🪷 ${merit}</span>
            <div style="font-size:11.5px;color:#6b4a2e;">Tâm Tịnh: ${this.player.mindfulness}%</div>
          </div>
        </div>
        <div class="progress-track" style="width:100%;height:10px;background:#efe2c6;margin:6px 0;">
          <div class="progress-fill clean" style="width:${pct}%;"></div>
        </div>
        <p style="font-size:12.5px;color:#5c381e;">
          ${nextTitle
            ? `Cần thêm <strong>${nextTitle.minMerit - merit} 🪷</strong> để chứng đạt danh hiệu <strong>« ${this.escapeHtml(nextTitle.title)} »</strong> (${merit}/${nextTitle.minMerit}).`
            : '🌟 Bạn đã đạt danh hiệu cao quý nhất tại An Yên Cổ Tự: <strong>« Hộ Pháp An Yên »</strong>!'}
        </p>
      `;
    }

    const statsEl = document.getElementById('meritStatsGrid');
    if (statsEl) {
      const s = this.meritStats || {};
      const items = [
        { label: '🪔 Lần dâng hương', val: s.incense || 0 },
        { label: '🧹 Lá & rác đã dọn', val: s.sweep || 0 },
        { label: '🧘 Thời thiền định', val: s.meditation || 0 },
        { label: '📿 Thời kinh viên mãn', val: s.sutra || 0 },
        { label: '🔔 Lần thỉnh chuông', val: s.bell || 0 },
        { label: '🪷 Hoa đăng đã thả', val: s.lantern || 0 },
        { label: '🧧 Ước nguyện & chúc phúc', val: s.wish || 0 },
        { label: '🍵 Thưởng trà & vấn đạo', val: s.dharma || 0 }
      ];
      statsEl.innerHTML = items.map(it => `
        <div class="merit-stat-box">
          <span>${it.label}</span>
          <strong>${it.val}</strong>
        </div>
      `).join('');
    }

    const unlockEl = document.getElementById('meritUnlockList');
    if (unlockEl) {
      unlockEl.innerHTML = '';
      window.TEMPLE_DATA.accessories.filter(a => a.id !== 'none').forEach((acc) => {
        const unlocked = merit >= acc.minMerit;
        const equipped = this.player.appearance.accessory === acc.id;
        const row = document.createElement('div');
        row.className = 'merit-unlock-row';
        row.innerHTML = `
          <div>
            <strong>${acc.icon} ${this.escapeHtml(acc.name)}</strong>
            <div style="font-size:11.5px;color:#6b4a2e;">
              ${acc.minMerit === 0 ? 'Mở sẵn cho mọi Phật tử' : `Yêu cầu: ${acc.minMerit} 🪷 Hạt Sen Công Đức`}
            </div>
          </div>
          <button type="button" class="choice-chip ${equipped ? 'active' : ''}" ${!unlocked ? 'disabled' : ''}>
            ${equipped ? 'Đang mang' : unlocked ? 'Mang ngay' : `Thiếu ${acc.minMerit - merit} 🪷`}
          </button>
        `;
        if (unlocked && !equipped) {
          row.querySelector('button').onclick = () => this.equipUnlockedAccessory(acc.id);
        }
        unlockEl.appendChild(row);
      });
    }

    const boardEl = document.getElementById('meritLeaderboard');
    if (boardEl) {
      boardEl.innerHTML = '<p class="cal-empty">Đang tải Bảng Vàng Công Đức...</p>';
      let leaders = null;
      try {
        const res = await fetch('/api/merit-board');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.leaders) && data.leaders.length) {
            leaders = data.leaders;
          }
        }
      } catch (e) {}

      if (!leaders) {
        const sample = [
          { name: 'Minh Anh', merit: 145, title: 'Tâm Sen Thanh Tịnh' },
          { name: 'Khánh Duy', merit: 85, title: 'Phật Tử Chăm Chỉ' },
          { name: 'Thảo Vy', merit: 42, title: 'Người Gieo Hạt Lành' },
          { name: 'Hoàng Nam', merit: 28, title: 'Người Gieo Hạt Lành' },
          { name: this.player.name, merit: this.player.merit, title: this.player.title, isMe: true }
        ];
        sample.sort((a, b) => b.merit - a.merit);
        leaders = sample.map((item, idx) => ({ ...item, rank: idx + 1 }));
      }

      boardEl.innerHTML = leaders.map((l) => {
        const isMe = l.isMe || l.name === this.player.name;
        const rankClass = l.rank <= 3 ? `top-${l.rank}` : '';
        return `
          <div class="merit-leader-row ${isMe ? 'is-me' : ''}">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="leader-rank ${rankClass}">${l.rank}</span>
              <div>
                <div>${this.escapeHtml(l.name)} ${isMe ? '<small>(Bạn)</small>' : ''}</div>
                <small style="color:#6b4a2e;">« ${this.escapeHtml(l.title)} »</small>
              </div>
            </div>
            <strong style="color:#8c2318;">🪷 ${l.merit}</strong>
          </div>
        `;
      }).join('');
    }
  }

  async equipUnlockedAccessory(accId) {
    const nextAppearance = { ...this.player.appearance, accessory: accId };
    if (this.isOnlineAccount) {
      try {
        const user = await this.account.saveProfile(this.player.name, nextAppearance);
        this.applyUser(user);
      } catch (e) {
        this.showToast('Chưa lưu được phụ kiện, bạn thử lại nhé.');
        return;
      }
    } else {
      this.applyAppearance(nextAppearance);
      this.saveProfile();
      this.updateHUD();
    }
    this.audio.playZitherNote(587.33, 0.16);
    this.renderMeritModal();
    this.showToast('✨ Đã trang bị pháp bảo mới!');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('open');
    // Xin xăm xong thì đứng dậy khỏi chiếu quỳ
    if (modalId === 'fortuneModal' && this.player.activity === 'quy') this.player.activity = '';
  }

  showToast(message) {
    const toast = document.getElementById('templeToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3800);
  }

  updateHUD() {
    const clockBtn = document.getElementById('timeOfDayBtn');
    if (clockBtn) {
      const label = this.calendar.shortLabel() + (this.calendar.lightMode === 'auto' ? '' : ' ✦');
      if (clockBtn.textContent !== label) clockBtn.textContent = label;
    }
    const nameEl = document.getElementById('hudPlayerName');
    const titleEl = document.getElementById('hudPlayerTitle');
    const meritEl = document.getElementById('hudMeritCount');
    const mindFill = document.getElementById('hudMindfulnessBar');
    const cleanFill = document.getElementById('hudCleanlinessBar');
    const cleanText = document.getElementById('hudCleanlinessText');
    const onlineEl = document.getElementById('hudOnlineCount');

    if (nameEl) nameEl.textContent = this.player.name;
    if (titleEl) titleEl.textContent = this.player.title;
    if (meritEl) meritEl.textContent = this.player.merit;
    if (mindFill) mindFill.style.width = `${this.player.mindfulness}%`;
    if (cleanFill) cleanFill.style.width = `${this.world.cleanliness}%`;
    if (cleanText) cleanText.textContent = `${this.world.cleanliness}%`;

    if (onlineEl) {
      const people = 1 + this.network.remotePlayers.size;
      if (this.network.mode === 'server') {
        onlineEl.textContent = `${people} người • phòng ${this.network.room}`;
      } else if (this.network.mode === 'local') {
        onlineEl.textContent = `${people} người • ngoại tuyến`;
      } else {
        onlineEl.textContent = 'Đang kết nối…';
      }
    }
  }

  updatePlayerMovement() {
    const p = this.player;
    let kx = 0;
    let ky = 0;

    if (this.keys['w'] || this.keys['arrowup']) ky -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) ky += 1;
    if (this.keys['a'] || this.keys['arrowleft']) kx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) kx += 1;
    // Q / R xoay camera quanh nhân vật (chuột kéo cũng xoay được)
    if (this.renderer.rotateCamera) {
      if (this.keys['q']) this.renderer.rotateCamera(0.03);
      if (this.keys['r']) this.renderer.rotateCamera(-0.03);
    }

    if (this.isModalOpen()) {
      kx = 0;
      ky = 0;
    }

    // Phím di chuyển đi theo hướng camera đang nhìn
    const yaw = this.renderer.cameraYaw || 0;
    const dx = Math.cos(yaw) * kx + Math.sin(yaw) * ky;
    const dy = -Math.sin(yaw) * kx + Math.cos(yaw) * ky;
    const wasSitting = p.isSitting;

    if (kx !== 0 || ky !== 0) {
      p.walkTarget = null;
      p.onArrive = null;
      p.isSitting = false;
      const len = Math.hypot(dx, dy);
      p.x += (dx / len) * p.speed;
      p.y += (dy / len) * p.speed;
      p.dir = dx >= 0 ? 1 : -1;
      p.isMoving = true;
    } else if (p.walkTarget) {
      const tx = p.walkTarget.x - p.x;
      const ty = p.walkTarget.y - p.y;
      const dist = Math.hypot(tx, ty);
      // Kẹt quá 2 giây không tiến lại gần hơn: dừng lại (đã đủ gần thì vẫn làm việc định làm)
      const prog = p.walkProgress || (p.walkProgress = { best: Infinity, frames: 0 });
      if (dist < prog.best - 2) {
        prog.best = dist;
        prog.frames = 0;
      } else if (++prog.frames > 120) {
        const onArrive = dist < 160 ? p.onArrive : null;
        p.walkTarget = null;
        p.onArrive = null;
        p.walkProgress = null;
        p.isMoving = false;
        if (onArrive) onArrive();
      }
      if (!p.walkTarget) {
        // đã dừng vì kẹt
      } else if (dist > 4) {
        const step = Math.min(p.speed, dist);
        p.x += (tx / dist) * step;
        p.y += (ty / dist) * step;
        p.dir = tx >= 0 ? 1 : -1;
        p.isMoving = true;
      } else {
        p.walkTarget = null;
        p.walkProgress = null;
        p.isMoving = false;
        const onArrive = p.onArrive;
        p.onArrive = null;
        if (onArrive) onArrive();
      }
    } else {
      p.isMoving = false;
    }

    if (p.isMoving && p.space === 'chinh_dien' && (wasSitting || p.activity)) this.hallPractice.onPlayerMoved();
    if (p.isMoving && p.space !== 'chinh_dien' && ['chap_tay', 'quy', 'uong_tra'].includes(p.activity)) p.activity = '';
    if (p.isMoving && p.space !== 'chinh_dien') p.seatId = null;

    const bounds = this.currentBounds();
    p.x = Math.max(bounds.left, Math.min(bounds.right, p.x));
    p.y = Math.max(bounds.top, Math.min(bounds.bottom, p.y));

    if (p.speechTimer > 0) p.speechTimer--;

    if (p.space === 'chinh_dien') {
      this.updateHotspotPrompt(this.hallHotspots());
      return;
    }
    const zone = window.TEMPLE_DATA.zones[p.space];
    if (zone) {
      this.resolveZoneObstacles(zone);
      this.updateHotspotPrompt(this.zoneHotspots(zone));
      return;
    }

    this.resolveCourtyardObstacles();

    // Kiểm tra quét lá / nhặt rác tự động khi cầm Chổi Tre (hoặc đi sát rác)
    p.isSweeping = false;
    const sweepRadius = p.tool === 'broom' ? 48 : 24;

    for (let i = this.world.groundItems.length - 1; i >= 0; i--) {
      const item = this.world.groundItems[i];
      const dist = Math.hypot(item.x - p.x, item.y - p.y);

      if (dist <= sweepRadius && (p.tool === 'broom' || item.type === 'trash')) {
        p.isSweeping = true;
        this.world.removeGroundItem(item.id);
        this.audio.playSweepSound();
        this.updateHUD();

        // Có server: chờ server xác nhận mình quét trước rồi mới cộng công đức
        if (this.network.serverConnected) {
          this.pendingCleans.set(item.id, item);
          this.network.sendCleanItem(item.id, p.x, p.y);
          break;
        }

        this.earnMerit(item.type === 'leaf' ? 'sweep_leaf' : 'sweep_trash', item.x, item.y);
        if (this.world.groundItems.length === 0) {
          this.world.triggerBlessingRain();
          this.showToast('🌸 Sân chùa đã sạch bóng lá rụng! Mưa Hoa Đại Cát ban phước lành!');
          this.earnMerit('clean_temple');
        }
        break;
      }
    }

    this.updateHotspotPrompt(this.world.hotspots);
  }

  // Không cho đi xuyên hồ sen, nhà cửa, gốc cây: đẩy ra mép gần nhất
  resolveCourtyardObstacles() {
    this.resolveObstacles([{ type: 'rect', left: 155, right: 430, top: 535, bottom: 810 }, ...(window.COURTYARD_OBSTACLES || [])]);
  }

  resolveZoneObstacles(zone) {
    this.resolveObstacles(zone.obstacles || []);
    // Hồ lớn: chỉ đi được trên bờ và trên bến gỗ
    if (zone.pond) {
      const p = this.player;
      const { x, y, r } = zone.pond;
      const pier = zone.pier;
      const onPier = p.x >= pier.left && p.x <= pier.right && p.y >= pier.top;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < r + 12 && !onPier) {
        const k = (r + 12) / Math.max(d, 0.01);
        p.x = x + (p.x - x) * k;
        p.y = y + (p.y - y) * k;
      }
    }
  }

  // Đẩy người chơi ra khỏi vật cản. Nếu đang tự đi tới một điểm thì trượt dọc theo vật cản để đi vòng qua
  resolveObstacles(obstacles) {
    const p = this.player;
    const target = p.walkTarget;
    for (const o of obstacles) {
      if (o.type === 'circle') {
        const d = Math.hypot(p.x - o.x, p.y - o.y);
        if (d < o.r) {
          const nx = d > 0.01 ? (p.x - o.x) / d : 1;
          const ny = d > 0.01 ? (p.y - o.y) / d : 0;
          p.x = o.x + nx * o.r;
          p.y = o.y + ny * o.r;
          if (target) {
            let tx = -ny;
            let ty = nx;
            if (tx * (target.x - p.x) + ty * (target.y - p.y) < 0) {
              tx = -tx;
              ty = -ty;
            }
            p.x += tx * p.speed;
            p.y += ty * p.speed;
          }
        }
      } else if (p.x > o.left && p.x < o.right && p.y > o.top && p.y < o.bottom) {
        const exits = [
          { d: p.x - o.left, x: o.left, y: p.y, side: 'x' },
          { d: o.right - p.x, x: o.right, y: p.y, side: 'x' },
          { d: p.y - o.top, x: p.x, y: o.top, side: 'y' },
          { d: o.bottom - p.y, x: p.x, y: o.bottom, side: 'y' }
        ];
        const nearest = exits.reduce((a, b) => (b.d < a.d ? b : a));
        p.x = nearest.x;
        p.y = nearest.y;
        if (target) {
          // Trượt dọc cạnh về phía góc gần đích hơn
          if (nearest.side === 'y') {
            const dir = Math.abs(target.x - p.x) > 2 ? Math.sign(target.x - p.x) : (p.x - o.left < o.right - p.x ? -1 : 1);
            p.x += dir * p.speed;
          } else {
            const dir = Math.abs(target.y - p.y) > 2 ? Math.sign(target.y - p.y) : (p.y - o.top < o.bottom - p.y ? -1 : 1);
            p.y += dir * p.speed;
          }
        }
      }
    }
  }

  updateHotspotPrompt(hotspots) {
    let nearest = null;
    let minD = Infinity;
    for (const hs of hotspots) {
      const d = Math.hypot(this.player.x - hs.x, this.player.y - hs.y);
      if (d <= hs.radius && d < minD) {
        minD = d;
        nearest = hs;
      }
    }
    this.activeHotspot = nearest;
    const promptEl = document.getElementById('hotspotPrompt');
    if (!promptEl) return;
    if (nearest) {
      if (promptEl.textContent !== nearest.actionLabel) promptEl.textContent = nearest.actionLabel;
      promptEl.classList.add('visible');
      promptEl.onclick = () => this.triggerHotspot(nearest);
    } else {
      promptEl.classList.remove('visible');
    }
  }

  gameLoop() {
    this.updatePlayerMovement();
    this.hallPractice.update();
    this.world.update();
    this.network.updateRemotePlayers();
    this.renderer.updateCamera(this.player.x, this.player.y);
    this.renderer.render(this.player, this.network.remotePlayers, this.activeHotspot);

    requestAnimationFrame(() => this.gameLoop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new TempleGame();
});
