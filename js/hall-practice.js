// Thực hành trong Chính Điện: ngồi thiền theo hơi thở, gõ mõ tụng kinh theo từng chữ, niệm Phật 108 biến,
// thỉnh chuông gia trì và đảnh lễ. Người khác trong điện thấy tư thế và nghe tiếng mõ của mình.

const BREATH_CYCLE = [
  { name: 'Hít vào…', seconds: 4, from: 0.62, to: 1 },
  { name: 'Lắng yên…', seconds: 1.5, from: 1, to: 1 },
  { name: 'Thở ra…', seconds: 5.5, from: 1, to: 0.62 }
];

class HallPractice {
  constructor(game) {
    this.game = game;
    this.mode = ''; // '' | 'thien' | 'kinh'
    this.sutra = null;
    this.lang = 'vi'; // 'vi' (Gõ Tiếng Việt + dịch Anh) | 'en' (Gõ Tiếng Anh + dịch Việt)
    this.autoSpeak = false;
    this.currentEnglishWord = '';
    this.tokens = [];
    this.paras = [];
    this.cursor = 0;
    this.repeatDone = 0;
    this.autoTimer = null;
    this.tempo = 72;
    this.meditation = null;
    this.bowTimer = null;
    this.bindUI();
  }

  get player() {
    return this.game.player;
  }

