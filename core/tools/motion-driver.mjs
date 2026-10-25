// Runs the real browser runtime (core/js/src/runtime.js) with a fake page, a fake clock and seeded random numbers, and
// records what it does on every frame. The recordings (core/spec/motion-traces.json) are what the other ports must reproduce.
//
// Rules of the fake world, which every port's replay must follow too:
//   * Time starts at 1000 ms when the avatar is created. Frame i happens at 1000 + the sum of the first i+1 frame gaps.
//   * At each frame, in this order: (1) the scripted events for that frame run (pointer move, tap, set), (2) timers that are
//     due fire in due-time order, (3) the frame runs. A timer fires "at" its due time.
//   * Math.random is mulberry32(randomSeed) / 2^32, consumed in the order the runtime asks.
import { createHash } from 'node:crypto';
import { blobmate } from '../js/src/main.js';
import { mulberry32 } from '../js/src/internals.js';
import { animate } from '../js/src/runtime.js';

const world = { now: 1000, timers: [], seq: 0, raf: null, listeners: {}, reduce: false };

function fakeElement() {
  const attrs = {};
  const el = {
    style: {}, innerHTML: '', tabIndex: undefined,
    attrs,
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    addEventListener() {}, appendChild() {}, remove() {},
    // The box a browser would report: the element's size, moved and scaled and rotated about 50% / 85% of itself.
    getBoundingClientRect() {
      const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
      let tx = 0, ty = 0, rot = 0, sx = 1, sy = 1;
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)(?: rotate\(([-\d.]+)deg\) scale\(([-\d.]+),\s*([-\d.]+)\))?/.exec(el.style.transform || '');
      if (m) { tx = +m[1]; ty = +m[2]; if (m[3] !== undefined) { rot = +m[3]; sx = +m[4]; sy = +m[5]; } }
      const ox = 0.5 * w, oy = 0.85 * h, a = (rot * Math.PI) / 180;
      const xs = [], ys = [];
      for (const [px, py] of [[0, 0], [w, 0], [w, h], [0, h]]) {
        const x = (px - ox) * sx, y = (py - oy) * sy;
        xs.push(ox + x * Math.cos(a) - y * Math.sin(a) + tx); ys.push(oy + x * Math.sin(a) + y * Math.cos(a) + ty);
      }
      const left = Math.min(...xs), top = Math.min(...ys);
      return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
    },
  };
  return el;
}

Object.assign(globalThis, {
  matchMedia: () => ({ matches: world.reduce }),
  getComputedStyle: () => ({ position: 'relative' }),
  document: { createElement: fakeElement },
  addEventListener: (type, fn) => { world.listeners[type] = fn; },
  removeEventListener: (type) => { delete world.listeners[type]; },
  requestAnimationFrame: (cb) => { world.raf = cb; return 1; },
  cancelAnimationFrame: () => { world.raf = null; },
  setTimeout: (fn, ms = 0) => { const id = ++world.seq; world.timers.push({ id, due: world.now + ms, fn }); return id; },
  clearTimeout: (id) => { world.timers = world.timers.filter((t) => t.id !== id); },
});
Object.defineProperty(globalThis, 'performance', { value: { now: () => world.now }, configurable: true, writable: true });

