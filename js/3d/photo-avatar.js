// Tạo nhân vật từ ảnh chân dung, xử lý hoàn toàn trong trình duyệt (ảnh gốc không được gửi lên server)
// - MediaPipe Face Landmarker: 478 điểm trên khuôn mặt -> dáng mặt, cỡ mắt, miệng, mũi, râu, kính, màu da
// - MediaPipe Hair Segmenter: tách vùng tóc -> màu tóc, độ dài, có mái hay không, đầu cạo
// - Tạo thêm ảnh mặt hoạt hình 128px (làm mịn, giảm màu, viền nét) để người chơi tuỳ chọn dán lên nhân vật

const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAIR_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite';

// Đường viền khuôn mặt theo thứ tự trong bản đồ điểm của MediaPipe
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

let visionPromise = null;
let landmarkerPromise = null;
let hairPromise = null;

function getVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const vision = await import(`${VISION_URL}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);
      return { vision, fileset };
    })().catch((err) => {
      visionPromise = null;
      throw err;
    });
  }
  return visionPromise;
}

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { vision, fileset } = await getVision();
      return vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL },
        runningMode: 'IMAGE',
        numFaces: 1,
        outputFaceBlendshapes: true
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

async function getHairSegmenter() {
  if (!hairPromise) {
    hairPromise = (async () => {
      const { vision, fileset } = await getVision();
      return vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAIR_MODEL_URL },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });
    })().catch((err) => {
      hairPromise = null;
      throw err;
    });
  }
  return hairPromise;
}

// Mặt nạ tóc: mảng 0/1 cùng kích thước ảnh. Không tải được mô hình tóc thì trả về null để dùng cách ước lượng cũ
async function hairMask(canvas) {
  try {
    const segmenter = await getHairSegmenter();
    let out = null;
    segmenter.segment(canvas, (result) => {
      const mask = result.categoryMask;
      if (mask) {
        out = { data: mask.getAsUint8Array().slice(), width: mask.width, height: mask.height };
        mask.close();
      }
    });
    return out;
  } catch (err) {
    return null;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này.'));
    };
    img.src = url;
  });
}

const lum = c => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
const toHex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const colorDistance = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

// Màu trung bình quanh một điểm, bỏ 15% điểm tối nhất và sáng nhất (bóng đổ, lóa sáng)
function sampleColor(img, cx, cy, radius) {
  const { data, width, height } = img;
  const pixels = [];
  const r = Math.max(1, Math.round(radius));
  for (let y = Math.round(cy) - r; y <= Math.round(cy) + r; y++) {
    for (let x = Math.round(cx) - r; x <= Math.round(cx) + r; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * 4;
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  if (!pixels.length) return null;
  pixels.sort((a, b) => lum(a) - lum(b));
  const kept = pixels.slice(Math.floor(pixels.length * 0.15), Math.ceil(pixels.length * 0.85));
  const n = kept.length || 1;
  return kept.reduce((acc, p) => ({ r: acc.r + p.r / n, g: acc.g + p.g / n, b: acc.b + p.b / n }), { r: 0, g: 0, b: 0 });
}

function stylizeSkin(c) {
  return { r: Math.min(255, c.r * 1.08 + 8), g: Math.min(255, c.g * 1.08 + 6), b: Math.min(255, c.b * 1.08 + 4) };
}

function nearestId(list, hex) {
  const parse = h => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
  const target = parse(hex);
  let best = list[0];
  let bestD = Infinity;
  for (const item of list) {
    const d = colorDistance(parse(item.color), target);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best.id;
}

// Phân tích vùng tóc: màu, độ dài, mái, đầu cạo
function analyzeHair(mask, img, P, faceW, faceH) {
  const { data: m, width, height } = mask;
  const sx = width / img.width;
  const sy = height / img.height;
  const top = P(10);
  const chin = P(152);
  const left = P(234);
  const right = P(454);

  let count = 0;
  let bottom = 0;
  const colors = [];
  const step = Math.max(1, Math.round(Math.min(width, height) / 200));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (!m[y * width + x]) continue;
      const ix = x / sx;
      const iy = y / sy;
      // Chỉ tính tóc quanh đầu người chính trong ảnh
      if (ix < left.x - faceW * 0.9 || ix > right.x + faceW * 0.9 || iy > chin.y + faceH * 1.6) continue;
      count++;
      if (ix < left.x - faceW * 0.05 || ix > right.x + faceW * 0.05) bottom = Math.max(bottom, iy);
      if (colors.length < 4000) {
        const i = (Math.round(iy) * img.width + Math.round(ix)) * 4;
        colors.push({ r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] });
      }
    }
  }
  const faceArea = (faceW * faceH) / (step * step / (sx * sy));
  if (count < faceArea * 0.12) return { bald: true };

  colors.sort((a, b) => lum(a) - lum(b));
  const mid = colors.slice(Math.floor(colors.length * 0.25), Math.ceil(colors.length * 0.75));
  const n = mid.length || 1;
  const color = mid.reduce((acc, c) => ({ r: acc.r + c.r / n, g: acc.g + c.g / n, b: acc.b + c.b / n }), { r: 0, g: 0, b: 0 });

  // Mái: tóc che phần trán giữa hai chân mày và đường chân tóc
  const browY = (P(105).y + P(334).y) / 2;
  let fringe = 0;
  let total = 0;
  for (let iy = top.y + (browY - top.y) * 0.25; iy < browY; iy += 2) {
    for (let ix = P(54).x; ix < P(284).x; ix += 2) {
      const mx = Math.round(ix * sx);
      const my = Math.round(iy * sy);
      if (mx < 0 || my < 0 || mx >= width || my >= height) continue;
      total++;
      if (m[my * width + mx]) fringe++;
    }
  }
  const earY = (left.y + right.y) / 2;
  let length = 'short';
  if (bottom > chin.y + faceH * 0.2) length = 'long';
  else if (bottom > (earY + chin.y) / 2) length = 'bob';
  return { bald: false, color, length, bangs: total > 0 && fringe / total > 0.45 };
}

// Ảnh mặt hoạt hình 128x128: làm mịn, giảm số màu, viền nét tối, cắt theo đường viền khuôn mặt
function cartoonFace(sourceCanvas, P) {
  const pts = FACE_OVAL.map(P);
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const size = Math.max(maxX - minX, maxY - minY) * 1.04;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const S = 128;

  const work = document.createElement('canvas');
  work.width = work.height = S;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, cx - size / 2, cy - size / 2, size, size, 0, 0, S, S);
  const img = ctx.getImageData(0, 0, S, S);
  const src = img.data;

  // Làm mịn 2 lượt (box blur 3x3) để mất chi tiết da, giữ mảng màu lớn
  let buf = new Float32Array(src);
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(buf.length);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue;
              sum += buf[(yy * S + xx) * 4 + c];
              cnt++;
            }
          }
          out[(y * S + x) * 4 + c] = sum / cnt;
        }
        out[(y * S + x) * 4 + 3] = 255;
      }
    }
    buf = out;
  }

  // Độ lớn biên (Sobel) trên ảnh đã làm mịn để vẽ nét viền
  const L = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) L[i] = buf[i * 4] * 0.299 + buf[i * 4 + 1] * 0.587 + buf[i * 4 + 2] * 0.114;
  const edges = new Float32Array(S * S);
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const g = (i, j) => L[(y + j) * S + (x + i)];
      const gx = -g(-1, -1) - 2 * g(-1, 0) - g(-1, 1) + g(1, -1) + 2 * g(1, 0) + g(1, 1);
      const gy = -g(-1, -1) - 2 * g(0, -1) - g(1, -1) + g(-1, 1) + 2 * g(0, 1) + g(1, 1);
      edges[y * S + x] = Math.hypot(gx, gy);
    }
  }
  const sorted = Array.from(edges).sort((a, b) => b - a);
  const threshold = Math.max(40, sorted[Math.floor(sorted.length * 0.11)]);

  // Mặt nạ hình khuôn mặt, viền mềm
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = S;
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  mctx.filter = 'blur(2px)';
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  pts.forEach((p, i) => {
    const x = (p.x - (cx - size / 2)) / size * S;
    const y = (p.y - (cy - size / 2)) / size * S;
    if (i === 0) mctx.moveTo(x, y);
    else mctx.lineTo(x, y);
  });
  mctx.closePath();
  mctx.fill();
  const mask = mctx.getImageData(0, 0, S, S).data;

  const levels = 6;
  const q = v => Math.round(v / 255 * (levels - 1)) / (levels - 1) * 255;
  for (let i = 0; i < S * S; i++) {
    // Giảm số màu và tăng nhẹ độ tươi
    let r = q(Math.min(255, buf[i * 4] * 1.06 + 6));
    let g = q(Math.min(255, buf[i * 4 + 1] * 1.05 + 5));
    let b = q(Math.min(255, buf[i * 4 + 2] * 1.04 + 4));
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 1.15;
    g = avg + (g - avg) * 1.15;
    b = avg + (b - avg) * 1.15;
    if (edges[i] > threshold) {
      const k = Math.min(1, (edges[i] - threshold) / threshold + 0.55);
      r = r * (1 - k) + 58 * k;
      g = g * (1 - k) + 36 * k;
      b = b * (1 - k) + 24 * k;
    }
    src[i * 4] = r;
    src[i * 4 + 1] = g;
    src[i * 4 + 2] = b;
    src[i * 4 + 3] = mask[i * 4 + 3] > 0 ? mask[i * 4] : 0;
  }
  ctx.putImageData(img, 0, 0);
  return work.toDataURL('image/png');
}

export async function analyzePhoto(file, onStatus = () => {}) {
  onStatus('Đang tải bộ nhận diện khuôn mặt (lần đầu mất vài giây)…');
  const landmarker = await getLandmarker();
  onStatus('Đang đọc ảnh…');
  const { img, url } = await loadImage(file);

  try {
    const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h);

    onStatus('Đang nhận diện khuôn mặt…');
    const result = landmarker.detect(canvas);
    if (!result.faceLandmarks || !result.faceLandmarks.length) {
      throw new Error('Không tìm thấy khuôn mặt. Hãy dùng ảnh chụp chính diện, đủ sáng, thấy rõ mặt.');
    }
    const lm = result.faceLandmarks[0];
    const P = i => ({ x: lm[i].x * w, y: lm[i].y * h });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const top = P(10);
    const chin = P(152);
    const faceH = dist(top, chin);
    const faceW = dist(P(234), P(454));
    if (faceW < 60) throw new Error('Khuôn mặt trong ảnh quá nhỏ, hãy chụp gần hơn.');

    // Dáng mặt
    const ratio = faceH / faceW;
    const jawRatio = dist(P(172), P(397)) / faceW;
    let faceShape = 'trai_xoan';
    if (ratio > 1.42) faceShape = 'dai';
    else if (jawRatio > 0.86) faceShape = 'vuong';
    else if (ratio < 1.22) faceShape = 'tron';

    // Cỡ mắt, miệng, mũi so với bề ngang khuôn mặt
    const eyeW = (dist(P(33), P(133)) + dist(P(362), P(263))) / 2 / faceW;
    const eyeSize = eyeW > 0.235 ? 'to' : eyeW < 0.2 ? 'nho' : 'vua';
    const mouthW = dist(P(61), P(291)) / faceW;
    const mouth = mouthW > 0.43 ? 'rong' : mouthW < 0.35 ? 'nho' : 'vua';
    const noseW = dist(P(129), P(358)) / faceW;
    const nose = noseW > 0.3 ? 'to' : noseW < 0.245 ? 'nho' : 'vua';

    // Màu da
    const r = faceW * 0.06;
    const skinSamples = [P(50), P(280), P(151)].map(p => sampleColor(pixels, p.x, p.y, r)).filter(Boolean);
    const n = skinSamples.length;
    const skinRaw = skinSamples.reduce((a, c) => ({ r: a.r + c.r / n, g: a.g + c.g / n, b: a.b + c.b / n }), { r: 0, g: 0, b: 0 });

    // Râu: vùng nhân trung và cằm tối hơn da rõ rệt
    const lipTop = sampleColor(pixels, (P(164).x + P(0).x) / 2, (P(164).y + P(0).y) / 2, r * 0.6);
    const chinSpot = sampleColor(pixels, (P(17).x + chin.x) / 2, (P(17).y + chin.y) / 2, r * 0.8);
    const darker = c => c && lum(skinRaw) - lum(c) > 38;
    const beard = darker(chinSpot) ? 'rau' : darker(lipTop) ? 'ria' : 'none';

    // Kính: gọng kính làm sống mũi giữa hai mắt tối hẳn so với da
    const bridge = sampleColor(pixels, P(168).x, P(168).y, r * 0.35);
    const glasses = bridge && lum(skinRaw) - lum(bridge) > 50 ? 'kinh_tron' : 'none';

    // Đôi mắt theo biểu cảm trong ảnh
    const shapes = {};
    for (const c of (result.faceBlendshapes && result.faceBlendshapes[0] ? result.faceBlendshapes[0].categories : [])) shapes[c.categoryName] = c.score;
    const smile = ((shapes.mouthSmileLeft || 0) + (shapes.mouthSmileRight || 0)) / 2;
    const blink = ((shapes.eyeBlinkLeft || 0) + (shapes.eyeBlinkRight || 0)) / 2;
    const eyesId = blink > 0.45 ? 'lim_dim' : smile > 0.55 ? 'cuoi' : 'tron';

    // Tóc: ưu tiên tách tóc bằng AI, không được thì ước lượng theo màu
    onStatus('Đang tách vùng tóc…');
    const data = window.TEMPLE_DATA;
    const mask = await hairMask(canvas);
    let hair;
    if (mask) {
      hair = analyzeHair(mask, pixels, P, faceW, faceH);
    } else {
      const above = sampleColor(pixels, top.x, top.y - faceH * 0.12, r * 1.2);
      hair = !above || colorDistance(above, skinRaw) < 38 ? { bald: true } : { bald: false, color: above, length: 'short', bangs: false };
    }

    const skinHex = toHex(stylizeSkin(skinRaw));
    const appearance = { skinColor: skinHex, skinId: nearestId(data.skinTones, skinHex), faceShape, eyesId, eyeSize, mouth, nose, beard, glasses };
    if (hair.bald) {
      appearance.hairId = 'cao_troc';
    } else {
      const hairHex = toHex(hair.color);
      appearance.hairColor = hairHex;
      appearance.hairColorId = nearestId(data.hairColors, hairHex);
      appearance.hairId = hair.length === 'long' ? 'toc_dai' : hair.length === 'bob' ? 'toc_ngang_vai' : hair.bangs ? 'toc_mai' : 'toc_ngan';
    }

    onStatus('Đang vẽ khuôn mặt hoạt hình…');
    const faceImage = cartoonFace(canvas, P);

    const name = (list, id) => list.find(x => x.id === id).name;
    const parts = [
      name(data.faceShapes, faceShape), name(data.eyeSizes, eyeSize), name(data.mouths, mouth),
      name(data.hairs, appearance.hairId)
    ];
    if (beard !== 'none') parts.push(name(data.beards, beard));
    if (glasses !== 'none') parts.push('Đeo kính');
    return { appearance, faceImage, summary: parts.join(' • '), thumbnailUrl: url, usedHairAI: !!mask };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}
