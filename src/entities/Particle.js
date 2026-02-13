import { rand } from '../utils.js';
import { state } from '../state.js';
import { ObjectPool } from '../core/ObjectPool.js';

export class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = '';
    this.size = 3;
    this.life = 0;
    this.decay = 0;
  }

  reset(x, y, color, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = rand(-3, 3);
    this.vy = rand(-3, 3);
    this.color = color;
    this.size = size;
    this.life = 1;
    this.decay = rand(0.02, 0.05);
    return this;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= this.decay * dt * 60;
    return this.life > 0;
  }

  draw(ctx, cam) {
    const { W, H } = state;
    const sx = this.x - cam.x + W / 2;
    const sy = this.y - cam.y + H / 2;
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) return;
    ctx.beginPath();
    ctx.arc(sx, sy, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life * 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export const particlePool = new ObjectPool(
  () => new Particle(),
  (obj, x, y, color, size) => obj.reset(x, y, color, size),
  200
);
