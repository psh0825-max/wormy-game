import { CFG } from '../config.js';
import { state } from '../state.js';

export function drawMinimap() {
  const { mmCtx, camera, foods, worms, W, H } = state;
  const mmContainer = document.getElementById('minimap-container');
  const mmW = Math.round(parseFloat(getComputedStyle(mmContainer).width)) || 140;
  const mmH = mmW;
  mmCtx.clearRect(0, 0, mmW, mmH);

  // Background
  mmCtx.fillStyle = 'rgba(10, 10, 40, 0.5)';
  mmCtx.fillRect(0, 0, mmW, mmH);

  const sx = mmW / CFG.WORLD_W;
  const sy = mmH / CFG.WORLD_H;

  // Danger zone
  if (state.dangerZone && state.dangerZone.active) {
    const cx = (CFG.WORLD_W / 2) * sx;
    const cy = (CFG.WORLD_H / 2) * sy;
    const r = state.dangerZone.radius * sx;

    // Red overlay outside safe zone
    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.rect(0, 0, mmW, mmH);
    mmCtx.arc(cx, cy, r, 0, Math.PI * 2, true);
    mmCtx.fillStyle = 'rgba(200, 30, 30, 0.3)';
    mmCtx.fill();

    mmCtx.beginPath();
    mmCtx.arc(cx, cy, r, 0, Math.PI * 2);
    mmCtx.strokeStyle = 'rgba(255, 60, 60, 0.6)';
    mmCtx.lineWidth = 1;
    mmCtx.stroke();
    mmCtx.restore();
  }

  // Foods
  mmCtx.fillStyle = 'rgba(100, 200, 100, 0.3)';
  for (const f of foods) {
    if (!f.alive) continue;
    mmCtx.fillRect(f.x * sx, f.y * sy, 1, 1);
  }

  // Obstacles
  mmCtx.fillStyle = 'rgba(120, 120, 140, 0.5)';
  for (const obs of state.obstacles) {
    const r = Math.max(1.5, obs.radius * sx);
    mmCtx.beginPath();
    mmCtx.arc(obs.x * sx, obs.y * sy, r, 0, Math.PI * 2);
    mmCtx.fill();
  }

  // Portals
  for (const pair of state.portals) {
    const hsl = `hsl(${pair.hue}, 80%, 60%)`;
    for (const p of [pair.a, pair.b]) {
      mmCtx.beginPath();
      mmCtx.arc(p.x * sx, p.y * sy, 2.5, 0, Math.PI * 2);
      mmCtx.fillStyle = hsl;
      mmCtx.fill();
    }
  }

  // Worms
  for (const w of worms) {
    if (!w.alive || w.isMinion) continue;
    const r = Math.max(2, w.radius * sx * 2);
    mmCtx.beginPath();
    mmCtx.arc(w.head.x * sx, w.head.y * sy, r, 0, Math.PI * 2);
    if (w.isBoss) {
      mmCtx.fillStyle = '#ff4444';
    } else {
      mmCtx.fillStyle = w.isPlayer ? '#ffdd44' : w.color.h;
    }
    mmCtx.globalAlpha = w.isPlayer ? 1 : 0.7;
    mmCtx.fill();
    mmCtx.globalAlpha = 1;
  }

  // Camera view rect
  const vx = (camera.x - W / 2) * sx;
  const vy = (camera.y - H / 2) * sy;
  const vw = W * sx;
  const vh = H * sy;
  mmCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  mmCtx.lineWidth = 1;
  mmCtx.strokeRect(vx, vy, vw, vh);
}
