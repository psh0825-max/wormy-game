export const state = {
  gameState: 'menu', // menu, playing, gameover
  selectedColor: 0,
  playerName: '',
  player: null,
  worms: [],
  foods: [],
  items: [],
  particles: [],
  camera: { x: 0, y: 0, targetX: 0, targetY: 0, zoom: 1, targetZoom: 1 },
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
  skillChoices: null,
  selectedSkills: [],
  skillModifiers: {},
  nextSkillScore: 500,
  achievements: {},
  obstacles: [],
  portals: [],
  dangerZone: { active: false, radius: 0 },
  bossesAlive: 0,
  evolutionFlash: 0,
  screenShake: 0,
  screenShakeX: 0,
  screenShakeY: 0,

  // Spatial hash grids
  foodGrid: null,
  segmentGrid: null,

  // DOM references
  canvas: null,
  ctx: null,
  mmCanvas: null,
  mmCtx: null,
  W: 0,
  H: 0,
  dpr: 1,

  // ── New visual effects state ──
  damageVignette: 0,        // red vignette alpha (fades from 1 to 0)
  speedLines: false,         // show speed lines during boost
  floatTexts: [],            // floating score texts [{x, y, text, color, life, vy}]
  foodAbsorbs: [],           // food absorption animations [{fx, fy, tx, ty, color, t, radius}]
  isMobile: false,           // detected mobile device
  joystick: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, id: null },
};
