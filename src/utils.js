import { CFG } from './config.js';

export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function randPos() { const m = 200; return { x: rand(m, CFG.WORLD_W - m), y: rand(m, CFG.WORLD_H - m) }; }
