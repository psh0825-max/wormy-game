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

// Stage 2: 뱀 세그먼트 (Slither.io급 현실적인 뱀 비늘)
function createSnakeSegment(ctx, cx, cy, r, color) {
  const width = r * 1.15;
  const height = r * 0.9;

  // 고품질 드롭 섀도우
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // Slither.io 스타일 3단계 그라디언트 (매우 부드러운)
  const mainGrad = ctx.createRadialGradient(cx - width * 0.25, cy - height * 0.35, 0, cx, cy, width * 1.1);
  mainGrad.addColorStop(0, lightenColor(color.h, 1.4)); // 매우 밝은 하이라이트
  mainGrad.addColorStop(0.15, lightenColor(color.h, 1.15));
  mainGrad.addColorStop(0.4, color.h);
  mainGrad.addColorStop(0.7, color.b);
  mainGrad.addColorStop(0.85, darkenColor(color.b, 0.8));
  mainGrad.addColorStop(1, darkenColor(color.b, 0.5));
  
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = mainGrad;
  ctx.fill();

  // 현실적인 뱀 비늘 패턴 (overlapping scales)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const scaleSize = Math.max(4, r * 0.25);
  const rows = Math.ceil((height * 2) / (scaleSize * 0.6));
  const cols = Math.ceil((width * 2) / (scaleSize * 0.8));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * scaleSize * 0.4; // 벽돌 패턴
      const x = cx - width + col * scaleSize * 0.8 + offsetX;
      const y = cy - height + row * scaleSize * 0.6;
      
      // 각 비늘마다 미세한 그라디언트
      const scaleGrad = ctx.createRadialGradient(x - scaleSize * 0.1, y - scaleSize * 0.1, 0, x, y, scaleSize * 0.4);
      scaleGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
      scaleGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      scaleGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
      
      // 타원형 비늘 (더 현실적)
      ctx.beginPath();
      ctx.ellipse(x, y, scaleSize * 0.35, scaleSize * 0.25, Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = scaleGrad;
      ctx.fill();
      
      // 비늘 테두리 (매우 미세)
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
  }

  ctx.restore();

  // 뱀 배 부분 (Slither.io 스타일 중앙 하이라이트)
  const bellyGrad = ctx.createLinearGradient(cx, cy - height * 0.2, cx, cy + height * 0.6);
  bellyGrad.addColorStop(0, 'rgba(255,255,255,0)');
  bellyGrad.addColorStop(0.3, 'rgba(255,255,255,0.12)');
  bellyGrad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  bellyGrad.addColorStop(1, 'rgba(255,255,255,0)');
  
  ctx.beginPath();
  ctx.ellipse(cx, cy + height * 0.1, width * 0.6, height * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = bellyGrad;
  ctx.fill();

  // 상단 하이라이트 (Slither.io의 시그니처)
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.15, cy - height * 0.25, width * 0.5, height * 0.15, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 3: 왕뱀 세그먼트 (고급스러운 황금 비늘)
function createKingSnakeSegment(ctx, cx, cy, r, color) {
  const width = r * 1.25;
  const height = r * 0.95;

  // 왕족의 강력한 그림자
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 황금 메탈릭 그라디언트 (7단계!)
  const goldGrad = ctx.createRadialGradient(cx - width * 0.2, cy - height * 0.3, 0, cx, cy, width * 1.2);
  goldGrad.addColorStop(0, '#fffacd'); // 거의 흰색 하이라이트
  goldGrad.addColorStop(0.1, '#ffd700'); // 순금
  goldGrad.addColorStop(0.25, '#ffed4e'); // 밝은 황금
  goldGrad.addColorStop(0.4, color.h);
  goldGrad.addColorStop(0.6, '#daa520'); // 골든로드
  goldGrad.addColorStop(0.8, color.b);
  goldGrad.addColorStop(1, '#8b6914'); // 어두운 황금

  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = goldGrad;
  ctx.fill();

  // 프리미엄 육각형 비늘 (honeycomb 패턴)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const hexSize = Math.max(5, r * 0.28);
  const hexHeight = hexSize * Math.sqrt(3) / 2;
  const rows = Math.ceil((height * 2) / (hexHeight * 1.5));
  const cols = Math.ceil((width * 2) / (hexSize * 1.5));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * hexSize * 0.75; // 정확한 honeycomb 오프셋
      const x = cx - width + col * hexSize * 1.5 + offsetX;
      const y = cy - height + row * hexHeight * 1.5;
      
      // 각 육각형마다 황금 그라디언트
      const hexGrad = ctx.createRadialGradient(x - hexSize * 0.2, y - hexSize * 0.2, 0, x, y, hexSize * 0.6);
      hexGrad.addColorStop(0, 'rgba(255,255,200,0.4)');
      hexGrad.addColorStop(0.3, 'rgba(255,215,0,0.25)');
      hexGrad.addColorStop(0.7, 'rgba(218,165,32,0.15)');
      hexGrad.addColorStop(1, 'rgba(139,105,20,0.2)');
      
      // 완벽한 육각형
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = x + Math.cos(angle) * hexSize * 0.35;
        const py = y + Math.sin(angle) * hexSize * 0.35;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = hexGrad;
      ctx.fill();
      
      // 황금 테두리
      ctx.strokeStyle = 'rgba(184,134,11,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      
      // 중앙 황금 점 (보석 효과)
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,100,0.9)';
      ctx.fill();
    }
  }

  ctx.restore();

  // 왕족 배 부분 (더 고급스러운)
  const royalBellyGrad = ctx.createLinearGradient(cx, cy - height * 0.3, cx, cy + height * 0.5);
  royalBellyGrad.addColorStop(0, 'rgba(255,255,255,0)');
  royalBellyGrad.addColorStop(0.2, 'rgba(255,255,200,0.25)');
  royalBellyGrad.addColorStop(0.5, 'rgba(255,215,0,0.15)');
  royalBellyGrad.addColorStop(0.8, 'rgba(255,255,200,0.1)');
  royalBellyGrad.addColorStop(1, 'rgba(255,255,255,0)');
  
  ctx.beginPath();
  ctx.ellipse(cx, cy + height * 0.05, width * 0.7, height * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = royalBellyGrad;
  ctx.fill();

  // 왕족 상단 메탈릭 하이라이트
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.1, cy - height * 0.3, width * 0.6, height * 0.2, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  // 추가 골드 글로우
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.2, cy - height * 0.15, width * 0.3, height * 0.1, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,215,0,0.2)';
  ctx.fill();

  return ctx.canvas;
}

