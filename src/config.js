export const CFG = {
  WORLD_W: 5000,
  WORLD_H: 5000,
  FOOD_COUNT: 400,
  ITEM_COUNT: 15,
  AI_COUNT: 12,
  SEGMENT_DIST: 6,
  BASE_SPEED: 2.8,
  BOOST_SPEED: 5.2,
  BOOST_DRAIN: 0.15,
  INITIAL_LENGTH: 20,
  GROW_PER_FOOD: 2,
  HEAD_RADIUS_BASE: 14,
  MIN_RADIUS: 5,
  FOOD_RADIUS: 5,
  ITEM_RADIUS: 12,
  MINION_COUNT: 5,
  MINION_DURATION: 12000,
  MINION_COOLDOWN: 25000,
  ITEM_DURATION: 8000,
  EAT_DISTANCE: 1.3,
  BORDER_MARGIN: 80,
  CAMERA_SMOOTH: 0.08,
};

export const COLORS = [
  { name: '핑크', h: '#ff6b9d', b: '#ff4477', l: '#ffaac8' },
  { name: '보라', h: '#c44dff', b: '#9933dd', l: '#dd88ff' },
  { name: '파랑', h: '#4d8bff', b: '#2266dd', l: '#88bbff' },
  { name: '하늘', h: '#44ddff', b: '#22aadd', l: '#88eeff' },
  { name: '초록', h: '#44dd88', b: '#22aa66', l: '#88ffbb' },
  { name: '노랑', h: '#ffdd44', b: '#ddaa22', l: '#ffee88' },
  { name: '주황', h: '#ff8844', b: '#dd6622', l: '#ffbb88' },
  { name: '빨강', h: '#ff4455', b: '#dd2233', l: '#ff8899' },
];

export const ITEM_TYPES = [
  { id: 'speed', icon: '⚡', name: '가속', color: '#ffdd44', desc: '이동 속도 증가' },
  { id: 'shield', icon: '🛡️', name: '방어막', color: '#44ddff', desc: '일정 시간 무적' },
  { id: 'magnet', icon: '🧲', name: '자석', color: '#ff4455', desc: '주변 먹이 흡수' },
  { id: 'growth', icon: '⭐', name: '성장', color: '#44dd88', desc: '즉시 성장' },
  { id: 'freeze', icon: '❄️', name: '빙결', color: '#aaddff', desc: '주변 적 감속' },
];

export const AI_NAMES = ['별이', '달이', '해피', '럭키', '코코', '모모', '두부', '콩이', '나비', '봄이', '하루', '소라', '구름', '바다', '풀잎', '꽃잎'];

// ─── Phase 2 Configs ──────────────────────────────────

export const EVOLUTION_STAGES = [
  { name: '아기 지렁이', icon: '🐛', minScore: 0, turnMod: 1.0, eatMod: 1.0, decoration: null,
    headScale: 1.0, colorIntensity: 1.0, eyeStyle: 'baby',
    aura: null, trailParticles: false },
  { name: '지렁이', icon: '🪱', minScore: 10, turnMod: 1.05, eatMod: 1.05, decoration: null,
    headScale: 1.06, colorIntensity: 1.1, eyeStyle: 'alert',
    aura: { color: '255,220,100', radius: 1.8, alpha: 0.18, pulse: 1.5 }, trailParticles: false },
  { name: '큰 지렁이', icon: '🐍', minScore: 30, turnMod: 1.1, eatMod: 1.1, decoration: 'horns',
    headScale: 1.15, colorIntensity: 1.2, eyeStyle: 'fierce',
    aura: { color: '255,160,60', radius: 2.2, alpha: 0.25, pulse: 2.0 }, trailParticles: false },
  { name: '뱀', icon: '👑', minScore: 60, turnMod: 1.2, eatMod: 1.2, decoration: 'crown',
    headScale: 1.25, colorIntensity: 1.35, eyeStyle: 'regal',
    aura: { color: '200,120,255', radius: 2.6, alpha: 0.3, pulse: 2.5 }, trailParticles: false },
  { name: '용', icon: '🐉', minScore: 120, turnMod: 1.3, eatMod: 1.3, decoration: 'wings',
    headScale: 1.35, colorIntensity: 1.5, eyeStyle: 'dragon',
    aura: { color: '255,80,30', radius: 3.0, alpha: 0.35, pulse: 3.0 }, trailParticles: true },
];

export const WAVE_CFG = {
  DURATION: 60,         // seconds per wave
  FOOD_PER_WAVE: 30,
  AI_PER_WAVE: 2,
  AI_LENGTH_PER_WAVE: 10,
  BOSS_WAVES: [3, 6, 9, 12],
  BOSS_LENGTH_MULT: 3,
  BOSS_SPEED_MULT: 1.15,
  WAVE_BONUS_MULT: 20,   // score bonus = wave * this
};