  bindUI() {
    document.querySelectorAll('[data-hall]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleAction(btn.dataset.hall));
    });
    document.querySelectorAll('[data-sutra-lang]').forEach((btn) => {
      btn.addEventListener('click', () => this.setLanguage(btn.dataset.sutraLang));
    });
    document.querySelectorAll('[data-med-minutes]').forEach((btn) => {
      btn.addEventListener('click', () => this.startMeditation(Number(btn.dataset.medMinutes)));
    });
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.cachedEnVoice = null;
      });
    }
    this.bindTyping();
    const tempo = document.getElementById('sutraTempo');
    if (tempo) {
      tempo.addEventListener('input', () => {
        this.tempo = Number(tempo.value);
        document.getElementById('sutraTempoLabel').textContent = `${this.tempo} nhịp/phút`;
        if (this.autoTimer) this.startAuto();
      });
    }
  }

  // ---------------- Vào / ra điện ----------------

  show() {
    document.getElementById('hallPanel').hidden = false;
    this.updateStatus();
  }

  hide() {
    this.stopAll();
    document.getElementById('hallPanel').hidden = true;
  }

  handleAction(action) {
    switch (action) {
      case 'meditate': return this.requireSeat(() => this.openMeditationSetup());
      case 'chant': return this.requireSeat(() => this.openSutra('tam_kinh'));
      case 'tu_bi': return this.requireSeat(() => this.openSutra('tu_bi'));
      case 'ke_chuong': return this.requireSeat(() => this.openSutra('ke_chuong'));
      case 'niem_phat': return this.requireSeat(() => this.openSutra('niem_phat'));
      case 'bell': return this.ringBell();
      case 'bow': return this.bow();
      case 'stand': return this.stand();
      case 'leave': return this.game.leaveHall();
      case 'tap': return this.tap();
      case 'auto': return this.toggleAuto();
      case 'toggle-speak': return this.toggleAutoSpeak();
      case 'speak-word': return this.speakCurrentWord();
      case 'speak-line': return this.speakCurrentLine();
      case 'close-sutra': return this.closeSutra();
      case 'end-meditation': return this.endMeditation(false);
      case 'close-med-setup': return this.closeMeditationSetup();
    }
  }

  updateStatus(text) {
    const el = document.getElementById('hallStatus');
    if (!el) return;
    if (text) {
      el.textContent = text;
      return;
    }
    const sitting = this.player.isSitting;
    const others = [...this.game.network.remotePlayers.values()].filter(p => p.space === 'chinh_dien');
    const chanting = others.filter(p => p.activity === 'tung_kinh' || p.activity === 'niem_phat').length;
    const meditating = others.filter(p => p.activity === 'thien').length;
    const parts = [];
    if (!sitting) parts.push('Bấm vào một bồ đoàn để ngồi xuống');
    else if (this.mode === 'thien') parts.push('Đang tĩnh tọa');
    else if (this.mode === 'kinh') parts.push('Đang tụng kinh — gõ từng chữ đang sáng, mỗi chữ đúng là một tiếng mõ');
    else parts.push('Đã an tọa trên bồ đoàn');
    if (this.congPhu) parts.push('🔔 Đang thời công phu — Sư Thầy dẫn chúng tụng kinh');
    if (meditating) parts.push(`${meditating} người đang thiền`);
    if (chanting) parts.push(`${chanting} người đang tụng kinh`);
    el.textContent = parts.join(' • ');
    document.querySelectorAll('[data-hall="stand"]').forEach(b => { b.hidden = !sitting; });
  }

  // ---------------- Ngồi bồ đoàn ----------------

  seatOccupied(seat) {
    for (const p of this.game.network.remotePlayers.values()) {
      if (p.space === 'chinh_dien' && p.isSitting && Math.hypot(p.targetX - seat.x, p.targetY - seat.y) < 24) return true;
    }
    return false;
  }

  nearestFreeSeat() {
    const seats = window.TEMPLE_DATA.hall.cushions.filter(s => !this.seatOccupied(s));
    seats.sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
    return seats[0] || null;
  }

  goSit(seatId, then) {
    const seat = window.TEMPLE_DATA.hall.cushions.find(s => s.id === seatId);
    if (!seat) return;
    if (this.seatOccupied(seat)) {
      this.game.showToast('Bồ đoàn này đã có người ngồi, bạn chọn chỗ khác nhé 🙏');
      return;
    }
    this.stopAll();
    this.player.isSitting = false;
    this.game.walkTo(seat.x, seat.y, () => this.sitAt(seat, then));
  }

  sitAt(seat, then) {
    this.player.x = seat.x;
    this.player.y = seat.y;
    this.player.isSitting = true;
    this.player.seatId = seat.id;
    this.setActivity('');
    // Hạ camera ra sau lưng, nhìn thẳng lên bàn thờ
    const cam = this.game.renderer.cam;
    if (cam) {
      cam.yaw = 0;
      cam.pitch = 0.2;
      cam.dist = 6.5;
    }
    this.game.audio.playZitherNote(392, 0.12);
    this.updateStatus();
    if (then) then();
  }

  requireSeat(then) {
    if (this.player.isSitting) {
      then();
      return;
    }
    const seat = this.nearestFreeSeat();
    if (!seat) {
      this.game.showToast('Các bồ đoàn đều đã kín chỗ, bạn chờ một chút nhé 🙏');
      return;
    }
    this.goSit(seat.id, then);
  }

  stand() {
    this.stopAll();
    this.player.isSitting = false;
    this.player.seatId = null;
    this.player.y += 30;
    this.updateStatus();
  }

  setActivity(activity) {
    this.player.activity = activity;
    this.player.activityStart = Date.now();
  }

  stopAll() {
    this.closeSutra();
    this.closeMeditationSetup();
    if (this.meditation) this.endMeditation(false);
    if (this.bowTimer) {
      clearTimeout(this.bowTimer);
      this.bowTimer = null;
    }
    this.setActivity('');
  }

  // Người chơi tự đi lại khi đang ngồi: đứng dậy và dừng mọi việc đang làm
  onPlayerMoved() {
    if (this.mode || this.player.activity) this.stopAll();
    this.player.seatId = null;
    this.updateStatus();
  }

  // ---------------- Ngồi thiền ----------------

  openMeditationSetup() {
    this.closeSutra();
    document.getElementById('meditationOverlay').hidden = false;
    document.getElementById('medSetup').hidden = false;
    document.getElementById('medSession').hidden = true;
  }

  closeMeditationSetup() {
    if (this.meditation) return;
    const overlay = document.getElementById('meditationOverlay');
    if (overlay) overlay.hidden = true;
  }

  startMeditation(minutes) {
    this.mode = 'thien';
    this.setActivity('thien');
    this.meditation = { total: minutes * 60, start: performance.now(), minutes };
    document.getElementById('medSetup').hidden = true;
    document.getElementById('medSession').hidden = false;
    document.body.classList.add('is-meditating');
    this.game.audio.playSingingBowl(0.9);
    this.updateStatus();
  }

  endMeditation(completed) {
    if (!this.meditation) return;
    const { minutes } = this.meditation;
    this.meditation = null;
    this.mode = '';
    this.setActivity('');
    document.getElementById('meditationOverlay').hidden = true;
    document.body.classList.remove('is-meditating');
    if (completed) {
      this.game.audio.playSingingBowl(1);
      setTimeout(() => this.game.audio.playSingingBowl(0.8), 2600);
      this.game.earnMerit('meditation');
      this.game.showToast(`🧘 Bạn đã tĩnh tọa trọn ${minutes} phút. Tâm an, thân nhẹ. A Di Đà Phật 🙏`);
    }
    this.updateStatus();
  }

  updateMeditation() {
    const m = this.meditation;
    if (!m) return;
    const elapsed = (performance.now() - m.start) / 1000;
    const left = Math.max(0, m.total - elapsed);
    const mm = Math.floor(left / 60);
    const ss = Math.floor(left % 60);
    document.getElementById('medTimer').textContent = `${mm}:${String(ss).padStart(2, '0')}`;

    const cycleLen = BREATH_CYCLE.reduce((s, p) => s + p.seconds, 0);
    let t = elapsed % cycleLen;
    let phase = BREATH_CYCLE[0];
    for (const p of BREATH_CYCLE) {
      if (t <= p.seconds) {
        phase = p;
        break;
      }
      t -= p.seconds;
    }
    const k = phase.seconds ? t / phase.seconds : 1;
    const eased = 0.5 - Math.cos(Math.min(1, k) * Math.PI) / 2;
    const scale = phase.from + (phase.to - phase.from) * eased;
    document.getElementById('breathCircle').style.transform = `scale(${scale})`;
    document.getElementById('breathText').textContent = phase.name;

    if (left <= 0) this.endMeditation(true);
  }

  // ---------------- Gõ mõ tụng kinh / niệm Phật (Song ngữ Việt - Anh) ----------------

  setLanguage(lang) {
    if (lang !== 'vi' && lang !== 'en') return;
    this.lang = lang;
    document.querySelectorAll('[data-sutra-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sutraLang === lang);
    });
    if (this.sutra && this.mode === 'kinh') {
      this.openSutra(this.sutra.id, true);
    }
  }

  toggleAutoSpeak() {
    this.autoSpeak = !this.autoSpeak;
    const btn = document.getElementById('sutraAutoSpeakBtn');
    if (btn) btn.classList.toggle('active', this.autoSpeak);
    if (this.autoSpeak) this.speakCurrentWord(true);
  }

  // Chọn giọng đọc tự nhiên nhất (Samantha / Google US English / Daniel), loại bỏ các giọng hiệu ứng robot của macOS (Albert, Zarvox, Fred...)
  pickBestEnglishVoice() {
    if (this.cachedEnVoice) return this.cachedEnVoice;
    if (typeof window.speechSynthesis === 'undefined' || !window.speechSynthesis.getVoices) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const noveltyRe = /albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|fred|good news|hysterical|jester|junior|organ|superstar|ralph|trinoids|whisper|zarvox|deranged|kathy|princess|grandma|grandpa|rocko|reed|shelley|sandy|eddy|flo|espeak/i;
    const enVoices = voices.filter(v => /^en(-|_|$)/i.test(v.lang) && !noveltyRe.test(v.name));
    if (!enVoices.length) return voices.find(v => /^en/i.test(v.lang)) || null;

    const scoreVoice = (v) => {
      const name = v.name.toLowerCase();
      if (name.includes('google us english')) return 100;
      if (name.includes('google uk english female')) return 96;
      if (name.includes('natural') || name.includes('premium') || name.includes('enhanced')) return 94;
      if (name.includes('samantha')) return 90;
      if (name.includes('ava') || name.includes('allison') || name.includes('serena')) return 86;
      if (name.includes('daniel') || name.includes('alex') || name.includes('karen') || name.includes('moira')) return 82;
      if (/^en(-|_)US/i.test(v.lang)) return 70;
      if (/^en(-|_)GB/i.test(v.lang)) return 65;
      return 50;
    };

    enVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    this.cachedEnVoice = enVoices[0];
    return this.cachedEnVoice;
  }

  // Phiên âm hỗ trợ các thuật ngữ Phạn ngữ để giọng đọc phát âm mượt và chuẩn
  toSpeakableEnglish(text) {
    const phoneticMap = {
      avalokiteshvara: 'Ah-vah-loh-kee-tesh-vah-rah',
      prajnaparamita: 'Prahj-nah-pah-rah-mee-tah',
      shariputra: 'Shah-ree-poo-trah',
      bodhisattva: 'Boh-dee-saht-vah',
      amitabha: 'Ah-mee-tah-bah',
      nirvana: 'Neer-vah-nah',
      svaha: 'svah-hah'
    };
    return String(text).replace(/\b(avalokiteshvara|prajnaparamita|shariputra|bodhisattva|amitabha|nirvana|svaha)\b/gi,
      m => phoneticMap[m.toLowerCase()] || m);
  }

  isSpeakingNow() {
    const audioPlaying = this.dictAudio && !this.dictAudio.paused && !this.dictAudio.ended;
    const synthPlaying = typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking;
    return !!(audioPlaying || synthPlaying);
  }

  speakWithSynth(text, forceCancel = true) {
    if (!text || typeof window.speechSynthesis === 'undefined') return;
    try {
      if (forceCancel) window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(this.toSpeakableEnglish(text));
      const voice = this.pickBestEnglishVoice();
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang || 'en-US';
      } else {
        utter.lang = 'en-US';
      }
      utter.rate = 0.92;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  // Ưu tiên phát giọng đọc từ điển người thật (US English) cho từ đơn, nếu không có mạng hoặc từ Phạn ngữ thì dùng giọng Samantha / Google US
  speakEnglishWord(word, force = true) {
    const clean = HallPractice.cleanWord(word).replace(/[^a-z\s-]/g, '').trim();
    if (!clean) return;
    if (!force && this.isSpeakingNow()) return;

    const sanskritRe = /^(avalokiteshvara|prajnaparamita|shariputra|bodhisattva|amitabha|nirvana|svaha)$/i;
    if (sanskritRe.test(clean)) {
      this.speakWithSynth(clean, force);
      return;
    }

    try {
      if (this.dictAudio) {
        this.dictAudio.pause();
        this.dictAudio = null;
      }
      if (force && typeof window.speechSynthesis !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`);
      audio.volume = 0.95;
      this.dictAudio = audio;
      audio.onerror = () => this.speakWithSynth(clean, force);
      audio.play().catch(() => this.speakWithSynth(clean, force));
    } catch (e) {
      this.speakWithSynth(clean, force);
    }
  }

  speakCurrentWord(force = true) {
    if (this.currentEnglishWord) {
      this.speakEnglishWord(this.currentEnglishWord, force);
    }
  }

  // Phát âm tự động mượt mà khi chuyển chữ: không lặp lại từ trùng (ở chế độ gõ Tiếng Việt) và không cắt ngang từ chính bởi các từ nối ngắn
  triggerAutoSpeakForCurrentToken() {
    if (!this.autoSpeak || !this.currentEnglishWord) return;
    const token = this.tokens[this.cursor];
    if (!token) return;
    const clean = HallPractice.cleanWord(this.currentEnglishWord).replace(/[^a-z\s-]/g, '').trim();
    if (!clean) return;

    const key = `${token.lineIndex}:${clean}`;
    if (this.lang !== 'en' && this.lastAutoSpokenKey === key) return;
    this.lastAutoSpokenKey = key;

    const stopWords = /^(the|a|an|of|to|in|is|are|and|or|by|as|at|on|be|so|it)$/i;
    if (stopWords.test(clean) && this.isSpeakingNow()) return;

    if (this.autoSpeakDelayTimer) clearTimeout(this.autoSpeakDelayTimer);
    this.autoSpeakDelayTimer = setTimeout(() => {
      if (this.mode === 'kinh' && this.autoSpeak) {
        this.speakEnglishWord(clean, true);
      }
    }, 65);
  }

  speakCurrentLine() {
    if (!this.sutra) return;
    const token = this.tokens[this.cursor] || this.tokens[this.tokens.length - 1];
    if (!token) return;
    const enLines = this.sutra.linesEn || [];
    const lineText = enLines[token.lineIndex] || '';
    if (lineText) {
      if (this.dictAudio) {
        this.dictAudio.pause();
        this.dictAudio = null;
      }
      this.speakWithSynth(lineText, true);
    }
  }

  openSutra(id, keepSilence = false) {
    this.closeMeditationSetup();
    const sutra = window.TEMPLE_DATA.sutras.find(s => s.id === id);
    if (!sutra) return;
    this.sutra = sutra;
    this.mode = 'kinh';
    this.cursor = 0;
    this.repeatDone = 0;
    this.setActivity(id === 'niem_phat' ? 'niem_phat' : 'tung_kinh');

    const isEn = this.lang === 'en' && Array.isArray(sutra.linesEn);
    document.getElementById('sutraTitle').textContent = isEn ? (sutra.nameEn || sutra.name) : sutra.name;
    document.getElementById('sutraIntro').textContent = isEn ? (sutra.introEn || sutra.intro) : sutra.intro;

    const hintEl = document.getElementById('sutraTypingHint');
    if (hintEl) {
      hintEl.innerHTML = isEn
        ? '🇬🇧 <strong>Chế độ luyện Tiếng Anh:</strong> Gõ từng từ tiếng Anh đang sáng (tự chuyển từ khi gõ đúng, hoặc nhấn <strong>Cách</strong>). Bấm vào từ bất kỳ để nghe phát âm.'
        : '🇻🇳 <strong>Chế độ Song Ngữ:</strong> Gõ chữ đang sáng (có dấu tự sang chữ kế, không dấu nhấn <strong>Cách</strong>). Xem câu dịch & từ vựng Tiếng Anh ngay bên dưới.';
    }

    const tabsEl = document.getElementById('sutraTabs');
    if (tabsEl) {
      tabsEl.innerHTML = '';
      window.TEMPLE_DATA.sutras.forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-chip' + (s.id === id ? ' active' : '');
        btn.textContent = s.shortName || s.name;
        btn.onclick = () => this.openSutra(s.id);
        tabsEl.appendChild(btn);
      });
    }

    document.querySelectorAll('[data-sutra-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.sutraLang === this.lang);
    });

    const primaryLines = isEn ? sutra.linesEn : sutra.lines;
    const subLines = isEn ? sutra.lines : (sutra.linesEn || []);

    const body = document.getElementById('sutraText');
    body.innerHTML = '';
    this.tokens = [];
    this.paras = [];

    primaryLines.forEach((line, lineIndex) => {
      const wrap = document.createElement('div');
      wrap.className = 'sutra-para';

      const p = document.createElement('p');
      p.className = 'sutra-main-line';
      const words = line.split(/\s+/);
      words.forEach((word, wordIdxInLine) => {
        const span = document.createElement('span');
        span.className = 'syllable';
        span.textContent = word;
        const tokenObj = { el: span, lineIndex, word, wordIdxInLine, lineWordCount: words.length };
        span.onclick = () => {
          this.updateVocabCard(tokenObj);
          this.speakCurrentWord();
        };
        p.appendChild(span);
        p.appendChild(document.createTextNode(' '));
        this.tokens.push(tokenObj);
      });
      wrap.appendChild(p);

      if (subLines[lineIndex]) {
        const sub = document.createElement('p');
        sub.className = 'sutra-subline';
        sub.textContent = (isEn ? '🇻🇳 ' : '🇬🇧 ') + subLines[lineIndex];
        wrap.appendChild(sub);
      }

      body.appendChild(wrap);
      this.paras.push(wrap);
    });

    this.lastAutoSpokenKey = '';
    this.renderCursor();
    document.getElementById('sutraPanel').hidden = false;
    document.body.classList.add('is-chanting');
    this.resetTypingInput();
    // Máy tính thì đặt sẵn con trỏ vào ô gõ; điện thoại để người chơi tự chạm (tránh bàn phím bật lên che kinh)
    if (window.matchMedia('(pointer: fine)').matches) document.getElementById('sutraInput').focus();
    if (!keepSilence) this.game.audio.playSingingBowl(0.7);
    if (this.autoSpeak) this.triggerAutoSpeakForCurrentToken();
    this.updateStatus();
  }

  // Tra cứu từ vựng Tiếng Anh + IPA + Nghĩa Tiếng Việt cho từ đang sáng
  resolveVocab(token) {
    if (!token || !this.sutra) return null;
    const glossary = window.TEMPLE_DATA.sutraGlossary || {};
    const clean = HallPractice.cleanWord(token.word);

    // 1. Khi đang ở chế độ Gõ Tiếng Anh: tra trực tiếp từ tiếng Anh đang sáng
    if (this.lang === 'en') {
      const entry = glossary[clean];
      if (entry) {
        return {
          speak: clean,
          wordLabel: `🇬🇧 ${entry.en}`,
          ipa: entry.ipa || '',
          meaning: entry.vi
        };
      }
      return {
        speak: clean,
        wordLabel: `🇬🇧 ${token.word}`,
        ipa: '',
        meaning: (this.sutra.lines && this.sutra.lines[token.lineIndex]) || ''
      };
    }

    // 2. Khi đang ở chế độ Gõ Tiếng Việt: ưu tiên từ điển Việt->Anh, hoặc ánh xạ sang từ tiếng Anh tương ứng trong câu
    const direct = glossary[clean];
    const enLine = (this.sutra.linesEn && this.sutra.linesEn[token.lineIndex]) || '';
    const enWords = enLine ? enLine.split(/\s+/) : [];
    const mappedIdx = enWords.length
      ? Math.min(enWords.length - 1, Math.floor((token.wordIdxInLine / Math.max(1, token.lineWordCount)) * enWords.length))
      : 0;
    const mappedEnRaw = enWords[mappedIdx] || '';
    const mappedEnClean = HallPractice.cleanWord(mappedEnRaw);
    const mappedEntry = glossary[mappedEnClean];

    if (direct) {
      const firstEn = (direct.en.split(/[\/,(]/)[0] || '').trim() || mappedEnClean;
      return {
        speak: firstEn,
        wordLabel: `🇻🇳 ${clean} → 🇬🇧 ${direct.en}`,
        ipa: direct.ipa || '',
        meaning: direct.vi
      };
    }

    if (mappedEntry) {
      return {
        speak: mappedEnClean,
        wordLabel: `🇬🇧 ${mappedEntry.en}`,
        ipa: mappedEntry.ipa || '',
        meaning: `${mappedEntry.vi} (từ tiếng Anh trong câu)`
      };
    }

    return {
      speak: mappedEnClean || 'peace',
      wordLabel: `🇬🇧 ${mappedEnRaw || 'Mindfulness'}`,
      ipa: '',
      meaning: enLine
    };
  }

  updateVocabCard(tokenOverride = null) {
    const token = tokenOverride || this.tokens[this.cursor];
    const wordEl = document.getElementById('sutraVocabWord');
    const ipaEl = document.getElementById('sutraVocabIpa');
    const meanEl = document.getElementById('sutraVocabMeaning');
    if (!wordEl || !ipaEl || !meanEl) return;

    const info = this.resolveVocab(token);
    if (!info) {
      wordEl.textContent = '';
      ipaEl.textContent = '';
      meanEl.textContent = '';
      return;
    }
    this.currentEnglishWord = info.speak;
    wordEl.textContent = info.wordLabel;
    ipaEl.textContent = info.ipa;
    meanEl.textContent = info.meaning ? `• ${info.meaning}` : '';
  }

  closeSutra() {
    if (this.mode !== 'kinh') return;
    this.stopAuto();
    if (this.autoSpeakDelayTimer) clearTimeout(this.autoSpeakDelayTimer);
    if (this.dictAudio) {
      this.dictAudio.pause();
      this.dictAudio = null;
    }
    if (typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    this.mode = '';
    this.sutra = null;
    this.setActivity('');
    document.getElementById('sutraPanel').hidden = true;
    document.body.classList.remove('is-chanting');
    const input = document.getElementById('sutraInput');
    if (input) input.blur();
    this.updateStatus();
  }

  // ---------------- Gõ chữ theo kinh văn (chép kinh) ----------------

  bindTyping() {
    const input = document.getElementById('sutraInput');
    if (!input) return;
    // Bộ gõ tiếng Việt (Telex/VNI có ghép dấu) đang ghép chữ thì chưa kiểm tra, đợi ghép xong
    input.addEventListener('input', (e) => {
      if (e.isComposing) return;
      // Bàn phím điện thoại thường chèn dấu cách vào ô thay vì báo phím Cách
      if (/\s$/.test(input.value)) this.checkTyped(true);
      else this.checkTyped(false);
    });
    input.addEventListener('compositionend', () => this.checkTyped(false));
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.checkTyped(true);
      }
    });
  }

  // Bỏ dấu câu, viết thường, chuẩn hoá Unicode để so chữ
  static cleanWord(w) {
    return w.normalize('NFC').toLowerCase().replace(/[.,:;!?“”"'()…-]/g, '').trim();
  }

  // Bỏ cả dấu thanh, dấu mũ, đ -> d: để người gõ không dấu vẫn được
  static plainWord(w) {
    return HallPractice.cleanWord(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }

  // confirm = người chơi đã nhấn Cách / Enter. Gõ đúng có dấu thì sang chữ ngay; không dấu thì cần nhấn Cách
  checkTyped(confirm) {
    const input = document.getElementById('sutraInput');
    if (this.mode !== 'kinh' || !input) return;
    const token = this.tokens[this.cursor];
    const typed = input.value.trim();
    if (!token || !typed) {
      if (confirm) input.value = '';
      return;
    }
    const exact = HallPractice.cleanWord(typed) === HallPractice.cleanWord(token.word);
    const plain = HallPractice.plainWord(typed) === HallPractice.plainWord(token.word);
    if (exact || (confirm && plain)) {
      input.value = '';
      input.classList.remove('wrong');
      this.tap();
      this.resetTypingInput();
      return;
    }
    // Đang gõ dở: chữ khớp phần đầu thì báo đúng hướng, sai thì báo đỏ
    const onTrack = HallPractice.plainWord(token.word).startsWith(HallPractice.plainWord(typed));
    input.classList.toggle('wrong', !onTrack || confirm);
    if (confirm) {
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
    }
  }

  resetTypingInput() {
    const input = document.getElementById('sutraInput');
    if (!input) return;
    input.classList.remove('wrong');
    const token = this.tokens[this.cursor];
    input.placeholder = token ? `Gõ: ${HallPractice.cleanWord(token.word)}` : '';
  }

  renderCursor() {
    this.tokens.forEach((t, i) => {
      t.el.classList.toggle('done', i < this.cursor);
      t.el.classList.toggle('current', i === this.cursor);
    });
    const current = this.tokens[this.cursor];
    if (this.paras && this.paras.length) {
      this.paras.forEach((p, idx) => {
        p.classList.toggle('active-line', !!current && idx === current.lineIndex);
      });
    }
    if (current) current.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.updateVocabCard(current);
    const progress = document.getElementById('sutraProgress');
    if (this.sutra && this.sutra.repeat) {
      progress.textContent = `📿 Hạt thứ ${this.repeatDone + 1} / ${this.sutra.repeat}`;
    } else {
      progress.textContent = `${Math.min(this.cursor, this.tokens.length)} / ${this.tokens.length} ${this.lang === 'en' ? 'từ' : 'chữ'}`;
    }
  }

  // Một tiếng mõ: sáng chữ kế tiếp. Hết câu thì thỉnh một tiếng chuông nhỏ
  tap() {
    const now = Date.now();
    this.player.lastTap = now;
    this.game.audio.playWoodenFish(1.0, this.autoSpeak ? 0.42 : 1.0);
    this.game.renderer.pulseInstrument && this.game.renderer.pulseInstrument('mo');
    this.game.network.sendMoTap(false);
    this.game.earnMerit('wooden_fish');

    if (this.mode !== 'kinh' || !this.tokens.length) return;
    const token = this.tokens[this.cursor];
    this.cursor++;
    const next = this.tokens[this.cursor];
    const lineEnded = !next || next.lineIndex !== token.lineIndex;

    if (this.sutra.repeat) {
      if (!next) {
        this.repeatDone++;
        if (this.repeatDone >= this.sutra.repeat) {
          this.completeSutra();
          return;
        }
        this.cursor = 0;
        if (this.repeatDone % 9 === 0) this.ringBell(0.5);
      }
    } else if (!next) {
      this.completeSutra();
      return;
    } else if (lineEnded) {
      setTimeout(() => this.game.audio.playSingingBowl(0.45), 120);
    }
    this.renderCursor();
    if (this.autoSpeak) {
      this.triggerAutoSpeakForCurrentToken();
    }
  }

  completeSutra() {
    this.renderCursor();
    this.stopAuto();
    [0, 2200, 4400].forEach(ms => setTimeout(() => this.game.audio.playSingingBowl(0.9), ms));
    this.game.earnMerit('sutra_complete');
    const name = this.sutra.name;
    this.game.showToast(`🙏 Viên mãn thời kinh: ${name}. Nguyện đem công đức này hướng về khắp tất cả.`);
    this.game.say('Nam Mô Bổn Sư Thích Ca Mâu Ni Phật 🙏');
    setTimeout(() => this.closeSutra(), 1500);
  }

  toggleAuto() {
    if (this.autoTimer) this.stopAuto();
    else this.startAuto();
  }

  startAuto() {
    this.stopAuto();
    this.autoTimer = setInterval(() => this.tap(), 60000 / this.tempo);
    document.getElementById('sutraAutoBtn').classList.add('active');
  }

  stopAuto() {
    if (this.autoTimer) clearInterval(this.autoTimer);
    this.autoTimer = null;
    const btn = document.getElementById('sutraAutoBtn');
    if (btn) btn.classList.remove('active');
  }

  // ---------------- Chuông & đảnh lễ ----------------

  ringBell(volume = 1) {
    this.game.audio.playSingingBowl(volume);
    this.game.renderer.pulseInstrument && this.game.renderer.pulseInstrument('bell');
    this.game.network.sendMoTap(true);
    if (volume >= 1) this.game.earnMerit('bell');
  }

  bow() {
    if (this.player.isSitting) this.stand();
    this.stopAll();
    this.setActivity('lay');
    this.game.audio.playSingingBowl(0.6);
    this.game.say('Chí tâm đảnh lễ Tam Bảo 🙏');
    this.bowTimer = setTimeout(() => {
      this.bowTimer = null;
      this.setActivity('');
      this.game.earnMerit('bow');
    }, 9000);
  }

  // Tiếng mõ / chuông của người khác trong điện: nghe nhỏ hơn tiếng của mình
  onRemoteTap(packet) {
    const p = this.game.network.remotePlayers.get(packet.senderId);
    if (p) p.lastTap = Date.now();
    if (this.player.space !== 'chinh_dien') return;
    if (packet.bell) {
      this.game.audio.playSingingBowl(0.35);
      this.game.renderer.pulseInstrument && this.game.renderer.pulseInstrument('bell');
    } else {
      this.game.audio.playWoodenFish(0.96 + Math.random() * 0.08, 0.35);
    }
  }

  update() {
    if (this.meditation) this.updateMeditation();
    this.leadCongPhu();
  }

  // Giờ công phu: Sư Thầy tự gõ mõ dẫn chúng, người trong điện nghe nhịp mõ để tụng theo
  leadCongPhu() {
    const cal = this.game.calendar;
    if (this.player.space !== 'chinh_dien') return;
    const now = Date.now();
    if (now - (this.lastLeadCheck || 0) > 5000) {
      this.lastLeadCheck = now;
      this.congPhu = cal.isActive('cong_phu_sang') || cal.isActive('cong_phu_chieu');
    }
    if (!this.congPhu || now - (cal.monkTap || 0) < 920) return;
    cal.monkTap = now;
    this.game.audio.playWoodenFish(0.92, 0.45);
  }
}

window.HallPractice = HallPractice;
