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

  // Evolution-specific body shapes and patterns
  if (evoStage === 0) {
    // Stage 0: 아기 지렁이 - 둥글둥글 귀여운 모습
    return createBabyWormSegment(ctx, cx, cy, r, color);
  } else if (evoStage === 1) {
    // Stage 1: 지렁이 - 조금 더 길쭉한 모습
    return createWormSegment(ctx, cx, cy, r, color);
  } else if (evoStage === 2) {
    // Stage 2: 뱀 - 다이아몬드/지그재그 비늘 패턴
    return createSnakeSegment(ctx, cx, cy, r, color);
  } else if (evoStage === 3) {
    // Stage 3: 왕뱀 - 황금 비늘 패턴
    return createKingSnakeSegment(ctx, cx, cy, r, color);
  } else if (evoStage >= 4) {
    // Stage 4: 용 - 용 비늘 (큰 오각형 패턴)
    return createDragonSegment(ctx, cx, cy, r, color);
  }

  return canvas;
}

// Stage 0: 아기 지렁이 세그먼트
function createBabyWormSegment(ctx, cx, cy, r, color) {
  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
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

  // 부드러운 그라디언트 (귀여운 느낌)
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color.l);
  grad.addColorStop(0.7, color.h);
  grad.addColorStop(1, color.b);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 귀여운 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.2, cy - r * 0.2, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 1: 지렁이 세그먼트 (약간 길쭉)
