import { ACHIEVEMENT_DEFS } from '../config.js';

const STORAGE_KEY = 'wormy_achievements';

let unlocked = {}; // { id: true }
let pendingNotifications = []; // achievements unlocked this frame

export function loadAchievements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    unlocked = raw ? JSON.parse(raw) : {};
  } catch {
    unlocked = {};
  }
  pendingNotifications = [];
  return unlocked;
}

export function saveAchievements() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch { /* ignore */ }
}

export function getUnlocked() {
  return unlocked;
}

export function getPendingNotifications() {
  const out = [...pendingNotifications];
  pendingNotifications = [];
  return out;
}

export function checkAchievements(state) {
  const { player, killCount, survivalTime, wave, bossesAlive } = state;
  if (!player) return;

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked[def.id]) continue;
    if (def.check(state)) {
      unlocked[def.id] = true;
      pendingNotifications.push(def);
      saveAchievements();
    }
  }
}
