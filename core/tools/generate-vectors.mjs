// Writes core/spec/vectors.json: the test cases every port (JS, Swift, Kotlin) must reproduce exactly.
// Run: node core/tools/generate-vectors.mjs
// Everything here is deterministic (no randomness, no dates), so re-running only changes the file when the library
// or the parts data changed. Review that diff: it is exactly what would change for users.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { blobmate, parts, moods, bodies, accessories } from '../js/src/main.js';
import { fnv1a, mulberry32, num } from '../js/src/internals.js';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const cases = [];
const add = (group, id, seed, options = {}) => {
  const svg = blobmate(seed, options);
  const r = blobmate.resolve(seed, options);
  cases.push({
    group, id, seed, options,
    sha256: sha256(svg), length: svg.length,
    resolved: {
      style: r.style, body: r.body.id, color: r.color, accColor: r.accColor,
      acc: { top: r.acc.top?.id ?? null, eyes: r.acc.eyes?.id ?? null, face: r.acc.face?.id ?? null, cheeks: r.acc.cheeks?.id ?? null },
      variant: r.variant, eyeScale: r.eyeScale, faceY: r.faceY, mouth: r.mouth, brow: r.brow,
    },
    // The first few full SVGs are kept so a failing port can be diffed by eye, not just by hash.
    ...(cases.length < 6 ? { svg } : {}),
  });
};

// 1. Seeds: plain names, empty, spaces, accents, CJK, emoji, long text, emails.
const SEEDS = ['', 'a', 'sagar', 'alain00', 'Blobmates', 'blobmates', 'polypal', 'Mia', 'Noah', 'Zed', 'Ana', 'Kofi', 'Lena', 'Omar', 'Yuki',
  'hello world', 'The quick brown fox jumps over the lazy dog', '12345', '0', '  spaces  ', 'Zoë', 'José', '日本語', '🙂', 'a🙂b',
  'user@example.com', 'dhrijethi@gmail.com', 'ÅÄÖ', 'naïve', 'x'.repeat(200), ...Array.from({ length: 30 }, (_, i) => `user${i}`)];
SEEDS.forEach((s, i) => add('seeds', `seed-${i}`, s));

// 2. Every body (block needs its own style).
for (const body of bodies) add('bodies', `body-${body}`, 'vec-body', { body, style: body === 'block' ? 'block-eyes' : 'blob-face' });
add('bodies', 'body-block-minimal', 'vec-body', { body: 'block', style: 'minimal' });

// 3. Every mood, three seeds.
for (const mood of moods) for (const seed of ['sagar', 'mia', 'zed']) add('moods', `mood-${mood}-${seed}`, seed, { mood, size: 64 });

// 4. Styles x moods.
for (const style of Object.keys(parts.styles)) for (const mood of moods) add('styles', `style-${style}-${mood}`, 'vec-style', { style, mood, body: style === 'block-eyes' ? undefined : 'cloud' });

// 5. Every accessory.
for (const [slot, ids] of Object.entries(accessories)) for (const id of ids) add('accessories', `acc-${slot}-${id}`, 'vec-acc', { body: 'circle', color: '#4DA3F5', [slot]: id });
add('accessories', 'acc-colors', 'vec-acc', { body: 'circle', top: 'bow', eyes: 'shades-round', face: 'handlebar', cheeks: 'blush', accColor: '#E84A3C' });
add('accessories', 'acc-none', 'vec-acc', { top: 'none', eyes: 'none', face: 'none', cheeks: 'none' });
add('accessories', 'acc-unknown-id', 'vec-acc', { top: 'does-not-exist', eyes: 'nope' });

