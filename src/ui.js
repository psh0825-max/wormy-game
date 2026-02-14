import { COLORS, ACHIEVEMENT_DEFS } from './config.js';
import { state } from './state.js';
import { startGame } from './game.js';
import { loadRecords, formatTime } from './systems/records.js';

let previewAnimId = null;

export function setupUI() {
  // Color grid
  const colorGrid = document.getElementById('color-grid');
  COLORS.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'color-btn' + (i === 0 ? ' selected' : '');
    btn.style.background = `radial-gradient(circle at 40% 35%, ${c.l}, ${c.h}, ${c.b})`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedColor = i;
    });
    colorGrid.appendChild(btn);
  });

  document.getElementById('play-btn').addEventListener('click', () => {
    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    startGame();
  });
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('menu-screen').classList.remove('hidden');
    state.gameState = 'menu';
    updateMenuRecords();
    updateMenuAchievements();
    startPreviewAnimation();
  });

  // Menu background particles
  initMenuParticles();

  updateMenuRecords();
  updateMenuAchievements();
  startPreviewAnimation();
}

function initMenuParticles() {
  const container = document.getElementById('menu-particles');
  if (!container) return;
  const count = 15;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = 4 + Math.random() * 8;
    const hue = Math.random() * 360;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.background = `hsla(${hue}, 70%, 60%, 0.3)`;
    particle.style.animationDelay = Math.random() * 8 + 's';
    particle.style.animationDuration = (6 + Math.random() * 6) + 's';
    container.appendChild(particle);
  }
}

function startPreviewAnimation() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  let t = 0;

  function drawPreview() {
    previewAnimId = requestAnimationFrame(drawPreview);
    t += 0.03;

    ctx.clearRect(0, 0, W, H);

    // Draw a small worm preview
    const color = COLORS[state.selectedColor];
    const segCount = 12;
    const r = 6;

    for (let i = segCount - 1; i >= 0; i--) {
      const progress = i / segCount;
      const x = W / 2 + Math.cos(t + i * 0.4) * 20 + (i - segCount / 2) * 6;
      const y = H / 2 + Math.sin(t * 2 + i * 0.3) * 8;
      const segR = r * (1 - progress * 0.4);

      const grad = ctx.createRadialGradient(x - segR * 0.3, y - segR * 0.3, 0, x, y, segR);
      grad.addColorStop(0, color.l);
      grad.addColorStop(0.5, color.h);
      grad.addColorStop(1, color.b);

      ctx.beginPath();
      ctx.arc(x, y, segR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Head
    const hx = W / 2 + Math.cos(t) * 20 - segCount / 2 * 6 + segCount * 3;
    const hy = H / 2 + Math.sin(t * 2) * 8;
    const headR = r * 1.3;
    const hGrad = ctx.createRadialGradient(hx - headR * 0.3, hy - headR * 0.3, 0, hx, hy, headR);
    hGrad.addColorStop(0, '#fff');
    hGrad.addColorStop(0.3, color.l);
    hGrad.addColorStop(0.7, color.h);
    hGrad.addColorStop(1, color.b);
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fillStyle = hGrad;
    ctx.fill();

    // Eyes
    const eyeAngle = Math.atan2(Math.sin(t * 2) * 0.5, 1);
    for (const side of [-1, 1]) {
      const ex = hx + Math.cos(eyeAngle - side * 0.5) * headR * 0.35;
      const ey = hy + Math.sin(eyeAngle - side * 0.5) * headR * 0.35;
      ctx.beginPath();
      ctx.arc(ex, ey, headR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + Math.cos(eyeAngle) * headR * 0.08, ey + Math.sin(eyeAngle) * headR * 0.08, headR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + Math.cos(eyeAngle) * headR * 0.04 - headR * 0.06, ey - headR * 0.06, headR * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }
  }
  drawPreview();
}

export function updateMenuRecords() {
  const records = loadRecords();
  const el = document.getElementById('menu-records');
  if (!el) return;
  if (records.totalGames === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="records-title">🏆 내 기록</div>
    <div class="records-grid">
      <div class="record-item"><span class="record-label">최고점수</span><span class="record-val">${records.highScore}</span></div>
      <div class="record-item"><span class="record-label">최대길이</span><span class="record-val">${records.maxLength}</span></div>
      <div class="record-item"><span class="record-label">최다킬</span><span class="record-val">${records.maxKills}</span></div>
      <div class="record-item"><span class="record-label">최장생존</span><span class="record-val">${formatTime(records.longestSurvival)}</span></div>
      <div class="record-item"><span class="record-label">플레이</span><span class="record-val">${records.totalGames}회</span></div>
    </div>
  `;
}

export function updateMenuAchievements() {
  const el = document.getElementById('menu-achievements');
  if (!el) return;
  let achieved;
  try {
    const raw = localStorage.getItem('wormy_achievements');
    achieved = raw ? JSON.parse(raw) : {};
  } catch { achieved = {}; }

  if (ACHIEVEMENT_DEFS.length === 0) { el.innerHTML = ''; return; }

  const count = Object.keys(achieved).length;
  let html = `<div class="achieve-title">🏅 업적 (${count}/${ACHIEVEMENT_DEFS.length})</div>`;
  html += '<div class="achieve-grid">';
  for (const def of ACHIEVEMENT_DEFS) {
    const locked = !achieved[def.id];
    html += `<div class="achieve-item${locked ? ' locked' : ''}" title="${def.desc}">
      <span class="achieve-icon">${def.icon}</span>
      <span class="achieve-name">${def.name}</span>
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}
