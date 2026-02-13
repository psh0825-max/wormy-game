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
}
