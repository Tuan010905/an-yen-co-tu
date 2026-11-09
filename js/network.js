// Hệ thống Đồng bộ Multiplayer Thời gian thực
// - Có server (python3 server.py): người chơi đăng nhập, server giữ trạng thái chung của phòng,
//   client nhận qua SSE và gửi hành động qua REST
// - Mở trực tiếp file / không kết nối được server: chế độ ngoại tuyến, đồng bộ giữa các tab bằng BroadcastChannel

const LOCAL_FALLBACK_DELAY = 3000;
const PLAYER_KEEPALIVE_MS = 2000;
const REMOTE_PLAYER_TIMEOUT_MS = 15000;

class TempleMultiplayerNetwork {
  constructor() {
    this.room = this.readRoomName();
    this.clientId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.token = null;
    this.mode = 'connecting'; // 'connecting' | 'server' | 'reconnecting' | 'local'
    this.remotePlayers = new Map();
    this.channel = null;
    this.eventSource = null;
    this.lastPlayerPayload = '';
    this.lastPlayerSentAt = 0;

    this.onWelcomeCallback = null;
    this.onMeritCallback = null;
    this.onMoTapCallback = null;
    this.onChatCallback = null;
    this.onWorldEventCallback = null;
    this.onWishAddedCallback = null;
    this.onLanternAddedCallback = null;
  }

  // Gọi sau khi game đã gắn xong các callback (và đã đăng nhập), để không bỏ lỡ gói "welcome" đầu tiên
  connect({ offline = false } = {}) {
    if (offline || window.location.protocol === 'file:') {
      this.startLocalMode();
    } else {
      this.initServerConnection();
      setTimeout(() => {
        if (this.mode === 'connecting') this.startLocalMode();
      }, LOCAL_FALLBACK_DELAY);
    }
  }

  get serverConnected() {
    return this.mode === 'server';
  }

  readRoomName() {
    const raw = new URLSearchParams(window.location.search).get('room') || '';
    const name = raw.toLowerCase();
    return /^[a-z0-9-]{1,24}$/.test(name) ? name : 'an-yen';
  }

  startLocalMode() {
    this.mode = 'local';
    if (!this.channel && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('an_yen_co_tu_multiplayer');
      this.channel.onmessage = (event) => {
        if (this.mode === 'local') this.handleIncomingPacket(event.data);
      };
    }
  }

  initServerConnection() {
    const params = new URLSearchParams({ room: this.room });
    this.eventSource = new EventSource('/api/stream?' + params.toString());
    this.eventSource.onmessage = (e) => {
      try {
        this.handleIncomingPacket(JSON.parse(e.data));
      } catch (err) {}
    };
    this.eventSource.onerror = () => {
      // EventSource tự kết nối lại; khi có "welcome" mới sẽ đồng bộ lại toàn bộ
      if (this.mode === 'server') {
        this.mode = 'reconnecting';
        this.token = null;
      }
    };
  }

  reconnect() {
    if (this.mode !== 'server') return;
    this.mode = 'reconnecting';
    this.token = null;
    if (this.eventSource) this.eventSource.close();
    this.initServerConnection();
  }

  handleWelcome(packet) {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.mode = 'server';
    this.clientId = packet.clientId;
    this.token = packet.token;
    this.room = packet.room;
    this.lastPlayerPayload = '';

    this.remotePlayers.clear();
    for (const p of packet.players || []) {
      this.upsertRemotePlayer(p, true);
    }
    if (this.onWelcomeCallback) this.onWelcomeCallback(packet);
  }

  handleIncomingPacket(packet) {
    if (!packet || (packet.senderId && packet.senderId === this.clientId)) return;

    switch (packet.type) {
      case 'welcome':
        this.handleWelcome(packet);
        break;

      case 'auth_required':
        // Phiên đăng nhập đã hết hạn hoặc bị đăng xuất ở tab khác: tải lại để hiện màn đăng nhập
        this.eventSource.close();
        window.location.reload();
        break;

      case 'merit':
        if (this.onMeritCallback) this.onMeritCallback(packet);
        break;

      case 'mo_tap':
        if (this.onMoTapCallback) this.onMoTapCallback(packet);
        break;

      case 'room_full': {
        this.eventSource.close();
        const url = new URL(window.location.href);
        url.searchParams.set('room', packet.suggest);
        window.location.replace(url.toString());
        break;
      }

      case 'player_state':
        this.upsertRemotePlayer(packet.player, false);
        break;

      case 'player_left':
        this.remotePlayers.delete(packet.senderId);
        break;

      case 'chat': {
        const p = this.remotePlayers.get(packet.senderId);
        if (p) {
          p.speech = packet.text;
          p.speechTimer = 260;
        }
        if (this.onChatCallback) {
          this.onChatCallback(packet.author, packet.title, packet.text, packet.isEmote);
        }
        break;
      }

      case 'item_removed':
      case 'item_spawned':
      case 'blessing_rain':
      case 'incense_lit':
      case 'wish_blessed':
        if (this.onWorldEventCallback) this.onWorldEventCallback(packet);
        break;

      case 'new_wish':
        if (this.onWishAddedCallback) this.onWishAddedCallback(packet.wish);
        break;

      case 'new_lantern':
        if (this.onLanternAddedCallback) this.onLanternAddedCallback(packet.lantern);
        break;
    }
  }

