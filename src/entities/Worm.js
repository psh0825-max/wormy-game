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
      this.length -= CFG.BOOST_DRAIN * boostDrainMult * dt;
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

    // Dragon flame particles (stage >= 4)
    const evoStage = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    if (evoStage.trailParticles && this.segments.length > 5) {
      this._flameTimer += dt;
      if (this._flameTimer > 0.033) {
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

    // Check if visible
    const hx = this.head.x + offX;
    const hy = this.head.y + offY;
    if (hx < -300 || hx > W + 300 || hy < -300 || hy > H + 300) return;

    const evo = EVOLUTION_STAGES[this.evolutionStage] || EVOLUTION_STAGES[0];
    const stage = this.evolutionStage;

    // ── BODY GLOW OUTLINE (stage 2+) ──
    if (stage >= 2 && evo.aura) {
      const glowColor = evo.aura.color;
      const glowAlpha = stage >= 4 ? 0.25 : stage >= 3 ? 0.18 : 0.12;
      const glowExtra = stage >= 4 ? 6 : stage >= 3 ? 4 : 3;

      for (let i = this.segments.length - 1; i >= 0; i -= 2) {
        const seg = this.segments[i];
        const sx = seg.x + offX;
        const sy = seg.y + offY;
        if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
        const r = this.bodyRadius(i);
        const pulse = Math.sin(this.wobble * 2 + i * 0.15) * 0.3 + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r + glowExtra * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${glowColor},${glowAlpha * pulse})`;
        ctx.fill();
      }
    }

    // Boss body shimmer glow
    if (this.isBoss) {
      for (let i = this.segments.length - 1; i >= 0; i -= 3) {
        const seg = this.segments[i];
        const sx = seg.x + offX;
        const sy = seg.y + offY;
        const r = this.bodyRadius(i);
        ctx.beginPath();
        ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,50,50,${0.15 + Math.sin(this.wobble * 2 + i * 0.3) * 0.1})`;
        ctx.fill();
      }
    }

    // ── SEGMENT CONNECTORS (fill gaps between segments) ──
    ctx.lineCap = 'round';
    for (let i = this.segments.length - 1; i >= 2; i--) {
      const seg = this.segments[i];
      const prev = this.segments[i - 1];
      const sx = seg.x + offX;
      const sy = seg.y + offY;
      const px = prev.x + offX;
      const py = prev.y + offY;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const r = this.bodyRadius(i);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = this.color.h;
      ctx.lineWidth = r * 1.7;
      ctx.stroke();
    }

    // ── BODY SEGMENTS ──
    for (let i = this.segments.length - 1; i >= 1; i--) {
      const seg = this.segments[i];
      const sx = seg.x + offX;
      const sy = seg.y + offY;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const r = this.bodyRadius(i);

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

    // Evolution decorations — draw BEHIND head for wings, OVER head for crown/horns
    const deco = evo.decoration;
    if (deco === 'wings') this.drawDecoration(ctx, hx, hy, r, 'wings');

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

    // ── CONNECTOR from head to first body segment ──
    if (this.segments.length > 1) {
      const seg1 = this.segments[1];
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

    // Head sprite
    const { sprite: headSprite, spriteRadius: headSpriteR } = getHeadSprite(this.colorIdx, r, stage);
    if (headSprite) {
      const scale = r / headSpriteR;
      const drawSize = headSprite.width * scale;
      ctx.drawImage(headSprite, hx - drawSize / 2, hy - drawSize / 2, drawSize, drawSize);
    }

    // Head shine
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.15, hy - r * 0.3, r * 0.6, r * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();

    // ── MOUTH (dark arc in movement direction) ──
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

    // ── TONGUE (boost only — red forked tongue via bezier) ──
    if (this.boosting) {
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

    // ── NOSTRILS (two dark dots above the mouth) ──
    const nostrilDist = r * 0.45;
    const nostrilSpread = 0.25;
    const nr = Math.max(0.8, r * 0.05);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (const offset of [-nostrilSpread, nostrilSpread]) {
      const nx = hx + Math.cos(this.angle + offset) * nostrilDist;
      const ny = hy + Math.sin(this.angle + offset) * nostrilDist;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    const eyeDist = r * 0.38;
    const eyeR = r * 0.32;
    const eyeOffX = Math.cos(this.angle - 0.4) * eyeDist;
    const eyeOffY = Math.sin(this.angle - 0.4) * eyeDist;
    const eyeOffX2 = Math.cos(this.angle + 0.4) * eyeDist;
    const eyeOffY2 = Math.sin(this.angle + 0.4) * eyeDist;
    const blinkScale = (this.eyeBlink > 3.85) ? Math.max(0.1, 1 - (this.eyeBlink - 3.85) / 0.15 * 0.9) : 1;
    this.drawEye(ctx, hx + eyeOffX, hy + eyeOffY, eyeR, blinkScale, evo.eyeStyle);
    this.drawEye(ctx, hx + eyeOffX2, hy + eyeOffY2, eyeR, blinkScale, evo.eyeStyle);

    // Cheeks + Smile (only baby/alert)
    if (evo.eyeStyle === 'baby' || evo.eyeStyle === 'alert') {
      const cheekDist = r * 0.55;
      ctx.fillStyle = 'rgba(255, 100, 120, 0.25)';
      for (const cAngle of [this.angle - 1.2, this.angle + 1.2]) {
        ctx.beginPath();
        ctx.arc(hx + Math.cos(cAngle) * cheekDist, hy + Math.sin(cAngle) * cheekDist, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Smile
      ctx.beginPath();
      const smileDist = r * 0.3;
      ctx.arc(hx + Math.cos(this.angle) * smileDist, hy + Math.sin(this.angle) * smileDist, r * 0.25, this.angle + 0.3, this.angle + Math.PI - 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Cheek aura glow (stage 3+)
    if (stage >= 3 && evo.aura) {
      const cheekDist = r * 0.5;
      const glowAlpha = 0.12 + Math.sin(this.wobble * 2) * 0.05;
      for (const cAngle of [this.angle - 1.0, this.angle + 1.0]) {
        const cx = hx + Math.cos(cAngle) * cheekDist;
        const cy = hy + Math.sin(cAngle) * cheekDist;
        const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.3);
        cGrad.addColorStop(0, `rgba(${evo.aura.color},${glowAlpha})`);
        cGrad.addColorStop(1, `rgba(${evo.aura.color},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = cGrad;
        ctx.fill();
      }
    }

    // Decorations on top (horns, crown — wings drawn earlier behind head)
    if (deco === 'horns' || deco === 'crown') this.drawDecoration(ctx, hx, hy, r, deco);
  }

  drawDecoration(ctx, hx, hy, r, type) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle - Math.PI / 2);

    if (type === 'horns') {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        const grad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.6);
        grad.addColorStop(0, this.color.b);
        grad.addColorStop(1, this.color.l);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(r * 0.15, -r * 0.3);
        ctx.quadraticCurveTo(r * 0.7, -r * 1.5, r * 0.25, -r * 1.4);
        ctx.quadraticCurveTo(r * 0.0, -r * 1.0, r * 0.0, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    } else if (type === 'crown') {
      const crownGrad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.4);
      crownGrad.addColorStop(0, '#bb8800');
      crownGrad.addColorStop(0.4, '#ffdd44');
      crownGrad.addColorStop(1, '#ffee88');
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.3);
      ctx.lineTo(-r * 0.5, -r * 1.2);
      ctx.lineTo(-r * 0.2, -r * 0.75);
      ctx.lineTo(0, -r * 1.4);
      ctx.lineTo(r * 0.2, -r * 0.75);
      ctx.lineTo(r * 0.5, -r * 1.2);
      ctx.lineTo(r * 0.6, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#996600';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ddaa00';
      ctx.fillRect(-r * 0.6, -r * 0.4, r * 1.2, r * 0.15);
      ctx.strokeRect(-r * 0.6, -r * 0.4, r * 1.2, r * 0.15);
      const jewels = [[-r * 0.5, -r * 1.15], [0, -r * 1.35], [r * 0.5, -r * 1.15]];
      for (const [jx, jy] of jewels) {
        ctx.beginPath();
        ctx.arc(jx, jy, r * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#ff2233';
        ctx.fill();
        ctx.strokeStyle = '#cc0022';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(jx - r * 0.03, jy - r * 0.03, r * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
      }
    } else if (type === 'wings') {
      const flapAngle = Math.sin(this.wobble * 4) * 0.3;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flapAngle * side);

        const wingGrad = ctx.createLinearGradient(0, 0, -r * 2.5, 0);
        wingGrad.addColorStop(0, this.color.h);
        wingGrad.addColorStop(0.4, this.color.l);
        wingGrad.addColorStop(1, this.color.b);

        ctx.globalAlpha = 0.65;
        ctx.fillStyle = wingGrad;

        ctx.beginPath();
        ctx.moveTo(r * 0.1, -r * 0.1);
        ctx.quadraticCurveTo(-r * 1.0, -r * 1.8, -r * 2.2, -r * 0.6);
        ctx.quadraticCurveTo(-r * 2.0, -r * 0.1, -r * 1.8, r * 0.3);
        ctx.quadraticCurveTo(-r * 1.4, r * 0.6, -r * 1.0, r * 0.5);
        ctx.quadraticCurveTo(-r * 0.4, r * 0.4, r * 0.1, r * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(r * 0.1, 0);
        ctx.quadraticCurveTo(-r * 0.8, -r * 1.2, -r * 2.0, -r * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.1, 0);
        ctx.quadraticCurveTo(-r * 1.0, -r * 0.3, -r * 1.8, r * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.1, 0);
        ctx.quadraticCurveTo(-r * 0.6, r * 0.1, -r * 1.0, r * 0.5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(r * 0.1, -r * 0.1);
        ctx.quadraticCurveTo(-r * 0.8, -r * 1.5, -r * 1.8, -r * 0.5);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Small crown for dragon stage
      const crownGrad = ctx.createLinearGradient(0, -r * 0.3, 0, -r * 1.1);
      crownGrad.addColorStop(0, '#bb8800');
      crownGrad.addColorStop(0.5, '#ffdd44');
      crownGrad.addColorStop(1, '#ffee88');
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.3);
      ctx.lineTo(-r * 0.35, -r * 0.95);
      ctx.lineTo(0, -r * 0.55);
      ctx.lineTo(r * 0.35, -r * 0.95);
      ctx.lineTo(r * 0.45, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#996600';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

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
}
