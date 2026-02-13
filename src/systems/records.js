const STORAGE_KEY = 'wormy_records';

const defaultRecords = {
  highScore: 0,
  maxLength: 0,
  maxKills: 0,
  longestSurvival: 0, // seconds
  totalGames: 0,
};

let records = null;
let newRecords = []; // track which records were broken this session

export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    records = raw ? { ...defaultRecords, ...JSON.parse(raw) } : { ...defaultRecords };
  } catch {
    records = { ...defaultRecords };
  }
  newRecords = [];
  return records;
}

export function saveRecords() {
  if (!records) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch { /* quota exceeded - ignore */ }
}

export function getRecords() {
  if (!records) loadRecords();
  return records;
}

export function getNewRecords() {
  return newRecords;
}

export function clearNewRecords() {
  newRecords = [];
}

export function checkRecordBroken(state) {
  if (!records) return false;
  const { player, killCount } = state;
  if (!player) return false;

  let broken = false;
  const score = Math.floor(player.score);
  const length = Math.floor(player.length);
  const survivalTime = state.survivalTime || 0;

  if (score > records.highScore) {
    records.highScore = score;
    if (!newRecords.includes('highScore')) { newRecords.push('highScore'); broken = true; }
  }
  if (length > records.maxLength) {
    records.maxLength = length;
    if (!newRecords.includes('maxLength')) { newRecords.push('maxLength'); broken = true; }
  }
  if (killCount > records.maxKills) {
    records.maxKills = killCount;
    if (!newRecords.includes('maxKills')) { newRecords.push('maxKills'); broken = true; }
  }
  if (survivalTime > records.longestSurvival) {
    records.longestSurvival = survivalTime;
    if (!newRecords.includes('longestSurvival')) { newRecords.push('longestSurvival'); broken = true; }
  }

  return broken;
}

export function incrementGameCount() {
  if (!records) loadRecords();
  records.totalGames++;
  saveRecords();
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