// Stage 4: 용 세그먼트 (전설급 드래곤 스케일)
function createDragonSegment(ctx, cx, cy, r, color) {
  const width = r * 1.35;
  const height = r * 1.05;

  // 전설의 드래곤 그림자 (매우 강력)
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // 드래곤 몸통 - 용암 같은 9단계 그라디언트
  const dragonGrad = ctx.createRadialGradient(cx - width * 0.25, cy - height * 0.3, 0, cx, cy, width * 1.3);
  dragonGrad.addColorStop(0, lightenColor(color.h, 1.8));   // 거의 백색 핫스팟
  dragonGrad.addColorStop(0.08, lightenColor(color.h, 1.5)); // 밝은 오렌지
  dragonGrad.addColorStop(0.2, lightenColor(color.h, 1.2));  
  dragonGrad.addColorStop(0.35, color.h);                    // 기본색
  dragonGrad.addColorStop(0.5, color.b);
  dragonGrad.addColorStop(0.65, darkenColor(color.b, 0.8));
  dragonGrad.addColorStop(0.8, darkenColor(color.b, 0.6));
  dragonGrad.addColorStop(0.92, '#2d1810'); // 어두운 갈색
  dragonGrad.addColorStop(1, '#0a0000');   // 거의 검정

  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.fillStyle = dragonGrad;
  ctx.fill();

  // 고품질 용 비늘 (overlapping pentagonal scales)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
  ctx.clip();

  const scaleSize = Math.max(6, r * 0.3);
  const rows = Math.ceil((height * 2) / (scaleSize * 0.7));
  const cols = Math.ceil((width * 2) / (scaleSize * 0.9));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = (row % 2) * scaleSize * 0.45; // 드래곤 스케일 오프셋
      const x = cx - width + col * scaleSize * 0.9 + offsetX;
      const y = cy - height + row * scaleSize * 0.7;
      
      // 각 비늘마다 불타는 그라디언트
      const scaleFireGrad = ctx.createRadialGradient(
        x - scaleSize * 0.15, y - scaleSize * 0.2, 0, 
        x, y, scaleSize * 0.5
      );
      scaleFireGrad.addColorStop(0, 'rgba(255,200,100,0.3)');
      scaleFireGrad.addColorStop(0.3, 'rgba(255,120,0,0.2)');
      scaleFireGrad.addColorStop(0.7, 'rgba(200,60,0,0.15)');
      scaleFireGrad.addColorStop(1, 'rgba(100,20,0,0.25)');
      
      // 완벽한 오각형 드래곤 스케일
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2 + (row * 0.1); // 약간의 회전 변화
        const radius = scaleSize * (0.35 + Math.sin(i * 1.2) * 0.05); // 미세한 크기 변화
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = scaleFireGrad;
      ctx.fill();
      
      // 불타는 테두리
      ctx.strokeStyle = 'rgba(255,80,20,0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      
      // 용의 심장 - 각 스케일 중앙에 불꽃 코어
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 2.5);
      coreGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
      coreGrad.addColorStop(0.5, 'rgba(255,150,0,0.7)');
      coreGrad.addColorStop(1, 'rgba(200,50,0,0.3)');
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }
  }

  ctx.restore();

  // 드래곤 배 부분 (용암 글로우)
  const lavaGrad = ctx.createLinearGradient(cx, cy - height * 0.4, cx, cy + height * 0.6);
  lavaGrad.addColorStop(0, 'rgba(255,100,0,0)');
  lavaGrad.addColorStop(0.2, 'rgba(255,180,50,0.15)');
  lavaGrad.addColorStop(0.4, 'rgba(255,120,0,0.25)');
  lavaGrad.addColorStop(0.6, 'rgba(255,180,50,0.2)');
  lavaGrad.addColorStop(0.8, 'rgba(255,100,0,0.1)');
  lavaGrad.addColorStop(1, 'rgba(255,100,0,0)');
  
  ctx.beginPath();
  ctx.ellipse(cx, cy + height * 0.05, width * 0.8, height * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = lavaGrad;
  ctx.fill();

  // 드래곤 상단 메탈릭 하이라이트 (불타는 금속)
  const metalGrad = ctx.createRadialGradient(
    cx - width * 0.2, cy - height * 0.35, 0,
    cx, cy - height * 0.2, width * 0.6
  );
  metalGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
  metalGrad.addColorStop(0.3, 'rgba(255,200,100,0.25)');
  metalGrad.addColorStop(0.7, 'rgba(255,150,50,0.15)');
  metalGrad.addColorStop(1, 'rgba(255,100,0,0.05)');
  
  ctx.beginPath();
  ctx.ellipse(cx - width * 0.1, cy - height * 0.3, width * 0.6, height * 0.25, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = metalGrad;
  ctx.fill();

  // 추가 불꽃 오라 (외곽)
  const fireAuraGrad = ctx.createRadialGradient(cx, cy, height * 0.5, cx, cy, height * 1.2);
  fireAuraGrad.addColorStop(0, 'rgba(255,100,0,0)');
  fireAuraGrad.addColorStop(0.6, 'rgba(255,80,20,0.08)');
  fireAuraGrad.addColorStop(0.8, 'rgba(255,60,0,0.15)');
  fireAuraGrad.addColorStop(1, 'rgba(200,40,0,0.08)');
  
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 1.1, height * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = fireAuraGrad;
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
