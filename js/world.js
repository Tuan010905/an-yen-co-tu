// Thế giới 2D Top-Down "An Yên Cổ Tự" - Bản đồ, Khu vực tương tác, Lá đa rơi, Cá Koi, Mèo Chùa & NPC

class TempleWorld {
  constructor() {
    this.width = 1600;
    this.height = 1100;

    // Độ thanh tịnh chung của sân chùa (0 - 100%)
    this.cleanliness = 84;
    this.blessingRainTimer = 0; // Khi đạt 100% sẽ có Mưa Hoa Đại Cát

    // Thời gian trong chùa: 'day' (Ban ngày nắng ấm), 'sunset' (Hoàng hôn), 'night' (Đêm hoa đăng)
    this.timeOfDay = 'day';

    // Ngoại tuyến: tự sinh lá rụng. Khi có server: lá, điều ước, hoa đăng do server quản lý
    this.authoritative = true;

    // Các điểm tương tác chính (Hotspots)
    this.hotspots = [
      {
        id: 'chinh_dien',
        name: 'Chính Điện Tam Bảo',
        actionLabel: '🛕 Vào Chính Điện — Thiền & Tụng Kinh [E / Click]',
        x: 800,
        y: 255,
        radius: 95,
        type: 'enter_hall'
      },
      {
        id: 'dinh_huong',
        name: 'Đỉnh Hương Đồng Sân Chùa',
        actionLabel: '🪔 Dâng Nén Tâm Hương [Phím H / Click]',
        x: 800,
        y: 375,
        radius: 65,
        type: 'incense'
      },
      {
        id: 'gac_chuong',
        name: 'Gác Đại Hồng Chung',
        actionLabel: '🔔 Lên Gác Đại Hồng Chung [E / Click]',
        x: 530,
        y: 300,
        radius: 75,
        type: 'enter_space',
        space: 'gac_chuong'
      },
      {
        id: 'lau_xin_xam',
        name: 'Lầu Xin Xăm & Giải Quẻ',
        actionLabel: '🎋 Vào Lầu Xin Xăm [E / Click]',
        x: 1250,
        y: 395,
        radius: 85,
        type: 'enter_space',
        space: 'lau_xin_xam'
      },
      {
        id: 'cay_nguyen_uoc',
        name: 'Cây Nguyện Ước & Điện Cầu Duyên',
        actionLabel: '🧧 Đến Cây Nguyện Ước & Miếu Nguyệt Lão [E / Click]',
        x: 1270,
        y: 700,
        radius: 95,
        type: 'enter_space',
        space: 'cay_nguyen_uoc'
      },
      {
        id: 'ho_sen',
        name: 'Bến Hồ Sen & Hoa Đăng',
        actionLabel: '🪷 Ra Bến Hồ Sen [E / Click]',
        x: 465,
        y: 665,
        radius: 80,
        type: 'enter_space',
        space: 'ho_sen'
      },
      {
        id: 'thuy_dinh',
        name: 'Hiên Trà Thủy Đình',
        actionLabel: '🍵 Vào Hiên Trà Thủy Đình [E / Click]',
        x: 320,
        y: 420,
        radius: 85,
        type: 'enter_space',
        space: 'thuy_dinh'
      },
      {
        id: 'ke_choi',
        name: 'Kệ Chổi Tre Công Quả',
        actionLabel: '🧹 Lấy/Cất Chổi Tre Quét Chùa [Phím 2 / Click]',
        x: 1030,
        y: 350,
        radius: 65,
        type: 'broom_rack'
      }
    ];

    // Ghế đệm cói ở Hiên Trà Thủy Đình
    this.teaSeats = [
      { x: 275, y: 345 },
      { x: 365, y: 345 },
      { x: 275, y: 395 },
      { x: 365, y: 395 }
    ];

    // Danh sách lá đa vàng rơi trên sân và rác nhỏ cần dọn
    this.groundItems = [];
    this.initGroundItems();

    // Đàn cá Koi bơi trong Hồ Sen (x: 160..435, y: 540..810)
    this.koiFish = [];
    this.initKoiFish();

    // Thức ăn cá thả xuống nước
    this.fishFoodPellet = [];

    // Đèn hoa đăng đang trôi trên hồ
    this.lanterns = this.seedLanterns();

    // Lời ước nguyện trên Cây Nguyện Ước
    this.wishes = this.seedWishes();

    // Khói hương & hạt hiệu ứng (Particles)
    this.particles = [];

    // Mèo chùa dễ thương
    this.cats = [
      {
        id: 'cat_muop',
        name: 'Mèo Mướp Sân Chùa',
        color: '#e09f5a',
        stripe: '#8c5319',
        x: 690,
        y: 560,
        targetX: 690,
        targetY: 560,
        state: 'idle',
        timer: 120,
        moodText: ''
      },
      {
        id: 'cat_tam_the',
        name: 'Mèo Tam Thể',
        color: '#f5f0e6',
        stripe: '#d97b43',
        x: 920,
        y: 470,
        targetX: 920,
        targetY: 470,
        state: 'sleep',
        timer: 200,
        moodText: 'Zzz...'
      }
    ];

    // Các NPC Sư Thầy, Chú Tiểu và Phật Tử Đồng Tu
    this.npcs = [
      {
        id: 'su_thay',
        name: 'Sư Thầy Tuệ Tâm',
        title: 'Trụ Trì An Yên Cổ Tự',
        outfit: { primary: '#d4882a', secondary: '#9e5f12', trim: '#f5d799' },
        hair: { style: 'bald', color: '#222' },
        accessory: 'trang_hat',
        tool: 'none',
        x: 1185,
        y: 365,
        targetX: 1185,
        targetY: 365,
        dir: 1,
        isMoving: false,
        speech: 'A Di Đà Phật! Mời thí chủ ghé xin quẻ đầu ngày.',
        speechTimer: 320,
        patrolPoints: [
          { x: 1185, y: 365 },
          { x: 960, y: 410 },
          { x: 800, y: 420 },
          { x: 1185, y: 365 }
        ],
        patrolIndex: 0,
        waitTimer: 260
      },
      {
        id: 'chu_tieu',
        name: 'Chú Tiểu An Nhiên',
        title: 'Tiểu Sư Chăm Chùa',
        outfit: { primary: '#8d6748', secondary: '#5e422b', trim: '#d9c4b0' },
        hair: { style: 'bald', color: '#222' },
        accessory: 'none',
        tool: 'broom',
        x: 660,
        y: 630,
        targetX: 740,
        targetY: 650,
        dir: 1,
        isMoving: true,
        speech: 'Lá bồ đề rơi nhiều quá, quét sân thôi~',
        speechTimer: 240,
        patrolPoints: [
          { x: 660, y: 630 },
          { x: 780, y: 680 },
          { x: 910, y: 600 },
          { x: 730, y: 490 }
        ],
        patrolIndex: 1,
        waitTimer: 120
      },
      {
        id: 'dong_tu_1',
        name: 'Minh Anh',
        title: 'Tâm Sen Thanh Tịnh',
        outfit: window.TEMPLE_DATA.outfits[1],
        hair: window.TEMPLE_DATA.hairs[1],
        accessory: 'hoa_sen',
        tool: 'none',
        x: 830,
        y: 395,
        targetX: 830,
        targetY: 395,
        dir: -1,
        isMoving: false,
        speech: 'Nguyện cầu gia đình luôn bình an 🙏',
        speechTimer: 200,
        patrolPoints: [
          { x: 830, y: 395 },
          { x: 1210, y: 670 },
          { x: 510, y: 660 },
          { x: 365, y: 395 }
        ],
        patrolIndex: 0,
        waitTimer: 180
      },
      {
        id: 'dong_tu_2',
        name: 'Hoàng Nam',
        title: 'Phật Tử Chăm Chỉ',
        outfit: window.TEMPLE_DATA.outfits[0],
        hair: window.TEMPLE_DATA.hairs[0],
        accessory: 'trang_hat',
        tool: 'broom',
        x: 960,
        y: 560,
        targetX: 960,
        targetY: 560,
        dir: -1,
        isMoving: false,
        speech: 'Cùng quét chùa tích công đức nào!',
        speechTimer: 180,
        patrolPoints: [
          { x: 960, y: 560 },
          { x: 840, y: 740 },
          { x: 640, y: 540 },
          { x: 1220, y: 410 }
        ],
        patrolIndex: 0,
        waitTimer: 140
      }
    ];
  }

