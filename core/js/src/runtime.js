// Browser runtime: makes an avatar alive. Mood-driven motion, blinking, gaze, and optional roaming inside a host element.
//   const rt = animate(host, polypal, { seed: "alain00", mood: "happy", roam: { speed: 70 } });
//   rt.set({ mood: "angry" });  rt.lookAt(x, y);  rt.poke();  rt.destroy();
// react: true makes it respond to a tap, touch or Enter/Space: a quick jump and a short-lived surprised, joyful or happy face.
// All numbers come from parts.moods[mood].motion, so other platforms can animate from the same data.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const EASED = ['base', 'bob', 'bobHz', 'squash', 'sway', 'swayHz', 'shake', 'shakeHz', 'roam'];

export function animate(host, polypal, o = {}) {
  const P = polypal.parts;
  const s = { seed: 'x', pins: {}, mood: 'neutral', motion: 'follow', roam: null, size: 120, ...o };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'absolute', left: 0, top: 0, transformOrigin: '50% 85%', willChange: 'transform', touchAction: 'none' });
  host.appendChild(el);

  let gaze, blink = 0, lastKey = '', pointer = null, ovFrame, curMood = s.mood;
  const draw = () => {
    const key = [s.seed, JSON.stringify(s.pins), curMood, s.size, gaze && gaze.map((v) => v.toFixed(2)), blink, ovFrame].join('|');
    if (key === lastKey) return;
    lastKey = key;
    el.style.width = el.style.height = s.size + 'px';
    el.innerHTML = polypal(s.seed, { ...s.pins, mood: curMood, gaze, blink, overlayFrame: ovFrame, size: s.size });
  };

  const onMove = (e) => { pointer = [e.clientX, e.clientY]; };
  addEventListener('pointermove', onMove);

  // Blink: eased close/open, sometimes doubled; interval follows the mood.
  let blinkTimer, dead = false;
  const blinkOnce = (done) => [0.6, 1, 0.6, 0].forEach((v, i) => setTimeout(() => { blink = v; draw(); if (i === 3) done?.(); }, i * 45));
  const blinkLoop = () => {
    const [lo, hi] = P.moods[s.mood].motion.blink;
    blinkTimer = setTimeout(() => {
      if (s.motion !== 'none' && !reduce) blinkOnce(() => Math.random() < 0.25 && setTimeout(() => blinkOnce(), 120));
      blinkLoop();
    }, rnd(lo, hi) * 1000);
  };
  blinkLoop();

  // Tap reaction (optional): react: true | { moods: [...], duration: seconds }. It stops any walking, jumps, and shows a short mood.
  const REACTIONS = ['surprised', 'joyful', 'excited', 'happy'];
  let reactMood = null, reactUntil = 0, tapT = -1;
  function poke() {
    const cfg = s.react && typeof s.react === 'object' ? s.react : {};
    const pool = (cfg.moods?.length ? cfg.moods : REACTIONS).filter((m) => P.moods[m]);
    const n = performance.now();
    reactMood = pool[Math.floor(Math.random() * pool.length)];
    reactUntil = n + (cfg.duration || 1.1) * 1000;
    tapT = n;
    target = null;
    pauseUntil = Math.max(pauseUntil, reactUntil);
    lastKey = '';
  }
  const onTap = () => { if (s.react) poke(); };
  const onKey = (e) => { if (s.react && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); poke(); } };
  const applyReact = () => {
    el.style.pointerEvents = s.react ? 'auto' : '';
    el.style.cursor = s.react ? 'pointer' : '';
    if (s.react) { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Poke'); }
    else { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
  };
  el.addEventListener('pointerdown', onTap);
  el.addEventListener('keydown', onKey);
  applyReact();

  // Motion params ease toward the current mood so switching never pops.
  const cur = { ...P.moods[s.mood].motion };
  const pos = { x: 0, y: 0 };
  let placed = false, target = null, pauseUntil = 0, mv = 0, last = performance.now(), raf;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const reacting = reactMood && now < reactUntil;
    if (!reacting) reactMood = null;
    curMood = reacting ? reactMood : s.mood;
    const m = P.moods[curMood].motion, k = Math.min(1, dt * 5);
    for (const key of EASED) cur[key] += (m[key] - cur[key]) * k;

    const W = host.clientWidth, H = host.clientHeight, maxX = Math.max(0, W - s.size), maxY = Math.max(0, H - s.size);
    const minY = Math.min(maxY, s.size * 0.12); // headroom so walking hops never leave the host
    const roaming = s.roam && s.motion !== 'none' && !reduce;
    let vx = 0, vy = 0, speed = 0;
    if (!placed && W > 0) {
      // spawn: "random" scatters many avatars across the host instead of stacking them in the middle
      pos.x = s.spawn === 'random' ? rnd(0, maxX) : maxX / 2;
      pos.y = s.spawn === 'random' ? rnd(minY, maxY) : maxY / 2;
      placed = true;
    }

    if (roaming) {
      const area = s.roam;
      if (!target && now >= pauseUntil) target = { x: rnd(0, maxX), y: rnd(minY, maxY) };
      if (target) {
        const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy);
        speed = (area.speed || 70) * cur.roam;
        if (d < 2) { target = null; pauseUntil = now + rnd(...(area.pause || [0.6, 2.2])) * 1000; speed = 0; }
        else { const step = Math.min(d, speed * dt); pos.x += (dx / d) * step; pos.y += (dy / d) * step; vx = dx / d; vy = dy / d; }
      }
    } else {
      // Not roaming: drift back to the center of the host.
      target = null;
      pos.x += (maxX / 2 - pos.x) * Math.min(1, dt * 4); pos.y += (maxY / 2 - pos.y) * Math.min(1, dt * 4);
    }
    pos.x = Math.max(0, Math.min(maxX, pos.x)); pos.y = Math.max(minY, Math.min(maxY, pos.y));
    mv += ((speed > 0 ? 1 : 0) - mv) * Math.min(1, dt * 8);

    // Gaze: look where it is walking, else follow the pointer, else wander (idle), else the mood's own gaze.
    const t = now / 1000;
    const ov = P.overlays?.[P.moods[curMood].overlay];
    ovFrame = ov && s.motion !== 'none' && !reduce ? Math.floor(t * ov.fps) % ov.frames.length : undefined;
    const r = el.getBoundingClientRect();
    if (mv > 0.3) gaze = [vx, vy];
    else if (s.motion === 'follow' && pointer) {
      const dx = pointer[0] - (r.left + r.width / 2), dy = pointer[1] - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, f = Math.min(1, d / 220);
      gaze = [(dx / d) * f, (dy / d) * f];
    } else if (s.motion === 'idle') gaze = [Math.sin(t * 0.9), Math.cos(t * 0.6) * 0.6];
    else gaze = undefined;
    if (gaze) gaze = gaze.map((v) => Math.round(v * 8) / 8); // quantize so we only re-render when it visibly changes
    draw();

    if (s.motion === 'none' || reduce) el.style.transform = `translate(${pos.x}px,${pos.y}px)`;
    else {
      const up = 0.5 - 0.5 * Math.cos(TAU * cur.bobHz * t);
      const step = Math.abs(Math.sin(Math.PI * (1.6 + cur.roam) * t));               // hop phase while walking
      const sq = cur.squash * (2 * up - 1) - 0.08 * mv * (1 - step);
      const jx = cur.shake * (Math.sin(TAU * cur.shakeHz * t) + 0.5 * Math.sin(TAU * cur.shakeHz * 1.7 * t + 1));
      const jy = cur.shake * 0.6 * Math.sin(TAU * cur.shakeHz * 1.3 * t + 2);
      const lean = mv * vx * 7;
      // tap kick: a quick jump plus a damped squash-and-stretch wobble
      const tt = tapT < 0 ? 99 : (now - tapT) / 1000;
      const wob = tt < 1.2 ? Math.exp(-5 * tt) * Math.cos(tt * 22) * 0.2 : 0;
      const jump = tt < 0.45 ? s.size * 0.2 * Math.sin((Math.PI * tt) / 0.45) : 0;
      el.style.transform =
        `translate(${(pos.x + jx).toFixed(2)}px,${(pos.y + jy - cur.bob * up - mv * s.size * 0.1 * step - jump).toFixed(2)}px) ` +
        `rotate(${(cur.sway * Math.sin(TAU * cur.swayHz * t) + lean).toFixed(2)}deg) ` +
        `scale(${(cur.base * (1 - sq * 0.6) * (1 + wob)).toFixed(3)},${(cur.base * (1 + sq) * (1 - wob)).toFixed(3)})`;
    }
    if (!dead) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    set(patch) { Object.assign(s, patch); if (patch.roam === null || patch.roam === false) target = null; if (!reactMood) curMood = s.mood; applyReact(); lastKey = ''; draw(); },
    poke,
    lookAt(x, y) { pointer = [x, y]; },
    destroy() { dead = true; cancelAnimationFrame(raf); clearTimeout(blinkTimer); removeEventListener('pointermove', onMove); el.remove(); },
  };
}
