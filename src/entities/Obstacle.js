import { rand } from '../utils.js';
import { CFG, MAP_CFG } from '../config.js';

export class Obstacle {
  constructor() {
    const margin = 300;
    this.x = rand(margin, CFG.WORLD_W - margin);
    this.y = rand(margin, CFG.WORLD_H - margin);
    this.radius = rand(MAP_CFG.OBSTACLE_RADIUS_MIN, MAP_CFG.OBSTACLE_RADIUS_MAX);
  }

  draw(ctx, cam, W, H) {
    const sx = this.x - cam.x + W / 2;
    const sy = this.y - cam.y + H / 2;
    if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) return;

    // Dark rock
    const grad = ctx.createRadialGradient(sx - this.radius * 0.2, sy - this.radius * 0.2, 0, sx, sy, this.radius);
    grad.addColorStop(0, '#3a3a50');
    grad.addColorStop(0.7, '#252535');
    grad.addColorStop(1, '#1a1a28');
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(sx - this.radius * 0.2, sy - this.radius * 0.3, this.radius * 0.5, this.radius * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
  }
}
