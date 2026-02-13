import { CFG } from './config.js';
import { state } from './state.js';
import { Worm } from './entities/Worm.js';
import { foodPool } from './entities/Food.js';
import { particlePool } from './entities/Particle.js';
import { EVOLUTION_STAGES } from './config.js';
import { Item } from './entities/Item.js';
import { SpatialHash } from './core/SpatialHash.js';
import { updateAI } from './systems/ai.js';
import { checkCollisions } from './systems/collision.js';
import { updateCamera } from './systems/camera.js';
import { spawnAI, respawnFood, respawnItems, respawnAI } from './systems/spawner.js';
import { drawBackground } from './rendering/background.js';
import { drawMinimap } from './rendering/minimap.js';
import { updateHUD, showNotification } from './rendering/hud.js';
import { initAudio, startBGM, stopBGM, playDeath, playAchievement, playEvolution } from './audio/SoundManager.js';
import { loadRecords, saveRecords, checkRecordBroken, incrementGameCount, getRecords, getNewRecords, clearNewRecords, formatTime } from './systems/records.js';
import { loadAchievements, checkAchievements, getPendingNotifications } from './systems/achievements.js';
import { checkEvolution } from './systems/evolution.js';
import { updateWave } from './systems/wave.js';
import { checkSkillTrigger } from './systems/skills.js';
import { showSkillUI, isSkillUIShowing, hideSkillUI } from './rendering/skillSelectUI.js';
import { updatePortals, updateDangerZone, checkObstacleCollisions, checkPortalTeleport } from './systems/mapObjects.js';

// Init spatial grids
state.foodGrid = new SpatialHash(100);
state.segmentGrid = new SpatialHash(100);

// Register gameOver callback to avoid circular dependency with collision.js
state.onGameOver = () => gameOver();

export function startGame() {
  state.playerName = document.getElementById('nickname').value.trim() || '나';
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('active');
  document.getElementById('minion-wrap').style.display = 'block';
  document.getElementById('boost-wrap').style.display = 'block';
  document.getElementById('minimap-container').style.display = 'block';

  state.killCount = 0;
  state.minionCooldown = 0;
  state.activeItemEffects = [];
  state.notifications = [];
  state.survivalTime = 0;

  // Phase 2 resets
  state.wave = 0;
  state.waveTimer = 0;
  state.skillChoices = null;
  state.selectedSkills = [];
  state.skillModifiers = {};
  state.nextSkillScore = 500;
  state.obstacles = [];
  state.portals = [];
  state.dangerZone = { active: false, radius: 0 };
  state.bossesAlive = 0;
  state.evolutionFlash = 0;

  // Records & Achievements
  loadRecords();
  clearNewRecords();
  incrementGameCount();
  loadAchievements();
  state._bossKilled = false;

  // Player
  const cx = CFG.WORLD_W / 2;
  const cy = CFG.WORLD_H / 2;
  state.player = new Worm(cx, cy, state.selectedColor, state.playerName, true);
  state.worms = [state.player];

  // AI
  for (let i = 0; i < CFG.AI_COUNT; i++) {
    spawnAI();
  }

  // Food
  state.foods = [];
  for (let i = 0; i < CFG.FOOD_COUNT; i++) {
    state.foods.push(foodPool.acquire());
  }

  // Items
  state.items = [];
  for (let i = 0; i < CFG.ITEM_COUNT; i++) {
    state.items.push(new Item());
  }

  state.particles = [];
  state.camera.x = cx;
  state.camera.y = cy;
  state.camera.targetX = cx;
  state.camera.targetY = cy;

  state.gameState = 'playing';

  // Audio
  initAudio();
  startBGM();
  document.getElementById('mute-btn').style.display = 'block';
}

export function gameOver() {
  const { player, killCount } = state;
  state.gameState = 'gameover';
  stopBGM();
  playDeath();
  hideSkillUI();
  state.skillChoices = null;

  // Final record check and save
  checkRecordBroken(state);
  saveRecords();

  const records = getRecords();
  const broken = getNewRecords();

  document.getElementById('mute-btn').style.display = 'none';

  // Evolution icon + wave on game over
  const evoStage = EVOLUTION_STAGES[player.evolutionStage] || EVOLUTION_STAGES[0];
  document.getElementById('go-evo-icon').textContent = evoStage.icon;
  const goWaveEl = document.getElementById('go-wave');
  if (goWaveEl) {
    goWaveEl.textContent = state.wave > 0 ? `🌊 웨이브 ${state.wave} 도달` : '';
  }

  document.getElementById('go-score').textContent = `점수: ${Math.floor(player.score)}`;
  document.getElementById('go-detail').textContent = `길이: ${Math.floor(player.length)} | 킬: ${killCount} | 생존: ${formatTime(state.survivalTime)}`;

  // Show record info on game over
  const recordEl = document.getElementById('go-records');
  if (recordEl) {
    let html = '';
    if (broken.length > 0) {
      html += '<div class="go-new-record">🏆 새 기록!</div>';
    }
    html += `<div class="go-record-list">`;
    html += `<span>최고 ${records.highScore}점</span>`;
    html += `<span>최대 길이 ${records.maxLength}</span>`;
    html += `<span>최다 킬 ${records.maxKills}</span>`;
    html += `<span>최장 생존 ${formatTime(records.longestSurvival)}</span>`;
    html += `</div>`;
    recordEl.innerHTML = html;
  }

  document.getElementById('game-over').classList.add('active');
  document.getElementById('hud').classList.remove('active');
  document.getElementById('minion-wrap').style.display = 'none';
  document.getElementById('boost-wrap').style.display = 'none';
  document.getElementById('minimap-container').style.display = 'none';
}

