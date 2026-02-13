import './styles/main.css';
import { state } from './state.js';
import { setupUI } from './ui.js';
import { setupInput } from './input.js';
import { gameLoop } from './game.js';
import { initWormRenderer } from './rendering/WormRenderer.js';

// ─── INIT DOM REFS ─────────────────────────────────
state.canvas = document.getElementById('game');
state.ctx = state.canvas.getContext('2d');
state.mmCanvas = document.getElementById('minimap');
state.mmCtx = state.mmCanvas.getContext('2d');

// ─── RESIZE ────────────────────────────────────────
function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.W = window.innerWidth;
  state.H = window.innerHeight;

  const { canvas, ctx, mmCanvas, mmCtx, dpr, W, H } = state;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Resize minimap canvas to match CSS size
  const mmContainer = document.getElementById('minimap-container');
  const mmSize = Math.round(parseFloat(getComputedStyle(mmContainer).width)) || 140;
  mmCanvas.width = mmSize * dpr;
  mmCanvas.height = mmSize * dpr;
  mmCanvas.style.width = mmSize + 'px';
  mmCanvas.style.height = mmSize + 'px';
  mmCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
resize();

// ─── SETUP ─────────────────────────────────────────
initWormRenderer();
setupUI();
setupInput();

// ─── START LOOP ────────────────────────────────────
requestAnimationFrame(gameLoop);