  upsertRemotePlayer(p, snapToPosition) {
    if (!p || !p.id) return;
    const existing = this.remotePlayers.get(p.id) || { id: p.id, x: p.x, y: p.y };
    if (snapToPosition) {
      existing.x = p.x;
      existing.y = p.y;
    }
    existing.name = p.name;
    existing.title = p.title;
    Object.assign(existing, window.TEMPLE_DATA.resolveAppearance({
      outfitId: p.outfitId,
      hairId: p.hairId,
      hairColorId: p.hairColorId,
      skinId: p.skinId,
      eyesId: p.eyesId,
      faceShape: p.faceShape,
      glasses: p.glasses,
      eyeSize: p.eyeSize,
      mouth: p.mouth,
      nose: p.nose,
      beard: p.beard,
      faceId: p.faceId,
      skinColor: p.skinColor,
      hairColor: p.hairColor,
      accessory: p.accessory
    }));
    existing.space = p.space || 'san_chua';
    if (existing.activity !== p.activity) existing.activityStart = Date.now();
    existing.activity = p.activity || '';
    existing.tool = p.tool;
    existing.targetX = p.x;
    existing.targetY = p.y;
    existing.dir = p.dir;
    existing.isSitting = p.isSitting;
    existing.speech = p.speech;
    existing.speechTimer = p.speech ? 220 : 0;
    existing.lastSeen = Date.now();
    existing.isHuman = true;
    this.remotePlayers.set(p.id, existing);
  }

  broadcast(packet) {
    if (this.mode === 'server' && this.token) {
      fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...packet, token: this.token })
      }).then((res) => {
        // Server đã khởi động lại hoặc phiên hết hạn: kết nối lại để nhận phiên mới
        if (res.status === 403) this.reconnect();
      }).catch(() => {});
    } else if (this.mode === 'local' && this.channel) {
      this.channel.postMessage({ ...packet, senderId: this.clientId });
    }
  }

  // Chỉ gửi khi trạng thái thay đổi, hoặc định kỳ để người khác biết mình vẫn còn trong chùa.
  // Có server thì tên, danh hiệu, ngoại hình được server lấy từ tài khoản; gửi kèm để chế độ ngoại tuyến dùng
  sendPlayerState(player) {
    // Ảnh mặt chỉ có trên máy (faceLocal) rất nặng, không gửi kèm mỗi gói vị trí
    const { faceLocal, ...appearance } = player.appearance;
    void faceLocal;
    const state = {
      id: this.clientId,
      name: player.name,
      title: player.title,
      ...appearance,
      tool: player.tool,
      x: Math.round(player.x),
      y: Math.round(player.y),
      dir: player.dir,
      isMoving: player.isMoving,
      isSitting: player.isSitting,
      space: player.space,
      activity: player.activity,
      speech: player.speechTimer > 0 ? player.speech : ''
    };
    const payload = JSON.stringify(state);
    const now = Date.now();
    if (payload === this.lastPlayerPayload && now - this.lastPlayerSentAt < PLAYER_KEEPALIVE_MS) return;
    this.lastPlayerPayload = payload;
    this.lastPlayerSentAt = now;
    this.broadcast({ type: 'player_state', player: state });
  }

  sendChat(author, title, text, isEmote = false) {
    this.broadcast({ type: 'chat', author, title, text, isEmote });
  }

  sendMoTap(bell) {
    this.broadcast({ type: 'mo_tap', bell: !!bell });
  }

  sendEarn(reason) {
    this.broadcast({ type: 'earn', reason });
  }

  sendCleanItem(itemId, x, y) {
    this.broadcast({ type: 'clean_item', itemId, x: Math.round(x), y: Math.round(y) });
  }

  sendIncense(author, wish) {
    this.broadcast({ type: 'incense_lit', author, wish });
  }

  sendWish(wish) {
    this.broadcast({ type: 'new_wish', wish });
  }

  sendBlessWish(wishId) {
    this.broadcast({ type: 'bless_wish', wishId });
  }

  sendLantern(lantern) {
    this.broadcast({ type: 'new_lantern', lantern });
  }

  // Làm mượt chuyển động người chơi khác & xóa kết nối quá hạn
  updateRemotePlayers() {
    const now = Date.now();
    for (const [id, p] of this.remotePlayers.entries()) {
      if (now - p.lastSeen > REMOTE_PLAYER_TIMEOUT_MS) {
        this.remotePlayers.delete(id);
        continue;
      }
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      p.x += dx * 0.22;
      p.y += dy * 0.22;
      p.isMoving = Math.hypot(dx, dy) > 1.5;
      if (p.speechTimer > 0) p.speechTimer--;
    }
  }
}

window.templeNetwork = new TempleMultiplayerNetwork();
