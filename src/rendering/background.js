import { CFG } from '../config.js';
import { state } from '../state.js';

// ── Star field (120 stars, generated once) ──
const STAR_COUNT = 120;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random() * CFG.WORLD_W,
    y: Math.random() * CFG.WORLD_H,
    size: 0.5 + Math.random() * 2,
    brightness: 0.3 + Math.random() * 0.7,
    twinkleSpeed: 0.02 + Math.random() * 0.04,
    depth: 0.3 + Math.random() * 0.4, // parallax depth
  });
}

// ── Floating dust (35 large particles for fog/depth) ──
const DUST_COUNT = 35;
const dustParticles = [];
for (let i = 0; i < DUST_COUNT; i++) {
  dustParticles.push({
    x: Math.random() * CFG.WORLD_W,
    y: Math.random() * CFG.WORLD_H,
    r: 15 + Math.random() * 25,
    alpha: 0.02 + Math.random() * 0.02,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.2,
  });
}

export function drawBackground() {
  const { ctx, camera, W, H, frameCount } = state;

  const offX = -camera.x + W / 2;
  const offY = -camera.y + H / 2;

  // ── 3A. Radial gradient background ──
  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  grad.addColorStop(0, '#0c0c2d');
  grad.addColorStop(1, '#040412');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── 3D. Wave color shift overlay ──
  const wave = state.wave || 0;
  if (wave > 0) {
    const hue = (wave * 30) % 360;
    const waveAlpha = 0.03 + Math.min(wave * 0.005, 0.05);
    ctx.fillStyle = `hsla(${hue}, 60%, 40%, ${waveAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 3B. Star field with parallax + twinkle ──
  const viewLeft = camera.x - W / 2;
  const viewTop = camera.y - H / 2;
  const viewRight = camera.x + W / 2;
  const viewBottom = camera.y + H / 2;

  for (const star of stars) {
    // Parallax: shift star position based on camera and depth
    const sx = star.x - camera.x * star.depth + W / 2;
    const sy = star.y - camera.y * star.depth + H / 2;

    // Wrap stars into view
    const wrappedX = ((sx % W) + W) % W;
    const wrappedY = ((sy % H) + H) % H;

    // Twinkle
    const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.x) * 0.3 + 0.7;
    const alpha = star.brightness * twinkle;

    ctx.beginPath();
    ctx.arc(wrappedX, wrappedY, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,210,255,${alpha})`;
    ctx.fill();
  }

  // ── 3C. Grid (minor + major) ──
  const gridSize = 60;
  const majorGridSize = 300;
  const startX = Math.floor((camera.x - W / 2) / gridSize) * gridSize;
  const startY = Math.floor((camera.y - H / 2) / gridSize) * gridSize;

  // Minor grid
  ctx.strokeStyle = 'rgba(40, 40, 100, 0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = startX; x < camera.x + W / 2 + gridSize; x += gridSize) {
    // Skip major grid lines
    if (x % majorGridSize === 0) continue;
    const sx = x + offX;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
  }
  for (let y = startY; y < camera.y + H / 2 + gridSize; y += gridSize) {
    if (y % majorGridSize === 0) continue;
    const sy = y + offY;
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
  }
  ctx.stroke();

  // Major grid
  const majorStartX = Math.floor((camera.x - W / 2) / majorGridSize) * majorGridSize;
  const majorStartY = Math.floor((camera.y - H / 2) / majorGridSize) * majorGridSize;
  ctx.strokeStyle = 'rgba(50, 50, 120, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = majorStartX; x < camera.x + W / 2 + majorGridSize; x += majorGridSize) {
    const sx = x + offX;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
  }
  for (let y = majorStartY; y < camera.y + H / 2 + majorGridSize; y += majorGridSize) {
    const sy = y + offY;
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
  }
  ctx.stroke();

  // ── 3E. Floating dust particles ──
  for (const d of dustParticles) {
    // Slow drift (camera-independent movement)
    d.x += d.vx;
    d.y += d.vy;
    // Wrap in world
    if (d.x < 0) d.x += CFG.WORLD_W;
    if (d.x > CFG.WORLD_W) d.x -= CFG.WORLD_W;
    if (d.y < 0) d.y += CFG.WORLD_H;
    if (d.y > CFG.WORLD_H) d.y -= CFG.WORLD_H;

    const dx = d.x + offX;
    const dy = d.y + offY;
    if (dx < -50 || dx > W + 50 || dy < -50 || dy > H + 50) continue;

    ctx.beginPath();
    ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,170,220,${d.alpha})`;
    ctx.fill();
  }

  // Danger zone overlay
  if (state.dangerZone && state.dangerZone.active) {
    const cx = CFG.WORLD_W / 2 + offX;
    const cy = CFG.WORLD_H / 2 + offY;
    const screenR = state.dangerZone.radius;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, screenR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(200, 30, 30, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, screenR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Obstacles
  for (const obs of state.obstacles) {
    obs.draw(ctx, camera, W, H);
  }

  // Portals
  for (const pair of state.portals) {
    pair.draw(ctx, camera, W, H);
  }

  // Border glow
  const border = CFG.BORDER_MARGIN;
  if (camera.x - W / 2 < border + 100) {
    const gx = border + offX;
    const g = ctx.createLinearGradient(gx - 50, 0, gx + 100, 0);
    g.addColorStop(0, 'rgba(255, 50, 80, 0.3)');
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 50, 0, 150, H);
  }
  if (camera.x + W / 2 > CFG.WORLD_W - border - 100) {
    const gx = CFG.WORLD_W - border + offX;
    const g = ctx.createLinearGradient(gx + 50, 0, gx - 100, 0);
    g.addColorStop(0, 'rgba(255, 50, 80, 0.3)');
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 100, 0, 150, H);
  }
  if (camera.y - H / 2 < border + 100) {
    const gy = border + offY;
    const g = ctx.createLinearGradient(0, gy - 50, 0, gy + 100);
    g.addColorStop(0, 'rgba(255, 50, 80, 0.3)');
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - 50, W, 150);
  }
  if (camera.y + H / 2 > CFG.WORLD_H - border - 100) {
    const gy = CFG.WORLD_H - border + offY;
    const g = ctx.createLinearGradient(0, gy + 50, 0, gy - 100);
    g.addColorStop(0, 'rgba(255, 50, 80, 0.3)');
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - 100, W, 150);
  }
}
