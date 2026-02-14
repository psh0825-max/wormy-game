import { CFG, FOOD_TIERS } from '../config.js';
import { dist, angle, rand, randInt } from '../utils.js';
import { state } from '../state.js';
import { foodPool } from '../entities/Food.js';
import { particlePool } from '../entities/Particle.js';
import { showNotification, addFloatText, addFoodAbsorb } from '../rendering/hud.js';
import { playEat, playKill, playItemPickup, playShield, playFreeze } from '../audio/SoundManager.js';

export function checkCollisions() {
  const { worms, foods, items, particles, foodGrid, segmentGrid } = state;

  // Worm eats food
  for (const w of worms) {
    if (!w.alive) continue;
    const sm = w.isPlayer ? (state.skillModifiers || {}) : {};
    const eatRadiusMult = 1 + (sm.eatRadiusMult || 0);
    const scoreMult = 1 + (sm.scoreMult || 0);
    const eatR = w.radius * CFG.EAT_DISTANCE * eatRadiusMult;

    // Magnet effect
    if (w.magnetized || (w.isPlayer && sm.autoMagnet)) {
      const magnetRange = w.magnetized ? 200 : 120;
      const nearFoods = foodGrid.query(w.head.x, w.head.y, magnetRange);
      for (const f of nearFoods) {
        if (!f.alive) continue;
        const d = dist(w.head, f);
        if (d < magnetRange) {
          const a = angle(f, w.head);
          f.x += Math.cos(a) * 4;
          f.y += Math.sin(a) * 4;
        }
      }
    }

    // Freeze aura skill
    if (w.isPlayer && sm.freezeAura) {
      for (const other of worms) {
        if (other === w || !other.alive || other.isMinion) continue;
        if (other.isMinion && other.minionOwner === w) continue;
        if (dist(w.head, other.head) < 150) {
          if (!other.frozen) {
            other.frozenTimer = Math.max(other.frozenTimer, 500);
            other.frozen = true;
          }
        }
      }
    }

    const evoEatMod = w.isPlayer ? (({ 0: 1, 1: 1.05, 2: 1.1, 3: 1.2, 4: 1.3 })[w.evolutionStage] || 1) : 1;

    // Eat food
    const nearbyFood = foodGrid.query(w.head.x, w.head.y, eatR);
    for (const f of nearbyFood) {
      if (!f.alive) continue;
      if (dist(w.head, f) < eatR) {
        f.alive = false;
        const tier = f.tier || FOOD_TIERS[0];
        w.length += tier.growValue * evoEatMod;
        w.score += Math.floor(tier.scoreValue * scoreMult);
        if (w.isPlayer) playEat();

        // Food absorption animation (food flies to mouth)
        addFoodAbsorb(f.x, f.y, w.head.x, w.head.y, f.color, f.radius);

        // Small particles at eat point
        const pSize = tier.golden ? 5 : tier.growValue > 2 ? 4 : 3;
        particles.push(particlePool.acquire(f.x, f.y, f.color, pSize));
      }
    }

    // Worm eats item
    for (const it of items) {
      if (!it.alive) continue;
      if (dist(w.head, it) < eatR + CFG.ITEM_RADIUS) {
        it.alive = false;
        applyItem(w, it.type);
        for (let j = 0; j < 12; j++) {
          particles.push(particlePool.acquire(it.x, it.y, it.type.color, 4));
        }
      }
    }
  }

  // Worm eats worm
  for (const w of worms) {
    if (!w.alive) continue;
    for (const other of worms) {
      if (other === w || !other.alive) continue;
      if (w.isMinion && other === w.minionOwner) continue;
      if (other.isMinion && other.minionOwner === w) continue;
      if (w.isMinion && other.isMinion && w.minionOwner === other.minionOwner) continue;

      const headDist = dist(w.head, other.head);
      const eatDist = (w.radius + other.radius) * 0.8;

      if (headDist < eatDist) {
        if (w.shielded && !other.shielded) {
          killWorm(other, w);
        } else if (other.shielded && !w.shielded) {
          killWorm(w, other);
        } else if (w.length > other.length * 1.1) {
          killWorm(other, w);
        } else if (other.length > w.length * 1.1) {
          killWorm(w, other);
        }
      }
    }

    if (!w.alive) continue;
    const queryRadius = w.radius + 40;
    const nearSegs = segmentGrid.query(w.head.x, w.head.y, queryRadius);
    for (const entry of nearSegs) {
      const other = entry.worm;
      if (other === w || !other.alive) continue;
      if (w.isMinion && other === w.minionOwner) continue;
      if (other.isMinion && other.minionOwner === w) continue;
      if (w.isMinion && other.isMinion && w.minionOwner === other.minionOwner) continue;
      if (w.length >= other.length || w.shielded) continue;

      const segR = other.bodyRadius(entry.segIndex);
      if (dist(w.head, entry) < (w.radius + segR) * 0.6) {
        killWorm(w, other);
        break;
      }
    }
  }
}

