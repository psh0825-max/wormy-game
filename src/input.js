import { state } from './state.js';
import { spawnMinions } from './systems/spawner.js';
import { toggleMute } from './audio/SoundManager.js';

// Detect mobile
function detectMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0);
}

export function setupInput() {
  const { canvas } = state;
  state.isMobile = detectMobile();

  // Prevent all default touch behaviors
  document.addEventListener('touchmove', (e) => { if (state.gameState === 'playing') e.preventDefault(); }, { passive: false });

  // ── Mouse input ──
  canvas.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  });

  // ── Touch input (non-joystick: direct aim) ──
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    // If joystick is active, don't use canvas touch for aiming
    if (state.joystick.active) return;
    state.mouse.x = e.touches[0].clientX;
    state.mouse.y = e.touches[0].clientY;
  }, { passive: false });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (state.joystick.active) return;
    state.mouse.x = e.touches[0].clientX;
    state.mouse.y = e.touches[0].clientY;
  }, { passive: false });

  // ── Boost button ──
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

  // ── Virtual Joystick ──
  if (state.isMobile) {
    setupJoystick();
  }
}

function setupJoystick() {
  const joystickArea = document.getElementById('joystick-area');
  const joystickBase = document.getElementById('joystick-base');
  const joystickKnob = document.getElementById('joystick-knob');
  if (!joystickArea) return;

  joystickArea.style.display = 'block';

  const maxDist = 50; // max knob distance from center

  joystickArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = joystickArea.getBoundingClientRect();
    
    state.joystick.active = true;
    state.joystick.id = touch.identifier;
    state.joystick.startX = touch.clientX;
    state.joystick.startY = touch.clientY;
    state.joystick.currentX = touch.clientX;
    state.joystick.currentY = touch.clientY;

    // Position base at touch point (relative to joystick area)
    const localX = touch.clientX - rect.left;
    const localY = touch.clientY - rect.top;
    joystickBase.style.left = localX + 'px';
    joystickBase.style.top = localY + 'px';
    joystickBase.style.opacity = '1';
    joystickKnob.style.transform = 'translate(-50%, -50%)';
  }, { passive: false });

  joystickArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    for (const touch of e.changedTouches) {
      if (touch.identifier === state.joystick.id) {
        state.joystick.currentX = touch.clientX;
        state.joystick.currentY = touch.clientY;

        let dx = touch.clientX - state.joystick.startX;
        let dy = touch.clientY - state.joystick.startY;
        const dist = Math.hypot(dx, dy);
        
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Update mouse position to simulate aiming from screen center
        if (dist > 5) {
          state.mouse.x = state.W / 2 + dx * 5;
          state.mouse.y = state.H / 2 + dy * 5;
        }
      }
    }
  }, { passive: false });

  const endJoystick = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === state.joystick.id) {
        state.joystick.active = false;
        state.joystick.id = null;
        joystickBase.style.opacity = '0.4';
        joystickKnob.style.transform = 'translate(-50%, -50%)';
      }
    }
  };

  joystickArea.addEventListener('touchend', endJoystick);
  joystickArea.addEventListener('touchcancel', endJoystick);
}
