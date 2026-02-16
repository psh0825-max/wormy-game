import { CFG } from '../config.js';
import { state } from '../state.js';

// ── Star field (120 stars) ──
const STAR_COUNT = 120;
const stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random() * CFG.WORLD_W,
    y: Math.random() * CFG.WORLD_H,
    size: 0.5 + Math.random() * 2,
    brightness: 0.3 + Math.random() * 0.7,
    twinkleSpeed: 0.02 + Math.random() * 0.04,
    depth: 0.3 + Math.random() * 0.4,
  });
}

// ── Floating dust ──
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

// ── Terrain decorations (pre-generated) ──
// Note: isMobile is set later in setupInput(), so we generate all 80 and
// skip rendering based on isMobile at draw time.  A pre-render cache is
// built on first drawBackground call to avoid per-frame cost.
const TERRAIN_MAX = 80;
const terrainDecos = [];
const terrainTypes = ['grass', 'stone', 'flower', 'moss', 'pebble'];
for (let i = 0; i < TERRAIN_MAX; i++) {
  const type = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
  terrainDecos.push({
    x: Math.random() * CFG.WORLD_W,
    y: Math.random() * CFG.WORLD_H,
    type,
    size: 4 + Math.random() * 12,
    rotation: Math.random() * Math.PI * 2,
    hue: Math.random() * 30 - 15, // slight color variation
    alpha: 0.15 + Math.random() * 0.15,
  });
}

