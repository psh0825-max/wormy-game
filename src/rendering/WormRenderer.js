import { COLORS, EVOLUTION_STAGES } from '../config.js';

// Pre-render segment sprites for all colors, sizes, and evolution stages
// Size range: 4 to 45, step 2 (21 sizes)
const SPRITE_SIZES = [];
for (let r = 4; r <= 45; r += 2) {
  SPRITE_SIZES.push(r);
}

const spriteCache = new Map(); // key: `${colorIdx}_${sizeIdx}` or `${colorIdx}_${sizeIdx}_s` or `${colorIdx}_${sizeIdx}_e${stage}`

function createSegmentSprite(color, radius, evoStage = 0) {
  const padding = 6;
  const size = Math.ceil((radius + padding) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size / 2;
  const r = radius;

  // 1. Drop shadow — deeper, offset + blur
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 2. Body gradient — 4-stop radial (light → head → body → darker rim)
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  grad.addColorStop(0, color.l);
  grad.addColorStop(0.35, color.h);
  grad.addColorStop(0.7, color.b);
  grad.addColorStop(1, darkenColor(color.b, 0.7));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 3. Evolution stage variants (stage 2+)
  if (evoStage >= 2) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (evoStage === 2) {
      // Fierce: dot texture pattern
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const dotSpacing = Math.max(3, r * 0.35);
      for (let dx = -r; dx <= r; dx += dotSpacing) {
        for (let dy = -r; dy <= r; dy += dotSpacing) {
          if (dx * dx + dy * dy < r * r * 0.8) {
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (evoStage === 3) {
      // Regal: gold rim stroke
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (evoStage >= 4) {
      // Dragon: orange ember glow rim
      const emberGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
      emberGrad.addColorStop(0, 'rgba(255,100,0,0)');
      emberGrad.addColorStop(0.7, 'rgba(255,80,0,0.08)');
      emberGrad.addColorStop(1, 'rgba(255,60,0,0.2)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = emberGrad;
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Top highlight — brighter alpha
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.15, cy - r * 0.35, r * 0.55, r * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  // 5. Bottom depth shadow — lower crescent
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.05, cy + r * 0.35, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fill();

  // 6. Rim light — bottom-right reflection arc
  ctx.beginPath();
  ctx.arc(cx + r * 0.25, cy + r * 0.2, r * 0.9, -0.3, 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.lineCap = 'round';
  ctx.stroke();

  return canvas;
}

function createStripedSegmentSprite(color, radius, evoStage = 0) {
  // Start with base segment
  const canvas = createSegmentSprite(color, radius, evoStage);
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = radius;

  // Add stripe ring
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();

  return canvas;
}

// Simple color darkener for hex colors
function darkenColor(hex, factor) {
  // Parse hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `rgb(${nr},${ng},${nb})`;
}

// Build all sprites on init
export function initWormRenderer() {
  // Base sprites (no evolution) + evolution variants for stage 2,3,4
  const stages = [0, 2, 3, 4];
  for (let ci = 0; ci < COLORS.length; ci++) {
    const color = COLORS[ci];
    for (let si = 0; si < SPRITE_SIZES.length; si++) {
      const r = SPRITE_SIZES[si];
      for (const stage of stages) {
        const suffix = stage > 0 ? `_e${stage}` : '';
        spriteCache.set(`${ci}_${si}${suffix}`, createSegmentSprite(color, r, stage));
        spriteCache.set(`${ci}_${si}_s${suffix}`, createStripedSegmentSprite(color, r, stage));
      }
    }
  }
}

// Find closest pre-rendered size index
function findSizeIndex(radius) {
  // SPRITE_SIZES goes from 4 to 45 in steps of 2
  const idx = Math.round((radius - 4) / 2);
  return Math.max(0, Math.min(SPRITE_SIZES.length - 1, idx));
}

// Get cached sprite for a segment
export function getSegmentSprite(colorIdx, radius, isStriped, evoStage = 0) {
  const si = findSizeIndex(radius);
  const evoSuffix = evoStage >= 2 ? `_e${Math.min(evoStage, 4)}` : '';
  const key = isStriped ? `${colorIdx}_${si}_s${evoSuffix}` : `${colorIdx}_${si}${evoSuffix}`;
  return { sprite: spriteCache.get(key), spriteRadius: SPRITE_SIZES[si] };
}

// Head sprite cache
export function getHeadSprite(colorIdx, radius, evoStage = 0) {
  const si = findSizeIndex(radius);
  const evoSuffix = evoStage >= 2 ? `_e${Math.min(evoStage, 4)}` : '';
  return { sprite: spriteCache.get(`${colorIdx}_${si}${evoSuffix}`), spriteRadius: SPRITE_SIZES[si] };
}
