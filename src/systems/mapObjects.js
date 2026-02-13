import { CFG, MAP_CFG } from '../config.js';
import { dist, angle } from '../utils.js';
import { state } from '../state.js';
import { Obstacle } from '../entities/Obstacle.js';
import { PortalPair } from '../entities/Portal.js';
import { playPortal } from '../audio/SoundManager.js';

export function updateMapForWave(wave) {
  // Add obstacles
  const targetObstacles = Math.min(wave * MAP_CFG.OBSTACLES_PER_WAVE, MAP_CFG.MAX_OBSTACLES);
  while (state.obstacles.length < targetObstacles) {
    state.obstacles.push(new Obstacle());
  }

  // Add portal pairs every N waves
  if (wave > 0 && wave % MAP_CFG.PORTALS_EVERY_N_WAVES === 0) {
    const targetPairs = Math.min(Math.floor(wave / MAP_CFG.PORTALS_EVERY_N_WAVES), MAP_CFG.MAX_PORTAL_PAIRS);
    while (state.portals.length < targetPairs) {
      state.portals.push(new PortalPair());
    }
  }

  // Danger zone
  if (wave >= MAP_CFG.DANGER_ZONE_START_WAVE && !state.dangerZone.active) {
    state.dangerZone.active = true;
    state.dangerZone.radius = Math.max(CFG.WORLD_W, CFG.WORLD_H) / 2;
  }
}

export function updatePortals(dt) {
  for (const pair of state.portals) {
    pair.update(dt);
  }
}

export function updateDangerZone(dt) {
  if (!state.dangerZone.active) return;

  // Shrink
  state.dangerZone.radius = Math.max(
    MAP_CFG.DANGER_ZONE_MIN_RADIUS,
    state.dangerZone.radius - MAP_CFG.DANGER_ZONE_SHRINK_RATE * dt
  );

  // Damage worms outside safe zone
  const cx = CFG.WORLD_W / 2;
  const cy = CFG.WORLD_H / 2;
  const safeR = state.dangerZone.radius;

  for (const w of state.worms) {
    if (!w.alive) continue;
    const d = dist(w.head, { x: cx, y: cy });
    if (d > safeR) {
      w.length -= MAP_CFG.DANGER_ZONE_DAMAGE * dt;
      if (w.length < 5) {
        w.alive = false;
        if (w.isPlayer && state.onGameOver) {
          state.onGameOver();
        }
      }
    }
  }
}

export function checkObstacleCollisions() {
  for (const w of state.worms) {
    if (!w.alive) continue;
    for (const obs of state.obstacles) {
      const d = dist(w.head, obs);
      const minDist = w.radius + obs.radius;
      if (d < minDist) {
        // Bounce: push worm away
        const a = angle(obs, w.head);
        const overlap = minDist - d;
        w.head.x += Math.cos(a) * overlap;
        w.head.y += Math.sin(a) * overlap;

        // Angle redirect
        w.targetAngle = a;

        // If boosting, lose some length
        if (w.boosting && w.length > 10) {
          w.length -= 2;
        }
      }
    }
  }
}

export function checkPortalTeleport() {
  for (const pair of state.portals) {
    for (const w of state.worms) {
      if (!w.alive) continue;
      // Check portal A
      if (pair.a.cooldown <= 0 && dist(w.head, pair.a) < pair.radius) {
        w.head.x = pair.b.x + Math.cos(w.angle) * (pair.radius + 10);
        w.head.y = pair.b.y + Math.sin(w.angle) * (pair.radius + 10);
        pair.a.cooldown = MAP_CFG.PORTAL_COOLDOWN;
        pair.b.cooldown = MAP_CFG.PORTAL_COOLDOWN;
        if (w.isPlayer) playPortal();
        break;
      }
      // Check portal B
      if (pair.b.cooldown <= 0 && dist(w.head, pair.b) < pair.radius) {
        w.head.x = pair.a.x + Math.cos(w.angle) * (pair.radius + 10);
        w.head.y = pair.a.y + Math.sin(w.angle) * (pair.radius + 10);
        pair.a.cooldown = MAP_CFG.PORTAL_COOLDOWN;
        pair.b.cooldown = MAP_CFG.PORTAL_COOLDOWN;
        if (w.isPlayer) playPortal();
        break;
      }
    }
  }
}