export const SKILL_DEFS = [
  { id: 'speedUp', icon: '💨', name: '지속 부스트', desc: '기본 이동속도 +10%', maxLevel: 3, effect: { speedMult: 0.1 } },
  { id: 'fastMove', icon: '⚡', name: '빠른 이동', desc: '부스트 드레인 -20%', maxLevel: 3, effect: { boostDrainMult: -0.2 } },
  { id: 'wideEat', icon: '👄', name: '넓은 입', desc: '먹기 범위 +15%', maxLevel: 3, effect: { eatRadiusMult: 0.15 } },
  { id: 'moreMinions', icon: '👥', name: '부하 증원', desc: '소환 부하 +2', maxLevel: 2, effect: { minionCountBonus: 2 } },
  { id: 'fastSummon', icon: '🔄', name: '빠른 소환', desc: '소환 쿨다운 -25%', maxLevel: 2, effect: { minionCdMult: -0.25 } },
  { id: 'autoMagnet', icon: '🧲', name: '자동 흡수', desc: '근처 먹이 자동 흡수', maxLevel: 1, effect: { autoMagnet: true } },
  { id: 'regen', icon: '💚', name: '재생', desc: '초당 길이 +0.5 재생', maxLevel: 3, effect: { regenPerSec: 0.5 } },
  { id: 'shield', icon: '🛡️', name: '보호막', desc: '부활 1회 (길이 50%)', maxLevel: 1, effect: { revive: true } },
  { id: 'scoreBoost', icon: '💰', name: '점수 부스트', desc: '점수 획득 +20%', maxLevel: 3, effect: { scoreMult: 0.2 } },
  { id: 'freezeAura', icon: '❄️', name: '냉기 오라', desc: '근처 적 10% 감속', maxLevel: 2, effect: { freezeAura: 0.1 } },
];

export const ACHIEVEMENT_DEFS = [
  { id: 'firstKill', icon: '🗡️', name: '첫 사냥', desc: '처음으로 적을 처치',
    check: (s) => s.killCount >= 1 },
  { id: 'kill10', icon: '⚔️', name: '사냥꾼', desc: '한 게임에서 10킬',
    check: (s) => s.killCount >= 10 },
  { id: 'length100', icon: '📏', name: '긴 몸', desc: '길이 100 도달',
    check: (s) => s.player && s.player.length >= 100 },
  { id: 'length300', icon: '🐲', name: '대장 지렁이', desc: '길이 300 도달',
    check: (s) => s.player && s.player.length >= 300 },
  { id: 'survive3m', icon: '⏱️', name: '3분 생존', desc: '3분간 생존',
    check: (s) => s.survivalTime >= 180 },
  { id: 'survive5m', icon: '🕐', name: '5분 생존', desc: '5분간 생존',
    check: (s) => s.survivalTime >= 300 },
  { id: 'score1000', icon: '⭐', name: '천점', desc: '점수 1000 도달',
    check: (s) => s.player && s.player.score >= 1000 },
  { id: 'score5000', icon: '🌟', name: '만점왕', desc: '점수 5000 도달',
    check: (s) => s.player && s.player.score >= 5000 },
  { id: 'evolveDragon', icon: '🐉', name: '용 진화', desc: '용으로 진화',
    check: (s) => s.player && s.player.evolutionStage >= 4 },
  { id: 'wave5', icon: '🌊', name: '웨이브 5', desc: '웨이브 5 도달',
    check: (s) => s.wave >= 5 },
  { id: 'bossKill', icon: '💀', name: '보스 처치', desc: '보스를 처치',
    check: (s) => s._bossKilled },
  { id: 'skillMaster', icon: '🎓', name: '스킬 마스터', desc: '스킬 5개 이상 선택',
    check: (s) => s.selectedSkills && s.selectedSkills.length >= 5 },
];

export const FOOD_TIERS = [
  { id: 'small',  weight: 60, radiusMin: 2.5, radiusMax: 4,   scoreValue: 5,  growValue: 1, golden: false },
  { id: 'medium', weight: 25, radiusMin: 4.5, radiusMax: 6.5, scoreValue: 10, growValue: 2, golden: false },
  { id: 'large',  weight: 10, radiusMin: 7,   radiusMax: 9,   scoreValue: 25, growValue: 4, golden: false },
  { id: 'golden', weight: 5,  radiusMin: 5,   radiusMax: 7,   scoreValue: 50, growValue: 6, golden: true  },
];

// Pre-compute cumulative weights for weighted random
const _tierTotalWeight = FOOD_TIERS.reduce((s, t) => s + t.weight, 0);
const _tierCumulative = [];
{ let cum = 0; for (const t of FOOD_TIERS) { cum += t.weight; _tierCumulative.push(cum); } }

export function getRandomFoodTier() {
  const r = Math.random() * _tierTotalWeight;
  for (let i = 0; i < FOOD_TIERS.length; i++) {
    if (r < _tierCumulative[i]) return FOOD_TIERS[i];
  }
  return FOOD_TIERS[0];
}

export const MAP_CFG = {
  OBSTACLES_PER_WAVE: 3,
  MAX_OBSTACLES: 30,
  OBSTACLE_RADIUS_MIN: 20,
  OBSTACLE_RADIUS_MAX: 60,
  PORTALS_EVERY_N_WAVES: 2,
  MAX_PORTAL_PAIRS: 5,
  PORTAL_RADIUS: 25,
  PORTAL_COOLDOWN: 3000,      // ms
  DANGER_ZONE_START_WAVE: 5,
  DANGER_ZONE_SHRINK_RATE: 2, // px per second
  DANGER_ZONE_MIN_RADIUS: 800,
  DANGER_ZONE_DAMAGE: 0.5,    // length per second
};
