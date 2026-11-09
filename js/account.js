// Tài khoản người chơi: đăng ký, đăng nhập, đăng xuất, lưu hồ sơ nhân vật lên server
// Phiên đăng nhập nằm trong cookie HttpOnly nên JS không đọc được mật khẩu hay mã phiên

class TempleAccount {
  constructor() {
    this.tab = 'login';
    this.user = null;
    this.pendingResolve = null;
    this.bindAuthForm();
  }

  async request(path, body) {
    const options = body === undefined
      ? { method: 'GET' }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    const res = await fetch(path, { ...options, credentials: 'same-origin' });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {}
    return { status: res.status, data };
  }

  // 'user' khi đã đăng nhập, 'guest' khi server có nhưng chưa đăng nhập, 'offline' khi không có server
  async check() {
    if (window.location.protocol === 'file:') return { status: 'offline' };
    try {
      const { status, data } = await this.request('/api/me');
      if (status === 200) {
        this.user = data.user;
        return { status: 'user', user: data.user };
      }
      if (status === 401) return { status: 'guest' };
    } catch (e) {}
    return { status: 'offline' };
  }

  // Hiện màn đăng nhập và chờ tới khi người chơi đăng nhập / đăng ký xong
  waitForLogin() {
    const screen = document.getElementById('authScreen');
    screen.hidden = false;
    setTimeout(() => document.getElementById('authUsername').focus(), 50);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  switchTab(tab) {
    this.tab = tab;
    document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('authNameGroup').hidden = tab !== 'register';
    document.getElementById('authPassword').autocomplete = tab === 'login' ? 'current-password' : 'new-password';
    document.getElementById('authSubmit').textContent = tab === 'login' ? '🙏 Vào Chùa' : '🪷 Tạo Tài Khoản & Vào Chùa';
    document.getElementById('authError').textContent = '';
  }

  bindAuthForm() {
    const form = document.getElementById('authForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('authError');
      const submitBtn = document.getElementById('authSubmit');
      const username = document.getElementById('authUsername').value.trim().toLowerCase();
      const password = document.getElementById('authPassword').value;
      const name = document.getElementById('authName').value.trim();

      if (!username || !password) {
        errorEl.textContent = 'Hãy nhập tên đăng nhập và mật khẩu.';
        return;
      }

      errorEl.textContent = '';
      submitBtn.disabled = true;
      try {
        const isRegister = this.tab === 'register';
        const body = isRegister
          ? { username, password, name, appearance: this.localAppearance() }
          : { username, password };
        const { status, data } = await this.request(isRegister ? '/api/register' : '/api/login', body);
        if (status !== 200) {
          errorEl.textContent = data.error || 'Có lỗi xảy ra, bạn thử lại nhé.';
          return;
        }
        this.user = data.user;
        document.getElementById('authPassword').value = '';
        document.getElementById('authScreen').hidden = true;
        if (this.pendingResolve) {
          this.pendingResolve({ user: data.user, isNew: isRegister });
          this.pendingResolve = null;
        }
      } catch (err) {
        errorEl.textContent = 'Không kết nối được tới chùa, bạn kiểm tra mạng rồi thử lại.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Lần đầu tạo tài khoản: mang theo ngoại hình đã chọn khi chơi ngoại tuyến (không mang theo công đức)
  localAppearance() {
    try {
      const saved = JSON.parse(localStorage.getItem('an_yen_co_tu_profile') || '{}');
      return saved.appearance || undefined;
    } catch (e) {
      return undefined;
    }
  }

  async saveProfile(name, appearance) {
    const { status, data } = await this.request('/api/profile', { name, appearance });
    if (status !== 200) throw new Error(data.error || 'Không lưu được hồ sơ.');
    this.user = data.user;
    return data.user;
  }

  // Ảnh mặt hoạt hình 128px (đã xử lý trên máy). Ảnh gốc không bao giờ được gửi đi
  async uploadFace(dataUrl) {
    const { status, data } = await this.request('/api/face', { image: dataUrl });
    if (status !== 200) throw new Error(data.error || 'Không lưu được khuôn mặt.');
    this.user = data.user;
    return data.user;
  }

  async deleteFace() {
    const { status, data } = await this.request('/api/face/delete', {});
    if (status !== 200) throw new Error(data.error || 'Không xoá được khuôn mặt.');
    this.user = data.user;
    return data.user;
  }

  async logout() {
    try {
      await this.request('/api/logout', {});
    } catch (e) {}
    this.user = null;
  }
}

window.templeAccount = new TempleAccount();