  initGroundItems() {
    this.groundItems = [];
    // Tạo 18 chiếc lá vàng và 5 món rác nhỏ quanh sân chùa
    for (let i = 0; i < 18; i++) {
      this.spawnGroundItem('leaf');
    }
    for (let i = 0; i < 5; i++) {
      this.spawnGroundItem('trash');
    }
  }

  spawnGroundItem(forcedType) {
    if (this.groundItems.length >= 34) return;
    const type = forcedType || (Math.random() < 0.78 ? 'leaf' : 'trash');

    // Khu vực sân chùa hợp lệ (tránh hồ nước và chính điện)
    let x = 540 + Math.random() * 620;
    let y = 410 + Math.random() * 440;

    this.groundItems.push({
      id: 'item_' + Math.random().toString(36).substring(2, 8),
      type,
      subType: type === 'leaf'
        ? (Math.random() < 0.65 ? 'bodhi_gold' : 'bodhi_amber')
        : (Math.random() < 0.5 ? 'paper' : 'bottle'),
      x,
      y,
      rotation: Math.random() * Math.PI * 2,
      scale: 0.85 + Math.random() * 0.35
    });
    this.recalculateCleanliness();
  }

  // Điều ước mẫu chỉ để trang trí, lượt chúc phúc của chúng không gửi lên server
  seedWishes() {
    return window.TEMPLE_DATA.defaultWishes.map(w => ({ ...w, seed: true }));
  }

