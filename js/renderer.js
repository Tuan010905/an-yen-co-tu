// Bộ dựng hình 2D Top-Down Cozy "An Yên Cổ Tự" (HTML5 Canvas)

class TempleRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;

    this.camera = { x: 0, y: 0 };
    this.frameCount = 0;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  updateCamera(targetX, targetY) {
    const desiredX = targetX - this.canvas.width / 2;
    const desiredY = targetY - this.canvas.height / 2;

    const maxX = Math.max(0, this.world.width - this.canvas.width);
    const maxY = Math.max(0, this.world.height - this.canvas.height);

    const clampedX = Math.max(0, Math.min(maxX, desiredX));
    const clampedY = Math.max(0, Math.min(maxY, desiredY));

    this.camera.x += (clampedX - this.camera.x) * 0.12;
    this.camera.y += (clampedY - this.camera.y) * 0.12;
  }

  render(localPlayer, remotePlayers, activeHotspot) {
    this.frameCount++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 1. Nền cỏ xanh & Sân gạch Bát Tràng
    this.drawGround(ctx);

    // 2. Hồ Sen Phóng Sinh & Cá Koi & Đèn Hoa Đăng
    this.drawLotusPond(ctx);

    // 3. Các công trình kiến trúc Chùa Việt
    this.drawTamQuanGate(ctx);
    this.drawTeaPavilion(ctx);
    this.drawFortunePavilion(ctx);
    this.drawBellTower(ctx);
    this.drawMainSanctuary(ctx);
    this.drawBroomRack(ctx);

    // 4. Vòng tròn gợi ý tại các điểm tương tác (Hotspots)
    this.drawHotspotIndicators(ctx, activeHotspot);

    // 5. Lá đa rụng & Rác nhỏ trên sân chùa
    this.drawGroundItems(ctx);

    // 6. Sắp xếp chiều sâu (Y-Sorting) cho Nhân vật, Mèo, Đỉnh hương và Cây cổ thụ
    const renderables = [];

    // Đỉnh hương đồng
    renderables.push({
      y: 365,
      draw: () => this.drawIncenseBurner(ctx, 800, 355)
    });

    // Cây Bồ Đề Cổ Thụ giữa sân
    renderables.push({
      y: 555,
      draw: () => this.drawBodhiTree(ctx, 800, 540)
    });

    // Cây Nguyện Ước & Cầu Duyên
    renderables.push({
      y: 665,
      draw: () => this.drawWishingTree(ctx, 1270, 645)
    });

    // Mèo chùa
    for (const cat of this.world.cats) {
      renderables.push({
        y: cat.y,
        draw: () => this.drawCat(ctx, cat)
      });
    }

    // NPC Sư thầy & Đồng tu
    for (const npc of this.world.npcs) {
      renderables.push({
        y: npc.y,
        draw: () => this.drawCharacter(ctx, npc, false)
      });
    }

    // Người chơi Multiplayer khác
    for (const [, rp] of remotePlayers.entries()) {
      renderables.push({
        y: rp.y,
        draw: () => this.drawCharacter(ctx, rp, false)
      });
    }

    // Người chơi chính
    renderables.push({
      y: localPlayer.y,
      draw: () => this.drawCharacter(ctx, localPlayer, true)
    });

    renderables.sort((a, b) => a.y - b.y);
    for (const item of renderables) {
      item.draw();
    }

    // 7. Khói hương, lá rơi & chữ nổi (Particles)
    this.drawParticles(ctx);

    // 8. Ánh sáng Ngày / Hoàng Hôn / Đêm Hoa Đăng
    this.drawLighting(ctx, localPlayer);

    ctx.restore();
  }

  drawGround(ctx) {
    // Thảm cỏ xanh thanh bình quanh chùa
    const grassGrad = ctx.createLinearGradient(0, 0, 0, this.world.height);
    grassGrad.addColorStop(0, '#5a7d52');
    grassGrad.addColorStop(0.5, '#688f5e');
    grassGrad.addColorStop(1, '#527349');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, this.world.width, this.world.height);

    // Tường bao cổ kính rêu phong
    ctx.strokeStyle = '#6e6559';
    ctx.lineWidth = 16;
    ctx.strokeRect(60, 60, this.world.width - 120, this.world.height - 120);

    // Sân gạch đỏ Bát Tràng trung tâm (x: 480..1120, y: 310..880)
    ctx.fillStyle = '#b86b52';
    this.roundRect(ctx, 480, 310, 640, 570, 16, true, false);

    // Viền đá xanh quanh sân gạch
    ctx.strokeStyle = '#8c857b';
    ctx.lineWidth = 8;
    this.roundRect(ctx, 480, 310, 640, 570, 16, false, true);

    // Họa tiết ô gạch sân chùa
    ctx.strokeStyle = 'rgba(125, 58, 38, 0.26)';
    ctx.lineWidth = 1;
    for (let x = 510; x < 1120; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 314);
      ctx.lineTo(x, 876);
      ctx.stroke();
    }
    for (let y = 330; y < 880; y += 32) {
      ctx.beginPath();
      ctx.moveTo(484, y);
      ctx.lineTo(1116, y);
      ctx.stroke();
    }

    // Đường lát đá dẫn sang Đông (Lầu Xin Xăm & Cây Nguyện Ước) và Tây (Hồ Sen & Thủy Đình)
    ctx.fillStyle = '#a89f91';
    // Đường sang Đông
    this.roundRect(ctx, 1115, 345, 160, 54, 10, true, false);
    this.roundRect(ctx, 1115, 625, 160, 54, 10, true, false);
    this.roundRect(ctx, 1215, 355, 60, 310, 10, true, false);

    // Đường sang Tây (Thủy Đình & Hồ Sen)
    this.roundRect(ctx, 320, 345, 165, 54, 10, true, false);
    this.roundRect(ctx, 425, 635, 65, 54, 10, true, false);

    // Đường từ Cổng Tam Quan đi vào
    this.roundRect(ctx, 745, 875, 110, 165, 8, true, false);

    // Chiếu hoa sen chạm khắc bằng đá giữa sân chùa (800, 540)
    ctx.save();
    ctx.translate(800, 540);
    ctx.fillStyle = '#c9b99d';
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8f7d60';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Khóm trúc xanh quanh tường chùa
    const bambooClusters = [
      { x: 130, y: 150 }, { x: 190, y: 130 }, { x: 1410, y: 150 }, { x: 1460, y: 200 },
      { x: 1440, y: 840 }, { x: 1380, y: 890 }, { x: 150, y: 890 }, { x: 220, y: 920 },
      { x: 630, y: 930 }, { x: 970, y: 930 }
    ];
    for (const b of bambooClusters) {
      this.drawBambooBush(ctx, b.x, b.y);
    }
  }

  drawBambooBush(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân trúc
    ctx.strokeStyle = '#436e3b';
    ctx.lineWidth = 4;
    [-10, 0, 10].forEach((ox, i) => {
      ctx.beginPath();
      ctx.moveTo(ox, 10);
      ctx.lineTo(ox + (i - 1) * 4, -26);
      ctx.stroke();
    });

    // Tán lá trúc
    ctx.fillStyle = '#4e8745';
    ctx.beginPath();
    ctx.arc(0, -24, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#68a65e';
    ctx.beginPath();
    ctx.arc(-6, -28, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLotusPond(ctx) {
    // Hồ Sen Phóng Sinh (x: 155..445, y: 530..820)
    ctx.save();

    // Bờ đá quanh hồ
    ctx.fillStyle = '#878176';
    this.roundRect(ctx, 145, 520, 310, 310, 48, true, false);

    // Mặt nước xanh ngọc bích
    const waterGrad = ctx.createLinearGradient(155, 530, 445, 820);
    waterGrad.addColorStop(0, '#2a6f73');
    waterGrad.addColorStop(0.5, '#348aa7');
    waterGrad.addColorStop(1, '#1f565e');
    ctx.fillStyle = waterGrad;
    this.roundRect(ctx, 158, 533, 284, 284, 40, true, false);

    // Gợn sóng nước nhẹ
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    const waveOffset = Math.sin(this.frameCount * 0.03) * 6;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(240 + i * 32, 600 + (i % 3) * 65, 18 + waveOffset, 0, Math.PI);
      ctx.stroke();
    }

    // Đàn cá Koi bơi dưới hồ
    for (const fish of this.world.koiFish) {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);

      const wag = Math.sin(fish.tailPhase) * 0.3;
      // Đuôi cá
      ctx.fillStyle = fish.color;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-14, -5 + wag * 8);
      ctx.lineTo(-14, 5 + wag * 8);
      ctx.closePath();
      ctx.fill();

      // Thân cá
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đốm đỏ Kohaku
      ctx.fillStyle = fish.spotColor;
      ctx.beginPath();
      ctx.arc(2, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Thức ăn cá trên mặt nước
    for (const pellet of this.world.fishFoodPellet) {
      ctx.fillStyle = '#e8b968';
      ctx.beginPath();
      ctx.arc(pellet.x, pellet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lá sen và Hoa sen nở
    const lotuses = [
      { x: 210, y: 585, r: 20, hasFlower: true },
      { x: 245, y: 615, r: 15, hasFlower: false },
      { x: 375, y: 580, r: 22, hasFlower: true },
      { x: 350, y: 745, r: 21, hasFlower: true },
      { x: 225, y: 765, r: 17, hasFlower: false },
      { x: 295, y: 660, r: 19, hasFlower: true }
    ];

    for (const l of lotuses) {
      // Lá sen
      ctx.fillStyle = '#3f8554';
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0.2, Math.PI * 1.9);
      ctx.lineTo(l.x, l.y);
      ctx.closePath();
      ctx.fill();

      if (l.hasFlower) {
        // Hoa sen hồng
        ctx.fillStyle = '#f78fb3';
        for (let a = 0; a < 6; a++) {
          ctx.save();
          ctx.translate(l.x, l.y - 3);
          ctx.rotate((a * Math.PI) / 3);
          ctx.beginPath();
          ctx.ellipse(0, -6, 4, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(l.x, l.y - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Đèn Hoa Đăng lung linh trên hồ
    for (const lantern of this.world.lanterns) {
      const floatY = lantern.y + Math.sin(this.frameCount * 0.04 + lantern.x) * 2.5;
      ctx.save();
      ctx.translate(lantern.x, floatY);

      // Quầng sáng phản chiếu mặt nước
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, 'rgba(255, 225, 130, 0.75)');
      glow.addColorStop(1, 'rgba(255, 225, 130, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      // Đế đèn hoa sen
      ctx.fillStyle = lantern.color || '#ff7eb3';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Ngọn nến vàng giữa tâm
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(0, -1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cầu gỗ nhỏ bên hồ sen (x: 425..485, y: 635..690)
    ctx.fillStyle = '#8c5a36';
    this.roundRect(ctx, 420, 635, 68, 52, 6, true, false);
    ctx.strokeStyle = '#5c381e';
    ctx.lineWidth = 2;
    for (let x = 430; x < 485; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 636);
      ctx.lineTo(x, 686);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawMainSanctuary(ctx) {
    // Chính Điện Tam Bảo ở phía Bắc (x: 610..990, y: 95..285)
    ctx.save();

    // Bậc thềm đá Rồng Chầu
    ctx.fillStyle = '#9e9689';
    this.roundRect(ctx, 600, 120, 400, 185, 12, true, false);

    // Bậc tam cấp đi lên
    ctx.fillStyle = '#b5ada0';
    ctx.fillRect(730, 275, 140, 34);
    ctx.strokeStyle = '#7d7568';
    ctx.lineWidth = 2;
    ctx.strokeRect(730, 283, 140, 8);
    ctx.strokeRect(730, 295, 140, 8);

    // Nền gỗ Chính Điện
    ctx.fillStyle = '#734427';
    this.roundRect(ctx, 620, 130, 360, 150, 8, true, false);

    // Hậu cung và Tượng Phật Vàng tỏa hào quang bên trong
    const halo = ctx.createRadialGradient(800, 175, 8, 800, 175, 58);
    halo.addColorStop(0, 'rgba(255, 223, 110, 0.95)');
    halo.addColorStop(1, 'rgba(255, 223, 110, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(800, 175, 58, 0, Math.PI * 2);
    ctx.fill();

    // Tòa sen & Tượng Phật
    ctx.fillStyle = '#e88da2';
    ctx.beginPath();
    ctx.ellipse(800, 195, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(800, 180, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(800, 162, 9, 0, Math.PI * 2);
    ctx.fill();

    // Mái Đao Cong truyền thống (2 tầng mái ngói đỏ nâu)
    ctx.fillStyle = '#8f2d22';
    ctx.beginPath();
    ctx.moveTo(575, 155);
    ctx.quadraticCurveTo(800, 85, 1025, 155);
    ctx.lineTo(1005, 225);
    ctx.quadraticCurveTo(800, 195, 595, 225);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a338';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Bức hoành phi sơn son thếp vàng "AN YÊN CỔ TỰ"
    ctx.fillStyle = '#5c1912';
    this.roundRect(ctx, 715, 200, 170, 32, 6, true, false);
    ctx.strokeStyle = '#f0c44d';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 715, 200, 170, 32, 6, false, true);

    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 15px "Be Vietnam Pro", serif';
    ctx.textAlign = 'center';
    ctx.fillText('AN YÊN CỔ TỰ', 800, 221);

    // Hàng cột gỗ lim đỏ và Đèn lồng đỏ treo hiên chùa
    const pillars = [645, 715, 885, 955];
    for (const px of pillars) {
      ctx.fillStyle = '#8c2318';
      ctx.fillRect(px - 6, 225, 12, 55);
      // Đèn lồng
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(px, 236, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(px - 4, 225, 8, 3);
    }

    ctx.restore();
  }

  drawBellTower(ctx) {
    // Gác Đại Hồng Chung (530, 240)
    ctx.save();
    ctx.translate(530, 240);

    ctx.fillStyle = '#8c7f70';
    this.roundRect(ctx, -45, -35, 90, 85, 8, true, false);

    // Mái gác chuông
    ctx.fillStyle = '#7d281e';
    ctx.beginPath();
    ctx.moveTo(-58, -15);
    ctx.quadraticCurveTo(0, -55, 58, -15);
    ctx.lineTo(48, 8);
    ctx.lineTo(-48, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a338';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Quả chuông đồng lớn
    ctx.fillStyle = '#d49b35';
    ctx.beginPath();
    ctx.arc(0, 16, 14, Math.PI, 0);
    ctx.lineTo(17, 36);
    ctx.lineTo(-17, 36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Gác Chuông & Mõ', 0, -42);
    ctx.restore();
  }

  drawFortunePavilion(ctx) {
    // Lầu Xin Xăm & Giải Quẻ (1250, 340)
    ctx.save();
    ctx.translate(1250, 340);

    ctx.fillStyle = '#8a5a36';
    this.roundRect(ctx, -58, -42, 116, 88, 10, true, false);

    // Mái ngói Lầu Xin Xăm
    ctx.fillStyle = '#913225';
    ctx.beginPath();
    ctx.moveTo(-72, -20);
    ctx.quadraticCurveTo(0, -64, 72, -20);
    ctx.lineTo(62, 5);
    ctx.lineTo(-62, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e0b341';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bàn gỗ & Ống Xăm Tre
    ctx.fillStyle = '#ba8550';
    ctx.fillRect(-26, 10, 52, 24);
    ctx.fillStyle = '#d94848';
    ctx.fillRect(-7, 2, 14, 18); // Ống xăm đỏ

    ctx.fillStyle = '#fff3d1';
    ctx.font = 'bold 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎋 Lầu Xin Xăm', 0, -48);
    ctx.restore();
  }

  drawTeaPavilion(ctx) {
    // Hiên Trà Thủy Đình (320, 365)
    ctx.save();
    ctx.translate(320, 365);

    // Sàn gỗ lục giác / vuông
    ctx.fillStyle = '#7c5032';
    this.roundRect(ctx, -75, -55, 150, 110, 14, true, false);
    ctx.strokeStyle = '#52321b';
    ctx.lineWidth = 4;
    this.roundRect(ctx, -75, -55, 150, 110, 14, false, true);

    // 4 Đệm cói ngồi thưởng trà
    const seats = [
      { x: -45, y: -20 },
      { x: 45, y: -20 },
      { x: -45, y: 30 },
      { x: 45, y: 30 }
    ];
    for (const s of seats) {
      ctx.fillStyle = '#d9b978';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9e7d3b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Bàn trà gỗ giữa Thủy Đình + Ấm trà sen
    ctx.fillStyle = '#59341c';
    this.roundRect(ctx, -26, -16, 52, 36, 6, true, false);
    ctx.fillStyle = '#75b89f';
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff3d1';
    ctx.font = 'bold 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍵 Hiên Trà Tâm Giao', 0, -64);
    ctx.restore();
  }

  drawTamQuanGate(ctx) {
    // Cổng Tam Quan phía Nam (800, 940)
    ctx.save();
    ctx.translate(800, 940);

    // 4 Trụ biểu cổng Tam Quan
    const pillars = [-130, -52, 52, 130];
    for (const px of pillars) {
      ctx.fillStyle = '#8c8375';
      ctx.fillRect(px - 10, -35, 20, 75);
      ctx.fillStyle = '#d46548';
      ctx.fillRect(px - 6, -15, 12, 42); // Câu đối đỏ
    }

    // Mái cổng chính và 2 cổng phụ
    ctx.fillStyle = '#822b20';
    this.roundRect(ctx, -150, -52, 300, 26, 8, true, false);
    this.roundRect(ctx, -70, -72, 140, 28, 8, true, false);

    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 13px "Be Vietnam Pro", serif';
    ctx.textAlign = 'center';
    ctx.fillText('CỔNG TAM QUAN', 0, -54);
    ctx.restore();
  }

  drawBroomRack(ctx) {
    // Kệ Chổi Tre Công Quả & Thùng Rác Tre (1030, 350)
    ctx.save();
    ctx.translate(1030, 350);

    ctx.fillStyle = '#7a5230';
    this.roundRect(ctx, -28, -18, 56, 32, 6, true, false);

    // Những cây chổi tre dựng trên kệ
    for (let i = -14; i <= 14; i += 14) {
      ctx.strokeStyle = '#c9a259';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(i, -14);
      ctx.lineTo(i, 8);
      ctx.stroke();

      ctx.fillStyle = '#dfc17a';
      ctx.beginPath();
      ctx.arc(i, 10, 6, 0, Math.PI);
      ctx.fill();
    }

    // Sọt tre đựng rác bên cạnh
    ctx.fillStyle = '#b58d4b';
    this.roundRect(ctx, 36, -10, 24, 26, 5, true, false);

    ctx.fillStyle = '#fff3d1';
    ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧹 Kệ Chổi Công Quả', 10, -24);
    ctx.restore();
  }

  drawIncenseBurner(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Bóng đổ
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chân đỉnh đồng
    ctx.fillStyle = '#755c34';
    ctx.fillRect(-16, 4, 7, 14);
    ctx.fillRect(9, 4, 7, 14);

    // Bầu lư hương đồng chạm rồng
    ctx.fillStyle = '#9c7a44';
    this.roundRect(ctx, -24, -18, 48, 26, 10, true, false);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -24, -18, 48, 26, 10, false, true);

    // Các chân hương đỏ và đốm lửa hương đang cháy
    for (let i = -10; i <= 10; i += 5) {
      ctx.strokeStyle = '#c93b2b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(i, -16);
      ctx.lineTo(i * 1.1, -30);
      ctx.stroke();

      ctx.fillStyle = '#ff7b00';
      ctx.beginPath();
      ctx.arc(i * 1.1, -31, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawBodhiTree(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Bóng râm mát dưới gốc đa/bồ đề
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 78, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bồn đá quanh gốc cây
    ctx.fillStyle = '#877f72';
    ctx.beginPath();
    ctx.ellipse(0, 12, 42, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây cổ thụ và rễ phụ
    ctx.fillStyle = '#5c4028';
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.quadraticCurveTo(-12, -30, -24, -55);
    ctx.lineTo(24, -55);
    ctx.quadraticCurveTo(12, -30, 18, 12);
    ctx.closePath();
    ctx.fill();

    // Tán lá Bồ Đề xanh rợp kết hợp lá ánh vàng
    const sway = Math.sin(this.frameCount * 0.02) * 3;
    const clusters = [
      { x: 0, y: -88, r: 52, color: '#3b6e38' },
      { x: -45, y: -68, r: 42, color: '#498245' },
      { x: 45, y: -68, r: 42, color: '#498245' },
      { x: -24, y: -102, r: 38, color: '#5b9654' },
      { x: 26, y: -100, r: 38, color: '#5b9654' },
      { x: 0, y: -74, r: 40, color: '#6ead5c' }
    ];

    for (const c of clusters) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x + sway, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawWishingTree(ctx, x, y) {
    // Cây Nguyện Ước & Cầu Duyên (1270, 645) rực rỡ dải lụa đỏ
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 72, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bệ đá đỏ cầu duyên
    ctx.fillStyle = '#9e3b33';
    ctx.beginPath();
    ctx.ellipse(0, 12, 40, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây
    ctx.fillStyle = '#543924';
    ctx.fillRect(-14, -60, 28, 72);

    // Tán cây
    const sway = Math.sin(this.frameCount * 0.025 + 1) * 3;
    const clusters = [
      { x: 0, y: -85, r: 50, color: '#3e6b48' },
      { x: -42, y: -66, r: 38, color: '#4c8057' },
      { x: 42, y: -66, r: 38, color: '#4c8057' },
      { x: 0, y: -68, r: 42, color: '#5b9467' }
    ];
    for (const c of clusters) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x + sway, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dải lụa đỏ & Thẻ gỗ ước nguyện đung đưa trong gió
    const ribbons = [-44, -26, -8, 12, 28, 44];
    ribbons.forEach((rx, idx) => {
      const rSway = Math.sin(this.frameCount * 0.05 + idx) * 4;
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx + sway, -52);
      ctx.quadraticCurveTo(rx + rSway, -32, rx + rSway * 1.3, -16);
      ctx.stroke();

      // Thẻ gỗ vàng
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(rx - 3 + sway, -54, 6, 9);
    });

    ctx.fillStyle = '#fff3d1';
    ctx.font = 'bold 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🧧 Cây Nguyện Ước (${this.world.wishes.length} điều ước)`, 0, -142);

    ctx.restore();
  }

  drawHotspotIndicators(ctx, activeHotspot) {
    const pulse = 1 + Math.sin(this.frameCount * 0.06) * 0.08;
    for (const hs of this.world.hotspots) {
      const isSelected = activeHotspot && activeHotspot.id === hs.id;
      ctx.save();
      ctx.translate(hs.x, hs.y);
      ctx.strokeStyle = isSelected ? 'rgba(255, 217, 102, 0.85)' : 'rgba(255, 240, 200, 0.25)';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 12, 28 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawGroundItems(ctx) {
    for (const item of this.world.groundItems) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.scale(item.scale, item.scale);

      if (item.type === 'leaf') {
        // Lá Bồ Đề hình trái tim có đuôi nhọn màu vàng thu
        ctx.fillStyle = item.subType === 'bodhi_gold' ? '#e8b948' : '#d98236';
        ctx.beginPath();
        ctx.arc(-3, 0, 5, 0, Math.PI * 2);
        ctx.arc(3, 0, 5, 0, Math.PI * 2);
        ctx.moveTo(-7, 2);
        ctx.lineTo(0, 11);
        ctx.lineTo(7, 2);
        ctx.fill();
      } else {
        // Rác nhỏ (vỏ giấy hoặc chai nhựa) cần nhặt sạch
        if (item.subType === 'paper') {
          ctx.fillStyle = '#e6e1d6';
          ctx.beginPath();
          ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#8ecae6';
          ctx.fillRect(-4, -7, 8, 14);
          ctx.fillStyle = '#e63946';
          ctx.fillRect(-3, -10, 6, 3);
        }
      }
      ctx.restore();
    }
  }

  drawCat(ctx, cat) {
    ctx.save();
    ctx.translate(cat.x, cat.y);

    // Bóng mèo
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân mèo
    ctx.fillStyle = cat.color;
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đầu mèo & 2 tai nhọn
    ctx.beginPath();
    ctx.arc(7, -3, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cat.stripe;
    ctx.beginPath();
    ctx.moveTo(3, -8);
    ctx.lineTo(6, -13);
    ctx.lineTo(8, -8);
    ctx.moveTo(8, -8);
    ctx.lineTo(11, -13);
    ctx.lineTo(13, -7);
    ctx.fill();

    // Đuôi mèo ngoe nguẩy
    const tailSwing = Math.sin(this.frameCount * 0.08) * 4;
    ctx.strokeStyle = cat.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.quadraticCurveTo(-16, -5 + tailSwing, -13, -10);
    ctx.stroke();

    if (cat.moodText) {
      ctx.fillStyle = 'rgba(40, 30, 20, 0.78)';
      this.roundRect(ctx, -28, -32, 56, 16, 8, true, false);
      ctx.fillStyle = '#fff5d6';
      ctx.font = '10px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cat.moodText, 0, -21);
    }

    ctx.restore();
  }

  drawCharacter(ctx, char, isLocal, isPreview = false) {
    ctx.save();
    if (!isPreview) ctx.translate(char.x, char.y);

    const walkBob = char.isMoving ? Math.sin(this.frameCount * 0.22) * 3 : 0;
    const outfit = char.outfit || window.TEMPLE_DATA.outfits[0];
    const hair = char.hair || window.TEMPLE_DATA.hairs[0];

    // Vầng hào quang tâm tịnh dưới chân người chơi chính hoặc phụ kiện Hào Quang
    if (isLocal || char.accessory === 'hao_quang') {
      ctx.strokeStyle = char.accessory === 'hao_quang'
        ? 'rgba(255, 215, 90, 0.7)'
        : 'rgba(255, 235, 175, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 14, 18, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bóng nhân vật
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân áo (Áo Lam / Áo Dài / Pháp Phục)
    ctx.fillStyle = outfit.primary;
    this.roundRect(ctx, -11, -12 + walkBob, 22, 24, 7, true, false);

    // Cổ áo chữ V truyền thống & vạt áo
    ctx.strokeStyle = outfit.trim || '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -11 + walkBob);
    ctx.lineTo(0, -3 + walkBob);
    ctx.lineTo(5, -11 + walkBob);
    ctx.stroke();

    const hairColor = char.hairColor || hair.color || '#2c221e';

    // Đuôi tóc buộc nằm sau gáy, ngược hướng nhân vật đang nhìn
    if (hair.style === 'ponytail') {
      const back = -(char.dir || 1);
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(back * 11, -18 + walkBob, 4.5, 9, back * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Đầu nhân vật
    ctx.fillStyle = char.skin || '#ffdfc4';
    ctx.beginPath();
    ctx.arc(0, -22 + walkBob, 11, 0, Math.PI * 2);
    ctx.fill();

    // Tóc (trừ khi là Sư Thầy / Chú Tiểu đầu tròn)
    if (hair.style !== 'bald') {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -25 + walkBob, 11.5, Math.PI, 0);
      ctx.fill();

      if (hair.style === 'bun') {
        ctx.beginPath();
        ctx.arc(0, -37 + walkBob, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Trâm cài gỗ
        ctx.strokeStyle = '#c99b52';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9, -37 + walkBob);
        ctx.lineTo(9, -37 + walkBob);
        ctx.stroke();
      } else if (hair.style === 'long') {
        ctx.fillRect(-11, -25 + walkBob, 4, 16);
        ctx.fillRect(7, -25 + walkBob, 4, 16);
      }
    }

    // Khuôn mặt hiền hòa (Mắt & Má hồng)
    const eyeY = -21 + walkBob;
    if (char.eyes === 'cuoi' || char.eyes === 'lim_dim') {
      ctx.strokeStyle = '#36261b';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (const ex of [-4, 4]) {
        ctx.beginPath();
        if (char.eyes === 'cuoi') {
          ctx.arc(ex, eyeY + 1, 1.8, Math.PI * 1.15, Math.PI * 1.85);
        } else {
          ctx.moveTo(ex - 1.8, eyeY);
          ctx.lineTo(ex + 1.8, eyeY);
        }
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#36261b';
      ctx.beginPath();
      ctx.arc(-4, eyeY, 1.4, 0, Math.PI * 2);
      ctx.arc(4, eyeY, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(240, 120, 120, 0.28)';
    ctx.beginPath();
    ctx.arc(-6.5, eyeY + 3.5, 2, 0, Math.PI * 2);
    ctx.arc(6.5, eyeY + 3.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Kính mắt 2D
    if (char.glasses === 'tron' || char.glasses === 'vuong') {
      ctx.strokeStyle = char.glasses === 'tron' ? '#b8902e' : '#2a221d';
      ctx.lineWidth = 1.2;
      if (char.glasses === 'tron') {
        ctx.beginPath();
        ctx.arc(-4, eyeY, 3.2, 0, Math.PI * 2);
        ctx.moveTo(0.8, eyeY);
        ctx.arc(4, eyeY, 3.2, 0, Math.PI * 2);
        ctx.moveTo(-0.8, eyeY);
        ctx.lineTo(0.8, eyeY);
        ctx.stroke();
      } else {
        ctx.strokeRect(-7.5, eyeY - 2.6, 6.4, 5.2);
        ctx.strokeRect(1.1, eyeY - 2.6, 6.4, 5.2);
        ctx.beginPath();
        ctx.moveTo(-1.1, eyeY);
        ctx.lineTo(1.1, eyeY);
        ctx.stroke();
      }
    }

    // Râu 2D
    if (char.beard && char.beard !== 'none') {
      ctx.strokeStyle = hairColor;
      ctx.fillStyle = hairColor;
      if (char.beard === 'ria' || char.beard === 'quai_non') {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, eyeY + 4.5);
        ctx.quadraticCurveTo(0, eyeY + 3.5, 4, eyeY + 4.5);
        ctx.stroke();
      }
      if (char.beard === 'cam') {
        ctx.beginPath();
        ctx.arc(0, eyeY + 8.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (char.beard === 'quai_non') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -22 + walkBob, 10.5, 0.25, Math.PI - 0.25);
        ctx.stroke();
      }
    }

    // Phụ kiện đội đầu: Nón Lá
    if (char.accessory === 'non_la') {
      ctx.fillStyle = '#ebd399';
      ctx.beginPath();
      ctx.moveTo(-17, -28 + walkBob);
      ctx.lineTo(0, -43 + walkBob);
      ctx.lineTo(17, -28 + walkBob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#bfa065';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Phụ kiện cầm tay / đeo cổ
    if (char.accessory === 'trang_hat') {
      ctx.strokeStyle = '#6e4726';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -9 + walkBob, 6, 0, Math.PI);
      ctx.stroke();
    } else if (char.accessory === 'hoa_sen') {
      ctx.fillStyle = '#ff7eb3';
      ctx.beginPath();
      ctx.arc(-13, -3 + walkBob, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.accessory === 'long_den') {
      ctx.fillStyle = '#ff595e';
      ctx.beginPath();
      ctx.arc(-15, 0 + walkBob, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dụng cụ đang cầm: Chổi tre hoặc Túi thức ăn cá/mèo
    if (char.tool === 'broom') {
      const sweepSwing = char.isSweeping
        ? Math.sin(this.frameCount * 0.45) * 0.65
        : Math.sin(this.frameCount * 0.08) * 0.1;
      ctx.save();
      ctx.translate(12, -4 + walkBob);
      ctx.rotate(sweepSwing);
      ctx.strokeStyle = '#ba924c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(4, 14);
      ctx.stroke();

      ctx.fillStyle = '#dfc17a';
      ctx.beginPath();
      ctx.arc(4, 15, 7, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    } else if (char.tool === 'food') {
      ctx.fillStyle = '#e8b968';
      this.roundRect(ctx, 9, -4 + walkBob, 9, 10, 3, true, false);
    }

    if (isPreview) {
      ctx.restore();
      return;
    }

    // Bảng tên & Danh hiệu Phật Tử
    ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    const nameWidth = Math.max(ctx.measureText(char.name).width + 16, 68);

    ctx.fillStyle = isLocal ? 'rgba(42, 31, 22, 0.85)' : 'rgba(30, 30, 30, 0.68)';
    this.roundRect(ctx, -nameWidth / 2, -58 + walkBob, nameWidth, 18, 9, true, false);

    ctx.fillStyle = isLocal ? '#ffd966' : '#ffffff';
    ctx.fillText(char.name, 0, -45 + walkBob);

    if (char.title) {
      ctx.fillStyle = '#f2d0a4';
      ctx.font = '9.5px "Be Vietnam Pro", sans-serif';
      ctx.fillText(`« ${char.title} »`, 0, -63 + walkBob);
    }

    // Bong bóng lời nói / Cầu nguyện / Chào hỏi
    if (char.speech && char.speechTimer > 0) {
      ctx.font = '11.5px "Be Vietnam Pro", sans-serif';
      const bubbleW = Math.min(240, Math.max(90, ctx.measureText(char.speech).width + 22));
      ctx.fillStyle = 'rgba(255, 250, 238, 0.96)';
      this.roundRect(ctx, -bubbleW / 2, -96 + walkBob, bubbleW, 24, 10, true, false);
      ctx.strokeStyle = '#c99b52';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, -bubbleW / 2, -96 + walkBob, bubbleW, 24, 10, false, true);

      ctx.fillStyle = '#3d2817';
      ctx.fillText(char.speech, 0, -80 + walkBob);
    }

    ctx.restore();
  }

  // Vẽ nhân vật phóng to trong bảng tạo nhân vật (không có bảng tên / bong bóng lời nói)
  drawCharacterPreview(canvas, char) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.72);
    ctx.scale(3.6, 3.6);
    this.drawCharacter(ctx, { ...char, name: '', title: '', speech: '', isMoving: false, tool: 'none' }, false, true);
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const pt of this.world.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));

      if (pt.type === 'smoke') {
        ctx.fillStyle = '#e6dfd5';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'falling_leaf') {
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation + this.frameCount * 0.03);
        ctx.fillStyle = '#f2c14e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'lotus_petal') {
        ctx.translate(pt.x, pt.y);
        ctx.fillStyle = '#ff8fab';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'ripple') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (35 - pt.life) * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.type === 'floating_text') {
        ctx.font = 'bold 13px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = pt.color || '#ffd966';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 4;
        ctx.fillText(pt.text, pt.x, pt.y);
      }

      ctx.restore();
    }
  }

  drawLighting(ctx, localPlayer) {
    if (this.world.timeOfDay === 'day') {
      // Nắng ấm nhẹ xuyên qua tán cây
      const sunGrad = ctx.createRadialGradient(800, 350, 80, 800, 500, 750);
      sunGrad.addColorStop(0, 'rgba(255, 240, 180, 0.12)');
      sunGrad.addColorStop(1, 'rgba(255, 220, 140, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, this.world.width, this.world.height);
    } else if (this.world.timeOfDay === 'sunset') {
      ctx.fillStyle = 'rgba(215, 110, 55, 0.22)';
      ctx.fillRect(0, 0, this.world.width, this.world.height);
    } else if (this.world.timeOfDay === 'night') {
      // Đêm Hoa Đăng huyền ảo
      ctx.fillStyle = 'rgba(14, 22, 46, 0.54)';
      ctx.fillRect(0, 0, this.world.width, this.world.height);

      // Các nguồn sáng ấm áp trong đêm
      const lights = [
        { x: 800, y: 230, r: 190 }, // Chính điện
        { x: 800, y: 355, r: 110 }, // Đỉnh hương
        { x: 1270, y: 645, r: 150 }, // Cây nguyện ước
        { x: 1250, y: 340, r: 120 }, // Lầu xin xăm
        { x: 300, y: 660, r: 175 },  // Hồ hoa đăng
        { x: 320, y: 365, r: 120 },  // Thủy đình
        { x: localPlayer.x, y: localPlayer.y, r: 115 } // Người chơi
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
        g.addColorStop(0, 'rgba(255, 200, 105, 0.28)');
        g.addColorStop(1, 'rgba(255, 200, 105, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

window.TempleRenderer = TempleRenderer;
