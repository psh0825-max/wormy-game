import { CFG, EVOLUTION_STAGES, WAVE_CFG } from '../config.js';
import { state } from '../state.js';

export function updateHUD() {
  const { player, worms, killCount, minionCooldown, activeItemEffects, wave, waveTimer } = state;
  if (!player) return;

  const evoStage = EVOLUTION_STAGES[player.evolutionStage] || EVOLUTION_STAGES[0];
  document.getElementById('score-value').textContent = Math.floor(player.score);

  const evoBadge = document.getElementById('evo-badge');
  if (evoBadge) {
    evoBadge.textContent = evoStage.icon;
    evoBadge.className = 'evo-badge' + (player.evolutionStage >= 2 ? ' pulse' : '');
  }
  document.getElementById('score-length').textContent = `${evoStage.name} | 길이: ${Math.floor(player.length)} | 킬: ${killCount}`;

  // Wave progress bar
  const waveEl = document.getElementById('wave-info');
  if (waveEl) {
    const elapsed = Math.min(waveTimer, WAVE_CFG.DURATION);
    const pct = (elapsed / WAVE_CFG.DURATION) * 100;
    if (wave > 0) {
      waveEl.innerHTML = `<span class="wave-label">🌊 ${wave}</span><div class="wave-bar"><div class="wave-bar-fill" id="wave-bar-fill" style="width:${pct}%"></div></div>`;
      waveEl.style.display = 'flex';
    } else {
      const remaining = Math.max(0, Math.ceil(WAVE_CFG.DURATION - waveTimer));
      waveEl.innerHTML = `<span class="wave-label">다음 웨이브: ${remaining}s</span>`;
      waveEl.style.display = 'flex';
    }
  }

  // Leaderboard
  const alive = worms.filter(w => w.alive && !w.isMinion).sort((a, b) => b.score - a.score).slice(0, 6);
  const lb = document.getElementById('leaderboard');
  let html = '<div class="lb-title">순위</div>';
  alive.forEach((w, i) => {
    const cls = w.isPlayer ? ' me' : '';
    html += `<div class="lb-entry${cls}"><span><span class="lb-rank">${i + 1}.</span>${w.name}</span><span>${Math.floor(w.score)}</span></div>`;
  });
  lb.innerHTML = html;

  // Minion cooldown
  const btn = document.getElementById('minion-btn');
  const cdCircle = document.querySelector('#minion-cd circle');
  if (minionCooldown > 0) {
    btn.disabled = true;
    const pct = minionCooldown / CFG.MINION_COOLDOWN;
    cdCircle.style.strokeDashoffset = (1 - pct) * 226;
    cdCircle.style.stroke = 'rgba(255,150,50,0.5)';
  } else {
    btn.disabled = false;
    cdCircle.style.strokeDashoffset = 0;
    cdCircle.style.stroke = 'rgba(255,255,255,0.3)';
  }

  // Active items
  const aiDiv = document.getElementById('active-items');
  const now = Date.now();
  state.activeItemEffects = activeItemEffects.filter(e => now - e.start < e.duration);
  aiDiv.innerHTML = state.activeItemEffects.map(e => {
    const remaining = 1 - (now - e.start) / e.duration;
    return `<div class="active-item">
      <span class="item-icon">${e.type.icon}</span>
      <span>${e.type.name}</span>
      <div class="item-bar"><div class="item-bar-fill" style="width:${remaining * 100}%;background:${e.type.color}"></div></div>
    </div>`;
  }).join('');

  // Damage vignette
  const vignetteEl = document.getElementById('damage-vignette');
  if (vignetteEl) {
    vignetteEl.style.opacity = state.damageVignette;
  }
}

export function showNotification(text, color, size = 'normal') {
  const div = document.createElement('div');
  div.className = 'kill-notify' + (size === 'large' ? ' kill-notify-large' : '');
  div.style.color = color;
  if (size === 'large') {
    div.style.textShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
  }
  div.textContent = text;
  document.body.appendChild(div);
  const duration = size === 'large' ? 2200 : 1600;
  setTimeout(() => div.remove(), duration);
}

// ── Float text system (rendered on canvas) ──
export function addFloatText(worldX, worldY, text, color = '#fff', size = 18) {
  state.floatTexts.push({
    x: worldX,
    y: worldY,
    text,
    color,
    size,
    life: 1.0,
    vy: -1.5,
  });
}

export function updateAndDrawFloatTexts(ctx, cam, dt) {
  const { W, H } = state;
  const alive = [];

  for (const ft of state.floatTexts) {
    ft.y += ft.vy * dt * 60;
    ft.vy *= 0.98;
    ft.life -= dt * 0.8;
    if (ft.life <= 0) continue;

    const sx = ft.x - cam.x + W / 2;
    const sy = ft.y - cam.y + H / 2;
    if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) { alive.push(ft); continue; }

    ctx.save();
    ctx.globalAlpha = ft.life;
    ctx.font = `bold ${ft.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(ft.text, sx, sy + 2);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, sx, sy);
    ctx.restore();

    alive.push(ft);
  }
  state.floatTexts = alive;
}

// ── Food absorption animations ──
export function addFoodAbsorb(fx, fy, tx, ty, color, radius) {
  state.foodAbsorbs.push({ fx, fy, tx, ty, color, radius, t: 0 });
}

export function updateAndDrawFoodAbsorbs(ctx, cam, dt) {
  const { W, H } = state;
  const alive = [];

  for (const fa of state.foodAbsorbs) {
    fa.t += dt * 5; // complete in ~0.2s
    if (fa.t >= 1) continue;

    // Ease-in curve for suction effect
    const t = fa.t * fa.t;
    const x = fa.fx + (fa.tx - fa.fx) * t;
    const y = fa.fy + (fa.ty - fa.fy) * t;
    const r = fa.radius * (1 - t);

    const sx = x - cam.x + W / 2;
    const sy = y - cam.y + H / 2;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) { alive.push(fa); continue; }

    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(1, r), 0, Math.PI * 2);
    ctx.fillStyle = fa.color;
    ctx.fill();
    ctx.globalAlpha = 1;

    alive.push(fa);
  }
  state.foodAbsorbs = alive;
}

// ── Speed lines effect ──
export function drawSpeedLines(ctx, W, H, boosting) {
  if (!boosting) return;

  const count = state.isMobile ? 8 : 15;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < count; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 30 + Math.random() * 60;
    const angle = Math.atan2(y - H / 2, x - W / 2);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}
