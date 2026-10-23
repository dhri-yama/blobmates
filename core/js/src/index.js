// avatar(seed, opts) -> SVG string. The seed picks every axis by default; any axis in opts is "pinned" and wins.
// mood/gaze/blink are runtime state, never seeded. Integer-only seed math so Kotlin/Swift ports can match bit for bit.
//
// Pins: style, body, color (hex or palette id), variant (eye variant #), eyeSize, faceY, mouth, brow,
//       top | eyes | face | cheeks (accessory id, or "none"), accColor (hex).

const fnv1a = (s) => {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h >>> 0;
};
const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
};
const num = (x) => String(+x.toFixed(2));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const GAZE = 3.5;
// Darker tint of the body color for details (plates, spots, frills). Integer math so ports match.
const shade = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return '#' + [1, 3, 5].map((i) => Math.floor((parseInt(hex.slice(i, i + 2), 16) * 78) / 100).toString(16).padStart(2, '0')).join('');
};
const SLOTS = ['top', 'eyes', 'face', 'cheeks'];

export function makeAvatar(P) {
  const weighted = (next, items) => {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = next() % total;
    for (const [v, w] of items) if ((r -= w) < 0) return v;
  };

  // Everything the seed decides, with pins applied. Also what an editor shows as the "auto" value.
  function resolve(seed, o = {}) {
    const next = mulberry32(fnv1a(String(seed)));
    // Fixed draw order; every draw happens even if unused, so adding a rule never shifts earlier draws.
    const styleDraw = weighted(next, Object.entries(P.styles).map(([k, v]) => [k, v.weight]));
    const bodyDraw = next(), colorDraw = next(), variantDraw = next();
    const scaleDraw = next(), mouthDraw = weighted(next, P.identityMouths), browDraw = weighted(next, P.identityBrows);
    const slotDraws = SLOTS.map(() => [next() % 100, next()]);
    const accColorDraw = next();

    const style = P.styles[o.style] ? o.style : styleDraw;
    const st = P.styles[style];
    const pool = st.bodies ? P.bodies.filter((b) => st.bodies.includes(b.id)) : P.bodies.filter((b) => !b.block);
    const body = P.bodies.find((b) => b.id === o.body) || pool[bodyDraw % pool.length];

    const named = P.palettes.find((p) => p.id === o.color);
    const color = named ? named.color : o.color || P.palettes[colorDraw % P.palettes.length].color;

    const accPool = P.accColors.filter((c) => c.toLowerCase() !== color.toLowerCase());
    const accColor = o.accColor || accPool[accColorDraw % accPool.length];

    const acc = {};
    SLOTS.forEach((slot, i) => {
      const list = P.accessories[slot];
      const pin = o[slot];
      acc[slot] = pin === 'none' ? null : list.find((a) => a.id === pin) || (pin ? null : slotDraws[i][0] < P.accChance[slot] ? list[slotDraws[i][1] % list.length] : null);
    });

    return {
      style, body, color, accColor, acc,
      variant: Number.isInteger(o.variant) ? o.variant : variantDraw,
      eyeScale: o.eyeSize ?? [90, 100, 115][scaleDraw % 3] / 100,
      faceY: o.faceY || 0,
      mouth: P.mouths[o.mouth] !== undefined ? o.mouth : mouthDraw,
      brow: st.defaultBrow || (st.brows ? (P.brows[o.brow] !== undefined ? o.brow : browDraw) : 'none'),
    };
  }

  const eyeSvg = (id, key) => {
    for (const fam of P.styles[id.style].eyes) {
      const list = P.eyes[fam][key];
      if (list) return list[id.variant % list.length];
    }
    return P.eyes.blob.open[0];
  };

  function avatar(seed, o = {}) {
    const id = resolve(seed, o);
    const mood = P.moods[o.mood] || P.moods.neutral;
    const st = P.styles[id.style];
    const mouth = mood.mouth || id.mouth;
    const brow = st.brows ? mood.brow || id.brow : 'none';
    const gaze = o.gaze || mood.gaze || [0, 0];
    const gx = clamp(gaze[0], -1, 1) * GAZE, gy = clamp(gaze[1], -1, 1) * GAZE;
    const blink = clamp(o.blink || 0, 0, 1);

    let eyes = eyeSvg(id, mood.eye).replace(/data-part="pupil-([lr])"/g, `data-part="pupil-$1" transform="translate(${num(gx)} ${num(gy)})"`);
    if (blink) eyes = `<g transform="translate(0 46) scale(1 ${num(1 - 0.9 * blink)}) translate(0 -46)">${eyes}</g>`;

    const b = id.body, fs = b.fs || 1;
    const faceTf = `translate(${50 + (b.fx || 0)} ${50 + (b.fy || 0) + id.faceY}) scale(${fs}) translate(-50 -50)`;
    const part = (name, svg) => (svg ? `<g data-part="${name}">${svg}</g>` : '');
    const a = id.acc;

    const back = b.block ? '' : SLOTS.map((s) => part(`acc-${s}-back`, a[s]?.back)).join('');
    const face =
      `<g data-part="face" transform="${faceTf}">` +
      part('acc-cheeks', a.cheeks?.front) +
      `<g data-part="eyes" transform="translate(50 46) scale(${num(id.eyeScale)}) translate(-50 -46)">${eyes}</g>` +
      part('acc-eyes', a.eyes?.front) + P.brows[brow] + part('mouth', P.mouths[mouth]) +
      part('acc-face', a.face?.front) + part('acc-top', a.top?.front) + '</g>';

    const hasBack = back !== '';
    const backG = hasBack ? `<g transform="${faceTf}">${back}</g>` : '';
    const scene =
      `${b.back && !b.block ? `<g data-part="body-back">${b.back}</g>` : ''}${backG}<g data-part="body">${b.svg}</g>` +
      `${b.front ? `<g data-part="body-front">${b.front}</g>` : ''}${face}`;
    const framed = b.block ? scene : `<g transform="translate(50 50) scale(0.88) translate(-50 -50)">${scene}</g>`;

    const rx = { circle: 50, rounded: 22, square: 0 }[o.shape];
    const cid = `av${fnv1a(String(seed)).toString(36)}`;
    const wrap = rx === undefined ? framed : `<clipPath id="${cid}"><rect width="100" height="100" rx="${rx}"/></clipPath><g clip-path="url(#${cid})">${o.bg ? `<rect width="100" height="100" fill="${o.bg}"/>` : ''}${framed}</g>`;
    const bg = rx === undefined && o.bg ? `<rect width="100" height="100" fill="${o.bg}"/>` : '';

    // Mood overlay (thought bubble, snoring): frame chosen by the runtime, or the mood's still frame for static output.
    const ov = mood.overlay && P.overlays[mood.overlay];
    const overlay = ov ? `<g data-part="overlay">${ov.frames[Number.isInteger(o.overlayFrame) ? o.overlayFrame % ov.frames.length : ov.still]}</g>` : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${o.size || 128}" height="${o.size || 128}">${bg}${wrap}${overlay}</svg>`
      .replaceAll('{{body}}', id.color)
      .replaceAll('{{acc}}', id.accColor)
      .replaceAll('{{shade}}', shade(id.color))
      .replaceAll('{{lid}}', id.body.lid || id.color);
  }

  avatar.resolve = resolve;
  avatar.parts = P;
  return avatar;
}
