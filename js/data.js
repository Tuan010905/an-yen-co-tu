// Dữ liệu văn hóa, Quẻ Xăm, Cầu Duyên, Pháp Phục & Danh Hiệu trong "An Yên Cổ Tự"

window.TEMPLE_DATA = {
  outfits: [
    {
      id: 'ao_lam',
      name: 'Áo Lam Phật Tử',
      primary: '#6b8cae',
      secondary: '#4a6b8c',
      trim: '#d6e4f0',
      desc: 'Trang phục màu lam truyền thống, giản dị và thanh tịnh khi lên chùa.'
    },
    {
      id: 'ao_dai_sen',
      name: 'Áo Dài Hồng Sen',
      primary: '#d97b93',
      secondary: '#b5566e',
      trim: '#fce4ec',
      desc: 'Tà áo dài truyền thống mang sắc hồng dịu dàng của đóa sen sớm mai.'
    },
    {
      id: 'ao_ba_ba',
      name: 'Áo Bà Ba Nâu Sồng',
      primary: '#8d6748',
      secondary: '#69492e',
      trim: '#ebd9c8',
      desc: 'Màu nâu đất mộc mạc, gần gũi với thiên nhiên và chốn thiền môn.'
    },
    {
      id: 'phap_phuc_ngoc',
      name: 'Pháp Phục Ngọc Bích',
      primary: '#5a9e87',
      secondary: '#3b7a65',
      trim: '#dff2eb',
      desc: 'Sắc xanh ngọc bích mát lành, tượng trưng cho sự an nhiên tự tại.'
    },
    {
      id: 'ao_dai_vang',
      name: 'Áo Dài Hoàng Kim',
      primary: '#d4a338',
      secondary: '#a87c1d',
      trim: '#fff3d1',
      desc: 'Sắc vàng ấm áp như ánh nắng chiều nơi hiên chùa cổ kính.'
    },
    {
      id: 'phap_phuc_bach_lien',
      name: 'Pháp Phục Bạch Liên',
      primary: '#e8e4dc',
      secondary: '#beb8ac',
      trim: '#ffffff',
      desc: 'Trắng tinh khôi như đóa sen trắng không vướng bụi trần.'
    }
  ],

  // Lưu ý: danh sách id ngoại hình phải khớp với các bộ OUTFITS / HAIRS / ... trong server.py
  hairs: [
    { id: 'toc_ngan', name: 'Tóc Ngắn Gọn Gàng', color: '#2c221e', style: 'short' },
    { id: 'toc_bui', name: 'Tóc Búi Trâm Gỗ', color: '#241c18', style: 'bun' },
    { id: 'toc_dai', name: 'Tóc Dài Xõa Vai', color: '#362822', style: 'long' },
    { id: 'toc_duoi_ngua', name: 'Tóc Buộc Đuôi Ngựa', color: '#2c221e', style: 'ponytail' },
    { id: 'toc_mai', name: 'Tóc Ngắn Có Mái', color: '#2c221e', style: 'bangs' },
    { id: 'toc_ngang_vai', name: 'Tóc Ngang Vai', color: '#2c221e', style: 'bob' },
    { id: 'cao_troc', name: 'Cạo Trọc (Chú Tiểu)', color: '#2c221e', style: 'bald' }
  ],

  hairColors: [
    { id: 'den', name: 'Đen Huyền', color: '#2c221e' },
    { id: 'nau', name: 'Nâu Trầm', color: '#5a3825' },
    { id: 'hat_de', name: 'Hạt Dẻ', color: '#8a5530' },
    { id: 'bac', name: 'Bạc Tiên Phong', color: '#dcd7d0' }
  ],

  skinTones: [
    { id: 'da_sang', name: 'Sáng', color: '#ffe3c9' },
    { id: 'da_trang_hong', name: 'Trắng Hồng', color: '#fcd5c0' },
    { id: 'da_banh_mat', name: 'Bánh Mật', color: '#e8b48a' },
    { id: 'da_ngam', name: 'Ngăm', color: '#c98e62' },
    { id: 'da_nau', name: 'Nâu', color: '#8f5d3d' }
  ],

  eyes: [
    { id: 'tron', name: 'Mắt Tròn' },
    { id: 'cuoi', name: 'Mắt Cười' },
    { id: 'lim_dim', name: 'Lim Dim Thiền Định' }
  ],

  defaultAppearance: {
    outfitId: 'ao_lam',
    hairId: 'toc_ngan',
    hairColorId: 'den',
    skinId: 'da_sang',
    eyesId: 'tron',
    faceShape: 'tron',
    glasses: 'none',
    eyeSize: 'vua',
    mouth: 'vua',
    nose: 'nho',
    beard: 'none',
    faceId: '',
    skinColor: '',
    hairColor: '',
    accessory: 'non_la'
  },

  // Đổi bộ id ngoại hình thành màu/kiểu cụ thể để vẽ nhân vật
  faceShapes: [
    { id: 'tron', name: 'Mặt Tròn' },
    { id: 'trai_xoan', name: 'Trái Xoan' },
    { id: 'vuong', name: 'Mặt Vuông' },
    { id: 'dai', name: 'Mặt Dài' }
  ],

  glasses: [
    { id: 'none', name: 'Không đeo' },
    { id: 'kinh_tron', name: 'Kính Tròn' },
    { id: 'kinh_vuong', name: 'Kính Vuông' }
  ],

  eyeSizes: [
    { id: 'nho', name: 'Mắt Nhỏ' },
    { id: 'vua', name: 'Mắt Vừa' },
    { id: 'to', name: 'Mắt To' }
  ],

  mouths: [
    { id: 'nho', name: 'Miệng Nhỏ' },
    { id: 'vua', name: 'Miệng Vừa' },
    { id: 'rong', name: 'Miệng Rộng' }
  ],

  noses: [
    { id: 'nho', name: 'Mũi Nhỏ' },
    { id: 'vua', name: 'Mũi Vừa' },
    { id: 'to', name: 'Mũi To' }
  ],

  beards: [
    { id: 'none', name: 'Không Râu' },
    { id: 'ria', name: 'Ria Mép' },
    { id: 'rau', name: 'Râu Cằm' }
  ],

  // Bộ id ngoại hình. skinColor / hairColor (mã màu) là màu lấy từ ảnh, ưu tiên hơn màu chọn sẵn
  resolveAppearance(app) {
    const a = { ...this.defaultAppearance, ...(app || {}) };
    const pick = (list, id) => list.find(x => x.id === id) || list[0];
    const isColor = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
    return {
      outfit: pick(this.outfits, a.outfitId),
      hair: pick(this.hairs, a.hairId),
      hairColor: isColor(a.hairColor) ? a.hairColor : pick(this.hairColors, a.hairColorId).color,
      skin: isColor(a.skinColor) ? a.skinColor : pick(this.skinTones, a.skinId).color,
      eyes: pick(this.eyes, a.eyesId).id,
      faceShape: pick(this.faceShapes, a.faceShape).id,
      glasses: pick(this.glasses, a.glasses).id,
      eyeSize: pick(this.eyeSizes, a.eyeSize || 'vua').id,
      mouth: pick(this.mouths, a.mouth || 'vua').id,
      nose: pick(this.noses, a.nose || 'nho').id,
      beard: pick(this.beards, a.beard).id,
      // Mặt hoạt hình từ ảnh: trên server (faceId) hoặc chỉ trên máy khi chơi ngoại tuyến (faceLocal)
      faceTexture: a.faceLocal || (a.faceId && /^[0-9]+-[0-9]+$/.test(a.faceId) ? `/api/face/${a.faceId}` : ''),
      accessory: this.accessories.some(x => x.id === a.accessory) ? a.accessory : 'none'
    };
  },

  // Các không gian người chơi có thể ở. Toạ độ logic giống sân chùa (px), server cũng giới hạn trong 0..1600 x 0..1100
  spaces: {
    san_chua: { name: 'Sân Chùa' },
    chinh_dien: { name: 'Chính Điện' }
  },

  // Bố cục bên trong Chính Điện (toạ độ logic, tâm điện ở 800, 550)
  hall: {
    bounds: { left: 380, right: 1220, top: 380, bottom: 900 },
    spawn: { x: 800, y: 780 },
    door: { x: 800, y: 920, radius: 60 },
    mo: { x: 640, y: 420, radius: 70 },
    bell: { x: 960, y: 420, radius: 70 },
    altar: { x: 800, y: 300 },
    prostrationMats: [{ x: 740, y: 430 }, { x: 800, y: 430 }, { x: 860, y: 430 }],
    monkSeat: { x: 640, y: 470 },
    cushions: (() => {
      const seats = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          seats.push({ id: row * 6 + col, x: 560 + col * 96, y: 540 + row * 82 });
        }
      }
      return seats;
    })()
  },

  // Các khu có không gian riêng (ngoài Chính Điện). Toạ độ logic, tâm mỗi khu ở (800, 550).
  // returnTo: chỗ đứng trên sân chùa khi rời khu. Danh sách id phải khớp SPACES trong server.py
  zones: {
    gac_chuong: {
      name: 'Gác Đại Hồng Chung',
      intro: 'Kéo chày kình thỉnh chuông. Mỗi tiếng chuông là một lời nguyện cho muôn loài an lạc.',
      bounds: { left: 560, right: 1040, top: 400, bottom: 760 },
      spawn: { x: 800, y: 720 },
      exit: { x: 800, y: 770, radius: 50 },
      returnTo: { x: 530, y: 330 },
      obstacles: [{ type: 'circle', x: 800, y: 530, r: 72 }, { type: 'rect', left: 860, right: 975, top: 515, bottom: 545 }],
      hotspots: [{ id: 'gc_rope', type: 'strike_bell', x: 1000, y: 560, radius: 75, actionLabel: '🔔 Kéo chày thỉnh chuông [E / Space]' }],
      actions: [{ id: 'strike_bell', label: '🔔 Thỉnh Chuông', key: 'Space' }, { id: 'greet', label: '🙏 Chắp Tay', key: 'G' }],
      verses: [
        'Nguyện thử chung thanh siêu pháp giới,',
        'Thiết vi u ám tất giai văn.',
        'Văn trần thanh tịnh chứng viên thông,',
        'Nhất thiết chúng sinh thành chánh giác.'
      ]
    },
    lau_xin_xam: {
      name: 'Lầu Xin Xăm',
      intro: 'Quỳ trước án, thành tâm gieo keo. Được Thánh Đài mới lắc ống xăm rút quẻ.',
      bounds: { left: 570, right: 1030, top: 470, bottom: 740 },
      spawn: { x: 800, y: 710 },
      exit: { x: 800, y: 755, radius: 50 },
      returnTo: { x: 1250, y: 425 },
      obstacles: [{ type: 'rect', left: 690, right: 910, top: 400, bottom: 465 }],
      mat: { x: 800, y: 505 },
      hotspots: [{ id: 'lx_mat', type: 'kneel_fortune', x: 800, y: 515, radius: 70, actionLabel: '🎋 Quỳ trước án xin xăm [E]' }],
      actions: [{ id: 'kneel_fortune', label: '🎋 Xin Xăm' }, { id: 'stand', label: '🧍 Đứng Dậy' }]
    },
    cay_nguyen_uoc: {
      name: 'Cây Nguyện Ước & Miếu Nguyệt Lão',
      intro: 'Mỗi thẻ gỗ trên cây là một điều ước thật. Bấm vào thẻ để đọc và chúc phúc cho nhau.',
      bounds: { left: 420, right: 1180, top: 320, bottom: 860 },
      spawn: { x: 800, y: 820 },
      exit: { x: 800, y: 870, radius: 55 },
      returnTo: { x: 1270, y: 745 },
      obstacles: [{ type: 'circle', x: 800, y: 500, r: 62 }, { type: 'rect', left: 500, right: 620, top: 360, bottom: 430 }],
      hotspots: [
        { id: 'cu_tree', type: 'hang_wish', x: 800, y: 600, radius: 85, actionLabel: '🧧 Treo điều ước lên cây [E]' },
        { id: 'cu_shrine', type: 'love_thread', x: 560, y: 480, radius: 75, actionLabel: '💞 Xin chỉ đỏ cầu duyên [E]' }
      ],
      actions: [{ id: 'hang_wish', label: '🧧 Treo Điều Ước' }, { id: 'love_thread', label: '💞 Xin Chỉ Đỏ' }]
    },
    ho_sen: {
      name: 'Hồ Sen Phóng Sinh',
      intro: 'Ra cuối bến gỗ thả hoa đăng. Bấm xuống mặt hồ để rải thức ăn cho đàn cá Koi.',
      bounds: { left: 400, right: 1200, top: 150, bottom: 900 },
      spawn: { x: 800, y: 860 },
      exit: { x: 800, y: 905, radius: 55 },
      returnTo: { x: 505, y: 665 },
      pond: { x: 800, y: 470, r: 300 },
      pier: { left: 772, right: 828, top: 630, bottom: 800 },
      hotspots: [{ id: 'hs_pier', type: 'release_lantern', x: 800, y: 650, radius: 60, actionLabel: '🪷 Thả đèn hoa đăng [E]' }],
      actions: [{ id: 'release_lantern', label: '🪷 Thả Hoa Đăng' }, { id: 'feed_fish', label: '🐟 Cho Cá Ăn' }]
    },
    thuy_dinh: {
      name: 'Hiên Trà Thủy Đình',
      intro: 'Ngồi xuống bồ đoàn, rót một chén trà sen và nghe Sư Thầy giảng đôi lời.',
      bounds: { left: 610, right: 990, top: 420, bottom: 700 },
      spawn: { x: 800, y: 675 },
      exit: { x: 800, y: 705, radius: 45 },
      returnTo: { x: 320, y: 450 },
      obstacles: [{ type: 'rect', left: 742, right: 858, top: 515, bottom: 585 }],
      table: { x: 800, y: 550 },
      monkSeat: { x: 800, y: 478 },
      seats: [
        { id: 0, x: 868, y: 512 }, { id: 1, x: 868, y: 588 }, { id: 2, x: 800, y: 622 },
        { id: 3, x: 732, y: 588 }, { id: 4, x: 732, y: 512 }
      ],
      hotspots: [],
      actions: [
        { id: 'pour_tea', label: '🍵 Rót Trà' },
        { id: 'listen', label: '📜 Nghe Sư Thầy Giảng' },
        { id: 'dharma_talk', label: '🙏 Vấn Đạo Sư Thầy' },
        { id: 'stand', label: '🧍 Đứng Dậy' }
      ]
    }
  },

  // Kinh văn tụng theo nhịp mõ: hỗ trợ song ngữ Việt - Anh để vừa tụng kinh vừa học Tiếng Anh
  sutras: [
    {
      id: 'tam_kinh',
      name: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
      nameEn: 'The Heart of Prajnaparamita Sutra',
      shortName: '📜 Bát Nhã Tâm Kinh',
      intro: 'Bản Hán Việt truyền thống kèm song ngữ Tiếng Anh. Mỗi tiếng mõ là một chữ, tụng chậm rãi và đều tay.',
      introEn: 'English Heart Sutra with Vietnamese translation & vocabulary. Type each highlighted English word to strike the wooden fish.',
      lines: [
        'Quán Tự Tại Bồ Tát, hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.',
        'Xá Lợi Tử, sắc bất dị không, không bất dị sắc, sắc tức thị không, không tức thị sắc, thọ tưởng hành thức diệc phục như thị.',
        'Xá Lợi Tử, thị chư pháp không tướng, bất sanh bất diệt, bất cấu bất tịnh, bất tăng bất giảm.',
        'Thị cố không trung vô sắc, vô thọ tưởng hành thức, vô nhãn nhĩ tỷ thiệt thân ý, vô sắc thanh hương vị xúc pháp, vô nhãn giới nãi chí vô ý thức giới.',
        'Vô vô minh diệc vô vô minh tận, nãi chí vô lão tử diệc vô lão tử tận, vô khổ tập diệt đạo, vô trí diệc vô đắc, dĩ vô sở đắc cố.',
        'Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố, tâm vô quái ngại, vô quái ngại cố, vô hữu khủng bố, viễn ly điên đảo mộng tưởng, cứu cánh Niết Bàn.',
        'Tam thế chư Phật y Bát Nhã Ba La Mật Đa cố, đắc A Nậu Đa La Tam Miệu Tam Bồ Đề.',
        'Cố tri Bát Nhã Ba La Mật Đa thị đại thần chú, thị đại minh chú, thị vô thượng chú, thị vô đẳng đẳng chú, năng trừ nhất thiết khổ, chân thật bất hư.',
        'Cố thuyết Bát Nhã Ba La Mật Đa chú, tức thuyết chú viết:',
        'Yết đế yết đế, ba la yết đế, ba la tăng yết đế, Bồ Đề tát bà ha.',
        'Yết đế yết đế, ba la yết đế, ba la tăng yết đế, Bồ Đề tát bà ha.',
        'Yết đế yết đế, ba la yết đế, ba la tăng yết đế, Bồ Đề tát bà ha.'
      ],
      linesEn: [
        'Avalokiteshvara Bodhisattva, practicing deep Prajnaparamita, clearly saw that all five aggregates are empty, transforming all suffering and distress.',
        'Shariputra, form is not different from emptiness, emptiness is not different from form; form is emptiness, emptiness is form; feelings, perceptions, mental formations, and consciousness are also like this.',
        'Shariputra, all phenomena bear the mark of emptiness; they are neither born nor destroyed, neither defiled nor pure, neither increasing nor decreasing.',
        'Therefore in emptiness there is no form, no feelings, perceptions, mental formations, or consciousness; no eye, ear, nose, tongue, body, or mind; no sight, sound, smell, taste, touch, or dharma; no realm of sight up to no realm of mind consciousness.',
        'There is no ignorance and no end of ignorance, up to no old age and death and no end of old age and death; no suffering, origin, cessation, or path; no wisdom and no attainment, because there is nothing to attain.',
        'The Bodhisattva relies on Prajnaparamita, and so the mind has no hindrance; without any hindrance, there is no fear; far beyond all inverted illusions, one realizes ultimate Nirvana.',
        'All Buddhas of past, present, and future rely on Prajnaparamita and attain supreme perfect enlightenment.',
        'Therefore know that Prajnaparamita is the great transcendent mantra, the great bright mantra, the supreme mantra, the unequaled mantra, which truly removes all suffering without fail.',
        'Therefore we proclaim the Prajnaparamita mantra, the mantra that says:',
        'Gone, gone, gone beyond, gone completely beyond, awakening, svaha.',
        'Gone, gone, gone beyond, gone completely beyond, awakening, svaha.',
        'Gone, gone, gone beyond, gone completely beyond, awakening, svaha.'
      ]
    },
    {
      id: 'tu_bi',
      name: 'Kinh Từ Bi — Rải Tâm Từ Thương Yêu Muôn Loài',
      nameEn: 'The Metta Sutta — Discourse on Loving-Kindness',
      shortName: '🪷 Kinh Từ Bi',
      intro: 'Lời kinh Việt hóa dịu lành giúp làm lắng dịu sân giận, gửi năng lượng bình an đến cha mẹ, người thương và muôn loài.',
      introEn: 'Chant the English verses of Loving-Kindness (Metta) to cultivate peace, gratitude, and boundless compassion.',
      lines: [
        'Nguyện cho con luôn giữ tâm thanh tịnh, nói lời hòa ái, sống đời tri túc và khiêm cung.',
        'Nguyện cho cha mẹ, ông bà và quyến thuộc thân bằng luôn dồi dào sức khỏe, thân tâm thường an lạc.',
        'Nguyện cho hết thảy chúng sanh nơi thế gian này không còn oán ghét, không còn khổ đau, biết thương yêu và chở che lẫn nhau.',
        'Như mẹ hiền hết lòng che chở đứa con duy nhất, nguyện mở rộng lòng từ bi vô lượng đến khắp cả muôn loài.',
        'Dù ở phương Đông hay phương Tây, phương Nam hay phương Bắc, trên cao hay dưới thấp, nguyện muôn loài đều thấm nhuần ánh sáng từ bi.'
      ],
      linesEn: [
        'May I always keep a pure mind, speak gentle words, and live a contented and humble life.',
        'May my parents, grandparents, and loved ones always enjoy abundant health, with body and mind in peace.',
        'May all living beings in this world be free from hostility and suffering, learning to love and protect one another.',
        'Just as a loving mother protects her only child, may we cultivate boundless compassion toward all living beings.',
        'Whether in the East or the West, the South or the North, above or below, may all beings be embraced by the light of compassion.'
      ]
    },
    {
      id: 'ke_chuong',
      name: 'Kệ Thỉnh Chuông & Hồi Hướng Công Đức',
      nameEn: 'Bell Chanting & Merit Dedication Verse',
      shortName: '🔔 Kệ Chuông & Hồi Hướng',
      intro: 'Bài kệ truyền thống chùa Việt ngắn gọn, trang nghiêm. Rất hợp để tịnh tâm nhanh và hồi hướng phước lành.',
      introEn: 'Short traditional temple bell verse and merit dedication in English — great for quick daily practice.',
      lines: [
        'Nguyện tiếng chuông này vang pháp giới, khắp nơi u tối đều lắng nghe.',
        'Ai còn lạc bước mau quay gót, tỉnh giấc mộng dài thấy ánh sen.',
        'Nguyện đem công đức lành hôm nay, hướng về khắp tất cả muôn nơi.',
        'Đệ tử và chúng sanh đều trọn thành Phật đạo.'
      ],
      linesEn: [
        'May the sound of this bell resonate through the dharma realm, so every dark place may listen and awaken.',
        'May those who wander lost return home, waking from a long dream to behold the lotus light.',
        'May the wholesome merit of today be dedicated to all beings everywhere.',
        'May we and all sentient beings together realize the awakened way.'
      ]
    },
    {
      id: 'niem_phat',
      name: 'Niệm Phật A Di Đà (108 biến)',
      nameEn: 'Mindfulness of Amitabha Buddha (108 Recitations)',
      shortName: '📿 Niệm Phật 108 Biến',
      intro: 'Mỗi câu niệm là một hạt tràng hạt. Tròn 108 hạt là viên mãn một chuỗi.',
      introEn: 'Each recitation is one mala bead. Chanting in English or Vietnamese for 108 beads completes a full mala.',
      repeat: 108,
      lines: ['Nam Mô A Di Đà Phật'],
      linesEn: ['Homage to Amitabha Buddha of Infinite Light']
    }
  ],

  // Từ điển Phật học & Đời sống (Anh - Việt + Phiên âm IPA) dùng khi tụng kinh
  sutraGlossary: {
    // --- Từ tiếng Anh trong các bài kinh ---
    avalokiteshvara: { en: 'Avalokiteshvara', ipa: '/ˌʌvəloʊkɪˈteɪʃvərə/', vi: 'Quán Tự Tại (Quán Thế Âm)' },
    bodhisattva: { en: 'Bodhisattva', ipa: '/ˌboʊdɪˈsʌtvə/', vi: 'Bồ Tát (bậc giác hữu tình)' },
    practicing: { en: 'practicing', ipa: '/ˈpræk.tɪ.sɪŋ/', vi: 'thực hành, hành trì (hành)' },
    deep: { en: 'deep', ipa: '/diːp/', vi: 'sâu xa, thâm sâu (thâm)' },
    prajnaparamita: { en: 'Prajnaparamita', ipa: '/ˌprɑːdʒnəˌpɑːrəˈmiːtə/', vi: 'Bát Nhã Ba La Mật Đa (Trí tuệ đáo bỉ ngạn)' },
    clearly: { en: 'clearly', ipa: '/ˈklɪr.li/', vi: 'rõ ràng, sáng tỏ (chiếu)' },
    saw: { en: 'saw (see)', ipa: '/sɔː/', vi: 'nhìn thấy, quán chiếu (kiến)' },
    five: { en: 'five', ipa: '/faɪv/', vi: 'năm (ngũ)' },
    aggregates: { en: 'aggregates', ipa: '/ˈæɡ.rɪ.ɡəts/', vi: 'uẩn / nhóm yếu tố tạo nên thân tâm (ngũ uẩn)' },
    empty: { en: 'empty', ipa: '/ˈemp.ti/', vi: 'rỗng không, vô tự tính (không)' },
    emptiness: { en: 'emptiness', ipa: '/ˈemp.ti.nəs/', vi: 'tính Không, sự rỗng lặng thanh tịnh' },
    transforming: { en: 'transforming', ipa: '/trænsˈfɔːr.mɪŋ/', vi: 'chuyển hóa, vượt qua (độ)' },
    suffering: { en: 'suffering', ipa: '/ˈsʌf.ər.ɪŋ/', vi: 'nỗi khổ, khổ đau (khổ)' },
    distress: { en: 'distress', ipa: '/dɪˈstres/', vi: 'ách nạn, ưu phiền (ách)' },
    shariputra: { en: 'Shariputra', ipa: '/ˌʃɑːrɪˈpuːtrə/', vi: 'Xá Lợi Tử (Tôn giả Xá Lợi Phất)' },
    form: { en: 'form', ipa: '/fɔːrm/', vi: 'sắc (hình tướng, vật chất)' },
    different: { en: 'different', ipa: '/ˈdɪf.ər.ənt/', vi: 'khác biệt (dị)' },
    feelings: { en: 'feelings', ipa: '/ˈfiː.lɪŋz/', vi: 'thọ (cảm giác vui, buồn, trung tính)' },
    perceptions: { en: 'perceptions', ipa: '/pərˈsep.ʃənz/', vi: 'tưởng (tri giác, nhận biết hình ảnh)' },
    mental: { en: 'mental', ipa: '/ˈmen.təl/', vi: 'thuộc về tâm ý' },
    formations: { en: 'formations', ipa: '/fɔːrˈmeɪ.ʃənz/', vi: 'hành (các tâm hành, ý niệm thúc đẩy)' },
    consciousness: { en: 'consciousness', ipa: '/ˈkɑːn.ʃəs.nəs/', vi: 'thức (nhận thức phân biệt)' },
    phenomena: { en: 'phenomena', ipa: '/fəˈnɑː.mɪ.nə/', vi: 'chư pháp (mọi hiện tượng vạn vật)' },
    bear: { en: 'bear', ipa: '/ber/', vi: 'mang, có (thị)' },
    mark: { en: 'mark', ipa: '/mɑːrk/', vi: 'tướng trạng, dấu ấn (tướng)' },
    neither: { en: 'neither', ipa: '/ˈniː.ðər/', vi: 'không... mà cũng không (bất)' },
    born: { en: 'born', ipa: '/bɔːrn/', vi: 'sinh ra (sanh)' },
    destroyed: { en: 'destroyed', ipa: '/dɪˈstrɔɪd/', vi: 'diệt mất, tiêu hoại (diệt)' },
    defiled: { en: 'defiled', ipa: '/dɪˈfaɪld/', vi: 'nhơ cấu, ô nhiễm (cấu)' },
    pure: { en: 'pure', ipa: '/pjʊr/', vi: 'thanh tịnh, trong sạch (tịnh)' },
    increasing: { en: 'increasing', ipa: '/ɪnˈkriː.sɪŋ/', vi: 'tăng thêm (tăng)' },
    decreasing: { en: 'decreasing', ipa: '/dɪˈkriː.sɪŋ/', vi: 'giảm bớt (giảm)' },
    therefore: { en: 'therefore', ipa: '/ˈðer.fɔːr/', vi: 'cho nên, vì thế (thị cố / cố)' },
    eye: { en: 'eye', ipa: '/aɪ/', vi: 'mắt (nhãn)' },
    ear: { en: 'ear', ipa: '/ɪr/', vi: 'tai (nhĩ)' },
    nose: { en: 'nose', ipa: '/noʊz/', vi: 'mũi (tỷ)' },
    tongue: { en: 'tongue', ipa: '/tʌŋ/', vi: 'lưỡi (thiệt)' },
    body: { en: 'body', ipa: '/ˈbɑː.di/', vi: 'thân thể (thân)' },
    mind: { en: 'mind', ipa: '/maɪnd/', vi: 'tâm, ý thức (tâm / ý)' },
    sight: { en: 'sight', ipa: '/saɪt/', vi: 'hình sắc, cảnh thấy được (sắc)' },
    sound: { en: 'sound', ipa: '/saʊnd/', vi: 'âm thanh, tiếng (thanh)' },
    smell: { en: 'smell', ipa: '/smel/', vi: 'mùi hương (hương)' },
    taste: { en: 'taste', ipa: '/teɪst/', vi: 'vị nếm (vị)' },
    touch: { en: 'touch', ipa: '/tʌtʃ/', vi: 'sự xúc chạm (xúc)' },
    dharma: { en: 'dharma', ipa: '/ˈdɑːr.mə/', vi: 'pháp (chân lý, giáo pháp, đối tượng của ý)' },
    realm: { en: 'realm', ipa: '/relm/', vi: 'giới, cõi, phạm vi (giới)' },
    ignorance: { en: 'ignorance', ipa: '/ˈɪɡ.nər.əns/', vi: 'vô minh (sự mê lầm chưa sáng suốt)' },
    end: { en: 'end', ipa: '/end/', vi: 'sự chấm dứt, hết sạch (tận)' },
    old: { en: 'old age', ipa: '/oʊld eɪdʒ/', vi: 'tuổi già (lão)' },
    death: { en: 'death', ipa: '/deθ/', vi: 'sự chết (tử)' },
    origin: { en: 'origin', ipa: '/ˈɔːr.ə.dʒɪn/', vi: 'tập đế (nguyên nhân của khổ)' },
    cessation: { en: 'cessation', ipa: '/seˈseɪ.ʃən/', vi: 'diệt đế (sự đoạn diệt khổ đau)' },
    path: { en: 'path', ipa: '/pæθ/', vi: 'đạo đế (con đường chuyển hóa)' },
    wisdom: { en: 'wisdom', ipa: '/ˈwɪz.dəm/', vi: 'trí tuệ (trí)' },
    attainment: { en: 'attainment', ipa: '/əˈteɪn.mənt/', vi: 'sự chứng đắc (đắc)' },
    attain: { en: 'attain', ipa: '/əˈteɪn/', vi: 'đạt được, chứng đắc (đắc)' },
    relies: { en: 'relies (rely)', ipa: '/rɪˈlaɪz/', vi: 'nương tựa vào (y)' },
    rely: { en: 'rely', ipa: '/rɪˈlaɪ/', vi: 'nương tựa vào (y)' },
    hindrance: { en: 'hindrance', ipa: '/ˈhɪn.drəns/', vi: 'chướng ngại, vướng bận (quái ngại)' },
    fear: { en: 'fear', ipa: '/fɪr/', vi: 'nỗi sợ hãi (khủng bố)' },
    beyond: { en: 'beyond', ipa: '/bɪˈjɑːnd/', vi: 'vượt qua bên kia (ba la / viễn ly)' },
    inverted: { en: 'inverted', ipa: '/ɪnˈvɜːr.tɪd/', vi: 'điên đảo, ngược ngạo' },
    illusions: { en: 'illusions', ipa: '/ɪˈluː.ʒənz/', vi: 'mộng tưởng, ảo ảnh' },
    realizes: { en: 'realizes', ipa: '/ˈriː.ə.laɪ.zɪz/', vi: 'chứng ngộ, nhận ra' },
    realize: { en: 'realize', ipa: '/ˈriː.ə.laɪz/', vi: 'chứng ngộ, thành tựu' },
    ultimate: { en: 'ultimate', ipa: '/ˈʌl.tə.mət/', vi: 'cứu cánh, rốt ráo tối hậu' },
    nirvana: { en: 'Nirvana', ipa: '/nɪrˈvɑː.nə/', vi: 'Niết Bàn (tịch tĩnh, an lạc tuyệt đối)' },
    buddhas: { en: 'Buddhas', ipa: '/ˈbʊd.əz/', vi: 'chư Phật (những bậc Giác Ngộ)' },
    buddha: { en: 'Buddha', ipa: '/ˈbʊd.ə/', vi: 'Đức Phật (Bậc Giác Ngộ)' },
    past: { en: 'past', ipa: '/pæst/', vi: 'quá khứ (đời trước)' },
    present: { en: 'present', ipa: '/ˈprez.ənt/', vi: 'hiện tại (ngay bây giờ)' },
    future: { en: 'future', ipa: '/ˈfjuː.tʃər/', vi: 'tương lai (đời vị lai)' },
    supreme: { en: 'supreme', ipa: '/sʊˈpriːm/', vi: 'vô thượng, tối cao' },
    perfect: { en: 'perfect', ipa: '/ˈpɜːr.fekt/', vi: 'viên mãn, chánh đẳng chánh giác' },
    enlightenment: { en: 'enlightenment', ipa: '/ɪnˈlaɪ.tən.mənt/', vi: 'sự Giác Ngộ (Bồ Đề)' },
    transcendent: { en: 'transcendent', ipa: '/trænˈsen.dənt/', vi: 'siêu việt, thần diệu (đại thần)' },
    bright: { en: 'bright', ipa: '/braɪt/', vi: 'sáng tỏ, đại minh' },
    mantra: { en: 'mantra', ipa: '/ˈmæn.trə/', vi: 'thần chú, chân ngôn (chú)' },
    unequaled: { en: 'unequaled', ipa: '/ʌnˈiː.kwəld/', vi: 'vô đẳng đẳng (không gì sánh bằng)' },
    removes: { en: 'removes', ipa: '/rɪˈmuːvz/', vi: 'trừ bỏ, hóa giải (trừ)' },
    proclaim: { en: 'proclaim', ipa: '/proʊˈkleɪm/', vi: 'tuyên thuyết, nói rõ (thuyết)' },
    gone: { en: 'gone', ipa: '/ɡɔːn/', vi: 'vượt qua rồi (Yết đế / Gate)' },
    completely: { en: 'completely', ipa: '/kəmˈpliːt.li/', vi: 'hoàn toàn, trọn vẹn (tăng / sam)' },
    awakening: { en: 'awakening', ipa: '/əˈweɪ.kən.ɪŋ/', vi: 'sự tỉnh thức, giác ngộ (Bồ Đề / Bodhi)' },
    svaha: { en: 'svaha', ipa: '/ˈsvɑː.hɑː/', vi: 'tát bà ha (viên mãn thành tựu)' },
    always: { en: 'always', ipa: '/ˈɔːl.weɪz/', vi: 'luôn luôn, thường hằng' },
    keep: { en: 'keep', ipa: '/kiːp/', vi: 'giữ gìn, hộ trì' },
    speak: { en: 'speak', ipa: '/spiːk/', vi: 'nói năng, thốt lời' },
    gentle: { en: 'gentle', ipa: '/ˈdʒen.təl/', vi: 'hiền hòa, dịu dàng (hòa ái)' },
    words: { en: 'words', ipa: '/wɜːrdz/', vi: 'lời nói, ngôn từ' },
    live: { en: 'live', ipa: '/lɪv/', vi: 'sống' },
    contented: { en: 'contented', ipa: '/kənˈten.tɪd/', vi: 'tri túc, biết đủ và hài lòng' },
    humble: { en: 'humble', ipa: '/ˈhʌm.bəl/', vi: 'khiêm nhường, khiêm cung' },
    life: { en: 'life', ipa: '/laɪf/', vi: 'đời sống, cuộc đời' },
    parents: { en: 'parents', ipa: '/ˈper.ənts/', vi: 'cha mẹ, song thân' },
    grandparents: { en: 'grandparents', ipa: '/ˈɡræn.per.ənts/', vi: 'ông bà' },
    loved: { en: 'loved ones', ipa: '/lʌvd wʌnz/', vi: 'người thương, quyến thuộc' },
    enjoy: { en: 'enjoy', ipa: '/ɪnˈdʒɔɪ/', vi: 'thọ hưởng, có được' },
    abundant: { en: 'abundant', ipa: '/əˈbʌn.dənt/', vi: 'dồi dào, sung túc' },
    health: { en: 'health', ipa: '/helθ/', vi: 'sức khỏe' },
    peace: { en: 'peace', ipa: '/piːs/', vi: 'sự bình an, an lạc' },
    living: { en: 'living beings', ipa: '/ˈlɪv.ɪŋ ˈbiː.ɪŋz/', vi: 'chúng sanh, muôn loài hữu tình' },
    beings: { en: 'beings', ipa: '/ˈbiː.ɪŋz/', vi: 'chúng sanh, muôn loài' },
    world: { en: 'world', ipa: '/wɜːrld/', vi: 'thế gian, cuộc đời' },
    free: { en: 'free', ipa: '/friː/', vi: 'tự do, thoát khỏi' },
    hostility: { en: 'hostility', ipa: '/hɑːˈstɪl.ə.ti/', vi: 'sự oán ghét, thù hận' },
    learning: { en: 'learning', ipa: '/ˈlɜːr.nɪŋ/', vi: 'học cách, biết' },
    love: { en: 'love', ipa: '/lʌv/', vi: 'yêu thương, từ ái' },
    protect: { en: 'protect', ipa: '/prəˈtekt/', vi: 'chở che, bảo vệ' },
    protects: { en: 'protects', ipa: '/prəˈtekts/', vi: 'che chở, bảo bọc' },
    loving: { en: 'loving', ipa: '/ˈlʌv.ɪŋ/', vi: 'hiền từ, giàu tình thương' },
    mother: { en: 'mother', ipa: '/ˈmʌð.ər/', vi: 'người mẹ hiền' },
    child: { en: 'child', ipa: '/tʃaɪld/', vi: 'đứa con' },
    cultivate: { en: 'cultivate', ipa: '/ˈkʌl.tə.veɪt/', vi: 'vun bồi, tu tập, mở rộng' },
    boundless: { en: 'boundless', ipa: '/ˈbaʊnd.ləs/', vi: 'vô lượng, không bờ bến' },
    compassion: { en: 'compassion', ipa: '/kəmˈpæʃ.ən/', vi: 'lòng từ bi' },
    east: { en: 'East', ipa: '/iːst/', vi: 'phương Đông' },
    west: { en: 'West', ipa: '/west/', vi: 'phương Tây' },
    south: { en: 'South', ipa: '/saʊθ/', vi: 'phương Nam' },
    north: { en: 'North', ipa: '/nɔːrθ/', vi: 'phương Bắc' },
    above: { en: 'above', ipa: '/əˈbʌv/', vi: 'trên cao' },
    below: { en: 'below', ipa: '/bɪˈloʊ/', vi: 'dưới thấp' },
    embraced: { en: 'embraced', ipa: '/ɪmˈbreɪst/', vi: 'được ôm ấp, thấm nhuần' },
    light: { en: 'light', ipa: '/laɪt/', vi: 'ánh sáng, hào quang' },
    bell: { en: 'bell', ipa: '/bel/', vi: 'tiếng chuông, đại hồng chung' },
    resonate: { en: 'resonate', ipa: '/ˈrez.ə.neɪt/', vi: 'ngân vang, vọng khắp' },
    dark: { en: 'dark', ipa: '/dɑːrk/', vi: 'u tối, mê mờ' },
    listen: { en: 'listen', ipa: '/ˈlɪs.ən/', vi: 'lắng nghe' },
    awaken: { en: 'awaken', ipa: '/əˈweɪ.kən/', vi: 'tỉnh thức, giác ngộ' },
    wander: { en: 'wander', ipa: '/ˈwɑːn.dər/', vi: 'lạc bước, phiêu bạt' },
    return: { en: 'return', ipa: '/rɪˈtɜːrn/', vi: 'quay về, hồi đầu' },
    waking: { en: 'waking', ipa: '/ˈweɪ.kɪŋ/', vi: 'tỉnh giấc' },
    dream: { en: 'dream', ipa: '/driːm/', vi: 'giấc mộng' },
    behold: { en: 'behold', ipa: '/bɪˈhoʊld/', vi: 'chiêm ngưỡng, nhìn thấy' },
    lotus: { en: 'lotus', ipa: '/ˈloʊ.təs/', vi: 'hoa sen' },
    wholesome: { en: 'wholesome', ipa: '/ˈhoʊl.səm/', vi: 'thiện lành, tốt đẹp' },
    merit: { en: 'merit', ipa: '/ˈmer.ɪt/', vi: 'công đức, phước báu' },
    dedicated: { en: 'dedicated', ipa: '/ˈded.ɪ.keɪ.tɪd/', vi: 'hồi hướng, gửi trao' },
    everywhere: { en: 'everywhere', ipa: '/ˈev.ri.wer/', vi: 'khắp muôn nơi' },
    sentient: { en: 'sentient beings', ipa: '/ˈsen.ʃənt ˈbiː.ɪŋz/', vi: 'chúng sanh hữu tình' },
    awakened: { en: 'awakened', ipa: '/əˈweɪ.kənd/', vi: 'giác ngộ (Phật đạo)' },
    homage: { en: 'homage', ipa: '/ˈhɑː.mɪdʒ/', vi: 'Nam Mô (kính lễ, quy y)' },
    amitabha: { en: 'Amitabha', ipa: '/ˌɑː.mɪˈtɑː.bə/', vi: 'A Di Đà (Vô Lượng Quang / Vô Lượng Thọ)' },
    infinite: { en: 'infinite', ipa: '/ˈɪn.fə.nət/', vi: 'vô lượng, vô biên' },
    all: { en: 'all', ipa: '/ɔːl/', vi: 'tất cả, nhất thiết, hết thảy (giai / nhất thiết)' },
    is: { en: 'is (be)', ipa: '/ɪz/', vi: 'là, tức là (tức thị)' },
    are: { en: 'are (be)', ipa: '/ɑːr/', vi: 'đều là (giai)' },
    not: { en: 'not', ipa: '/nɑːt/', vi: 'chẳng, không (bất)' },
    no: { en: 'no', ipa: '/noʊ/', vi: 'không có (vô)' },
    nor: { en: 'nor', ipa: '/nɔːr/', vi: 'cũng không (diệc bất)' },
    from: { en: 'from', ipa: '/frʌm/', vi: 'khỏi, với, từ' },
    and: { en: 'and', ipa: '/ænd/', vi: 'và, cùng với (cập / diệc)' },
    also: { en: 'also', ipa: '/ˈɔːl.soʊ/', vi: 'cũng như vậy (diệc phục)' },
    like: { en: 'like', ipa: '/laɪk/', vi: 'như, giống như (như)' },
    this: { en: 'this', ipa: '/ðɪs/', vi: 'này, điều này (thị)' },
    that: { en: 'that', ipa: '/ðæt/', vi: 'rằng, điều ấy' },
    the: { en: 'the', ipa: '/ðə/', vi: 'mạo từ xác định' },
    a: { en: 'a', ipa: '/ə/', vi: 'một' },
    in: { en: 'in', ipa: '/ɪn/', vi: 'trong, ở nơi (trung)' },
    there: { en: 'there', ipa: '/ðer/', vi: 'ở đó (there is = có)' },
    they: { en: 'they', ipa: '/ðeɪ/', vi: 'chúng, các pháp ấy' },
    or: { en: 'or', ipa: '/ɔːr/', vi: 'hoặc, hay là' },
    of: { en: 'of', ipa: '/ʌv/', vi: 'của, thuộc về' },
    up: { en: 'up to', ipa: '/ʌp tuː/', vi: 'cho đến (nãi chí)' },
    to: { en: 'to', ipa: '/tuː/', vi: 'đến, hướng tới' },
    age: { en: 'age (old age)', ipa: '/eɪdʒ/', vi: 'tuổi già (lão)' },
    because: { en: 'because', ipa: '/bɪˈkɔːz/', vi: 'bởi vì (dĩ... cố)' },
    nothing: { en: 'nothing', ipa: '/ˈnʌθ.ɪŋ/', vi: 'không có gì (vô sở)' },
    on: { en: 'on', ipa: '/ɑːn/', vi: 'vào, trên (rely on = y vào)' },
    so: { en: 'so', ipa: '/soʊ/', vi: 'vì thế, cho nên' },
    has: { en: 'has (have)', ipa: '/hæz/', vi: 'có (hữu)' },
    without: { en: 'without', ipa: '/wɪˈðaʊt/', vi: 'không có, chẳng chút (vô)' },
    any: { en: 'any', ipa: '/ˈen.i/', vi: 'bất kỳ' },
    far: { en: 'far', ipa: '/fɑːr/', vi: 'xa lìa (viễn ly)' },
    one: { en: 'one', ipa: '/wʌn/', vi: 'một người, bậc tu hành' },
    ones: { en: 'ones', ipa: '/wʌnz/', vi: 'những người (loved ones = người thương)' },
    know: { en: 'know', ipa: '/noʊ/', vi: 'biết rõ (tri)' },
    great: { en: 'great', ipa: '/ɡreɪt/', vi: 'lớn lao, vĩ đại (đại)' },
    which: { en: 'which', ipa: '/wɪtʃ/', vi: 'mà, điều mà' },
    truly: { en: 'truly', ipa: '/ˈtruː.li/', vi: 'chân thật, thực sự' },
    fail: { en: 'without fail', ipa: '/feɪl/', vi: 'không sai chạy (bất hư)' },
    we: { en: 'we', ipa: '/wiː/', vi: 'chúng con, chúng ta' },
    says: { en: 'says (say)', ipa: '/sez/', vi: 'nói rằng (viết)' },
    may: { en: 'may', ipa: '/meɪ/', vi: 'nguyện cầu cho (nguyện)' },
    i: { en: 'I', ipa: '/aɪ/', vi: 'con, tôi' },
    my: { en: 'my', ipa: '/maɪ/', vi: 'của con' },
    with: { en: 'with', ipa: '/wɪð/', vi: 'với, cùng' },
    be: { en: 'be', ipa: '/biː/', vi: 'được, là' },
    another: { en: 'one another', ipa: '/əˈnʌð.ər/', vi: 'lẫn nhau' },
    just: { en: 'just as', ipa: '/dʒʌst/', vi: 'cũng giống như' },
    as: { en: 'as', ipa: '/æz/', vi: 'như là' },
    her: { en: 'her', ipa: '/hɜːr/', vi: 'của mẹ, của bà' },
    only: { en: 'only', ipa: '/ˈoʊn.li/', vi: 'duy nhất' },
    toward: { en: 'toward', ipa: '/tɔːrd/', vi: 'hướng về, đối với' },
    whether: { en: 'whether', ipa: '/ˈweð.ər/', vi: 'dù cho, bất kể' },
    by: { en: 'by', ipa: '/baɪ/', vi: 'bởi' },
    through: { en: 'through', ipa: '/θruː/', vi: 'khắp qua, xuyên suốt' },
    every: { en: 'every', ipa: '/ˈev.ri/', vi: 'mọi, khắp mỗi' },
    place: { en: 'place', ipa: '/pleɪs/', vi: 'nơi chốn' },
    those: { en: 'those', ipa: '/ðoʊz/', vi: 'những ai' },
    who: { en: 'who', ipa: '/huː/', vi: 'người mà' },
    lost: { en: 'lost', ipa: '/lɔːst/', vi: 'lạc lối' },
    home: { en: 'home', ipa: '/hoʊm/', vi: 'quê nhà, bến giác' },
    long: { en: 'long', ipa: '/lɔːŋ/', vi: 'dài lâu' },
    today: { en: 'today', ipa: '/təˈdeɪ/', vi: 'hôm nay' },
    together: { en: 'together', ipa: '/təˈɡeð.ər/', vi: 'cùng nhau, đồng' },
    way: { en: 'way', ipa: '/weɪ/', vi: 'con đường, đạo lớn' },

    // --- Từ tiếng Việt trong các bài kinh ánh xạ sang từ vựng Tiếng Anh ---
    quán: { en: 'contemplate / observe', ipa: '/ˈkɑːn.təm.pleɪt/', vi: 'quán chiếu sâu sắc' },
    tâm: { en: 'mind / heart', ipa: '/maɪnd/', vi: 'tâm thức, lòng người' },
    kinh: { en: 'sutra / scripture', ipa: '/ˈsuː.trə/', vi: 'kinh điển Phật giáo' },
    hành: { en: 'practice / formation', ipa: '/ˈpræk.tɪs/', vi: 'thực hành; tâm hành' },
    thâm: { en: 'deep / profound', ipa: '/prəˈfaʊnd/', vi: 'thâm sâu, uyên thâm' },
    chiếu: { en: 'illuminate / shine', ipa: '/ɪˈluː.mə.neɪt/', vi: 'soi sáng, chiếu tỏ' },
    kiến: { en: 'see / perceive', ipa: '/pərˈsiːv/', vi: 'nhìn thấy tỏ tường' },
    ngũ: { en: 'five', ipa: '/faɪv/', vi: 'số năm (5)' },
    uẩn: { en: 'aggregates (skandhas)', ipa: '/ˈæɡ.rɪ.ɡəts/', vi: 'năm uẩn: sắc, thọ, tưởng, hành, thức' },
    không: { en: 'emptiness (shunyata)', ipa: '/ˈemp.ti.nəs/', vi: 'tính Không, vô ngã' },
    độ: { en: 'transform / liberate', ipa: '/ˈlɪb.ə.reɪt/', vi: 'vượt qua, cứu độ' },
    khổ: { en: 'suffering (dukkha)', ipa: '/ˈsʌf.ər.ɪŋ/', vi: 'nỗi khổ, sự bức bách' },
    ách: { en: 'distress / hardship', ipa: '/dɪˈstres/', vi: 'tai ách, chướng nạn' },
    sắc: { en: 'form / matter', ipa: '/fɔːrm/', vi: 'hình sắc vật chất' },
    thọ: { en: 'feeling / sensation', ipa: '/ˈfiː.lɪŋ/', vi: 'cảm thọ buồn vui' },
    tưởng: { en: 'perception', ipa: '/pərˈsep.ʃən/', vi: 'tri giác, tưởng tượng' },
    thức: { en: 'consciousness', ipa: '/ˈkɑːn.ʃəs.nəs/', vi: 'nhận thức phân biệt' },
    pháp: { en: 'dharma / phenomenon', ipa: '/ˈdɑːr.mə/', vi: 'giáo pháp; vạn vật hiện tượng' },
    tướng: { en: 'characteristic / mark', ipa: '/mɑːrk/', vi: 'hình tướng, đặc tính' },
    sanh: { en: 'birth / arising', ipa: '/bɜːrθ/', vi: 'sinh khởi' },
    diệt: { en: 'cessation / passing away', ipa: '/seˈseɪ.ʃən/', vi: 'hoại diệt, lắng yên' },
    tịnh: { en: 'pure / serene', ipa: '/pjʊr/', vi: 'thanh tịnh, trong sáng' },
    nhãn: { en: 'eye / vision', ipa: '/aɪ/', vi: 'con mắt' },
    nhĩ: { en: 'ear / hearing', ipa: '/ɪr/', vi: 'đôi tai' },
    tỷ: { en: 'nose / smell', ipa: '/noʊz/', vi: 'mũi' },
    thiệt: { en: 'tongue / taste', ipa: '/tʌŋ/', vi: 'lưỡi' },
    thân: { en: 'body', ipa: '/ˈbɑː.di/', vi: 'thân thể' },
    ý: { en: 'mind / thought', ipa: '/maɪnd/', vi: 'ý nghĩ, tâm ý' },
    minh: { en: 'clarity / wisdom', ipa: '/ˈwɪz.dəm/', vi: 'sự sáng suốt (vô minh = ignorance)' },
    lão: { en: 'old age / aging', ipa: '/ˈeɪ.dʒɪŋ/', vi: 'sự già nua' },
    tử: { en: 'death', ipa: '/deθ/', vi: 'sự qua đời' },
    đạo: { en: 'path / way (Tao)', ipa: '/pæθ/', vi: 'con đường tu tập giác ngộ' },
    trí: { en: 'wisdom', ipa: '/ˈwɪz.dəm/', vi: 'trí tuệ sáng suốt' },
    đắc: { en: 'attainment', ipa: '/əˈteɪn.mənt/', vi: 'đạt được, chứng đắc' },
    ngại: { en: 'hindrance / obstacle', ipa: '/ˈhɪn.drəns/', vi: 'chướng ngại trong tâm' },
    mộng: { en: 'dream / illusion', ipa: '/driːm/', vi: 'giấc mộng hư ảo' },
    phật: { en: 'Buddha (The Awakened One)', ipa: '/ˈbʊd.ə/', vi: 'Bậc Giác Ngộ hoàn toàn' },
    chú: { en: 'mantra', ipa: '/ˈmæn.trə/', vi: 'chân ngôn, thần chú' },
    nguyện: { en: 'vow / may (wish)', ipa: '/vaʊ/', vi: 'lời phát nguyện chân thành' },
    từ: { en: 'loving-kindness (metta)', ipa: '/ˈlʌv.ɪŋ ˈkaɪnd.nəs/', vi: 'lòng từ, ban vui' },
    bi: { en: 'compassion (karuna)', ipa: '/kəmˈpæʃ.ən/', vi: 'lòng bi, cứu khổ' },
    an: { en: 'peace / serenity', ipa: '/piːs/', vi: 'bình an, thư thái' },
    lạc: { en: 'joy / happiness', ipa: '/dʒɔɪ/', vi: 'niềm vui thanh tịnh' },
    chuông: { en: 'temple bell', ipa: '/bel/', vi: 'tiếng chuông thức tỉnh' },
    sen: { en: 'lotus flower', ipa: '/ˈloʊ.təs/', vi: 'hoa sen thuần khiết' },
    công: { en: 'merit / virtue', ipa: '/ˈmer.ɪt/', vi: 'công đức lành' },
    đức: { en: 'virtue / merit', ipa: '/ˈvɜːr.tʃuː/', vi: 'phẩm hạnh, phước đức' }
  },

  meditationDurations: [3, 5, 10, 15, 25],

  // Công đức cho từng việc thiện. Khi có server, server mới là nơi quyết định (xem REWARDS trong server.py)
  meritRewards: {
    greeting: { amount: 2, label: 'Khởi tâm thiện lành' },
    pet_cat: { amount: 3, label: 'Vuốt ve mèo chùa' },
    fish_food: { amount: 3, label: 'Phóng sinh & Cho cá ăn' },
    tea: { amount: 4, label: 'Thưởng trà tĩnh tâm' },
    dharma_talk: { amount: 5, label: 'Lắng nghe lời Pháp thoại' },
    incense: { amount: 10, label: 'Dâng nén tâm hương' },
    wooden_fish: { amount: 1, label: 'Tịnh tâm gõ mõ' },
    bell: { amount: 3, label: 'Thỉnh Đại Hồng Chung' },
    fortune: { amount: 5, label: 'Xin quẻ đầu ngày' },
    love_blessing: { amount: 5, label: 'Xin Chỉ Đỏ Cầu Duyên' },
    wish: { amount: 8, label: 'Treo Thẻ Nguyện Ước' },
    bless: { amount: 2, label: 'Chúc phúc đồng tu' },
    lantern: { amount: 8, label: 'Thả Đèn Hoa Đăng' },
    sweep_leaf: { amount: 2, label: 'Quét lá sân chùa' },
    sweep_trash: { amount: 3, label: 'Nhặt rác giữ chùa sạch' },
    clean_temple: { amount: 15, label: 'Công đức viên mãn' },
    meditation: { amount: 10, label: 'Tĩnh tọa thiền định' },
    sutra_complete: { amount: 20, label: 'Viên mãn thời kinh' },
    bow: { amount: 3, label: 'Đảnh lễ Tam Bảo' },
    event_cong_phu: { amount: 20, label: 'Tụng kinh thời công phu' },
    event_le: { amount: 15, label: 'Dâng hương ngày Sóc Vọng' },
    event_hoa_dang: { amount: 15, label: 'Thả đèn Đêm Hoa Đăng' },
    event_dai_le: { amount: 30, label: 'Hành lễ ngày đại lễ' }
  },

  accessories: [
    { id: 'none', name: 'Không mang', icon: '✨', minMerit: 0 },
    { id: 'non_la', name: 'Nón Lá Quê Hương', icon: '👒', minMerit: 0 },
    { id: 'trang_hat', name: 'Tràng Hạt Trầm Hương', icon: '📿', minMerit: 0 },
    { id: 'hoa_sen', name: 'Nhành Sen Hồng', icon: '🪷', minMerit: 20 },
    { id: 'long_den', name: 'Lồng Đèn Hội An', icon: '🏮', minMerit: 50 },
    { id: 'hao_quang', name: 'Vầng Sáng Tâm Tịnh', icon: '🌟', minMerit: 100 }
  ],

  titles: [
    { minMerit: 0, title: 'Khách Thập Phương' },
    { minMerit: 20, title: 'Người Gieo Hạt Lành' },
    { minMerit: 50, title: 'Phật Tử Chăm Chỉ' },
    { minMerit: 100, title: 'Tâm Sen Thanh Tịnh' },
    { minMerit: 200, title: 'Bậc Thiện Tri Thức' },
    { minMerit: 400, title: 'Hộ Pháp An Yên' }
  ],

  fortunes: [
    {
      number: 'Đệ Nhất Quẻ',
      rank: 'Thượng Thượng Cát',
      badgeColor: '#d94848',
      title: 'Liên Hoa Nở Rộ Giữa Hồ Thu',
      poem: [
        'Sen hồng nở giữa mặt hồ trong,',
        'Gió mát trăng thanh thỏa nỗi lòng.',
        'Mọi việc mưu cầu đều thuận lợi,',
        'Công thành danh toại phúc mênh mông.'
      ],
      meaning: 'Quẻ đại cát đại lợi. Tâm bạn đang sáng và thiện lành, những nỗ lực bền bỉ bấy lâu sắp đơm hoa kết trái.',
      career: 'Công việc hanh thông, gặp quý nhân nâng đỡ, thích hợp bắt đầu dự án mới.',
      love: 'Nhân duyên hòa hợp, người độc thân dễ gặp người tri kỷ nơi chẳng ngờ.',
      advice: 'Giữ tâm khiêm cung, chia sẻ may mắn cho người xung quanh qua những việc thiện nhỏ.'
    },
    {
      number: 'Đệ Nhị Quẻ',
      rank: 'Thượng Cát',
      badgeColor: '#d4882a',
      title: 'Mưa Xuân Tưới Mát Chồi Non',
      poem: [
        'Đất khô gặp trận mưa xuân mới,',
        'Cây cỏ đâm chồi đón nắng tươi.',
        'Chậm rãi từng bước đừng nóng vội,',
        'Cuối đường hoa nở rạng niềm vui.'
      ],
      meaning: 'Những khó khăn cũ đang dần qua đi, nhường chỗ cho vận hội mới tốt lành hơn.',
      career: 'Tiến triển vững chắc. Đừng ngại học hỏi thêm kỹ năng mới.',
      love: 'Tình cảm nảy nở tự nhiên như mưa dầm thấm lâu, hãy lắng nghe nhau nhiều hơn.',
      advice: 'Hôm nay hãy dành 10 phút hít thở sâu, uống một tách trà ấm và mỉm cười.'
    },
    {
      number: 'Đệ Tam Quẻ',
      rank: 'Đại Cát',
      badgeColor: '#d94848',
      title: 'Thuyền Xuôi Gió Thuận Vượt Trùng Khơi',
      poem: [
        'Cánh buồm no gió lướt nhanh nhanh,',
        'Biển rộng trời cao sóng lượn lành.',
        'Vững tay chèo lái tâm kiên định,',
        'Bến bờ hạnh phúc sớm viên thành.'
      ],
      meaning: 'Thời cơ thuận lợi đang đến. Khi tâm không dao động, bạn sẽ đi rất xa.',
      career: 'Được cấp trên và đồng nghiệp tin tưởng, tài lộc dồi dào.',
      love: 'Đôi lứa đồng lòng, cùng nhìn về một hướng.',
      advice: 'Biết ơn những người đã đồng hành cùng bạn trong lúc gian khó.'
    },
    {
      number: 'Đệ Tứ Quẻ',
      rank: 'Trung Bình - Hướng Cát',
      badgeColor: '#4f8a6e',
      title: 'Trăng Khuất Sau Mây Rồi Lại Sáng',
      poem: [
        'Mây mờ che khuất ánh trăng rằm,',
        'Chớ vội thở than dạ băn khoăn.',
        'Gió thổi mây tan trời lại sáng,',
        'Bình tâm tĩnh trí vượt khó khăn.'
      ],
      meaning: 'Hiện tại có thể còn đôi chút bối rối, nhưng chỉ là thử thách tạm thời để rèn luyện sự kiên nhẫn.',
      career: 'Cẩn trọng trong lời nói và quyết định vội vàng; chậm mà chắc.',
      love: 'Tránh hiểu lầm nhỏ nhặt, hãy dùng sự dịu dàng để hóa giải.',
      advice: 'Ra sân chùa quét vài chiếc lá rụng, bạn sẽ thấy lòng mình nhẹ nhõm hơn.'
    },
    {
      number: 'Đệ Ngũ Quẻ',
      rank: 'Thượng Cát',
      badgeColor: '#d4882a',
      title: 'Chim Hạc Bay Về Núi Thanh Lương',
      poem: [
        'Hạc trắng tung cánh giữa tầng mây,',
        'Tâm an vạn sự hóa sum vầy.',
        'Gieo nhân thiện lành gặt quả ngọt,',
        'Phước báu theo về khắp cỏ cây.'
      ],
      meaning: 'Nhờ lòng tốt và sự chân thành, bạn luôn được bình an che chở.',
      career: 'Danh tiếng tốt, hợp tác làm ăn gặp người ngay thẳng.',
      love: 'Mối lương duyên trong sáng, chân thành và bền chặt.',
      advice: 'Hãy gửi một lời chúc tốt đẹp đến một người bạn lâu ngày chưa hỏi thăm.'
    },
    {
      number: 'Đệ Lục Quẻ',
      rank: 'Trung Cát',
      badgeColor: '#4f8a6e',
      title: 'Tre Già Măng Mọc Vững Gốc Xanh',
      poem: [
        'Rễ sâu bám đất chẳng sợ giông,',
        'Tre nghiêng trước gió vẫn bền lòng.',
        'Kiên trì vun đắp nền tảng vững,',
        'Ngày mai gặt hái quả thành công.'
      ],
      meaning: 'Mọi thành tựu lớn đều bắt đầu từ những bước nhỏ kiên trì mỗi ngày.',
      career: 'Tập trung hoàn thành tốt việc đang dang dở thay vì ôm đồm quá nhiều.',
      love: 'Cần sự sẻ chia và vun đắp từ những điều giản dị hàng ngày.',
      advice: 'Chăm sóc sức khỏe bản thân, ngủ sớm hơn một chút vào tối nay.'
    },
    {
      number: 'Đệ Thất Quẻ',
      rank: 'Thượng Thượng Cát',
      badgeColor: '#d94848',
      title: 'Chuông Chùa Ngân Vang Thức Tỉnh Tâm',
      poem: [
        'Tiếng chuông ngân vọng khắp non ngàn,',
        'Phiền não tan theo khói trầm lan.',
        'Trí sáng tâm minh đường rộng mở,',
        'Gia đạo bình yên phúc ngập tràn.'
      ],
      meaning: 'Một sự khai sáng hoặc ý tưởng tuyệt vời sắp đến với bạn khi tâm trí thư giãn.',
      career: 'Sáng tạo đột phá, tháo gỡ được nút thắt bấy lâu.',
      love: 'Tình cảm gắn kết sâu sắc bằng sự thấu hiểu.',
      advice: 'Thắp một nén hương trầm và lắng nghe tiếng chuông chùa để nạp lại năng lượng.'
    },
    {
      number: 'Đệ Bát Quẻ',
      rank: 'Thượng Cát',
      badgeColor: '#d4882a',
      title: 'Cá Chép Hóa Rồng Nơi Vũ Môn',
      poem: [
        'Vượt qua thác lớn cá hóa rồng,',
        'Bao ngày khổ luyện chẳng hoài công.',
        'Tin ở chính mình thêm bền chí,',
        'Trời quang mây tạnh ánh dương hồng.'
      ],
      meaning: 'Sự cố gắng thầm lặng của bạn sắp được đền đáp xứng đáng.',
      career: 'Thi cử đỗ đạt, thăng tiến hoặc hoàn thành mục tiêu quan trọng.',
      love: 'Sau thử thách, hai người càng thêm trân quý nhau.',
      advice: 'Hãy tin tưởng vào giá trị của bản thân và tiếp tục bước tới.'
    }
  ],

  loveBlessings: [
    {
      title: 'Quẻ Duyên: Tương Phùng Dưới Hiên Mưa',
      ribbon: 'Chỉ Đỏ Tương Phùng',
      poem: 'Hữu duyên thiên lý năng tương ngộ,\nMột ánh nhìn trao ấm cả mùa.',
      message: 'Nhân duyên của bạn không ở đâu xa, hãy mở lòng đón nhận những cuộc trò chuyện tình cờ với tâm thế vui vẻ, tự nhiên nhất.'
    },
    {
      title: 'Quẻ Duyên: Sen Hồng Đồng Tâm',
      ribbon: 'Chỉ Đỏ Đồng Tâm',
      poem: 'Hai đóa sen chung một gốc lành,\nHương thơm dịu ngọt dưới trời xanh.',
      message: 'Tình cảm bền lâu nhất là tình cảm bắt đầu từ sự đồng điệu trong tâm hồn và sự tôn trọng lẫn nhau.'
    },
    {
      title: 'Quẻ Duyên: Trăng Sáng Bên Hồ',
      ribbon: 'Chỉ Đỏ Tri Kỷ',
      poem: 'Trăng soi đáy nước trong ngần,\nNgười thương ở riêng một góc gần bên tâm.',
      message: 'Trước khi gặp người thương mình trọn vẹn, hãy yêu thương và trân trọng chính bản thân mình thật tốt nhé.'
    },
    {
      title: 'Quẻ Duyên: Hoa Đào Nở Muộn Mà Bền',
      ribbon: 'Chỉ Đỏ Bình Yên',
      poem: 'Chẳng cần vội vã tìm kiếm xa,\nHoa nở đúng mùa sẽ thiết tha.',
      message: 'Đừng sốt ruột nếu duyên lành đến muộn. Những gì thuộc về chân tâm sẽ đến vào thời khắc đẹp đẽ nhất.'
    }
  ],

  monkQuotes: [
    '“Tâm bình thế giới bình, tâm an vạn sự an.”',
    '“Quét bụi sân chùa cũng là quét đi bụi trần trong tâm.”',
    '“Một nén tâm hương quý hơn vạn mâm cỗ đầy.”',
    '“Hạnh phúc không nằm ở đích đến, mà ở từng bước chân an lạc.”',
    '“Gặp nhau nơi cửa Phật đã là một chữ Duyên lành.”',
    '“Buông xuống một chút nóng giận, nhặt lên một phần bình yên.”'
  ],

  // Vấn đạo Sư Thầy Tuệ Tâm theo tâm trạng của thí chủ
  dharmaTalks: [
    {
      id: 'ap_luc',
      label: '💼 Đang áp lực công việc & lo âu tương lai',
      title: 'Pháp Thoại: Đi Từng Bước An Nhiên Giữa Dòng Đời Vội Vã',
      verse: [
        'Nước chảy mây trôi vốn tự nhiên,',
        'Lo chi ngày tháng chưa tới miền.',
        'Chăm trồng hạt giống ngay giây phút,',
        'Hoa nở đúng mùa tự bình yên.'
      ],
      teaching: 'Thí chủ à, sở dĩ lòng nặng trĩu là vì thân đang ở hiện tại nhưng tâm lại chạy về những điều chưa xảy tới. Việc lớn mấy cũng gồm từ từng việc nhỏ. Hãy quay về với hơi thở, làm trọn vẹn từng việc trước mắt với tâm bình thản, nhân lành đủ đầy thì quả ngọt ắt tự thành.',
      practiceLabel: '🧘 Vào Chính Điện ngồi thiền 3 phút tĩnh tâm',
      practiceAction: 'meditate'
    },
    {
      id: 'tinh_duyen',
      label: '💔 Buồn phiền chuyện tình cảm, nhân duyên chưa trọn',
      title: 'Pháp Thoại: Chữ Duyên Đủ Thì Hợp, Hết Thì Buông Nhẹ Nhàng',
      verse: [
        'Lá rụng về cội chẳng oán cành,',
        'Gặp nhau một đoạn đã duyên lành.',
        'Thương mình như đóa sen đầu hạ,',
        'Hương tự tỏa ngát dưới trời xanh.'
      ],
      teaching: 'Trong nhà Phật, mọi cuộc gặp gỡ đều do nhân duyên hội đủ. Nếu duyên còn sâu, ngàn dặm vẫn tương phùng; nếu duyên đã cạn, cưỡng cầu chỉ thêm khổ lụy. Hãy trân trọng những kỷ niệm đẹp, yêu thương chính mình thật nhiều, khi tâm con an định thì nhân duyên chân thật sẽ tự tìm về.',
      practiceLabel: '🪷 Ra Hồ Sen thả một ngọn Hoa Đăng buông xả',
      practiceAction: 'lantern'
    },
    {
      id: 'nong_gian',
      label: '🔥 Tâm đang nóng giận, bức bối, khó tha thứ',
      title: 'Pháp Thoại: Rải Nước Cam Lồ Dập Lửa Sân Hận',
      verse: [
        'Nóng giận như cầm than đỏ hồng,',
        'Chưa ném người kia đã bỏng lòng.',
        'Một niệm từ bi cơn mưa mát,',
        'Bụi trần lắng xuống nước trong ngần.'
      ],
      teaching: 'Cơn giận giống như nắm than hồng trong tay định ném vào người khác, nhưng người bị bỏng trước tiên chính là mình. Tha thứ cho người không phải vì họ xứng đáng, mà vì chính con xứng đáng được bình yên. Hãy hít vào thật sâu và tụng vài câu Kinh Từ Bi để làm dịu ngọn lửa trong lòng.',
      practiceLabel: '📿 Vào Chính Điện tụng Kinh Từ Bi',
      practiceAction: 'chant_tu_bi'
    },
    {
      id: 'co_don',
      label: '🌧️ Cảm thấy cô đơn, trống trải, mất phương hướng',
      title: 'Pháp Thoại: Quay Về Nương Tựa Hải Đảo Tự Thân',
      verse: [
        'Đêm tối mịt mù ngỡ lạc chân,',
        'Ngước nhìn trăng sáng vẫn trong ngần.',
        'Quét sạch lá khô nơi bậc đá,',
        'Thấy cả mùa xuân ở rất gần.'
      ],
      teaching: 'Khi thấy lòng trống trải, đừng vội chạy tìm sự ồn ào bên ngoài. Hãy thử cầm chiếc chổi tre, chậm rãi quét từng chiếc lá vàng trên sân chùa, lắng nghe tiếng chuông gió và tiếng chim hót. Khi thân và tâm cùng ở một nơi, con sẽ thấy mình luôn được đất trời và Tam Bảo ôm ấp.',
      practiceLabel: '🧹 Cầm chổi tre quét lá vàng sân chùa',
      practiceAction: 'sweep'
    },
    {
      id: 'gia_dao',
      label: '🏡 Cầu bình an, sức khỏe cho cha mẹ & gia đình',
      title: 'Pháp Thoại: Hiếu Tâm Là Phước Điền Tối Thượng',
      verse: [
        'Cha mẹ tại đường như Phật sống,',
        'Một lời êm ấm quý hơn vàng.',
        'Hương tâm dâng trọn lòng hiếu thảo,',
        'Phước đức sum vầy khắp thế gian.'
      ],
      teaching: 'Tấm lòng hiếu thảo nghĩ nhớ đến cha mẹ và gia đình là một đại thiện nghiệp. Bên cạnh nén hương cầu nguyện trước Tam Bảo, món quà lớn nhất con có thể dâng tặng gia đình chính là sự bình an, nụ cười hiền hòa và những lời hỏi thăm ấm áp mỗi ngày.',
      practiceLabel: '🪔 Dâng nén Tâm Hương cầu an gia đạo',
      practiceAction: 'incense'
    }
  ],

  defaultWishes: [
    { id: 'w1', author: 'Minh Anh', title: 'Tâm Sen Thanh Tịnh', category: 'Gia đạo', text: 'Cầu mong cha mẹ luôn mạnh khỏe, bình an và vui vẻ mỗi ngày.', blessings: 18, time: '10 phút trước' },
    { id: 'w2', author: 'Hoàng Nam', title: 'Khách Thập Phương', category: 'Sự nghiệp', text: 'Mong kỳ thi sắp tới tâm trí sáng suốt, đạt kết quả tốt đẹp.', blessings: 12, time: '25 phút trước' },
    { id: 'w3', author: 'Thảo Vy', title: 'Người Gieo Hạt Lành', category: 'Tình duyên', text: 'Nguyện gặp được người chân thành, cùng nhau đi qua năm tháng bình dị.', blessings: 24, time: '1 giờ trước' },
    { id: 'w4', author: 'Khánh Duy', title: 'Phật Tử Chăm Chỉ', category: 'Bình an', text: 'Chúc cho tất cả mọi người ghé thăm chùa online hôm nay đều nhẹ lòng, hết muộn phiền.', blessings: 39, time: '2 giờ trước' }
  ],

  defaultLanterns: [
    { id: 'l1', author: 'Minh Anh', color: '#ff7eb3', text: 'Bình an cho gia đình', x: 260, y: 610 },
    { id: 'l2', author: 'Thảo Vy', color: '#ffd166', text: 'Sức khỏe & Hạnh phúc', x: 340, y: 690 },
    { id: 'l3', author: 'An Nhiên', color: '#ffffff', text: 'Tâm luôn tĩnh lặng', x: 210, y: 740 },
    { id: 'l4', author: 'Hoàng Nam', color: '#c792ea', text: 'Vạn sự hanh thông', x: 375, y: 640 }
  ]
};
