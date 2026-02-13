// Procedural sound generation using Web Audio API (no external files needed)
let audioCtx = null;
let muted = false;
let initialized = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Ensure audio context is started on user gesture (mobile requirement)
function initAudio() {
  if (initialized) return;
  initialized = true;
  getCtx();
}

// Play a procedurally generated sound
function playTone(freq, duration, type = 'sine', volume = 0.3, freqEnd = null) {
  if (muted || !initialized) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  if (muted || !initialized) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// ─── Sound Effects ──────────────────────────────────

export function playEat() {
  playTone(600 + Math.random() * 400, 0.08, 'sine', 0.15);
}

export function playBoost() {
  playTone(200, 0.15, 'sawtooth', 0.08, 400);
}

export function playKill() {
  playTone(300, 0.3, 'square', 0.15, 100);
  setTimeout(() => playTone(500, 0.2, 'sine', 0.12), 100);
}

export function playDeath() {
  playTone(400, 0.5, 'sawtooth', 0.2, 80);
  setTimeout(() => playNoise(0.3, 0.08), 100);
}

export function playItemPickup() {
  playTone(800, 0.1, 'sine', 0.15, 1200);
  setTimeout(() => playTone(1200, 0.1, 'sine', 0.12, 1600), 80);
}

export function playShield() {
  playTone(500, 0.2, 'triangle', 0.1, 800);
}

export function playFreeze() {
  playTone(2000, 0.3, 'sine', 0.1, 500);
}

export function playMinionSpawn() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playTone(400 + i * 200, 0.1, 'triangle', 0.1), i * 60);
  }
}

export function playAchievement() {
  playTone(600, 0.15, 'sine', 0.12, 900);
  setTimeout(() => playTone(900, 0.15, 'sine', 0.12, 1200), 100);
  setTimeout(() => playTone(1200, 0.2, 'triangle', 0.1, 1600), 200);
}

export function playEvolution() {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playTone(300 + i * 150, 0.15, 'triangle', 0.12), i * 80);
  }
  setTimeout(() => playTone(900, 0.3, 'sine', 0.15, 1200), 350);
}

export function playWaveStart() {
  playTone(200, 0.2, 'square', 0.08, 400);
  setTimeout(() => playTone(400, 0.2, 'square', 0.08, 600), 150);
}

export function playBossSpawn() {
  playTone(100, 0.4, 'sawtooth', 0.15, 60);
  setTimeout(() => playTone(80, 0.3, 'square', 0.1, 120), 200);
  setTimeout(() => playNoise(0.2, 0.06), 300);
}

export function playSkillSelect() {
  playTone(500, 0.1, 'sine', 0.1, 700);
  setTimeout(() => playTone(700, 0.15, 'triangle', 0.1, 900), 80);
}

export function playPortal() {
  playTone(1000, 0.2, 'sine', 0.1, 500);
  setTimeout(() => playTone(500, 0.15, 'sine', 0.08, 1000), 100);
}

// ─── BGM (simple ambient loop) ──────────────────────

let bgmOsc = null;
let bgmGain = null;

export function startBGM() {
  if (muted || !initialized || bgmOsc) return;
  const ctx = getCtx();

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.03;
  bgmGain.connect(ctx.destination);

  bgmOsc = ctx.createOscillator();
  bgmOsc.type = 'sine';
  bgmOsc.frequency.value = 80;
  bgmOsc.connect(bgmGain);
  bgmOsc.start();

  // Subtle LFO for movement
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.2;
  lfoGain.gain.value = 10;
  lfo.connect(lfoGain);
  lfoGain.connect(bgmOsc.frequency);
  lfo.start();
}

export function stopBGM() {
  if (bgmOsc) {
    bgmOsc.stop();
    bgmOsc = null;
    bgmGain = null;
  }
}

// ─── Mute Toggle ────────────────────────────────────

export function toggleMute() {
  muted = !muted;
  if (muted) {
    stopBGM();
  }
  return muted;
}

export function isMuted() {
  return muted;
}

export { initAudio };
