import { EVOLUTION_STAGES } from '../config.js';

export function getStageForScore(score) {
  let stage = 0;
  for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
    if (score >= EVOLUTION_STAGES[i].minScore) {
      stage = i;
      break;
    }
  }
  return stage;
}

export function checkEvolution(worm) {
  const newStage = getStageForScore(worm.score);
  if (newStage !== worm.evolutionStage) {
    const oldStage = worm.evolutionStage;
    worm.evolutionStage = newStage;
    return { evolved: true, from: oldStage, to: newStage, stage: EVOLUTION_STAGES[newStage] };
  }
  return { evolved: false };
}

export function getEvolutionMods(stage) {
  const s = EVOLUTION_STAGES[stage] || EVOLUTION_STAGES[0];
  return { turnMod: s.turnMod, eatMod: s.eatMod };
}
