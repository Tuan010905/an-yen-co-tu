// Hệ thống Âm thanh Thiền & Hiệu ứng ASMR Chùa Việt (Web Audio API Synthesizer)

class ZenAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMusicPlaying = false;
    this.isRainPlaying = false;
    this.isChimesPlaying = false;
    this.isAutoMoPlaying = false;

    this.musicTimer = null;
    this.chimesTimer = null;
    this.autoMoTimer = null;
    this.rainNode = null;
    this.rainGain = null;

    // Thang âm Ngũ Cung (Cung - Thương - Giốc - Chủy - Vũ) ấm áp, thanh tịnh
    this.pentatonicScale = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99  // G5
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMasterVolume(val) {
    this.init();
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  // Tiếng Mõ Gỗ (Wooden Fish) trầm ấm
  playWoodenFish(pitchMultiplier = 1.0, volume = 1) {
    this.init();
    const now = this.ctx.currentTime;

    // Âm thân gỗ rỗng
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 320 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq * 1.25, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.025);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55 * volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    // Âm cộng hưởng hốc gỗ
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2.1, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.09);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.22 * volume, now + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.2);
    osc2.stop(now + 0.12);
  }

  // Tiếng Đại Hồng Chung / Chuông Chùa ngân vang
  playTempleBell(deep = true, volume = 1) {
    this.init();
    const now = this.ctx.currentTime;
    const base = deep ? 196.0 : 440.0; // G3 hoặc A4
    const ratios = [1, 1.5, 2.0, 2.42, 3.0, 3.85];
    const gains = [0.42, 0.22, 0.15, 0.1, 0.06, 0.03];
    const duration = deep ? 4.8 : 2.8;

    ratios.forEach((r, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * r, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(gains[idx] * volume, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration / (1 + idx * 0.35));

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Chuông gia trì (chuông bát): tiếng ngân dài, hơi rung do hai tần số lệch nhau
  playSingingBowl(volume = 1) {
    this.init();
    const now = this.ctx.currentTime;
    const partials = [
      { f: 293.0, g: 0.32, d: 9 },
      { f: 295.2, g: 0.22, d: 9 },
      { f: 806.0, g: 0.12, d: 6 },
      { f: 1520.0, g: 0.05, d: 3.5 },
      { f: 2402.0, g: 0.025, d: 2 }
    ];
    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(p.g * volume, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.d);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + p.d + 0.1);
    }
  }

  // Âm nền trầm ấm trong Chính Điện
  startHallAmbience() {
    this.init();
    if (this.hallNodes) return;
    const now = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(0.05, now + 3);
    out.connect(this.masterGain);
    const oscs = [110, 164.8, 220.4].map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = [0.6, 0.35, 0.15][i];
      osc.connect(g);
      g.connect(out);
      osc.start();
      return osc;
    });
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(out.gain);
    lfo.start();
    this.hallNodes = { out, oscs, lfo };
  }

  stopHallAmbience() {
    if (!this.hallNodes) return;
    const { out, oscs, lfo } = this.hallNodes;
    const now = this.ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0.0001, now + 1.5);
    [...oscs, lfo].forEach(o => o.stop(now + 1.6));
    this.hallNodes = null;
  }

  // Tiếng Chổi Tre Quét Lá ASMR
  playSweepSound() {
    this.init();
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.24;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.linearRampToValueAtTime(1600, now + 0.22);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  // Tiếng Lắc Ống Xăm Tre
  playBambooShake() {
    this.init();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playWoodenFish(1.55 + Math.random() * 0.35);
      }, i * 110);
    }
  }

  // Tiếng Đàn Tranh gảy nhẹ 1 nốt
  playZitherNote(freq, volume = 0.16) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  // Bật / Tắt Nhạc Phật Thiền Định (Đàn Tranh & Chuông Xoay Ngũ Cung)
  toggleZenMusic(forceState) {
    this.init();
    this.isMusicPlaying = forceState !== undefined ? forceState : !this.isMusicPlaying;

    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.isMusicPlaying) {
      let step = 0;
      const playPhrase = () => {
        if (!this.isMusicPlaying) return;
        const note = this.pentatonicScale[Math.floor(Math.random() * this.pentatonicScale.length)];
        this.playZitherNote(note, 0.14);

        // Đôi khi gảy thêm nốt hòa âm quãng 5 hoặc quãng 8
        if (Math.random() > 0.45) {
          setTimeout(() => {
            if (!this.isMusicPlaying) return;
            const secondNote = this.pentatonicScale[Math.floor(Math.random() * this.pentatonicScale.length)];
            this.playZitherNote(secondNote, 0.1);
          }, 380);
        }

        // Mỗi 8 nhịp điểm 1 tiếng chuông xoay nhẹ
        step++;
        if (step % 8 === 0) {
          this.playTempleBell(false);
        }
      };

      playPhrase();
      this.musicTimer = setInterval(playPhrase, 1450);
    }

    return this.isMusicPlaying;
  }

  // Bật / Tắt Tiếng Mưa Rơi Hiên Chùa
  toggleRain(forceState) {
    this.init();
    this.isRainPlaying = forceState !== undefined ? forceState : !this.isRainPlaying;

    if (this.rainNode) {
      try { this.rainNode.stop(); } catch (e) {}
      this.rainNode = null;
    }

    if (this.isRainPlaying) {
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.025;
        b6 = white * 0.115926;
      }

      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = buffer;
      this.rainNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 950;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0.32;

      this.rainNode.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      this.rainNode.start();
    }

    return this.isRainPlaying;
  }

  // Bật / Tắt Tiếng Chuông Gió Hiên Chùa
  toggleWindChimes(forceState) {
    this.init();
    this.isChimesPlaying = forceState !== undefined ? forceState : !this.isChimesPlaying;

    if (this.chimesTimer) {
      clearInterval(this.chimesTimer);
      this.chimesTimer = null;
    }

    if (this.isChimesPlaying) {
      const highNotes = [1046.5, 1174.66, 1318.5, 1567.98, 1760.0];
      const ringChime = () => {
        if (!this.isChimesPlaying) return;
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            if (!this.isChimesPlaying) return;
            const freq = highNotes[Math.floor(Math.random() * highNotes.length)];
            this.playZitherNote(freq, 0.06);
          }, i * 160);
        }
      };
      ringChime();
      this.chimesTimer = setInterval(ringChime, 2800);
    }

    return this.isChimesPlaying;
  }

  // Bật / Tắt Gõ Mõ Tự Động (Auto Mõ Tịnh Tâm)
  toggleAutoMo(forceState, onTapCallback) {
    this.init();
    this.isAutoMoPlaying = forceState !== undefined ? forceState : !this.isAutoMoPlaying;

    if (this.autoMoTimer) {
      clearInterval(this.autoMoTimer);
      this.autoMoTimer = null;
    }

    if (this.isAutoMoPlaying) {
      this.autoMoTimer = setInterval(() => {
        if (!this.isAutoMoPlaying) return;
        this.playWoodenFish(1.0);
        if (onTapCallback) onTapCallback();
      }, 1100);
    }

    return this.isAutoMoPlaying;
  }
}

window.zenAudio = new ZenAudioEngine();