// 6. Pins.
for (const v of [0.7, 0.9, 1, 1.15, 1.4, 1.234]) add('pins', `eyeSize-${v}`, 'vec-pin', { eyeSize: v });
for (const v of [-10, -3, 0, 2.5, 10]) add('pins', `faceY-${v}`, 'vec-pin', { faceY: v });
for (const v of [0, 1, 2, 3, 4]) add('pins', `variant-${v}`, 'vec-pin', { variant: v, style: 'blob-face' });
for (const m of Object.keys(parts.mouths)) add('pins', `mouth-${m}`, 'vec-pin', { mouth: m });
for (const b of Object.keys(parts.brows)) add('pins', `brow-${b}`, 'vec-pin', { brow: b, style: 'blob-face' });
for (const p of parts.palettes) add('pins', `color-${p.id}`, 'vec-pin', { color: p.id, body: 'dino-stego' });
for (const c of ['#4DA3F5', '#4da3f5', '#fff', '#FFFFFF', '#000000', 'red', 'notacolor']) add('pins', `color-${c}`, 'vec-pin', { color: c, body: 'dino-stego' });
for (const [k, o] of Object.entries({ 'body-unknown': { body: 'nope' }, 'style-unknown': { style: 'nope' }, 'mouth-unknown': { mouth: 'nope' }, 'brow-unknown': { brow: 'nope' } })) add('pins', k, 'vec-pin', o);

// 7. Output: shape, background, size.
for (const shape of ['circle', 'rounded', 'square', 'bogus', undefined]) for (const bg of [undefined, '#ffffff']) for (const body of ['cloud', 'block'])
  add('output', `shape-${shape}-bg-${bg}-${body}`, 'vec-out', { shape, bg, body, style: body === 'block' ? 'block-eyes' : undefined });
for (const size of [16, 32, 96, 128, 48.5, 0]) add('output', `size-${size}`, 'vec-out', { size });

// 8. Gaze and blink (the values the runtime produces are multiples of 1/8; these include exact rounding ties).
const GAZES = [-1, -0.75, -0.375, -0.125, 0, 0.125, 0.375, 0.75, 1];
for (const gx of GAZES) for (const gy of GAZES) add('gaze', `gaze-${gx}-${gy}`, 'vec-gaze', { gaze: [gx, gy] });
add('gaze', 'gaze-out-of-range', 'vec-gaze', { gaze: [2, -2] });
for (const blink of [0, 0.1, 0.6, 1, 1.5, -1]) add('gaze', `blink-${blink}`, 'vec-gaze', { blink });
add('gaze', 'blink-and-gaze', 'vec-gaze', { blink: 0.6, gaze: [0.75, 0.375], mood: 'happy' });

// 9. Overlay frames.
for (const mood of ['thinking', 'sleeping']) for (const f of [0, 1, 2, 3, 7]) add('overlay', `overlay-${mood}-${f}`, 'vec-overlay', { mood, overlayFrame: f });
add('overlay', 'overlay-still', 'vec-overlay', { mood: 'thinking' });

// Low-level pieces, so a port that fails can see whether the hash, the random numbers or the formatting is at fault.
const prng = ['', 'a', 'sagar', 'blobmates', 'Zoë', '🙂', 'user7', 'x'.repeat(50)].map((seed) => {
  const next = mulberry32(fnv1a(seed));
  return { seed, fnv1a: fnv1a(seed), draws: Array.from({ length: 14 }, () => next()) };
});
const numInputs = [0, -0, 1, 0.5, 0.125, 0.375, 0.625, 0.875, 2.625, 3.5, 1.005, 1.015, -0.001, -0.004, -0.005, -0.125, -2.625, 0.1 + 0.2, 50, 36.1, 0.9, 1.15, 1.234, 99.999, 0.45999999999999996, 3.0625, 128.5];
const shortestInputs = [0, 1, 50, 50.5, 36.1, 0.82, 0.9, -14, 0.1, 128.5, 0.88, 1.15, 46.5, -0.5];

const out = {
  note: 'GENERATED by core/tools/generate-vectors.mjs. Do not edit. See core/spec/README.md.',
  parts: { version: parts.version, sha256: sha256(readFileSync(new URL('../assets/parts.json', import.meta.url))) },
  formatting: {
    num: numInputs.map((x) => [x, num(x)]),
    shortest: shortestInputs.map((x) => [x, String(x)]),
  },
  prng,
  cases,
};
writeFileSync(new URL('../spec/vectors.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`vectors: ${cases.length} cases, ${prng.length} prng, ${numInputs.length} num formats`);
const groups = {}; for (const c of cases) groups[c.group] = (groups[c.group] || 0) + 1; console.log(groups);
