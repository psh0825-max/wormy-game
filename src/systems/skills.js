import { SKILL_DEFS } from '../config.js';
import { state } from '../state.js';

export function rollSkillChoices() {
  // Filter out maxed skills
  const available = SKILL_DEFS.filter(def => {
    const existing = state.selectedSkills.find(s => s.id === def.id);
    return !existing || existing.level < def.maxLevel;
  });

  if (available.length === 0) return null;

  // Shuffle and pick 3 (or fewer)
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

export function applySkill(skillId) {
  const def = SKILL_DEFS.find(d => d.id === skillId);
  if (!def) return;

  let existing = state.selectedSkills.find(s => s.id === skillId);
  if (existing) {
    if (existing.level >= def.maxLevel) return;
    existing.level++;
  } else {
    state.selectedSkills.push({ id: skillId, level: 1 });
  }

  computeSkillModifiers();
}

export function computeSkillModifiers() {
  const mods = {};

  for (const skill of state.selectedSkills) {
    const def = SKILL_DEFS.find(d => d.id === skill.id);
    if (!def) continue;

    for (const [key, val] of Object.entries(def.effect)) {
      if (typeof val === 'boolean') {
        mods[key] = val;
      } else {
        mods[key] = (mods[key] || 0) + val * skill.level;
      }
    }
  }

  state.skillModifiers = mods;
}

export function checkSkillTrigger() {
  if (!state.player || !state.player.alive) return false;
  if (state.skillChoices) return false; // already showing

  if (state.player.score >= state.nextSkillScore) {
    const choices = rollSkillChoices();
    if (choices && choices.length > 0) {
      state.skillChoices = choices;
      state.nextSkillScore += 500;
      return true;
    }
    // No choices available, skip this threshold
    state.nextSkillScore += 500;
  }
  return false;
}
