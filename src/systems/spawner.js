import { CFG, COLORS, AI_NAMES, WAVE_CFG } from '../config.js';
import { rand, randInt, randPos } from '../utils.js';
import { state } from '../state.js';
import { Worm } from '../entities/Worm.js';
import { foodPool } from '../entities/Food.js';
import { Item } from '../entities/Item.js';
import { particlePool } from '../entities/Particle.js';
import { showNotification } from '../rendering/hud.js';
import { playMinionSpawn } from '../audio/SoundManager.js';
import { getWaveDifficulty } from './wave.js';

export function spawnAI() {
  const diff = getWaveDifficulty();
  const pos = randPos();
  const ci = randInt(0, COLORS.length - 1);
  const name = AI_NAMES[randInt(0, AI_NAMES.length - 1)];
  const w = new Worm(pos.x, pos.y, ci, name, false);
  w.length = rand(diff.aiInitialLength.min, diff.aiInitialLength.max);
  state.worms.push(w);
}

export function spawnBoss() {
  const diff = getWaveDifficulty();
  const pos = randPos();
  const ci = randInt(0, COLORS.length - 1);
  const name = '🔥 보스';
  const w = new Worm(pos.x, pos.y, ci, name, false);
  w.length = diff.aiInitialLength.max * WAVE_CFG.BOSS_LENGTH_MULT;
  w.score = state.wave * 200; // give boss a high score for evolution
  w.isBoss = true;
  state.worms.push(w);
  state.bossesAlive++;
}

export function spawnMinions() {
  const { player, particles, worms } = state;
  if (state.gameState !== 'playing' || !player || !player.alive || state.minionCooldown > 0) return;

  const sm = state.skillModifiers || {};
  const cdMult = Math.max(0.1, 1 + (sm.minionCdMult || 0));
  state.minionCooldown = CFG.MINION_COOLDOWN * cdMult;

  const count = CFG.MINION_COUNT + (sm.minionCountBonus || 0);
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i;
    const mx = player.head.x + Math.cos(a) * 60;
    const my = player.head.y + Math.sin(a) * 60;
    const minion = new Worm(mx, my, state.selectedColor, '부하', false, true);
    minion.length = Math.max(10, player.length * 0.25);
    minion.minionOwner = player;
    minion.minionTimer = CFG.MINION_DURATION;
    worms.push(minion);

    for (let j = 0; j < 8; j++) {
      particles.push(particlePool.acquire(mx, my, player.color.l, 4));
    }
  }
  playMinionSpawn();
  showNotification(`👥 부하 ${count}명 소환!`, '#ff9944');
}

export function respawnFood() {
  const diff = getWaveDifficulty();
  const { foods } = state;
  const aliveFood = foods.filter(f => f.alive).length;
  const target = diff.foodCount;
  if (aliveFood < target) {
    for (let i = 0; i < target - aliveFood; i++) {
      foods.push(foodPool.acquire());
    }
  }
}

export function respawnItems() {
  const { items } = state;
  const aliveItems = items.filter(it => it.alive).length;
  if (aliveItems < CFG.ITEM_COUNT) {
    items.push(new Item());
  }
}

export function respawnAI() {
  const diff = getWaveDifficulty();
  const { worms, player } = state;
  const aliveAI = worms.filter(w => w.alive && !w.isPlayer && !w.isMinion && !w.isBoss).length;
  
  // Dynamic AI count adjustment based on player size for performance
  let targetAICount = diff.aiCount;
  if (player && player.alive) {
    if (player.length > 150) {
      targetAICount = Math.max(3, Math.floor(diff.aiCount * 0.7)); // Reduce AI when player is large
    } else if (player.length > 100) {
      targetAICount = Math.max(4, Math.floor(diff.aiCount * 0.85));
    }
  }
  
  if (aliveAI < targetAICount) {
    spawnAI();
  }

  // Spawn boss if requested
  if (state._spawnBoss) {
    state._spawnBoss = false;
    spawnBoss();
  }
}
