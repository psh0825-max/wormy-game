import { COLORS, ACHIEVEMENT_DEFS } from './config.js';
import { state } from './state.js';
import { startGame } from './game.js';
import { loadRecords, formatTime } from './systems/records.js';

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

  document.getElementById('play-btn').addEventListener('click', startGame);
  document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('menu-screen').classList.remove('hidden');
    state.gameState = 'menu';
    updateMenuRecords();
    updateMenuAchievements();
  });

  updateMenuRecords();
  updateMenuAchievements();
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
