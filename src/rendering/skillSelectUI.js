import { SKILL_DEFS } from '../config.js';
import { state } from '../state.js';
import { applySkill } from '../systems/skills.js';
import { playSkillSelect } from '../audio/SoundManager.js';

let overlay = null;

export function showSkillUI(choices) {
  if (overlay) hideSkillUI();

  overlay = document.createElement('div');
  overlay.id = 'skill-overlay';
  overlay.className = 'skill-overlay';

  let html = '<div class="skill-title">스킬 선택</div>';
  html += '<div class="skill-cards">';

  for (const def of choices) {
    const existing = state.selectedSkills.find(s => s.id === def.id);
    const currentLevel = existing ? existing.level : 0;
    const nextLevel = currentLevel + 1;
    const levelDots = Array.from({ length: def.maxLevel }, (_, i) =>
      `<span class="skill-dot${i < nextLevel ? ' filled' : ''}"></span>`
    ).join('');

    html += `
      <button class="skill-card" data-skill="${def.id}">
        <div class="skill-card-icon">${def.icon}</div>
        <div class="skill-card-name">${def.name}</div>
        <div class="skill-card-desc">${def.desc}</div>
        <div class="skill-card-level">${levelDots} Lv.${nextLevel}</div>
      </button>
    `;
  }

  html += '</div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // Attach click handlers
  overlay.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const skillId = card.dataset.skill;
      applySkill(skillId);
      playSkillSelect();
      hideSkillUI();
      state.skillChoices = null;
    });
    // Touch support
    card.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const skillId = card.dataset.skill;
      applySkill(skillId);
      playSkillSelect();
      hideSkillUI();
      state.skillChoices = null;
    });
  });

  // Force reflow for animation
  requestAnimationFrame(() => overlay.classList.add('active'));
}

export function hideSkillUI() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

export function isSkillUIShowing() {
  return overlay !== null;
}