export function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  if (state.gameState !== 'playing') return;

  // Skill selection pause
  if (isSkillUIShowing()) return;

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;
  state.frameCount++;

  const { player, worms, foods, items, particles, ctx, camera, mouse, W, H } = state;

  // Player input
  if (player && player.alive) {
    const dx = mouse.x - W / 2;
    const dy = mouse.y - H / 2;
    player.targetAngle = Math.atan2(dy, dx);
    player.boosting = state.boosting;
  }

  // Update worms
  for (const w of worms) {
    if (!w.alive) continue;
    if (!w.isPlayer) updateAI(w, dt);
    w.update(dt);

    // Evolution check (all non-minion worms)
    if (!w.isMinion) {
      const evo = checkEvolution(w);
      if (evo.evolved && w.isPlayer) {
        showNotification(`✨ ${evo.stage.icon} ${evo.stage.name}(으)로 진화!`, '#ffdd44', 'large');
        playEvolution();
        // Particle burst
        for (let j = 0; j < 30; j++) {
          const colors = ['#ffdd44', '#ff8844', '#ffaa00', '#ffffff'];
          const c = colors[(Math.random() * colors.length) | 0];
          const p = particlePool.acquire(w.head.x + (Math.random() - 0.5) * 20, w.head.y + (Math.random() - 0.5) * 20, c, 3 + Math.random() * 3);
          state.particles.push(p);
        }
        // Screen flash
        state.evolutionFlash = 1.0;
      }
    }
  }

  // Rebuild spatial grids
  state.foodGrid.clear();
  for (const f of foods) {
    if (f.alive) state.foodGrid.insert(f, f.x, f.y);
  }

  state.segmentGrid.clear();
  for (const w of worms) {
    if (!w.alive) continue;
    for (let i = 5; i < w.segments.length; i += 3) {
      const seg = w.segments[i];
      state.segmentGrid.insert({ worm: w, segIndex: i, x: seg.x, y: seg.y }, seg.x, seg.y);
    }
  }

  // Collisions
  checkCollisions();
  checkObstacleCollisions();
  checkPortalTeleport();

  // Update portals and danger zone
  updatePortals(dt);
  updateDangerZone(dt);

  // Respawn
  respawnFood();
  respawnItems();
  respawnAI();

  // Clean dead - release back to pools
  const aliveFoods = [];
  for (const f of foods) {
    if (f.alive) aliveFoods.push(f);
    else foodPool.release(f);
  }
  state.foods = aliveFoods;

  state.items = items.filter(it => it.alive);
  state.worms = worms.filter(w => w.alive || w.isPlayer);

  // Update particles - release dead back to pool
  const aliveParticles = [];
  for (const p of particles) {
    if (p.update(dt)) aliveParticles.push(p);
    else particlePool.release(p);
  }
  state.particles = aliveParticles;

  // Camera
  updateCamera();

  // Cooldown
  if (state.minionCooldown > 0) state.minionCooldown -= dt * 1000;

  // Survival time
  state.survivalTime += dt;

  // Wave system
  updateWave(dt);

  // Record check (every 60 frames)
  if (state.frameCount % 60 === 0) {
    if (checkRecordBroken(state)) {
      showNotification('🏆 새 기록!', '#ffdd44');
    }
  }

  // Achievement check (every 30 frames)
  if (state.frameCount % 30 === 0) {
    checkAchievements(state);
    const achieved = getPendingNotifications();
    for (const a of achieved) {
      showNotification(`🏅 업적 달성: ${a.name}!`, '#44ddff');
      playAchievement();
    }
  }

  // Skill selection trigger
  if (checkSkillTrigger()) {
    showSkillUI(state.skillChoices);
    return; // pause game while selecting
  }

  // ─── RENDER ──────────────────────────────────────
  drawBackground();

  // Foods
  for (const f of state.foods) f.draw(ctx, camera);

  // Items
  for (const it of state.items) it.draw(ctx, camera);

  // Particles
  for (const p of state.particles) p.draw(ctx, camera);

  // Sort worms by length for proper layering
  const sortedWorms = [...state.worms].filter(w => w.alive).sort((a, b) => a.length - b.length);
  for (const w of sortedWorms) w.draw(ctx, camera);

  // Evolution flash overlay
  if (state.evolutionFlash > 0) {
    ctx.fillStyle = `rgba(255,240,180,${state.evolutionFlash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
    state.evolutionFlash -= dt * 3; // fade over ~0.33s
    if (state.evolutionFlash < 0) state.evolutionFlash = 0;
  }

  // HUD
  if (state.frameCount % 6 === 0) updateHUD();
  if (state.frameCount % 10 === 0) drawMinimap();
}
