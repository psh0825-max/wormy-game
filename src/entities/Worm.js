import { CFG, COLORS, EVOLUTION_STAGES } from '../config.js';
import { dist, angle, lerp, clamp } from '../utils.js';
import { state } from '../state.js';
import { getSegmentSprite, getHeadSprite } from '../rendering/WormRenderer.js';
import { getEvolutionMods } from '../systems/evolution.js';
import { particlePool } from './Particle.js';

export class Worm {
  constructor(x, y, colorIdx, name, isPlayer = false, isMinion = false) {
    this.segments = [];
    this.colorIdx = colorIdx;
    this.color = COLORS[colorIdx];
    this.name = name;
    this.isPlayer = isPlayer;
    this.isMinion = isMinion;
    this.alive = true;
    this.length = CFG.INITIAL_LENGTH;
    this.score = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.speed = CFG.BASE_SPEED;
    this.boosting = false;
    this.shielded = false;
    this.magnetized = false;
    this.frozen = false;
    this.frozenTimer = 0;
    this.speedBoosted = false;
    this.wobble = Math.random() * 100;
    this.eyeBlink = 0;
    this.minionOwner = null;
    this.minionTimer = 0;
    this.kills = 0;
    this.evolutionStage = 0;
    this.isBoss = false;
    this._flameTimer = 0;

    // AI
    this.aiTimer = 0;
    this.aiTarget = null;
    this.aiState = 'wander';

    for (let i = 0; i < this.length; i++) {
      this.segments.push({ x: x - i * CFG.SEGMENT_DIST * Math.cos(this.angle), y: y - i * CFG.SEGMENT_DIST * Math.sin(this.angle) });
    }
  }

  get head() { return this.segments[0]; }

  get radius() {
    const evo = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    return (CFG.HEAD_RADIUS_BASE + Math.min(this.length * 0.12, 20)) * (evo.headScale || 1);
  }

  bodyRadius(i) {
    const r = this.radius;
    const t = i / this.segments.length;
    // Smoother taper with breathing
    if (t < 0.08) {
      // Head→neck: 0.85 → 1.0 quick ramp
      return r * lerp(0.85, 1.0, t / 0.08);
    }
    if (t > 0.65) {
      // Tail: quadratic falloff 0.95 → 0.25
      const tailT = (t - 0.65) / 0.35;
      return r * lerp(0.95, 0.25, tailT * tailT);
    }
    // Body: 0.95 + micro wobble breathing
    const breath = Math.sin(this.wobble * 10 + i * 0.5) * 0.02;
    return r * (0.95 + breath);
  }

  update(dt) {
    if (!this.alive) return;

    this.wobble += dt * 3;
    this.eyeBlink = (this.eyeBlink + dt) % 4;

    if (this.frozenTimer > 0) {
      this.frozenTimer -= dt * 1000;
      this.frozen = this.frozenTimer > 0;
    }

    // Skill modifiers (player only)
    const sm = this.isPlayer ? (state.skillModifiers || {}) : {};
    const speedSkillMult = 1 + (sm.speedMult || 0);
    const boostDrainMult = Math.max(0.1, 1 + (sm.boostDrainMult || 0));

    const speedMult = this.frozen ? 0.4 : (this.speedBoosted ? 1.4 : 1);
    const baseSpd = this.boosting ? CFG.BOOST_SPEED : CFG.BASE_SPEED;
    this.speed = baseSpd * speedMult * speedSkillMult;

    if (this.boosting && this.length > 8) {
      // Increased boost drain for large worms for better balance
      const lengthMultiplier = 1 + (this.length > 100 ? (this.length - 100) * 0.002 : 0);
      this.length -= CFG.BOOST_DRAIN * boostDrainMult * lengthMultiplier * dt;
      if (this.length < 8) { this.length = 8; this.boosting = false; }
    }

    // Regen (skill)
    if (this.isPlayer && sm.regenPerSec) {
      this.length += sm.regenPerSec * dt;
    }

    // Smooth angle (evolution affects turn speed)
    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const evoMods = getEvolutionMods(this.evolutionStage);
    const turnSpeed = (this.isMinion ? 0.15 : 0.1) * evoMods.turnMod;
    this.angle += angleDiff * turnSpeed;

    // Move head
    const s = this.speed * dt * 60;
    const newX = this.head.x + Math.cos(this.angle) * s;
    const newY = this.head.y + Math.sin(this.angle) * s;

    // Border
    const bm = CFG.BORDER_MARGIN;
    this.head.x = clamp(newX, bm, CFG.WORLD_W - bm);
    this.head.y = clamp(newY, bm, CFG.WORLD_H - bm);

    // Follow segments
    for (let i = 1; i < this.segments.length; i++) {
      const prev = this.segments[i - 1];
      const seg = this.segments[i];
      const a = angle(seg, prev);
      const d = dist(seg, prev);
      if (d > CFG.SEGMENT_DIST) {
        seg.x = prev.x - Math.cos(a) * CFG.SEGMENT_DIST;
        seg.y = prev.y - Math.sin(a) * CFG.SEGMENT_DIST;
      }
    }

    // Adjust segment count
    const targetSegs = Math.floor(this.length);
    while (this.segments.length < targetSegs) {
      const last = this.segments[this.segments.length - 1];
      this.segments.push({ x: last.x, y: last.y });
    }
    while (this.segments.length > targetSegs + 5) {
      this.segments.pop();
    }

    // Border bounce
    if (this.head.x <= bm || this.head.x >= CFG.WORLD_W - bm ||
        this.head.y <= bm || this.head.y >= CFG.WORLD_H - bm) {
      this.targetAngle = angle(this.head, { x: CFG.WORLD_W / 2, y: CFG.WORLD_H / 2 });
    }

    // Minion timer
    if (this.isMinion) {
      this.minionTimer -= dt * 1000;
      if (this.minionTimer <= 0) this.alive = false;
    }

    // Dragon flame particles (stage >= 4) - Optimized frequency
    const evoStage = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    if (evoStage.trailParticles && this.segments.length > 5) {
      this._flameTimer += dt;
      // Reduced from 0.033 to 0.1 (30fps to 10fps particle generation)
      if (this._flameTimer > 0.1 && state.particles.length < 200) { // Particle count limit
        this._flameTimer = 0;
        const seg = this.segments[Math.min(4, this.segments.length - 1)];
        const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
        const c = colors[(Math.random() * colors.length) | 0];
        const p = particlePool.acquire(
          seg.x + (Math.random() - 0.5) * 10,
          seg.y + (Math.random() - 0.5) * 10,
          c, 3 + Math.random() * 4
        );
        state.particles.push(p);
      }
    }
  }