function drawTerrainDeco(ctx, deco, offX, offY, W, H) {
  const dx = deco.x + offX;
  const dy = deco.y + offY;
  if (dx < -30 || dx > W + 30 || dy < -30 || dy > H + 30) return;

  const s = deco.size;
  ctx.globalAlpha = deco.alpha;

  switch (deco.type) {
    case 'grass': {
      // Small grass blades
      ctx.strokeStyle = `hsl(${120 + deco.hue}, 40%, 30%)`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) {
        const angle = deco.rotation + (j - 1) * 0.4;
        ctx.beginPath();
        ctx.moveTo(dx + (j - 1) * 2, dy);
        ctx.lineTo(dx + (j - 1) * 2 + Math.cos(angle) * s, dy - Math.sin(angle + 0.5) * s);
        ctx.stroke();
      }
      break;
    }
    case 'stone': {
      const grad = ctx.createRadialGradient(dx - s * 0.2, dy - s * 0.2, 0, dx, dy, s);
      grad.addColorStop(0, `hsla(220, 10%, 45%, ${deco.alpha})`);
      grad.addColorStop(1, `hsla(220, 10%, 25%, ${deco.alpha * 0.5})`);
      ctx.beginPath();
      ctx.ellipse(dx, dy, s, s * 0.7, deco.rotation, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }
    case 'flower': {
      const petalHue = (deco.hue + 200 + Math.abs(deco.x) * 0.1) % 360;
      ctx.fillStyle = `hsla(${petalHue}, 70%, 60%, ${deco.alpha})`;
      for (let j = 0; j < 5; j++) {
        const angle = deco.rotation + (j / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(dx + Math.cos(angle) * s * 0.4, dy + Math.sin(angle) * s * 0.4,
          s * 0.3, s * 0.15, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(45, 80%, 60%, ${deco.alpha})`;
      ctx.fill();
      break;
    }
    case 'moss': {
      ctx.fillStyle = `hsla(${140 + deco.hue}, 35%, 28%, ${deco.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pebble': {
      ctx.fillStyle = `hsla(30, 8%, 35%, ${deco.alpha * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(dx, dy, s * 0.5, s * 0.35, deco.rotation, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.globalAlpha = 1;
}

export function drawBackground(cam = null) {
  const { ctx, camera, W, H, frameCount } = state;
  const actualCamera = cam || camera;

  const zoom = actualCamera.zoom || 1;
  const offX = -actualCamera.x + W / 2;
  const offY = -actualCamera.y + H / 2;

  // 줌 보정된 화면 크기 (줌 트랜스폼 내에서 전체 화면 채우기)
  const zW = W / zoom + 200;
  const zH = H / zoom + 200;
  const zOffX = (W - zW) / 2;
  const zOffY = (H - zH) / 2;

  // ── Radial gradient background with subtle animation ──
  const time = frameCount * 0.001;
  const pulseIntensity = Math.sin(time) * 0.02 + 0.98;
  const grad = ctx.createRadialGradient(
    W / 2, H / 2, 0,
    W / 2, H / 2, Math.max(zW, zH) * 0.7 * pulseIntensity
  );
  grad.addColorStop(0, `hsl(240, 60%, ${8 + Math.sin(time * 0.5) * 2}%)`);
  grad.addColorStop(0.6, '#0c0c2d');
  grad.addColorStop(1, '#040412');
  ctx.fillStyle = grad;
  ctx.fillRect(zOffX, zOffY, zW, zH);

  // ── Wave color shift overlay ──
  const wave = state.wave || 0;
  if (wave > 0) {
    const hue = (wave * 30) % 360;
    const waveAlpha = (0.03 + Math.min(wave * 0.005, 0.05)) * (1 + Math.sin(frameCount * 0.02) * 0.3);
    const pulsingHue = hue + Math.sin(frameCount * 0.01) * 10;
    ctx.fillStyle = `hsla(${pulsingHue}, 70%, 45%, ${waveAlpha})`;
    ctx.fillRect(zOffX, zOffY, zW, zH);
  }

  // ── Star field with parallax + twinkle ──
  for (const star of stars) {
    const sx = star.x - actualCamera.x * star.depth + W / 2;
    const sy = star.y - actualCamera.y * star.depth + H / 2;
    const wrappedX = ((sx % W) + W) % W;
    const wrappedY = ((sy % H) + H) % H;
    const twinkle = Math.sin(frameCount * star.twinkleSpeed + star.x) * 0.3 + 0.7;
    const alpha = star.brightness * twinkle;

    ctx.beginPath();
    ctx.arc(wrappedX, wrappedY, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,210,255,${alpha})`;
    ctx.fill();
  }

  // ── Grid (minor + major) ──
  const gridSize = 60;
  const majorGridSize = 300;
  const viewHalfW = W / 2 / zoom;
  const viewHalfH = H / 2 / zoom;
  const startX = Math.floor((actualCamera.x - viewHalfW) / gridSize) * gridSize;
  const startY = Math.floor((actualCamera.y - viewHalfH) / gridSize) * gridSize;

  ctx.strokeStyle = 'rgba(40, 40, 100, 0.12)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = startX; x < actualCamera.x + viewHalfW + gridSize; x += gridSize) {
    if (x % majorGridSize === 0) continue;
    const sx = x + offX;
    ctx.moveTo(sx, zOffY);
    ctx.lineTo(sx, zOffY + zH);
  }
  for (let y = startY; y < actualCamera.y + viewHalfH + gridSize; y += gridSize) {
    if (y % majorGridSize === 0) continue;
    const sy = y + offY;
    ctx.moveTo(zOffX, sy);
    ctx.lineTo(zOffX + zW, sy);
  }
  ctx.stroke();

  const majorStartX = Math.floor((actualCamera.x - viewHalfW) / majorGridSize) * majorGridSize;
  const majorStartY = Math.floor((actualCamera.y - viewHalfH) / majorGridSize) * majorGridSize;
  ctx.strokeStyle = 'rgba(50, 50, 120, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = majorStartX; x < actualCamera.x + viewHalfW + majorGridSize; x += majorGridSize) {
    const sx = x + offX;
    ctx.moveTo(sx, zOffY);
    ctx.lineTo(sx, zOffY + zH);
  }
  for (let y = majorStartY; y < actualCamera.y + viewHalfH + majorGridSize; y += majorGridSize) {
    const sy = y + offY;
    ctx.moveTo(zOffX, sy);
    ctx.lineTo(zOffX + zW, sy);
  }
  ctx.stroke();

  // ── Terrain decorations (skip half on mobile for perf) ──
  const terrainLimit = state.isMobile ? Math.floor(TERRAIN_MAX / 2) : TERRAIN_MAX;
  for (let i = 0; i < terrainLimit; i++) {
    drawTerrainDeco(ctx, terrainDecos[i], offX, offY, W, H);
  }

  // ── Floating dust particles ──
  for (const d of dustParticles) {
    d.x += d.vx;
    d.y += d.vy;
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

  // ── Enhanced border glow (neon line + gradient) ──
  const border = CFG.BORDER_MARGIN;
  const borderGlowWidth = 150;
  const pulseAlpha = 0.25 + Math.sin(frameCount * 0.03) * 0.1;

  // Left
  if (actualCamera.x - W / 2 < border + 100) {
    const gx = border + offX;
    // Glow line
    ctx.strokeStyle = `rgba(255, 80, 120, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 80, 120, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Gradient fade
    const g = ctx.createLinearGradient(gx - 30, 0, gx + borderGlowWidth, 0);
    g.addColorStop(0, `rgba(255, 50, 80, ${pulseAlpha})`);
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 30, 0, borderGlowWidth + 30, H);
  }
  // Right
  if (actualCamera.x + W / 2 > CFG.WORLD_W - border - 100) {
    const gx = CFG.WORLD_W - border + offX;
    ctx.strokeStyle = `rgba(255, 80, 120, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 80, 120, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(gx + 30, 0, gx - borderGlowWidth, 0);
    g.addColorStop(0, `rgba(255, 50, 80, ${pulseAlpha})`);
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - borderGlowWidth, 0, borderGlowWidth + 30, H);
  }
  // Top
  if (actualCamera.y - H / 2 < border + 100) {
    const gy = border + offY;
    ctx.strokeStyle = `rgba(255, 80, 120, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 80, 120, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, gy - 30, 0, gy + borderGlowWidth);
    g.addColorStop(0, `rgba(255, 50, 80, ${pulseAlpha})`);
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - 30, W, borderGlowWidth + 30);
  }
  // Bottom
  if (actualCamera.y + H / 2 > CFG.WORLD_H - border - 100) {
    const gy = CFG.WORLD_H - border + offY;
    ctx.strokeStyle = `rgba(255, 80, 120, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 80, 120, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, gy + 30, 0, gy - borderGlowWidth);
    g.addColorStop(0, `rgba(255, 50, 80, ${pulseAlpha})`);
    g.addColorStop(1, 'rgba(255, 50, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy - borderGlowWidth, W, borderGlowWidth + 30);
  }
}
