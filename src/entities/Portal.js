import { rand } from '../utils.js';
import { CFG, MAP_CFG } from '../config.js';

export class PortalPair {
  constructor() {
    const margin = 400;
    const hue = rand(0, 360);
    this.a = {
      x: rand(margin, CFG.WORLD_W / 2 - 200),
      y: rand(margin, CFG.WORLD_H - margin),
      cooldown: 0,
    };
    this.b = {
      x: rand(CFG.WORLD_W / 2 + 200, CFG.WORLD_W - margin),
      y: rand(margin, CFG.WORLD_H - margin),
      cooldown: 0,
    };
    this.radius = MAP_CFG.PORTAL_RADIUS;
    this.hue = hue;
    this.phase = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.phase += dt * 3;
    if (this.a.cooldown > 0) this.a.cooldown -= dt * 1000;
    if (this.b.cooldown > 0) this.b.cooldown -= dt * 1000;
  }

  drawPortal(ctx, portal, cam, W, H) {
    const sx = portal.x - cam.x + W / 2;
    const sy = portal.y - cam.y + H / 2;
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;

    const r = this.radius;
    const onCooldown = portal.cooldown > 0;

    // Outer ring (rotating)
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.phase);

    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${this.hue}, 80%, ${onCooldown ? 30 : 60}%, ${onCooldown ? 0.3 : 0.7})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${onCooldown ? 0.1 : 0.3})`);
    grad.addColorStop(1, `hsla(${this.hue}, 80%, 50%, 0)`);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Swirl lines
    if (!onCooldown) {
      for (let i = 0; i < 3; i++) {
        const a = this.phase + (i * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, a, a + 1);
        ctx.strokeStyle = `hsla(${this.hue + 30}, 80%, 70%, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  draw(ctx, cam, W, H) {
    this.drawPortal(ctx, this.a, cam, W, H);
    this.drawPortal(ctx, this.b, cam, W, H);
  }
}
