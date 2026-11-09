// Nạp phần 3D và gắn vào window để game.js (script thường) dùng.
// Nếu không tải được Three.js (mất mạng, trình duyệt quá cũ) thì game tự dùng bộ vẽ 2D cũ.

import { TempleRenderer3D, AvatarPreview } from './renderer3d.js';
import { COURTYARD_OBSTACLES } from './courtyard.js';
import { analyzePhoto } from './photo-avatar.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

if (webglAvailable() && !new URLSearchParams(window.location.search).has('2d')) {
  window.TempleRenderer3D = TempleRenderer3D;
  window.AvatarPreview3D = AvatarPreview;
  window.COURTYARD_OBSTACLES = COURTYARD_OBSTACLES;
}
window.analyzePhotoForAvatar = analyzePhoto;
