import { CFG, EVOLUTION_STAGES, WAVE_CFG } from '../config.js';
import { state } from '../state.js';

export function updateHUD() {
  const { player, worms, killCount, minionCooldown, activeItemEffects, wave, waveTimer } = state;
  if (!player) return;

  const evoStage = EVOLUTION_STAGES[player.evolutionStage] || EVOLUTION_STAGES[0];
  document.getElementById('score-value').textContent = Math.floor(player.score);

  // Evolution badge with icon
  const evoBadge = document.getElementById('evo-badge');
  if (evoBadge) {
    evoBadge.textContent = evoStage.icon;
    evoBadge.className = 'evo-badge' + (player.evolutionStage >= 2 ? ' pulse' : '');
  }
  document.getElementById('score-length').textContent = `${evoStage.name} | 길이: ${Math.floor(player.length)} | 킬: ${killCount}`;

  // Wave progress bar
  const waveEl = document.getElementById('wave-info');
  const waveBar = document.getElementById('wave-bar-fill');
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