export function killWorm(victim, killer) {
  if (!victim.alive) return;
  victim.alive = false;

  const { foods, particles } = state;

  // Drop food
  const mediumTier = FOOD_TIERS[1];
  const largeTier = FOOD_TIERS[2];
  const dropCount = Math.min(Math.floor(victim.length / 2), 30);
  for (let i = 0; i < dropCount; i++) {
    const seg = victim.segments[Math.min(i * 2, victim.segments.length - 1)];
    const tier = (i % 4 === 0) ? largeTier : mediumTier;
    const f = foodPool.acquire(seg.x + rand(-15, 15), seg.y + rand(-15, 15), tier);
    f.color = victim.color.h;
    f.glow = victim.color.l;
    foods.push(f);
  }

  // Enhanced death explosion particles
  const particleCount = Math.min(40 + Math.floor(victim.length / 8), 60);
  for (let i = 0; i < particleCount; i++) {
    const seg = victim.segments[randInt(0, victim.segments.length - 1)];
    const colors = [victim.color.l, victim.color.h, '#ffffff', '#ffdd44'];
    const color = colors[randInt(0, colors.length - 1)];
    const size = rand(2, 9);
    particles.push(particlePool.acquire(
      seg.x + rand(-25, 25),
      seg.y + rand(-25, 25),
      color,
      size
    ));
  }

  const scoreGain = Math.floor(victim.score * 0.5) + 50;
  killer.length += victim.length * 0.2;
  killer.score += scoreGain;

  if (killer.isMinion && killer.minionOwner) {
    killer.minionOwner.score += 30;
    killer.minionOwner.length += victim.length * 0.15;
  }

  if (victim.isBoss) {
    state.bossesAlive = Math.max(0, state.bossesAlive - 1);
  }

  if (killer.isPlayer || (killer.isMinion && killer.minionOwner && killer.minionOwner.isPlayer)) {
    state.killCount++;

    // Floating score popup
    addFloatText(victim.head.x, victim.head.y - 20, `+${scoreGain}`, '#ffdd44', 22);

    if (victim.isBoss) {
      state._bossKilled = true;
      showNotification(`💀 보스 처치! +${scoreGain}점`, '#ff4444', 'large');
      addFloatText(victim.head.x, victim.head.y - 50, '💀 BOSS KILL!', '#ff4444', 28);
    } else {
      showNotification(`🍴 ${victim.name} 처치!`, killer.color.l);
    }
    playKill();
  }

  // Damage vignette when player dies
  if (victim.isPlayer) {
    state.damageVignette = 1.0;
    if (state.onGameOver) state.onGameOver();
  }
}

export function applyItem(w, type) {
  const { worms } = state;
  const isP = w.isPlayer || (w.isMinion && w.minionOwner && w.minionOwner.isPlayer);

  switch (type.id) {
    case 'speed':
      w.speedBoosted = true;
      setTimeout(() => { w.speedBoosted = false; }, CFG.ITEM_DURATION);
      if (isP) addActiveItemUI(type);
      break;
    case 'shield':
      w.shielded = true;
      if (isP) playShield();
      setTimeout(() => { w.shielded = false; }, CFG.ITEM_DURATION);
      if (isP) addActiveItemUI(type);
      break;
    case 'magnet':
      w.magnetized = true;
      setTimeout(() => { w.magnetized = false; }, CFG.ITEM_DURATION);
      if (isP) addActiveItemUI(type);
      break;
    case 'growth':
      w.length += 15;
      w.score += 30;
      if (isP) addFloatText(w.head.x, w.head.y - 20, '+15 길이', '#44dd88', 18);
      break;
    case 'freeze':
      for (const other of worms) {
        if (other === w || !other.alive) continue;
        if (w.isMinion && other === w.minionOwner) continue;
        if (dist(w.head, other.head) < 250) {
          other.frozenTimer = CFG.ITEM_DURATION;
          other.frozen = true;
        }
      }
      if (isP) { playFreeze(); addActiveItemUI(type); }
      break;
  }

  if (isP) {
    if (type.id !== 'shield' && type.id !== 'freeze') playItemPickup();
    showNotification(`${type.icon} ${type.name} 획득!`, type.color);
  }
}

function addActiveItemUI(type) {
  const id = Date.now() + '_' + type.id;
  state.activeItemEffects.push({ id, type, start: Date.now(), duration: CFG.ITEM_DURATION });
}
