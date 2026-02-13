export const state = {
  gameState: 'menu', // menu, playing, gameover
  selectedColor: 0,
  playerName: '',
  player: null,
  worms: [],
  foods: [],
  items: [],
  particles: [],
  camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
  mouse: { x: 0, y: 0 },
  boosting: false,
  killCount: 0,
  minionCooldown: 0,
  frameCount: 0,
  notifications: [],
  activeItemEffects: [],
  lastTime: 0,
  survivalTime: 0,

  // Phase 2 systems
  wave: 0,
  waveTimer: 0,
  skillChoices: null,      // null = no selection pending, array = show UI
  selectedSkills: [],      // { id, level }
  skillModifiers: {},      // computed modifiers from skills
  nextSkillScore: 500,     // next score threshold for skill selection
  achievements: {},        // loaded from localStorage
  obstacles: [],
  portals: [],             // pairs: [{a, b}, ...]
  dangerZone: { active: false, radius: 0 },
  bossesAlive: 0,
  evolutionFlash: 0,           // screen flash alpha (fades from 1.0 to 0)

  // Spatial hash grids (set during init)
  foodGrid: null,
  segmentGrid: null,

  // DOM references (set during init)
  canvas: null,
  ctx: null,
  mmCanvas: null,
  mmCtx: null,
  W: 0,
  H: 0,
  dpr: 1,
};
