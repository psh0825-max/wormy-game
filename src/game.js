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
import { updateHUD, showNotification, updateAndDrawFloatTexts, updateAndDrawFoodAbsorbs, drawSpeedLines } from './rendering/hud.js';
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

// Register gameOver callback
state.onGameOver = () => gameOver();

export function startGame() {
  state.playerName = document.getElementById('nickname').value.trim() || '나';
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('active');
  document.getElementById('minion-wrap').style.display = 'block';
  document.getElementById('boost-wrap').style.display = 'block';
  document.getElementById('minimap-container').style.display = 'block';

  // Show joystick on mobile
  if (state.isMobile) {
    const joystickArea = document.getElementById('joystick-area');
    if (joystickArea) joystickArea.style.display = 'block';
  }

  state.killCount = 0;
  state.minionCooldown = 0;
  state.activeItemEffects = [];
  state.notifications = [];
  state.survivalTime = 0;
  state.damageVignette = 0;
  state.floatTexts = [];
  state.foodAbsorbs = [];

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

  // Screen shake effect on death
  state.screenShake = 1.0;

  // Final record check and save
  checkRecordBroken(state);
  saveRecords();

  const records = getRecords();
  const broken = getNewRecords();

  document.getElementById('mute-btn').style.display = 'none';

  // Hide joystick
  const joystickArea = document.getElementById('joystick-area');
  if (joystickArea) joystickArea.style.display = 'none';

  // Evolution icon + wave on game over
  const evoStage = EVOLUTION_STAGES[player.evolutionStage] || EVOLUTION_STAGES[0];
  document.getElementById('go-evo-icon').textContent = evoStage.icon;
  const goWaveEl = document.getElementById('go-wave');
  if (goWaveEl) {
    goWaveEl.textContent = state.wave > 0 ? `🌊 웨이브 ${state.wave} 도달` : '';
  }

  // Stats card
  const scoreVal = document.getElementById('go-score-val');
  const lengthVal = document.getElementById('go-length-val');
  const killsVal = document.getElementById('go-kills-val');
  const timeVal = document.getElementById('go-time-val');
  if (scoreVal) scoreVal.textContent = Math.floor(player.score);
  if (lengthVal) lengthVal.textContent = Math.floor(player.length);
  if (killsVal) killsVal.textContent = killCount;
  if (timeVal) timeVal.textContent = formatTime(state.survivalTime);

  // Show record info
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

    // Evolution check
    if (!w.isMinion) {
      const evo = checkEvolution(w);
      if (evo.evolved && w.isPlayer) {
        showNotification(`✨ ${evo.stage.icon} ${evo.stage.name}(으)로 진화!`, '#ffdd44', 'large');
        playEvolution();
        for (let j = 0; j < 50; j++) {
          const colors = ['#ffdd44', '#ff8844', '#ffaa00', '#ffffff', '#ff66ff', '#66ffff'];
          const c = colors[(Math.random() * colors.length) | 0];
          const spread = 40 + j * 0.5;
          const angle = (Math.PI * 2 / 50) * j + Math.random() * 0.5;
          const distance = Math.random() * spread;
          const px = w.head.x + Math.cos(angle) * distance;
          const py = w.head.y + Math.sin(angle) * distance;
          const p = particlePool.acquire(px, py, c, 4 + Math.random() * 4);
          state.particles.push(p);
        }
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
    let spacing = 3;
    if (w.length > 100) {
      spacing = Math.max(5, Math.floor(w.length / 30));
    } else if (w.length > 50) {
      spacing = 5;
    }

    for (let i = 5; i < w.segments.length; i += spacing) {
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

  // Clean dead
  const aliveFoods = [];
  for (const f of foods) {
    if (f.alive) aliveFoods.push(f);
    else foodPool.release(f);
  }
  state.foods = aliveFoods;

  state.items = items.filter(it => it.alive);
  state.worms = worms.filter(w => w.alive || w.isPlayer);

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

  // Record check
  if (state.frameCount % 60 === 0) {
    if (checkRecordBroken(state)) {
      showNotification('🏆 새 기록!', '#ffdd44');
    }
  }

  // Achievement check
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
    return;
  }

  // ── Fade effects ──
  if (state.damageVignette > 0) {
    state.damageVignette -= dt * 2;
    if (state.damageVignette < 0) state.damageVignette = 0;
  }

  // ─── RENDER ──────────────────────────────────────
  const shakeCamera = {
    x: camera.x + state.screenShakeX,
    y: camera.y + state.screenShakeY,
    zoom: camera.zoom
  };

  const zoom = camera.zoom;
  const viewW = W / zoom;
  const viewH = H / zoom;

  // 줌 트랜스폼 적용 — 배경 포함 모든 월드 요소에 적용
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  drawBackground(shakeCamera);

  // Foods
  for (const f of state.foods) f.draw(ctx, shakeCamera);

  // Items
  for (const it of state.items) it.draw(ctx, shakeCamera);

  // Particles
  for (const p of state.particles) p.draw(ctx, shakeCamera);

  // Food absorption animations
  updateAndDrawFoodAbsorbs(ctx, shakeCamera, dt);

  // Sort worms by length for proper layering
  const sortedWorms = [...state.worms].filter(w => w.alive).sort((a, b) => a.length - b.length);

  const viewBounds = {
    left: camera.x - viewW / 2 - 300,
    right: camera.x + viewW / 2 + 300,
    top: camera.y - viewH / 2 - 300,
    bottom: camera.y + viewH / 2 + 300
  };

  for (const w of sortedWorms) {
    if (!w.isPlayer && (w.head.x < viewBounds.left || w.head.x > viewBounds.right ||
                         w.head.y < viewBounds.top || w.head.y > viewBounds.bottom)) {
      continue;
    }
    w.draw(ctx, shakeCamera);
  }

  // Float texts (score popups, etc.)
  updateAndDrawFloatTexts(ctx, shakeCamera, dt);

  ctx.restore(); // 줌 트랜스폼 복원

  // Speed lines during boost (줌 영향 안 받음)
  if (player && player.alive && player.boosting) {
    drawSpeedLines(ctx, W, H, true);
  }

  // Evolution flash overlay (줌 영향 안 받음)
  if (state.evolutionFlash > 0) {
    ctx.fillStyle = `rgba(255,240,180,${state.evolutionFlash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
    state.evolutionFlash -= dt * 3;
    if (state.evolutionFlash < 0) state.evolutionFlash = 0;
  }

  // HUD
  if (state.frameCount % 10 === 0) updateHUD();
  if (state.frameCount % 20 === 0) drawMinimap();
}
