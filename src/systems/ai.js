import { CFG } from '../config.js';
import { dist, angle, rand } from '../utils.js';
import { state } from '../state.js';

export function updateAI(w, dt) {
  if (w.isPlayer || !w.alive) return;

  w.aiTimer -= dt * 1000;

  if (w.isMinion) {
    updateMinionAI(w, dt);
    return;
  }

  // Boss AI: more aggressive
  if (w.isBoss) {
    updateBossAI(w, dt);
    return;
  }

  const { foods, items, worms, foodGrid } = state;

  if (w.aiTimer <= 0) {
    w.aiTimer = rand(500, 2000);
    w.aiState = 'wander';
    w.aiTarget = null;

    // Find nearest food (using spatial hash)
    let nearestFood = null;
    let nearestFoodDist = 300;
    const nearbyFoods = foodGrid.query(w.head.x, w.head.y, 300);
    for (const f of nearbyFoods) {
      if (!f.alive) continue;
      const d = dist(w.head, f);
      if (d < nearestFoodDist) {
        nearestFood = f;
        nearestFoodDist = d;
      }
    }

    // Find nearest item
    let nearestItem = null;
    let nearestItemDist = 400;
    for (const it of items) {
      if (!it.alive) continue;
      const d = dist(w.head, it);
      if (d < nearestItemDist) {
        nearestItem = it;
        nearestItemDist = d;
      }
    }

    // Find prey (smaller worm)
    let prey = null;
    let preyDist = 250;
    for (const other of worms) {
      if (other === w || !other.alive || other.isMinion) continue;
      if (other.length < w.length * 0.7) {
        const d = dist(w.head, other.head);
        if (d < preyDist) {
          prey = other;
          preyDist = d;
        }
      }
    }

    // Find threat (bigger worm)
    let threat = null;
    let threatDist = 200;
    for (const other of worms) {
      if (other === w || !other.alive) continue;
      if (other.length > w.length * 1.3) {
        const d = dist(w.head, other.head);
        if (d < threatDist) {
          threat = other;
          threatDist = d;
        }
      }
    }

    // AI avoids obstacles
    if (state.obstacles) {
      for (const obs of state.obstacles) {
        const d = dist(w.head, obs);
        if (d < obs.radius + 80) {
          w.aiState = 'flee';
          w.aiTarget = obs;
          break;
        }
      }
    }

    // Danger zone awareness
    if (state.dangerZone && state.dangerZone.active) {
      const cx = CFG.WORLD_W / 2;
      const cy = CFG.WORLD_H / 2;
      const distFromCenter = dist(w.head, { x: cx, y: cy });
      if (distFromCenter > state.dangerZone.radius - 100) {
        w.aiState = 'flee';
        w.aiTarget = { head: { x: cx, y: cy } }; // flee toward center
        w.targetAngle = angle(w.head, { x: cx, y: cy });
      }
    }

    if (w.aiState === 'wander') {
      // Decision
      if (threat && threatDist < 150) {
        w.aiState = 'flee';
        w.aiTarget = threat;
      } else if (prey && Math.random() > 0.3) {
        w.aiState = 'chase';
        w.aiTarget = prey;
      } else if (nearestItem && Math.random() > 0.4) {
        w.aiState = 'item';
        w.aiTarget = nearestItem;
      } else if (nearestFood) {
        w.aiState = 'food';
        w.aiTarget = nearestFood;
      }
    }
  }

  switch (w.aiState) {
    case 'flee':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.aiTarget.head, w.head);
        w.boosting = w.length > 15;
      }
      break;
    case 'chase':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.head, w.aiTarget.head);
        w.boosting = dist(w.head, w.aiTarget.head) < 100 && w.length > 15;
      } else {
        w.aiState = 'wander';
      }
      break;
    case 'food':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.head, w.aiTarget);
        w.boosting = false;
      } else {
        w.aiState = 'wander';
      }
      break;
    case 'item':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.head, w.aiTarget);
        w.boosting = false;
      } else {
        w.aiState = 'wander';
      }
      break;
    default: // wander
      if (w.aiTimer <= 0) {
        w.targetAngle = w.angle + rand(-0.8, 0.8);
      }
      w.boosting = false;
      break;
  }
}

function updateBossAI(w, dt) {
  const { worms, foodGrid } = state;

  w.aiTimer -= dt * 1000;
  if (w.aiTimer > 0 && w.aiTarget && w.aiTarget.alive) {
    // Continue current action
  } else {
    w.aiTimer = rand(300, 1000); // faster decisions
    w.aiTarget = null;
    w.aiState = 'wander';

    // Aggressively chase player or nearest prey within 400px
    let target = null;
    let targetDist = 400;
    for (const other of worms) {
      if (other === w || !other.alive || other.isMinion || other.isBoss) continue;
      const d = dist(w.head, other.head);
      // Prioritize player
      if (other.isPlayer && d < 500) {
        target = other;
        targetDist = d;
        break;
      }
      if (d < targetDist) {
        target = other;
        targetDist = d;
      }
    }

    if (target) {
      w.aiState = 'chase';
      w.aiTarget = target;
    } else {
      // Find food
      const nearbyFoods = foodGrid.query(w.head.x, w.head.y, 400);
      let nearestFood = null;
      let nearestFoodDist = 400;
      for (const f of nearbyFoods) {
        if (!f.alive) continue;
        const d = dist(w.head, f);
        if (d < nearestFoodDist) { nearestFood = f; nearestFoodDist = d; }
      }
      if (nearestFood) {
        w.aiState = 'food';
        w.aiTarget = nearestFood;
      }
    }
  }

  switch (w.aiState) {
    case 'chase':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.head, w.aiTarget.head);
        w.boosting = dist(w.head, w.aiTarget.head) < 200 && w.length > 30;
      } else {
        w.aiState = 'wander';
      }
      break;
    case 'food':
      if (w.aiTarget && w.aiTarget.alive) {
        w.targetAngle = angle(w.head, w.aiTarget);
        w.boosting = false;
      } else {
        w.aiState = 'wander';
      }
      break;
    default:
      w.targetAngle = w.angle + rand(-0.5, 0.5);
      w.boosting = false;
      break;
  }
}

function updateMinionAI(w, dt) {
  if (!w.minionOwner || !w.minionOwner.alive) {
    w.alive = false;
    return;
  }

  const { worms, foodGrid } = state;

  // Find nearest food (using spatial hash)
  let nearestFood = null;
  let nearestFoodDist = 250;
  const nearbyFoods = foodGrid.query(w.head.x, w.head.y, 250);
  for (const f of nearbyFoods) {
    if (!f.alive) continue;
    const d = dist(w.head, f);
    if (d < nearestFoodDist) {
      nearestFood = f;
      nearestFoodDist = d;
    }
  }

  // Find prey
  let prey = null;
  let preyDist = 200;
  for (const other of worms) {
    if (other === w || !other.alive || other === w.minionOwner || other.isMinion) continue;
    if (other.length < w.length * 0.8) {
      const d = dist(w.head, other.head);
      if (d < preyDist) {
        prey = other;
        preyDist = d;
      }
    }
  }

  if (prey) {
    w.targetAngle = angle(w.head, prey.head);
    w.boosting = preyDist < 80;
  } else if (nearestFood) {
    w.targetAngle = angle(w.head, nearestFood);
  } else {
    const ownerDist = dist(w.head, w.minionOwner.head);
    if (ownerDist > 200) {
      w.targetAngle = angle(w.head, w.minionOwner.head);
    } else {
      w.targetAngle += rand(-0.1, 0.1);
    }
  }
}
