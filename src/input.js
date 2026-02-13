import { state } from './state.js';
import { spawnMinions } from './systems/spawner.js';
import { toggleMute } from './audio/SoundManager.js';

export function setupInput() {
  const { canvas } = state;

  // Prevent all default touch behaviors on the page
  document.addEventListener('touchmove', (e) => { if (state.gameState === 'playing') e.preventDefault(); }, { passive: false });

  canvas.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    state.mouse.x = e.touches[0].clientX;
    state.mouse.y = e.touches[0].clientY;
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    state.mouse.x = e.touches[0].clientX;
    state.mouse.y = e.touches[0].clientY;
  }, { passive: false });

  // Boost
  const boostBtn = document.getElementById('boost-btn');
  boostBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); state.boosting = true; });
  boostBtn.addEventListener('mouseup', () => { state.boosting = false; });
  boostBtn.addEventListener('mouseleave', () => { state.boosting = false; });
  boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); state.boosting = true; });
  boostBtn.addEventListener('touchend', (e) => { e.preventDefault(); state.boosting = false; });
  document.addEventListener('keydown', (e) => { if (e.code === 'Space') state.boosting = true; });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') state.boosting = false; });

  // Minion button
  document.getElementById('minion-btn').addEventListener('click', spawnMinions);

  // Mute button
  document.getElementById('mute-btn').addEventListener('click', () => {
    const isMuted = toggleMute();
    document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
  });
}
