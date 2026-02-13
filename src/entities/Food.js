import { CFG, FOOD_TIERS, getRandomFoodTier } from '../config.js';
import { rand } from '../utils.js';
import { state } from '../state.js';
import { ObjectPool } from '../core/ObjectPool.js';

export class Food {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = 5;
    this.color = '';
    this.glow = '';
    this.phase = 0;
    this.alive = false;
    this.tier = FOOD_TIERS[0]; // default small
  }

  reset(x, y, tier) {
    this.tier = tier || getRandomFoodTier();
    this.x = x != null ? x : rand(100, CFG.WORLD_W - 100);
    this.y = y != null ? y : rand(100, CFG.WORLD_H - 100);
    this.radius = rand(this.tier.radiusMin, this.tier.radiusMax);
    this.phase = Math.random() * Math.PI * 2;
    this.alive = true;

    if (this.tier.golden) {
      // Golden: fixed gold color
      this.color = 'hsl(45, 90%, 65%)';
      this.glow = 'hsl(45, 95%, 75%)';
    } else {
      const hue = rand(0, 360);
      this.color = `hsl(${hue}, 80%, 65%)`;
      this.glow = `hsl(${hue}, 80%, 75%)`;
    }
    return this;
  }

  draw(ctx, cam) {
    const { W, H, frameCount } = state;
    const sx = this.x - cam.x + W / 2;
    const sy = this.y - cam.y + H / 2;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;

    const pulse = 1 + Math.sin(this.phase + frameCount * 0.04) * 0.15;
    const r = this.radius * pulse;
    const isLarge = this.tier.id === 'large';
    const isGolden = this.tier.golden;

    // ── Golden pulsing ring ──
    if (isGolden) {
      const ringPulse = 1 + Math.sin(frameCount * 0.06 + this.phase) * 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 4 * ringPulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,215,0,${0.3 + Math.sin(frameCount * 0.05) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Glow (bigger for large/golden) ──
    const glowExtra = isGolden ? 8 : isLarge ? 6 : 4;
    const glowAlpha = isGolden ? 0.25 : isLarge ? 0.2 : 0.15;
    ctx.beginPath();
    ctx.arc(sx, sy, r + glowExtra, 0, Math.PI * 2);
    ctx.fillStyle = this.glow;
    ctx.globalAlpha = glowAlpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Body gradient ──
    const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, this.color);
    g.addColorStop(1, this.glow);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // ── Sparkle highlight (large + golden) ──
    if (isLarge || isGolden) {
      const sparkAngle = frameCount * 0.03 + this.phase;
      const sparkDist = r * 0.35;
      const sparkX = sx + Math.cos(sparkAngle) * sparkDist;
      const sparkY = sy + Math.sin(sparkAngle) * sparkDist;
      const sparkR = r * 0.2;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(frameCount * 0.08) * 0.3})`;
      ctx.fill();
    }
  }
}

export const foodPool = new ObjectPool(
  () => new Food(),
  (obj, x, y, tier) => obj.reset(x, y, tier),
  CFG.FOOD_COUNT
);
