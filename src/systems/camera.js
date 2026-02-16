import { CFG } from '../config.js';
import { lerp } from '../utils.js';
import { state } from '../state.js';

export function updateCamera() {
  const { player, camera } = state;
  if (player && player.alive) {
    camera.targetX = player.head.x;
    camera.targetY = player.head.y;
    
    // 플레이어 길이에 따라 줌아웃 (커질수록 더 넓게 봄)
    const len = player.length;
    if (len < 30) {
      camera.targetZoom = 1.0;
    } else if (len < 80) {
      camera.targetZoom = 1.0 - (len - 30) * 0.004; // 1.0 → 0.8
    } else if (len < 200) {
      camera.targetZoom = 0.8 - (len - 80) * 0.002; // 0.8 → 0.56
    } else {
      camera.targetZoom = Math.max(0.35, 0.56 - (len - 200) * 0.001);
    }
  }
  camera.x = lerp(camera.x, camera.targetX, CFG.CAMERA_SMOOTH);
  camera.y = lerp(camera.y, camera.targetY, CFG.CAMERA_SMOOTH);
  camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.03); // 부드러운 줌 전환
  
  // Screen shake effect
  if (state.screenShake > 0) {
    const intensity = state.screenShake * 15;
    state.screenShakeX = (Math.random() - 0.5) * intensity;
    state.screenShakeY = (Math.random() - 0.5) * intensity;
    state.screenShake -= 0.02; // Fade out over time
    if (state.screenShake < 0) {
      state.screenShake = 0;
      state.screenShakeX = 0;
      state.screenShakeY = 0;
    }
  }
}