const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** Frame gaps in ms: a steady 60 per second with an occasional long gap (to exercise the runtime's cap on big steps). */
export const frameGap = (i) => (i % 37 === 36 ? 70 : 1000 / 60);

export function runScenario(script) {
  world.now = 1000; world.timers = []; world.seq = 0; world.raf = null; world.listeners = {}; world.reduce = !!script.reduce;
  const next = mulberry32(script.randomSeed);
  const realRandom = Math.random;
  Math.random = () => next() / 4294967296;

  const host = { clientWidth: script.host.w, clientHeight: script.host.h, style: {}, appendChild() {} };
  let el;
  const oldCreate = document.createElement;
  document.createElement = () => (el = fakeElement());
  const rt = animate(host, blobmate, script.config);
  document.createElement = oldCreate;

  const frames = [];
  let t = 1000;
  for (let i = 0; i < script.frames; i++) {
    t += frameGap(i);
    world.now = t;
    for (const e of script.events.filter((e) => e.frame === i)) {
      if (e.type === 'pointer') world.listeners.pointermove?.({ clientX: e.x, clientY: e.y });
      else if (e.type === 'poke') rt.poke();
      else if (e.type === 'set') rt.set(e.patch);
    }
    for (;;) { // fire due timers in due-time order; a timer may schedule another that is also due
      const due = world.timers.filter((x) => x.due <= t).sort((a, b) => a.due - b.due || a.id - b.id)[0];
      if (!due) break;
      world.timers = world.timers.filter((x) => x !== due);
      world.now = due.due; due.fn(); world.now = t;
    }
    const cb = world.raf; world.raf = null;
    cb(t);
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)(?: rotate\(([-\d.]+)deg\) scale\(([-\d.]+),\s*([-\d.]+)\))?/.exec(el.style.transform);
    frames.push([+m[1], +m[2], m[3] === undefined ? null : +m[3], m[4] === undefined ? null : +m[4], m[5] === undefined ? null : +m[5], digest(el.innerHTML)]);
  }
  rt.destroy();
  Math.random = realRandom;
  return frames;
}

/** The scenarios recorded in core/spec/motion-traces.json. Keep them small: each is replayed by every port. */
export const SCENARIOS = [
  { name: 'neutral-follow-pointer', seed: 'trace-a', mood: 'neutral', motion: 'follow', events: [{ frame: 20, type: 'pointer', x: 300, y: 80 }, { frame: 90, type: 'pointer', x: 20, y: 250 }, { frame: 150, type: 'pointer', x: 160, y: 140 }] },
  { name: 'happy-roam', seed: 'trace-b', mood: 'happy', roam: { speed: 70 } },
  { name: 'excited-roam-random-spawn', seed: 'trace-c', mood: 'excited', roam: { speed: 40, pause: [0.3, 1] }, spawn: 'random' },
  { name: 'angry-shake', seed: 'trace-d', mood: 'angry' },
  { name: 'thinking-idle-overlay', seed: 'trace-e', mood: 'thinking', motion: 'idle' },
  { name: 'react-tap-while-roaming', seed: 'trace-f', mood: 'sad', roam: { speed: 90 }, react: true, events: [{ frame: 80, type: 'poke' }, { frame: 200, type: 'poke' }] },
  { name: 'react-custom-moods', seed: 'trace-g', mood: 'neutral', react: { moods: ['surprised', 'sleeping'], duration: 0.6 }, events: [{ frame: 40, type: 'poke' }] },
  { name: 'mood-changes', seed: 'trace-h', mood: 'neutral', events: [{ frame: 50, type: 'set', patch: { mood: 'joyful' } }, { frame: 110, type: 'set', patch: { mood: 'sleeping' } }, { frame: 170, type: 'set', patch: { mood: 'stressed' } }] },
  { name: 'reduced-motion-roam', seed: 'trace-i', mood: 'happy', roam: { speed: 70 }, reduce: true, react: true, events: [{ frame: 60, type: 'poke' }] },
  { name: 'motion-none', seed: 'trace-j', mood: 'happy', motion: 'none', roam: { speed: 70 } },
  { name: 'sleeping-roam', seed: 'trace-k', mood: 'sleeping', roam: { speed: 70 } },
  { name: 'roam-turned-off-midway', seed: 'trace-l', mood: 'happy', roam: { speed: 80 }, events: [{ frame: 100, type: 'set', patch: { roam: null } }, { frame: 200, type: 'set', patch: { roam: { speed: 60 } } }] },
  { name: 'pins-and-small-host', seed: 'trace-m', mood: 'smug', size: 80, pins: { body: 'cloud', top: 'bow' }, roam: { speed: 50 }, host: { w: 260, h: 140 } },
].map((s, i) => ({
  name: s.name,
  randomSeed: 1000 + i,
  host: s.host || { w: 520, h: 320 },
  frames: 300,
  reduce: !!s.reduce,
  config: { seed: s.seed, mood: s.mood, size: s.size || 120, motion: s.motion || 'follow', roam: s.roam || null, react: s.react, spawn: s.spawn, pins: s.pins || {} },
  events: s.events || [],
}));