  seedLanterns() {
    return window.TEMPLE_DATA.defaultLanterns.map(l => ({ ...l }));
  }

  applyServerState(state) {
    this.authoritative = false;
    this.groundItems = state.groundItems || [];
    this.wishes = [...(state.wishes || []), ...this.seedWishes()];
    this.lanterns = [...this.seedLanterns(), ...(state.lanterns || [])];
    this.recalculateCleanliness();
  }

  addGroundItem(item) {
    if (this.groundItems.some(i => i.id === item.id)) return;
    this.groundItems.push(item);
    this.recalculateCleanliness();
  }

  removeGroundItem(itemId) {
    const idx = this.groundItems.findIndex(i => i.id === itemId);
    if (idx === -1) return null;
    const [item] = this.groundItems.splice(idx, 1);
    this.recalculateCleanliness();
    return item;
  }

  addLantern(lantern) {
    this.lanterns.push(lantern);
    if (this.lanterns.length > 44) this.lanterns.shift();
  }

  recalculateCleanliness() {
    const count = this.groundItems.length;
    this.cleanliness = Math.max(40, Math.min(100, Math.round(100 - count * 1.6)));
  }

  initKoiFish() {
    const colors = ['#ff6b35', '#f7c548', '#ffffff', '#ff4d6d', '#ff9f1c', '#e8e8e8'];
    for (let i = 0; i < 9; i++) {
      this.koiFish.push({
        x: 200 + Math.random() * 210,
        y: 575 + Math.random() * 200,
        angle: Math.random() * Math.PI * 2,
        speed: 0.45 + Math.random() * 0.35,
        color: colors[i % colors.length],
        spotColor: i % 2 === 0 ? '#d9381e' : '#ff9f1c',
        tailPhase: Math.random() * 10
      });
    }
  }