function createWormSegment(ctx, cx, cy, r, color) {
  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 길쭉한 그라디언트
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  grad.addColorStop(0, color.l);
  grad.addColorStop(0.35, color.h);
  grad.addColorStop(0.7, color.b);
  grad.addColorStop(1, darkenColor(color.b, 0.7));
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.15, cy - r * 0.35, r * 0.6, r * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 2: 뱀 세그먼트 (다이아몬드 비늘)
function createSnakeSegment(ctx, cx, cy, r, color) {
  // 뱀 몸통은 더 길쭉
  const width = r * 1.2;
  const height = r * 0.85;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 기본 뱀 몸통
  const grad = ctx.createRadialGradient(cx - width * 0.3, cy - height * 0.3, 0, cx, cy, width);
  grad.addColorStop(0, lightenColor(color.h, 1.2));
  grad.addColorStop(0.4, color.h);
  grad.addColorStop(0.8, color.b);
  grad.addColorStop(1, darkenColor(color.b, 0.6));
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 다이아몬드 비늘 패턴
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const scaleSize = Math.max(3, r * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';

  for (let dx = -width; dx <= width; dx += scaleSize) {
    for (let dy = -height; dy <= height; dy += scaleSize * 0.8) {
      const x = cx + dx + (dy % (scaleSize * 1.6) === 0 ? scaleSize * 0.5 : 0);
      const y = cy + dy;
      
      // 다이아몬드 형태
      ctx.beginPath();
      ctx.moveTo(x, y - scaleSize * 0.3);
      ctx.lineTo(x + scaleSize * 0.3, y);
      ctx.lineTo(x, y + scaleSize * 0.3);
      ctx.lineTo(x - scaleSize * 0.3, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();

  // 뱀 특유의 배 부분 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx, cy + height * 0.3, width * 0.7, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 3: 왕뱀 세그먼트 (황금 비늘)
function createKingSnakeSegment(ctx, cx, cy, r, color) {
  const width = r * 1.3;
  const height = r * 0.9;

  // Drop shadow (더 강함)
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 황금빛 기본 몸통
  const grad = ctx.createRadialGradient(cx - width * 0.3, cy - height * 0.3, 0, cx, cy, width);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(0.3, color.h);
  grad.addColorStop(0.7, color.b);
  grad.addColorStop(1, darkenColor(color.b, 0.5));
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 황금 비늘 패턴
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const scaleSize = Math.max(4, r * 0.35);
  ctx.strokeStyle = 'rgba(180,140,0,0.6)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,215,0,0.3)';

  for (let dx = -width; dx <= width; dx += scaleSize * 0.8) {
    for (let dy = -height; dy <= height; dy += scaleSize * 0.7) {
      const x = cx + dx + (dy % (scaleSize * 1.4) === 0 ? scaleSize * 0.4 : 0);
      const y = cy + dy;
      
      // 육각형 비늘
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = x + Math.cos(angle) * scaleSize * 0.3;
        const py = y + Math.sin(angle) * scaleSize * 0.3;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // 중심 점
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,0,0.8)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,215,0,0.3)';
    }
  }

  ctx.restore();

  // 황금 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.2, cy - height * 0.2, width * 0.4, height * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,150,0.4)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 4: 용 세그먼트 (용 비늘)
function createDragonSegment(ctx, cx, cy, r, color) {
  const width = r * 1.4;
  const height = r;

  // 용의 강력한 그림자
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 용의 기본 몸통 (불타는 느낌)
  const grad = ctx.createRadialGradient(cx - width * 0.3, cy - height * 0.3, 0, cx, cy, width);
  grad.addColorStop(0, lightenColor(color.h, 1.4));
  grad.addColorStop(0.2, color.h);
  grad.addColorStop(0.5, color.b);
  grad.addColorStop(0.8, darkenColor(color.b, 0.7));
  grad.addColorStop(1, '#1a0000');
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // 용의 큰 오각형 비늘
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const scaleSize = Math.max(5, r * 0.4);
  ctx.strokeStyle = 'rgba(255,60,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(255,100,0,0.15)';

  for (let dx = -width; dx <= width; dx += scaleSize * 0.9) {
    for (let dy = -height; dy <= height; dy += scaleSize * 0.8) {
      const x = cx + dx + (dy % (scaleSize * 1.6) === 0 ? scaleSize * 0.45 : 0);
      const y = cy + dy;
      
      // 오각형 용 비늘
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(angle) * scaleSize * 0.35;
        const py = y + Math.sin(angle) * scaleSize * 0.35;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // 불꽃 효과 중심점
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,150,0,0.8)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,100,0,0.15)';
    }
  }

  ctx.restore();

  // 용의 불꽃 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.15, cy - height * 0.25, width * 0.5, height * 0.3, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,180,50,0.3)';
  ctx.fill();

  // 불꽃 오라
  const emberGrad = ctx.createRadialGradient(cx, cy, height * 0.6, cx, cy, height);
  emberGrad.addColorStop(0, 'rgba(255,100,0,0)');
  emberGrad.addColorStop(0.7, 'rgba(255,80,0,0.1)');
  emberGrad.addColorStop(1, 'rgba(255,60,0,0.25)');
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = emberGrad;
  ctx.fill();

  return ctx.canvas;
}

// 색상 밝게/어둡게 하는 헬퍼 함수들
function lightenColor(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r * factor));
  const ng = Math.min(255, Math.round(g * factor));
  const nb = Math.min(255, Math.round(b * factor));
  return `rgb(${nr},${ng},${nb})`;
}

function createStripedSegmentSprite(color, radius, evoStage = 0) {
  // Start with base segment
  const canvas = createSegmentSprite(color, radius, evoStage);
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = radius;

  // Evolution-specific stripe patterns
  if (evoStage === 0 || evoStage === 1) {
    // 기본 줄무늬
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.stroke();
  } else if (evoStage === 2) {
    // 뱀 - 지그재그 줄무늬
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const zigzagPoints = 8;
    for (let i = 0; i <= zigzagPoints; i++) {
      const angle = (i / zigzagPoints) * Math.PI * 2;
      const radius1 = r * 0.7;
      const radius2 = r * 0.9;
      const rad = (i % 2 === 0) ? radius1 : radius2;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  } else if (evoStage === 3) {
    // 왕뱀 - 황금 줄무늬
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = Math.max(2, r * 0.15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,100,0.3)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
  } else if (evoStage >= 4) {
    // 용 - 불꽃 무늬 줄무늬
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.strokeStyle = 'rgba(255,100,0,0.3)';
    ctx.lineWidth = 2.5;
    
    // 불꽃 모양 줄무늬
    ctx.beginPath();
    const flamePoints = 12;
    for (let i = 0; i <= flamePoints; i++) {
      const angle = (i / flamePoints) * Math.PI * 2;
      const baseRadius = r * 0.75;
      const flameHeight = Math.sin(i * 1.5) * r * 0.15;
      const rad = baseRadius + flameHeight;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // 내부 불꽃 링
    ctx.strokeStyle = 'rgba(255,150,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

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
  // Base sprites (no evolution) + evolution variants for all stages
  const stages = [0, 1, 2, 3, 4];
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
  const evoSuffix = evoStage >= 1 ? `_e${Math.min(evoStage, 4)}` : '';
  const key = isStriped ? `${colorIdx}_${si}_s${evoSuffix}` : `${colorIdx}_${si}${evoSuffix}`;
  return { sprite: spriteCache.get(key), spriteRadius: SPRITE_SIZES[si] };
}

// Head sprite cache
export function getHeadSprite(colorIdx, radius, evoStage = 0) {
  const si = findSizeIndex(radius);
  const evoSuffix = evoStage >= 1 ? `_e${Math.min(evoStage, 4)}` : '';
  return { sprite: spriteCache.get(`${colorIdx}_${si}${evoSuffix}`), spriteRadius: SPRITE_SIZES[si] };
}
