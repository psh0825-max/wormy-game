import { CFG, WAVE_CFG } from '../config.js';
import { state } from '../state.js';
import { showNotification } from '../rendering/hud.js';
import { playWaveStart, playBossSpawn } from '../audio/SoundManager.js';
import { updateMapForWave } from './mapObjects.js';

export function updateWave(dt) {
  state.waveTimer += dt;

  if (state.waveTimer >= WAVE_CFG.DURATION) {
    state.waveTimer -= WAVE_CFG.DURATION;
    state.wave++;

    // Update map objects for new wave
    updateMapForWave(state.wave);

    // Wave bonus score
    if (state.player && state.player.alive) {
      state.player.score += state.wave * WAVE_CFG.WAVE_BONUS_MULT;
    }

    showNotification(`🌊 웨이브 ${state.wave} 시작!`, '#88bbff', 'large');
    playWaveStart();

    // Check if boss wave
    if (WAVE_CFG.BOSS_WAVES.includes(state.wave)) {
      // Boss will be spawned by spawner on next respawn cycle
      state._spawnBoss = true;
      setTimeout(() => {
        showNotification('💀 보스 출현!', '#ff4444', 'large');
        playBossSpawn();
      }, 1500);
    }
  }
}

export function getWaveDifficulty() {
  const w = state.wave;
  return {
    foodCount: CFG.FOOD_COUNT + w * WAVE_CFG.FOOD_PER_WAVE,
    aiCount: CFG.AI_COUNT + w * WAVE_CFG.AI_PER_WAVE,
    aiInitialLength: { min: 15 + w * WAVE_CFG.AI_LENGTH_PER_WAVE, max: 60 + w * WAVE_CFG.AI_LENGTH_PER_WAVE },
  };
}