  addParticle(p) {
    if (this.particles.length > 220) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  triggerBlessingRain() {
    this.blessingRainTimer = 420; // 7 giây mưa hoa sen & lá bồ đề vàng
  }

  update() {
    // 1. Khói hương tự nhiên bay lên từ Đỉnh Hương Đồng (800, 355)
    if (Math.random() < 0.45) {
      this.addParticle({
        type: 'smoke',
        x: 800 + (Math.random() - 0.5) * 18,
        y: 342,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.65 - Math.random() * 0.4,
        radius: 4 + Math.random() * 5,
        alpha: 0.55,
        life: 90
      });
    }

    // 2. Lá đa rơi lả tả từ Cây Bồ Đề Cổ Thụ (800, 540)
    if (Math.random() < 0.08) {
      this.addParticle({
        type: 'falling_leaf',
        x: 800 + (Math.random() - 0.5) * 190,
        y: 445 + (Math.random() - 0.5) * 60,
        vx: 0.3 + Math.random() * 0.35,
        vy: 0.55 + Math.random() * 0.35,
        rotation: Math.random() * 6,
        alpha: 0.95,
        life: 140
      });
    }

    // 3. Thỉnh thoảng sinh thêm lá rụng trên sân để người chơi quét
    if (this.authoritative && Math.random() < 0.004 && this.groundItems.length < 24) {
      this.spawnGroundItem('leaf');
    }

    // 4. Hiệu ứng Mưa Hoa Đại Cát khi độ thanh tịnh sân chùa cao
    if (this.blessingRainTimer > 0) {
      this.blessingRainTimer--;
      if (Math.random() < 0.6) {
        this.addParticle({
          type: 'lotus_petal',
          x: 350 + Math.random() * 900,
          y: 120 + Math.random() * 600,
          vx: (Math.random() - 0.3) * 0.6,
          vy: 0.8 + Math.random() * 0.5,
          alpha: 1,
          life: 120
        });
      }
    }

    // 5. Cập nhật Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx || 0;
      pt.y += pt.vy || 0;
      pt.life--;
      if (pt.type === 'smoke') {
        pt.radius += 0.08;
        pt.alpha = Math.max(0, (pt.life / 90) * 0.5);
      } else if (pt.type === 'floating_text') {
        pt.alpha = Math.min(1, pt.life / 40);
      } else {
        pt.alpha = Math.max(0, pt.life / 120);
      }
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 6. Cập nhật đàn cá Koi trong Hồ Sen
    for (const fish of this.koiFish) {
      fish.tailPhase += 0.18;

      // Nếu có viên thức ăn cá gần đó thì bơi tới đớp
      let targetPellet = null;
      let minDist = 140;
      for (const pellet of this.fishFoodPellet) {
        const d = Math.hypot(pellet.x - fish.x, pellet.y - fish.y);
        if (d < minDist) {
          minDist = d;
          targetPellet = pellet;
        }
      }

      if (targetPellet) {
        const desiredAngle = Math.atan2(targetPellet.y - fish.y, targetPellet.x - fish.x);
        fish.angle = desiredAngle;
        fish.x += Math.cos(fish.angle) * (fish.speed * 1.9);
        fish.y += Math.sin(fish.angle) * (fish.speed * 1.9);
        if (minDist < 10) {
          targetPellet.eaten = true;
          this.addParticle({
            type: 'ripple',
            x: targetPellet.x,
            y: targetPellet.y,
            radius: 3,
            alpha: 0.8,
            life: 35
          });
        }
      } else {
        if (Math.random() < 0.02) {
          fish.angle += (Math.random() - 0.5) * 1.1;
        }
        fish.x += Math.cos(fish.angle) * fish.speed;
        fish.y += Math.sin(fish.angle) * fish.speed;

        // Giữ cá trong phạm vi Hồ Sen (x: 185..415, y: 560..790)
        if (fish.x < 185 || fish.x > 415) {
          fish.angle = Math.PI - fish.angle;
          fish.x = Math.max(185, Math.min(415, fish.x));
        }
        if (fish.y < 560 || fish.y > 790) {
          fish.angle = -fish.angle;
          fish.y = Math.max(560, Math.min(790, fish.y));
        }
      }
    }
    this.fishFoodPellet = this.fishFoodPellet.filter(p => !p.eaten);

    // 7. Cập nhật Mèo Chùa
    for (const cat of this.cats) {
      cat.timer--;
      if (cat.timer <= 0) {
        const rand = Math.random();
        if (rand < 0.45) {
          cat.state = 'walk';
          cat.targetX = 630 + Math.random() * 340;
          cat.targetY = 450 + Math.random() * 240;
          cat.timer = 150 + Math.floor(Math.random() * 120);
          cat.moodText = '';
        } else if (rand < 0.75) {
          cat.state = 'idle';
          cat.timer = 140;
          cat.moodText = 'Meow~ 🐾';
        } else {
          cat.state = 'sleep';
          cat.timer = 220;
          cat.moodText = 'Zzz...';
        }
      }

      if (cat.state === 'walk') {
        const dx = cat.targetX - cat.x;
        const dy = cat.targetY - cat.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          cat.x += (dx / dist) * 0.75;
          cat.y += (dy / dist) * 0.75;
        } else {
          cat.state = 'idle';
        }
      }
    }

    // 8. Cập nhật NPC Sư Thầy, Chú Tiểu & Phật Tử Đồng Tu
    for (const npc of this.npcs) {
      if (npc.speechTimer > 0) npc.speechTimer--;

      const target = npc.patrolPoints[npc.patrolIndex];
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 4) {
        npc.isMoving = true;
        npc.dir = dx >= 0 ? 1 : -1;
        npc.x += (dx / dist) * 1.05;
        npc.y += (dy / dist) * 1.05;
      } else {
        npc.isMoving = false;
        npc.waitTimer--;
        if (npc.waitTimer <= 0) {
          npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
          npc.waitTimer = 180 + Math.floor(Math.random() * 160);

          if (npc.id === 'su_thay' && Math.random() < 0.7) {
            const quotes = window.TEMPLE_DATA.monkQuotes;
            npc.speech = quotes[Math.floor(Math.random() * quotes.length)];
            npc.speechTimer = 280;
          } else if (npc.tool === 'broom' && Math.random() < 0.5) {
            npc.speech = 'Quét sạch lá vàng, lòng thêm thanh thản 🍃';
            npc.speechTimer = 200;
          }
        }
      }
    }
  }
}

window.TempleWorld = TempleWorld;
