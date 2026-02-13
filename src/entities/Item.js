import { CFG, ITEM_TYPES } from '../config.js';
import { randInt, randPos } from '../utils.js';
import { state } from '../state.js';

export class Item {
  constructor() {
    const pos = randPos();
    this.x = pos.x;
    this.y = pos.y;
    this.type = ITEM_TYPES[randInt(0, ITEM_TYPES.length - 1)];
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
    this.spawnTime = Date.now();
  }

  draw(ctx, cam) {
    const { W, H, frameCount } = state;
    const sx = this.x - cam.x + W / 2;
    const sy = this.y - cam.y + H / 2;
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) return;

    const bob = Math.sin(this.phase + frameCount * 0.03) * 4;
    const pulse = 1 + Math.sin(this.phase + frameCount * 0.05) * 0.1;
    const r = CFG.ITEM_RADIUS * pulse;

    // Enhanced item glow with pulsing
    const glowIntensity = 0.15 + Math.sin(frameCount * 0.04 + this.phase) * 0.08;
    
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r + 12 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.globalAlpha = glowIntensity * 0.6;
    ctx.fill();
    
    // Middle glow
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r + 6 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = this.type.color;
    ctx.globalAlpha = glowIntensity;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Background circle
    ctx.beginPath();
    ctx.arc(sx, sy + bob, r, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(sx, sy + bob - 3, 0, sx, sy + bob, r);
    ig.addColorStop(0, '#fff');
    ig.addColorStop(0.5, this.type.color);
    ig.addColorStop(1, this.type.color);
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Icon
    ctx.font = `${r * 1.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, sx, sy + bob + 1);
  }
}