  draw(ctx, cam) {
    if (!this.alive) return;

    const { W, H } = state;
    const offX = -cam.x + W / 2;
    const offY = -cam.y + H / 2;

    // Check if visible - tighter bounds for better performance
    const hx = this.head.x + offX;
    const hy = this.head.y + offY;
    if (hx < -250 || hx > W + 250 || hy < -250 || hy > H + 250) return;

    const evo = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    const stage = this.evolutionStage;

    // Performance: calculate view bounds once
    const viewLeft = -offX - 20;
    const viewRight = -offX + W + 20;
    const viewTop = -offY - 20;
    const viewBottom = -offY + H + 20;

    // ── BODY GLOW OUTLINE (stage 2+) ── Optimized to render every 5th segment
    if (stage >= 2 && evo.aura) {
      const glowColor = evo.aura.color;
      const glowAlpha = stage >= 4 ? 0.25 : stage >= 3 ? 0.18 : 0.12;
      const glowExtra = stage >= 4 ? 6 : stage >= 3 ? 4 : 3;

      for (let i = this.segments.length - 1; i >= 0; i -= 5) { // Changed from i -= 2 to i -= 5
        const seg = this.segments[i];
        if (seg.x < viewLeft || seg.x > viewRight || seg.y < viewTop || seg.y > viewBottom) continue;
        const sx = seg.x + offX;
        const sy = seg.y + offY;
        const r = this.bodyRadius(i);
        const pulse = Math.sin(this.wobble * 2 + i * 0.15) * 0.3 + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r + glowExtra * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${glowColor},${glowAlpha * pulse})`;
        ctx.fill();
      }
    }

    // Boss body shimmer glow - optimized spacing
    if (this.isBoss) {
      for (let i = this.segments.length - 1; i >= 0; i -= 4) { // Changed from i -= 3 to i -= 4
        const seg = this.segments[i];
        if (seg.x < viewLeft || seg.x > viewRight || seg.y < viewTop || seg.y > viewBottom) continue;
        const sx = seg.x + offX;
        const sy = seg.y + offY;
        const r = this.bodyRadius(i);
        ctx.beginPath();
        ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,50,50,${0.15 + Math.sin(this.wobble * 2 + i * 0.3) * 0.1})`;
        ctx.fill();
      }
    }

    // ── SEGMENT CONNECTORS (fill gaps between segments) ── Draw every 2nd connector
    ctx.lineCap = 'round';
    for (let i = this.segments.length - 1; i >= 2; i -= 2) { // Changed from i-- to i -= 2
      const seg = this.segments[i];
      const prev = this.segments[i - 1];
      if (seg.x < viewLeft || seg.x > viewRight || seg.y < viewTop || seg.y > viewBottom) continue;
      const sx = seg.x + offX;
      const sy = seg.y + offY;
      const px = prev.x + offX;
      const py = prev.y + offY;
      const r = this.bodyRadius(i);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = this.color.h;
      ctx.lineWidth = r * 1.7;
      ctx.stroke();
    }

    // ── BODY SEGMENTS ── LOD optimization for large worms
    const centerX = W / 2;
    const centerY = H / 2;
    const isLargeWorm = this.segments.length > 50;
    
    for (let i = this.segments.length - 1; i >= 1; i--) {
      const seg = this.segments[i];
      if (seg.x < viewLeft || seg.x > viewRight || seg.y < viewTop || seg.y > viewBottom) continue;
      
      const sx = seg.x + offX;
      const sy = seg.y + offY;
      const r = this.bodyRadius(i);

      // LOD: Use simpler rendering for segments far from screen center
      if (isLargeWorm) {
        const distFromCenter = Math.abs(sx - centerX) + Math.abs(sy - centerY);
        const useSimpleRender = distFromCenter > Math.min(W, H) * 0.4;
        
        if (useSimpleRender) {
          // Simple circle rendering for distant segments
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = this.color.h;
          ctx.fill();
          continue;
        }
      }

      // Full detail rendering for close segments
      const isStriped = (i % 4 === 0);
      const { sprite, spriteRadius } = getSegmentSprite(this.colorIdx, r, isStriped, stage);
      if (sprite) {
        const scale = r / spriteRadius;
        const drawSize = sprite.width * scale;
        ctx.drawImage(sprite, sx - drawSize / 2, sy - drawSize / 2, drawSize, drawSize);
      }
    }

