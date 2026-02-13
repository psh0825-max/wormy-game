import { CFG } from '../config.js';
import { lerp } from '../utils.js';
import { state } from '../state.js';

export function updateCamera() {
  const { player, camera } = state;
  if (player && player.alive) {
    camera.targetX = player.head.x;
    camera.targetY = player.head.y;
  }
  camera.x = lerp(camera.x, camera.targetX, CFG.CAMERA_SMOOTH);
  camera.y = lerp(camera.y, camera.targetY, CFG.CAMERA_SMOOTH);
  
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