    // Shield glow
    if (this.shielded) {
      const hsx = this.head.x + offX;
      const hsy = this.head.y + offY;
      ctx.beginPath();
      ctx.arc(hsx, hsy, this.radius + 12 + Math.sin(this.wobble) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(68, 221, 255, ${0.4 + Math.sin(this.wobble * 2) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = `rgba(68, 221, 255, 0.08)`;
      ctx.fill();
    }

    // Head
    this.drawHead(ctx, offX, offY);

    // Special tail effects for evolved forms
    if (this.segments.length > 10) {
      this.drawTailEffect(ctx, offX, offY, stage);
    }

    // Name tag
    if (!this.isMinion) {
      const nameX = this.head.x + offX;
      const nameY = this.head.y + offY - this.radius - 16;
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';

      if (this.isBoss) {
        const label = `💀 ${this.name}`;
        const tw = ctx.measureText(label).width;
        const bx = nameX - tw / 2 - 6, by = nameY - 12, bw = tw + 12, bh = 18, br = 6;
        ctx.fillStyle = 'rgba(180,20,20,0.7)';
        ctx.beginPath();
        ctx.moveTo(bx + br, by);
        ctx.lineTo(bx + bw - br, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
        ctx.lineTo(bx + bw, by + bh - br);
        ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
        ctx.lineTo(bx + br, by + bh);
        ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
        ctx.lineTo(bx, by + br);
        ctx.arcTo(bx, by, bx + br, by, br);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff8888';
        ctx.fillText(label, nameX, nameY);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillText(this.name, nameX, nameY + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.name, nameX, nameY);
      }
    }
  }

  drawHead(ctx, offX, offY) {
    const hx = this.head.x + offX;
    const hy = this.head.y + offY;
    const r = this.radius;
    const evo = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    const stage = this.evolutionStage;

    // 진화 단계별 완전히 다른 머리 형태
    if (stage === 0) {
      this.drawBabyWormHead(ctx, hx, hy, r, evo);
    } else if (stage === 1) {
      this.drawWormHead(ctx, hx, hy, r, evo);
    } else if (stage === 2) {
      this.drawSnakeHead(ctx, hx, hy, r, evo);
    } else if (stage === 3) {
      this.drawKingSnakeHead(ctx, hx, hy, r, evo);
    } else if (stage >= 4) {
      this.drawDragonHead(ctx, hx, hy, r, evo);
    }
  }

  // Stage 0: 아기 지렁이 머리 - 둥글둥글 귀여운 모습
  drawBabyWormHead(ctx, hx, hy, r, evo) {
    // 연결선
    this.drawBodyConnector(ctx, hx, hy, r);

    // 오라 및 보스 이펙트
    this.drawAuraAndBossEffects(ctx, hx, hy, r, evo);

    // 귀여운 원형 머리
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;

    const grad = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.3, 0, hx, hy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, this.color.l);
    grad.addColorStop(0.7, this.color.h);
    grad.addColorStop(1, this.color.b);
    
    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    // 귀여운 하이라이트
    ctx.beginPath();
    ctx.arc(hx - r * 0.2, hy - r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    // 아기 지렁이 눈 (크고 둥글게)
    const eyeDist = r * 0.3;
    const eyeR = r * 0.35;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    this.drawEye(ctx, hx + Math.cos(this.angle - 0.5) * eyeDist, hy + Math.sin(this.angle - 0.5) * eyeDist, eyeR, blinkScale, 'baby');
    this.drawEye(ctx, hx + Math.cos(this.angle + 0.5) * eyeDist, hy + Math.sin(this.angle + 0.5) * eyeDist, eyeR, blinkScale, 'baby');

    // 볼터기
    const cheekDist = r * 0.6;
    ctx.fillStyle = 'rgba(255, 150, 170, 0.4)';
    for (const cAngle of [this.angle - 1.2, this.angle + 1.2]) {
      ctx.beginPath();
      ctx.arc(hx + Math.cos(cAngle) * cheekDist, hy + Math.sin(cAngle) * cheekDist, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // 미소
    ctx.beginPath();
    const smileDist = r * 0.4;
    ctx.arc(hx + Math.cos(this.angle) * smileDist, hy + Math.sin(this.angle) * smileDist, r * 0.2, this.angle + 0.2, this.angle + Math.PI - 0.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Stage 1: 지렁이 머리 - 약간 길쭉한 모습
  drawWormHead(ctx, hx, hy, r, evo) {
    this.drawBodyConnector(ctx, hx, hy, r);
    this.drawAuraAndBossEffects(ctx, hx, hy, r, evo);

    // 약간 길쭉한 머리
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;

    const grad = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.3, 0, hx, hy, r);
    grad.addColorStop(0, this.color.l);
    grad.addColorStop(0.4, this.color.h);
    grad.addColorStop(0.8, this.color.b);
    grad.addColorStop(1, this.darkenColor(this.color.b, 0.7));
    
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * 1.1, r * 0.9, this.angle, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    // 하이라이트
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.15, hy - r * 0.25, r * 0.5, r * 0.3, this.angle - 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // 눈
    const eyeDist = r * 0.35;
    const eyeR = r * 0.3;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    this.drawEye(ctx, hx + Math.cos(this.angle - 0.4) * eyeDist, hy + Math.sin(this.angle - 0.4) * eyeDist, eyeR, blinkScale, 'alert');
    this.drawEye(ctx, hx + Math.cos(this.angle + 0.4) * eyeDist, hy + Math.sin(this.angle + 0.4) * eyeDist, eyeR, blinkScale, 'alert');

    // 입
    this.drawMouthAndTongue(ctx, hx, hy, r, false);
  }

  // Stage 2: 뱀 머리 - Slither.io급 현실적인 뱀 머리
  drawSnakeHead(ctx, hx, hy, r, evo) {
    this.drawBodyConnector(ctx, hx, hy, r);
    this.drawAuraAndBossEffects(ctx, hx, hy, r, evo);

    // 현실적인 뱀 머리 형태
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle);

    // 강화된 그림자
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowOffsetX = 2.5;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 8;

    const headLength = r * 1.6;
    const headWidth = r * 1.1;
    const neckWidth = r * 0.85;
    
    // Slither.io 스타일 5단계 머리 그라디언트
    const headGrad = ctx.createRadialGradient(-headLength * 0.2, -headWidth * 0.15, 0, 0, 0, headLength * 0.8);
    headGrad.addColorStop(0, this.lightenColor(this.color.h, 1.5)); // 매우 밝은 하이라이트
    headGrad.addColorStop(0.2, this.lightenColor(this.color.h, 1.2));
    headGrad.addColorStop(0.45, this.color.h);
    headGrad.addColorStop(0.75, this.color.b);
    headGrad.addColorStop(1, this.darkenColor(this.color.b, 0.7));

    // 현실적인 뱀 머리 형태 (더 부드러운 곡선)
    ctx.beginPath();
    ctx.moveTo(headLength * 0.65, 0); // 코 끝 (약간 뾰족)
    
    // 상단 곡선 (더 자연스럽게)
    ctx.bezierCurveTo(
      headLength * 0.4, -headWidth * 0.25,  // 첫 번째 제어점
      headLength * 0.1, -headWidth * 0.45,  // 두 번째 제어점
      -headLength * 0.1, -headWidth * 0.4   // 끝점
    );
    
    // 목 부분 (자연스러운 연결)
    ctx.bezierCurveTo(
      -headLength * 0.3, -neckWidth * 0.35,
      -headLength * 0.5, -neckWidth * 0.15,
      -headLength * 0.6, 0
    );
    
    // 하단 곡선 (대칭)
    ctx.bezierCurveTo(
      -headLength * 0.5, neckWidth * 0.15,
      -headLength * 0.3, neckWidth * 0.35,
      -headLength * 0.1, headWidth * 0.4
    );
    
    ctx.bezierCurveTo(
      headLength * 0.1, headWidth * 0.45,
      headLength * 0.4, headWidth * 0.25,
      headLength * 0.65, 0
    );
    
    ctx.closePath();
    ctx.fillStyle = headGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    // 현실적인 뱀 머리 비늘 (더 정교한)
    ctx.save();
    ctx.clip();
    
    const scaleRows = 4;
    const scalesPerRow = 6;
    
    for (let row = 0; row < scaleRows; row++) {
      for (let col = 0; col < scalesPerRow; col++) {
        const progress = row / (scaleRows - 1);
        const x = -headLength * 0.4 + progress * headLength * 0.8;
        const maxWidth = headWidth * (0.3 + 0.4 * Math.sin(progress * Math.PI));
        const y = -maxWidth + (col / (scalesPerRow - 1)) * maxWidth * 2;
        
        const scaleSize = r * (0.15 + progress * 0.1);
        
        // 각 비늘의 미세한 그라디언트
        const scaleGrad = ctx.createRadialGradient(x - scaleSize * 0.2, y - scaleSize * 0.2, 0, x, y, scaleSize);
        scaleGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
        scaleGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        scaleGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
        
        // 타원형 비늘
        ctx.beginPath();
        ctx.ellipse(x, y, scaleSize * 0.8, scaleSize * 0.5, Math.PI * (0.1 + progress * 0.1), 0, Math.PI * 2);
        ctx.fillStyle = scaleGrad;
        ctx.fill();
        
        // 미세한 테두리
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }
    }
    
    ctx.restore();

    // 뱀 머리 상단 하이라이트 (Slither.io 시그니처)
    ctx.beginPath();
    ctx.ellipse(-headLength * 0.1, -headWidth * 0.2, headLength * 0.4, headWidth * 0.15, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    ctx.restore();

    // 뱀의 세밀한 눈 (약간 뒤쪽 위치)
    const eyeDist = r * 0.35;
    const eyeR = r * 0.22;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    
    // 눈 위치를 약간 뒤로 (더 현실적)
    const eyeBackOffset = r * 0.1;
    const leftEyeX = hx + Math.cos(this.angle - 0.35) * eyeDist - Math.cos(this.angle) * eyeBackOffset;
    const leftEyeY = hy + Math.sin(this.angle - 0.35) * eyeDist - Math.sin(this.angle) * eyeBackOffset;
    const rightEyeX = hx + Math.cos(this.angle + 0.35) * eyeDist - Math.cos(this.angle) * eyeBackOffset;
    const rightEyeY = hy + Math.sin(this.angle + 0.35) * eyeDist - Math.sin(this.angle) * eyeBackOffset;
    
    this.drawEye(ctx, leftEyeX, leftEyeY, eyeR, blinkScale, 'fierce');
    this.drawEye(ctx, rightEyeX, rightEyeY, eyeR, blinkScale, 'fierce');

    // 뱀 혀 (항상 보임)
    this.drawSnakeTongue(ctx, hx, hy, r);
    
    // 정교한 콧구멍
    this.drawNostrils(ctx, hx, hy, r);
  }

  // Stage 3: 왕뱀 머리 - 왕관 + 황금 비늘
  drawKingSnakeHead(ctx, hx, hy, r, evo) {
    this.drawBodyConnector(ctx, hx, hy, r);
    this.drawAuraAndBossEffects(ctx, hx, hy, r, evo);

    // 왕뱀의 더 큰 삼각형 머리
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle);

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 6;

    const headLength = r * 1.5;
    const headWidth = r * 1.3;
    
    const grad = ctx.createRadialGradient(-headLength * 0.3, -headWidth * 0.2, 0, 0, 0, headLength);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(0.3, this.color.h);
    grad.addColorStop(0.7, this.color.b);
    grad.addColorStop(1, this.darkenColor(this.color.b, 0.5));

    ctx.beginPath();
    ctx.moveTo(headLength * 0.6, 0);
    ctx.quadraticCurveTo(headLength * 0.2, -headWidth * 0.55, -headLength * 0.3, -headWidth * 0.45);
    ctx.quadraticCurveTo(-headLength * 0.7, 0, -headLength * 0.3, headWidth * 0.45);
    ctx.quadraticCurveTo(headLength * 0.2, headWidth * 0.55, headLength * 0.6, 0);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    // 황금 비늘 무늬
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(180,140,0,0.4)';
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = -headLength * 0.3 + i * headLength * 0.15;
      const y = (i % 2) * headWidth * 0.2 - headWidth * 0.1;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3;
        const px = x + Math.cos(angle) * headLength * 0.08;
        const py = y + Math.sin(angle) * headWidth * 0.08;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    // 왕관
    this.drawCrown(ctx, hx, hy, r);

    // 황금 눈
    const eyeDist = r * 0.45;
    const eyeR = r * 0.28;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    this.drawEye(ctx, hx + Math.cos(this.angle - 0.25) * eyeDist, hy + Math.sin(this.angle - 0.25) * eyeDist, eyeR, blinkScale, 'regal');
    this.drawEye(ctx, hx + Math.cos(this.angle + 0.25) * eyeDist, hy + Math.sin(this.angle + 0.25) * eyeDist, eyeR, blinkScale, 'regal');

    // 왕뱀 혀
    this.drawSnakeTongue(ctx, hx, hy, r);
    this.drawNostrils(ctx, hx, hy, r);
  }

  // Stage 4: 용 머리 - 전설급 드래곤 헤드
  drawDragonHead(ctx, hx, hy, r, evo) {
    this.drawBodyConnector(ctx, hx, hy, r);
    this.drawAuraAndBossEffects(ctx, hx, hy, r, evo);

    // 용 날개 (머리 뒤에, 더 크고 화려하게)
    this.drawDragonWings(ctx, hx, hy, r);

    // 전설의 드래곤 머리
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle);

    // 강력한 드래곤 그림자
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.shadowBlur = 12;

    const headLength = r * 2.0;
    const headWidth = r * 1.3;
    const jawWidth = r * 1.1;
    const neckWidth = r * 0.9;
    
    // 용암 같은 8단계 머리 그라디언트
    const dragonHeadGrad = ctx.createRadialGradient(-headLength * 0.15, -headWidth * 0.25, 0, 0, 0, headLength * 0.9);
    dragonHeadGrad.addColorStop(0, this.lightenColor(this.color.h, 2.0));    // 백열 하이라이트
    dragonHeadGrad.addColorStop(0.1, this.lightenColor(this.color.h, 1.6));  
    dragonHeadGrad.addColorStop(0.25, this.lightenColor(this.color.h, 1.3)); 
    dragonHeadGrad.addColorStop(0.4, this.color.h);
    dragonHeadGrad.addColorStop(0.55, this.color.b);
    dragonHeadGrad.addColorStop(0.7, this.darkenColor(this.color.b, 0.8));
    dragonHeadGrad.addColorStop(0.85, '#3d2517'); // 어두운 갈색
    dragonHeadGrad.addColorStop(1, '#1a0d06');    // 거의 검정

    // 복잡한 용 머리 형태 (턱선 분리, 더 현실적)
    ctx.beginPath();
    // 상단 턱 (코부터 시작)
    ctx.moveTo(headLength * 0.75, 0);
    
    // 코 → 이마 곡선
    ctx.bezierCurveTo(
      headLength * 0.6, -headWidth * 0.15,
      headLength * 0.4, -headWidth * 0.35,
      headLength * 0.1, -headWidth * 0.45
    );
    
    // 이마 → 뒷머리
    ctx.bezierCurveTo(
      -headLength * 0.1, -headWidth * 0.5,
      -headLength * 0.3, -headWidth * 0.35,
      -headLength * 0.5, -headWidth * 0.2
    );
    
    // 목 연결부 (상단)
    ctx.bezierCurveTo(
      -headLength * 0.7, -neckWidth * 0.15,
      -headLength * 0.8, -neckWidth * 0.05,
      -headLength * 0.85, 0
    );
    
    // 목 → 하단 턱 시작
    ctx.bezierCurveTo(
      -headLength * 0.8, neckWidth * 0.05,
      -headLength * 0.7, neckWidth * 0.15,
      -headLength * 0.5, headWidth * 0.25
    );
    
    // 하단 턱선 (더 두꺼운 턱)
    ctx.bezierCurveTo(
      -headLength * 0.3, jawWidth * 0.4,
      -headLength * 0.1, jawWidth * 0.5,
      headLength * 0.15, jawWidth * 0.45
    );
    
    // 턱 → 코 끝
    ctx.bezierCurveTo(
      headLength * 0.4, jawWidth * 0.35,
      headLength * 0.6, jawWidth * 0.15,
      headLength * 0.75, 0
    );
    
    ctx.closePath();
    ctx.fillStyle = dragonHeadGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    // 전설급 용 비늘 패턴 (머리)
    ctx.save();
    ctx.clip();
    
    const headScaleRows = 6;
    const scalesPerHeadRow = 8;
    
    for (let row = 0; row < headScaleRows; row++) {
      for (let col = 0; col < scalesPerHeadRow; col++) {
        const progressX = row / (headScaleRows - 1);
        const progressY = (col - scalesPerHeadRow/2) / (scalesPerHeadRow/2);
        
        const x = -headLength * 0.6 + progressX * headLength * 0.9;
        const maxWidth = headWidth * (0.2 + 0.6 * Math.sin(progressX * Math.PI * 0.8));
        const y = progressY * maxWidth * 0.8;
        
        const scaleSize = r * (0.12 + progressX * 0.08);
        
        // 불타는 스케일 그라디언트
        const fireScaleGrad = ctx.createRadialGradient(
          x - scaleSize * 0.3, y - scaleSize * 0.3, 0, 
          x, y, scaleSize * 0.8
        );
        fireScaleGrad.addColorStop(0, 'rgba(255,240,200,0.4)');
        fireScaleGrad.addColorStop(0.3, 'rgba(255,150,50,0.25)');
        fireScaleGrad.addColorStop(0.7, 'rgba(200,80,20,0.2)');
        fireScaleGrad.addColorStop(1, 'rgba(100,30,10,0.3)');
        
        // 용 머리 펜타곤 스케일
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2 + (row * 0.15);
          const radius = scaleSize * (0.6 + Math.sin(i * 1.5) * 0.1);
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fireScaleGrad;
        ctx.fill();
        
        // 불타는 테두리
        ctx.strokeStyle = 'rgba(255,100,30,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        
        // 용의 심장부 - 작은 불꽃
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${150 + Math.sin(this.wobble * 5 + row + col) * 50},0,0.9)`;
        ctx.fill();
      }
    }
    
    ctx.restore();

    // 드래곤 머리 상단 메탈릭 하이라이트
    const metalHeadGrad = ctx.createRadialGradient(
      -headLength * 0.1, -headWidth * 0.3, 0,
      headLength * 0.1, -headWidth * 0.2, headLength * 0.4
    );
    metalHeadGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
    metalHeadGrad.addColorStop(0.3, 'rgba(255,220,150,0.3)');
    metalHeadGrad.addColorStop(0.7, 'rgba(255,150,50,0.2)');
    metalHeadGrad.addColorStop(1, 'rgba(255,100,0,0.1)');
    
    ctx.beginPath();
    ctx.ellipse(0, -headWidth * 0.25, headLength * 0.35, headWidth * 0.2, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = metalHeadGrad;
    ctx.fill();

    ctx.restore();

    // 드래곤의 위엄있는 뿔
    this.drawDragonHorns(ctx, hx, hy, r);

    // 용의 긴 수염
    this.drawDragonWhiskers(ctx, hx, hy, r);

    // 전설의 용 눈 (더 크고 위엄있게)
    const eyeDist = r * 0.45;
    const eyeR = r * 0.28;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    
    // 눈 위치를 약간 뒤로 (용다운 위치)
    const eyeBackOffset = r * 0.15;
    const leftDragonEyeX = hx + Math.cos(this.angle - 0.25) * eyeDist - Math.cos(this.angle) * eyeBackOffset;
    const leftDragonEyeY = hy + Math.sin(this.angle - 0.25) * eyeDist - Math.sin(this.angle) * eyeBackOffset;
    const rightDragonEyeX = hx + Math.cos(this.angle + 0.25) * eyeDist - Math.cos(this.angle) * eyeBackOffset;
    const rightDragonEyeY = hy + Math.sin(this.angle + 0.25) * eyeDist - Math.sin(this.angle) * eyeBackOffset;
    
    this.drawEye(ctx, leftDragonEyeX, leftDragonEyeY, eyeR, blinkScale, 'dragon');
    this.drawEye(ctx, rightDragonEyeX, rightDragonEyeY, eyeR, blinkScale, 'dragon');

    // 용의 입에서 불 (부스트 시)
    if (this.boosting) {
      this.drawDragonFire(ctx, hx, hy, r);
    }

    // 드래곤 콧구멍 (더 크고 연기가)
    this.drawDragonNostrils(ctx, hx, hy, r);
  }

  // 헬퍼 메서드들
  drawBodyConnector(ctx, hx, hy, r) {
    if (this.segments.length > 1) {
      const seg1 = this.segments[1];
      const { W, H } = state;
      const offX = -state.camera.x + W / 2;
      const offY = -state.camera.y + H / 2;
      const s1x = seg1.x + offX;
      const s1y = seg1.y + offY;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(s1x, s1y);
      ctx.strokeStyle = this.color.h;
      ctx.lineWidth = r * 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  drawAuraAndBossEffects(ctx, hx, hy, r, evo) {
    // Aura glow (behind head)
    if (evo.aura) {
      const a = evo.aura;
      const pulseSize = Math.sin(this.wobble * a.pulse) * 0.2 + 1;
      const auraR = r * a.radius * pulseSize;
      const grad = ctx.createRadialGradient(hx, hy, r * 0.2, hx, hy, auraR);
      grad.addColorStop(0, `rgba(${a.color},${a.alpha})`);
      grad.addColorStop(0.5, `rgba(${a.color},${a.alpha * 0.5})`);
      grad.addColorStop(1, `rgba(${a.color},0)`);
      ctx.beginPath();
      ctx.arc(hx, hy, auraR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Boss layered red glow
    if (this.isBoss) {
      const pulseR = r + 12 + Math.sin(this.wobble * 2) * 5;
      const bossGrad = ctx.createRadialGradient(hx, hy, r * 0.3, hx, hy, pulseR);
      bossGrad.addColorStop(0, 'rgba(255,40,40,0.25)');
      bossGrad.addColorStop(0.5, 'rgba(255,40,40,0.12)');
      bossGrad.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.beginPath();
      ctx.arc(hx, hy, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = bossGrad;
      ctx.fill();

      // Pulse ring
      ctx.beginPath();
      ctx.arc(hx, hy, r + 8 + Math.sin(this.wobble * 3) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,60,60,${0.4 + Math.sin(this.wobble * 3) * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  drawMouthAndTongue(ctx, hx, hy, r, forceShow = false) {
    // 일반 입
    const mouthDist = r * 0.55;
    const mx = hx + Math.cos(this.angle) * mouthDist;
    const my = hy + Math.sin(this.angle) * mouthDist;
    const mouthOpen = this.boosting ? 0.6 : 0.35;
    ctx.beginPath();
    ctx.arc(mx, my, r * mouthOpen, this.angle + Math.PI * 0.6, this.angle + Math.PI * 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 혀 (부스트 시에만)
    if (this.boosting || forceShow) {
      const tongueBase = r * 0.65;
      const tongueLen = r * 0.8;
      const tbx = hx + Math.cos(this.angle) * tongueBase;
      const tby = hy + Math.sin(this.angle) * tongueBase;
      const flicker = Math.sin(this.wobble * 15) * 0.2;
      const perpAngle = this.angle + Math.PI / 2;

      ctx.strokeStyle = '#cc2222';
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.lineCap = 'round';

      // Left fork
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      const tipLx = tbx + Math.cos(this.angle + flicker - 0.15) * tongueLen;
      const tipLy = tby + Math.sin(this.angle + flicker - 0.15) * tongueLen;
      const cpx1 = tbx + Math.cos(this.angle) * tongueLen * 0.5 + Math.cos(perpAngle) * r * 0.05;
      const cpy1 = tby + Math.sin(this.angle) * tongueLen * 0.5 + Math.sin(perpAngle) * r * 0.05;
      ctx.quadraticCurveTo(cpx1, cpy1, tipLx, tipLy);
      ctx.stroke();

      // Right fork
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      const tipRx = tbx + Math.cos(this.angle + flicker + 0.15) * tongueLen;
      const tipRy = tby + Math.sin(this.angle + flicker + 0.15) * tongueLen;
      const cpx2 = tbx + Math.cos(this.angle) * tongueLen * 0.5 - Math.cos(perpAngle) * r * 0.05;
      const cpy2 = tby + Math.sin(this.angle) * tongueLen * 0.5 - Math.sin(perpAngle) * r * 0.05;
      ctx.quadraticCurveTo(cpx2, cpy2, tipRx, tipRy);
      ctx.stroke();
    }
  }

  drawSnakeTongue(ctx, hx, hy, r) {
    // Slither.io급 현실적인 뱀 혀
    const tongueBase = r * 0.9;
    const tongueLen = r * 1.4;
    const tbx = hx + Math.cos(this.angle) * tongueBase;
    const tby = hy + Math.sin(this.angle) * tongueBase;
    const flicker = Math.sin(this.wobble * 25 + Math.sin(this.wobble * 8)) * 0.4; // 더 자연스러운 진동
    const perpAngle = this.angle + Math.PI / 2;

    // 혀 중앙 베이스 (더 두꺼운)
    ctx.strokeStyle = '#cc1818';
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(this.angle) * r * 0.6, hy + Math.sin(this.angle) * r * 0.6);
    ctx.lineTo(tbx, tby);
    ctx.stroke();

    // 두 갈래 혀 (더 현실적인 형태)
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    
    for (const side of [-0.3, 0.3]) {
      // 혀끝 위치 계산 (더 복잡한 움직임)
      const forkFlicker = flicker + side * 0.5;
      const tipX = tbx + Math.cos(this.angle + forkFlicker) * tongueLen;
      const tipY = tby + Math.sin(this.angle + forkFlicker) * tongueLen;
      
      // 혀 중간 제어점 (더 자연스러운 곡선)
      const midX = tbx + Math.cos(this.angle) * tongueLen * 0.6;
      const midY = tby + Math.sin(this.angle) * tongueLen * 0.6;
      const sideOffset = Math.cos(perpAngle) * r * side * 0.4;
      const sideOffsetY = Math.sin(perpAngle) * r * side * 0.4;
      
      // 그라디언트 색상 (끝으로 갈수록 어두워짐)
      const gradient = ctx.createLinearGradient(tbx, tby, tipX, tipY);
      gradient.addColorStop(0, '#ee2222');
      gradient.addColorStop(0.7, '#cc1818');
      gradient.addColorStop(1, '#aa1111');
      ctx.strokeStyle = gradient;
      
      ctx.beginPath();
      ctx.moveTo(tbx, tby);
      ctx.quadraticCurveTo(
        midX + sideOffset, midY + sideOffsetY,
        tipX, tipY
      );
      ctx.stroke();
      
      // 혀끝 강조 점
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3333';
      ctx.fill();
    }
  }

  drawNostrils(ctx, hx, hy, r) {
    const nostrilDist = r * 0.45;
    const nostrilSpread = 0.25;
    const nr = Math.max(0.8, r * 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (const offset of [-nostrilSpread, nostrilSpread]) {
      const nx = hx + Math.cos(this.angle + offset) * nostrilDist;
      const ny = hy + Math.sin(this.angle + offset) * nostrilDist;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCrown(ctx, hx, hy, r) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle - Math.PI / 2);

    const crownGrad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.2);
    crownGrad.addColorStop(0, '#bb8800');
    crownGrad.addColorStop(0.4, '#ffdd44');
    crownGrad.addColorStop(1, '#ffee88');
    
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.lineTo(-r * 0.4, -r * 1.1);
    ctx.lineTo(-r * 0.15, -r * 0.7);
    ctx.lineTo(0, -r * 1.2);
    ctx.lineTo(r * 0.15, -r * 0.7);
    ctx.lineTo(r * 0.4, -r * 1.1);
    ctx.lineTo(r * 0.5, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#996600';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 왕관 밴드
    ctx.fillStyle = '#ddaa00';
    ctx.fillRect(-r * 0.5, -r * 0.4, r * 1.0, r * 0.12);
    ctx.strokeRect(-r * 0.5, -r * 0.4, r * 1.0, r * 0.12);
    
    // 보석들
    const jewels = [[-r * 0.4, -r * 1.0], [0, -r * 1.15], [r * 0.4, -r * 1.0]];
    for (const [jx, jy] of jewels) {
      ctx.beginPath();
      ctx.arc(jx, jy, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#ff2233';
      ctx.fill();
      ctx.strokeStyle = '#cc0022';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      
      // 보석 하이라이트
      ctx.beginPath();
      ctx.arc(jx - r * 0.02, jy - r * 0.02, r * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }
    
    ctx.restore();
  }

  drawDragonWings(ctx, hx, hy, r) {
    const flapAngle = Math.sin(this.wobble * 3) * 0.5;
    const flapSpeed = this.boosting ? 2 : 1;
    
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(this.angle - Math.PI / 2);
      ctx.scale(side, 1);
      ctx.rotate(flapAngle * side * flapSpeed);

      // 전설급 날개 크기
      const wingSpan = r * 3.5;
      const wingHeight = r * 2.8;

      // 화려한 날개 그라디언트 (용암 효과)
      const wingFireGrad = ctx.createLinearGradient(0, 0, -wingSpan, 0);
      wingFireGrad.addColorStop(0, this.lightenColor(this.color.h, 1.2));
      wingFireGrad.addColorStop(0.2, this.color.h);
      wingFireGrad.addColorStop(0.4, this.color.l);
      wingFireGrad.addColorStop(0.6, this.color.b);
      wingFireGrad.addColorStop(0.8, this.darkenColor(this.color.b, 0.7));
      wingFireGrad.addColorStop(1, '#2d1810');

      // 날개 투명도 (박쥐 날개 느낌)
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = wingFireGrad;

      // 더 현실적인 용 날개 형태
      ctx.beginPath();
      // 날개 상단
      ctx.moveTo(r * 0.15, -r * 0.2);
      ctx.bezierCurveTo(-r * 0.8, -wingHeight * 0.9, -wingSpan * 0.7, -wingHeight * 0.6, -wingSpan, -r * 0.3);
      
      // 날개 끝 → 하단
      ctx.bezierCurveTo(-wingSpan * 0.9, r * 0.1, -wingSpan * 0.8, r * 0.5, -wingSpan * 0.6, wingHeight * 0.5);
      
      // 하단 곡선
      ctx.bezierCurveTo(-wingSpan * 0.5, wingHeight * 0.7, -r * 1.5, wingHeight * 0.8, -r * 0.8, wingHeight * 0.6);
      
      // 몸통 연결
      ctx.bezierCurveTo(-r * 0.4, wingHeight * 0.4, -r * 0.2, r * 0.3, r * 0.15, r * 0.2);
      
      ctx.closePath();
      ctx.fill();

      // 날개막 세부 구조 (박쥐 날개의 손가락뼈)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2.5;
      
      const wingBones = [
        // 주요 뼈대 5개
        [r * 0.1, -r * 0.1, -wingSpan * 0.7, -wingHeight * 0.5],
        [r * 0.1, 0, -wingSpan * 0.9, -r * 0.1],
        [r * 0.1, 0, -wingSpan * 0.8, r * 0.3],
        [r * 0.1, r * 0.1, -wingSpan * 0.6, wingHeight * 0.4],
        [r * 0.1, r * 0.1, -r * 0.8, wingHeight * 0.55]
      ];
      
      for (const [sx, sy, ex, ey] of wingBones) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // 날개막 연결선 (더 세밀한)
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      
      // 수평 연결선들
      const horizontalLines = [
        [-r * 0.5, -wingHeight * 0.4, -wingSpan * 0.5, -wingHeight * 0.3],
        [-r * 0.8, -r * 0.05, -wingSpan * 0.7, r * 0.1],
        [-r * 0.7, wingHeight * 0.25, -wingSpan * 0.4, wingHeight * 0.35]
      ];
      
      for (const [sx, sy, ex, ey] of horizontalLines) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // 날개 상단 메탈릭 하이라이트
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 0.2);
      ctx.bezierCurveTo(-r * 0.6, -wingHeight * 0.7, -wingSpan * 0.5, -wingHeight * 0.4, -wingSpan * 0.8, -r * 0.2);
      ctx.stroke();

      // 날개 가장자리 불꽃 효과 (부스트 시)
      if (this.boosting) {
        ctx.strokeStyle = 'rgba(255,120,0,0.6)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255,100,0,0.8)';
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.moveTo(r * 0.15, -r * 0.2);
        ctx.bezierCurveTo(-r * 0.8, -wingHeight * 0.9, -wingSpan * 0.7, -wingHeight * 0.6, -wingSpan, -r * 0.3);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  drawDragonHorns(ctx, hx, hy, r) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(this.angle - Math.PI / 2);
      ctx.scale(side, 1);

      const hornGrad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.8);
      hornGrad.addColorStop(0, this.color.b);
      hornGrad.addColorStop(0.5, this.color.l);
      hornGrad.addColorStop(1, '#ffffff');
      
      ctx.fillStyle = hornGrad;
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.3);
      ctx.quadraticCurveTo(r * 0.8, -r * 1.6, r * 0.3, -r * 1.7);
      ctx.quadraticCurveTo(r * 0.1, -r * 1.2, r * 0.05, -r * 0.4);
      ctx.closePath();
      ctx.fill();
      
      // 뿔 하이라이트
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 0.4);
      ctx.quadraticCurveTo(r * 0.6, -r * 1.4, r * 0.28, -r * 1.6);
      ctx.stroke();
      
      ctx.restore();
    }
  }

  drawDragonWhiskers(ctx, hx, hy, r) {
    const whiskerLength = r * 1.5;
    const whiskerWave = Math.sin(this.wobble * 3) * 0.3;
    
    for (const side of [-1, 1]) {
      ctx.strokeStyle = this.lightenColor(this.color.h, 1.2);
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      const startX = hx + Math.cos(this.angle + side * 1.2) * r * 0.6;
      const startY = hy + Math.sin(this.angle + side * 1.2) * r * 0.6;
      const endX = startX + Math.cos(this.angle + side * 0.3 + whiskerWave) * whiskerLength;
      const endY = startY + Math.sin(this.angle + side * 0.3 + whiskerWave) * whiskerLength;
      
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        startX + Math.cos(this.angle) * whiskerLength * 0.3,
        startY + Math.sin(this.angle) * whiskerLength * 0.3,
        endX, endY
      );
      ctx.stroke();
    }
  }

  drawDragonFire(ctx, hx, hy, r) {
    const fireLength = r * 2.5;
    const fireBase = hx + Math.cos(this.angle) * r * 0.9;
    const fireBaseY = hy + Math.sin(this.angle) * r * 0.9;
    
    // 드래곤 브레스 - 화염 방사기 효과
    const fireSpread = 0.8;
    const particleCount = 15 + Math.floor(Math.random() * 10);
    
    // 중앙 화염 코어
    const coreGrad = ctx.createRadialGradient(fireBase, fireBaseY, 0, fireBase, fireBaseY, r * 0.8);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    coreGrad.addColorStop(0.3, 'rgba(255,200,100,0.8)');
    coreGrad.addColorStop(0.7, 'rgba(255,100,0,0.6)');
    coreGrad.addColorStop(1, 'rgba(200,50,0,0.3)');
    
    ctx.beginPath();
    ctx.arc(fireBase, fireBaseY, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    
    // 화염 파티클들 (3단계 레이어)
    const fireStages = [
      { count: 8, sizeMin: 4, sizeMax: 8, colors: ['#ffffff', '#fff8dc', '#fffacd'] },      // 화이트 핫
      { count: 12, sizeMin: 3, sizeMax: 6, colors: ['#ffd700', '#ffa500', '#ff8c00'] },    // 골든 오렌지
      { count: 15, sizeMin: 2, sizeMax: 5, colors: ['#ff4500', '#ff0000', '#dc143c'] }     // 딥 레드
    ];
    
    fireStages.forEach((stage, layerIndex) => {
      for (let i = 0; i < stage.count; i++) {
        const progress = i / stage.count;
        const angle = this.angle + (Math.random() - 0.5) * fireSpread * (1 + layerIndex * 0.3);
        const distance = fireLength * (0.3 + Math.random() * 0.7) * (1 + layerIndex * 0.2);
        
        const fx = fireBase + Math.cos(angle) * distance;
        const fy = fireBaseY + Math.sin(angle) * distance;
        
        const size = stage.sizeMin + Math.random() * (stage.sizeMax - stage.sizeMin);
        const color = stage.colors[Math.floor(Math.random() * stage.colors.length)];
        
        // 각 파티클마다 미니 그라디언트
        const particleGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
        particleGrad.addColorStop(0, color);
        particleGrad.addColorStop(1, color + '00'); // 투명
        
        ctx.beginPath();
        ctx.arc(fx, fy, size, 0, Math.PI * 2);
        ctx.fillStyle = particleGrad;
        ctx.globalAlpha = (0.6 + Math.random() * 0.4) * (1 - layerIndex * 0.2);
        ctx.fill();
      }
    });
    
    // 화염 가장자리 스파크 효과
    for (let i = 0; i < 6; i++) {
      const sparkAngle = this.angle + (Math.random() - 0.5) * fireSpread * 1.5;
      const sparkDist = fireLength * (0.8 + Math.random() * 0.4);
      const sparkX = fireBase + Math.cos(sparkAngle) * sparkDist;
      const sparkY = fireBaseY + Math.sin(sparkAngle) * sparkDist;
      
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffff00'; // 밝은 노랑 스파크
      ctx.globalAlpha = 0.8 + Math.random() * 0.2;
      ctx.fill();
    }
    
    // 화염 줄기 (연속적인 불꽃 스트림)
    const streamGrad = ctx.createLinearGradient(fireBase, fireBaseY, 
      fireBase + Math.cos(this.angle) * fireLength, fireBaseY + Math.sin(this.angle) * fireLength);
    streamGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    streamGrad.addColorStop(0.3, 'rgba(255,150,0,0.3)');
    streamGrad.addColorStop(0.7, 'rgba(255,50,0,0.2)');
    streamGrad.addColorStop(1, 'rgba(100,0,0,0.1)');
    
    ctx.beginPath();
    ctx.ellipse(
      fireBase + Math.cos(this.angle) * fireLength * 0.4,
      fireBaseY + Math.sin(this.angle) * fireLength * 0.4,
      fireLength * 0.6, r * 0.3, this.angle, 0, Math.PI * 2
    );
    ctx.fillStyle = streamGrad;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }

  // 색상 헬퍼 메서드들
  lightenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.round(r * factor));
    const ng = Math.min(255, Math.round(g * factor));
    const nb = Math.min(255, Math.round(b * factor));
    return `rgb(${nr},${ng},${nb})`;
  }

  darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    return `rgb(${nr},${ng},${nb})`;
  }

  // 꼬리 특수 효과
  drawTailEffect(ctx, offX, offY, stage) {
    if (stage >= 4) {
      // 용의 불꽃 꼬리
      this.drawDragonTail(ctx, offX, offY);
    } else if (stage >= 2) {
      // 뱀의 꼬리 (더 날카롭게)
      this.drawSnakeTail(ctx, offX, offY);
    }
  }

  drawDragonTail(ctx, offX, offY) {
    if (this.segments.length < 5) return;
    
    const tailSeg = this.segments[this.segments.length - 1];
    const tx = tailSeg.x + offX;
    const ty = tailSeg.y + offY;
    const r = this.bodyRadius(this.segments.length - 1);
    
    // 꼬리 방향 계산
    const prevSeg = this.segments[this.segments.length - 2];
    const tailAngle = Math.atan2(tailSeg.y - prevSeg.y, tailSeg.x - prevSeg.x);
    
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(tailAngle);

    // 불꽃 삼각형
    const flameLength = r * 1.5;
    const flameWidth = r * 0.8;
    
    const fireGrad = ctx.createLinearGradient(0, 0, flameLength, 0);
    fireGrad.addColorStop(0, this.color.h);
    fireGrad.addColorStop(0.3, '#ff6600');
    fireGrad.addColorStop(0.7, '#ff4400');
    fireGrad.addColorStop(1, '#ff2200');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(flameLength, -flameWidth * 0.3);
    ctx.lineTo(flameLength * 0.8, 0);
    ctx.lineTo(flameLength, flameWidth * 0.3);
    ctx.closePath();
    ctx.fillStyle = fireGrad;
    ctx.fill();

    // 불꽃 파티클
    const particleCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < particleCount; i++) {
      const px = flameLength * (0.7 + Math.random() * 0.4);
      const py = (Math.random() - 0.5) * flameWidth * 0.6;
      const pSize = 2 + Math.random() * 3;
      
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = ['#ff8800', '#ffaa00', '#ffcc00'][Math.floor(Math.random() * 3)];
      ctx.globalAlpha = 0.8;
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawSnakeTail(ctx, offX, offY) {
    if (this.segments.length < 5) return;
    
    const tailSeg = this.segments[this.segments.length - 1];
    const tx = tailSeg.x + offX;
    const ty = tailSeg.y + offY;
    const r = this.bodyRadius(this.segments.length - 1);
    
    // 꼬리 방향 계산
    const prevSeg = this.segments[this.segments.length - 2];
    const tailAngle = Math.atan2(tailSeg.y - prevSeg.y, tailSeg.x - prevSeg.x);
    
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(tailAngle);

    // 날카로운 뱀 꼬리
    const tipLength = r * 0.8;
    const tipWidth = r * 0.3;
    
    const tipGrad = ctx.createLinearGradient(0, 0, tipLength, 0);
    tipGrad.addColorStop(0, this.color.h);
    tipGrad.addColorStop(0.6, this.color.b);
    tipGrad.addColorStop(1, this.darkenColor(this.color.b, 0.5));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipLength, 0);
    ctx.lineTo(tipLength * 0.7, -tipWidth);
    ctx.lineTo(0, -tipWidth * 0.5);
    ctx.lineTo(tipLength * 0.7, tipWidth);
    ctx.lineTo(0, tipWidth * 0.5);
    ctx.closePath();
    ctx.fillStyle = tipGrad;
    ctx.fill();

    // 꼬리 끝 하이라이트
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipLength * 0.3, 0);
    ctx.lineTo(tipLength, 0);
    ctx.stroke();
    
    ctx.restore();
  }

  // Removed old drawDecoration method - now using evolution-specific head shapes

  drawEye(ctx, ex, ey, r, blinkScale, style = 'baby') {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, blinkScale);

    // White sclera
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const lookX = Math.cos(this.angle) * r * 0.15;
    const lookY = Math.sin(this.angle) * r * 0.15;

    if (style === 'baby') {
      const pupilR = r * 0.6;
      ctx.beginPath();
      ctx.arc(lookX, lookY, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX - pupilR * 0.3, -pupilR * 0.3, pupilR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX + pupilR * 0.2, pupilR * 0.2, pupilR * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();

    } else if (style === 'alert') {
      const pupilR = r * 0.5;
      ctx.beginPath();
      ctx.arc(lookX, lookY, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX - pupilR * 0.3, -pupilR * 0.3, pupilR * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

    } else if (style === 'fierce') {
      const irisR = r * 0.6;
      ctx.beginPath();
      ctx.arc(lookX, lookY, irisR, 0, Math.PI * 2);
      ctx.fillStyle = '#cc3322';
      ctx.fill();
      const pupilR = r * 0.35;
      ctx.beginPath();
      ctx.arc(lookX, lookY, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a0a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX - pupilR * 0.4, -pupilR * 0.4, pupilR * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();

    } else if (style === 'regal') {
      const irisR = r * 0.6;
      ctx.beginPath();
      ctx.arc(lookX, lookY, irisR, 0, Math.PI * 2);
      ctx.fillStyle = '#ccaa22';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX, lookY, irisR * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#4422aa';
      ctx.fill();
      const pupilR = r * 0.25;
      ctx.beginPath();
      ctx.arc(lookX, lookY, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0020';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lookX - pupilR * 0.5, -pupilR * 0.5, pupilR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();

    } else if (style === 'dragon') {
      const irisR = r * 0.65;
      const irisGrad = ctx.createRadialGradient(lookX, lookY, 0, lookX, lookY, irisR);
      irisGrad.addColorStop(0, '#ffaa00');
      irisGrad.addColorStop(0.6, '#dd4400');
      irisGrad.addColorStop(1, '#881100');
      ctx.beginPath();
      ctx.arc(lookX, lookY, irisR, 0, Math.PI * 2);
      ctx.fillStyle = irisGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(lookX, lookY, r * 0.1, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,100,0,${0.3 + Math.sin(this.wobble * 3) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lookX - r * 0.15, -r * 0.18, r * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,220,150,0.7)';
      ctx.fill();
    }

    ctx.restore();
  }

  // 드래곤 전용 콧구멍 (연기 효과)
  drawDragonNostrils(ctx, hx, hy, r) {
    const nostrilDist = r * 0.6;
    const nostrilSpread = 0.4;
    const nr = Math.max(2, r * 0.08);
    
    // 드래곤 콧구멍 (더 크고 타원형)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (const offset of [-nostrilSpread, nostrilSpread]) {
      const nx = hx + Math.cos(this.angle + offset) * nostrilDist;
      const ny = hy + Math.sin(this.angle + offset) * nostrilDist;
      
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(this.angle);
      
      // 타원형 콧구멍
      ctx.beginPath();
      ctx.ellipse(0, 0, nr * 1.5, nr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 콧구멍 내부 하이라이트
      ctx.beginPath();
      ctx.ellipse(-nr * 0.3, -nr * 0.2, nr * 0.4, nr * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,100,50,0.3)';
      ctx.fill();
      
      // 연기 효과 (휴식 시에도 약간)
      if (Math.random() < 0.3) {
        const smokeParticles = this.boosting ? 3 : 1;
        for (let i = 0; i < smokeParticles; i++) {
          const smokeX = nr * (1 + Math.random() * 2);
          const smokeY = (Math.random() - 0.5) * nr * 0.5;
          const smokeSize = 1 + Math.random() * 2;
          
          ctx.beginPath();
          ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
          ctx.fillStyle = this.boosting ? 
            `rgba(255,${100 + Math.random() * 100},0,${0.4 + Math.random() * 0.4})` :
            `rgba(150,150,150,${0.2 + Math.random() * 0.3})`;
          ctx.fill();
        }
      }
      
      ctx.restore();
    }
  }
}
