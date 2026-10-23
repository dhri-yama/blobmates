// Generates core/assets/parts.json (frozen art pack). Run: node core/tools/build-parts.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const INK = '#111111';
const n = (x) => String(+x.toFixed(1));
const F = 'fill="{{body}}"';
const SH = 'fill="{{shade}}" stroke="{{shade}}" stroke-width="4" stroke-linejoin="round"';
const SOFT = 'fill="{{body}}" stroke="{{body}}" stroke-width="6" stroke-linejoin="round"';

// ---- bodies -------------------------------------------------------------
function smooth(pts) {
  const m = pts.length;
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m], p1 = pts[i], p2 = pts[(i + 1) % m], p3 = pts[(i + 2) % m];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + 'Z';
}
function lobed(k, amp, R = 43, sx = 1, sy = 1, fill = F) {
  const N = k * 10, pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = (R * (1 + amp * Math.cos(k * t))) / (1 + amp);
    pts.push([50 + r * sx * Math.cos(t), 50 + r * sy * Math.sin(t)]);
  }
  return `<path ${fill} d="${smooth(pts)}"/>`;
}
// Irregular pebble: fixed pseudo-random radii (frozen into parts.json, so ports never recompute them).
function pebble(seed, k = 7, jitter = 0.28, sx = 1, sy = 1) {
  let s = seed, rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pts = Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2, r = 41 * (1 - jitter + jitter * 2 * rnd()) / (1 + jitter * 0.5);
    return [50 + r * sx * Math.cos(t), 50 + r * sy * Math.sin(t)];
  });
  return `<path ${F} d="${smooth(pts)}"/>`;
}
function star(k, inner, R = 41) {
  const pts = [];
  for (let i = 0; i < k * 2; i++) {
    const t = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? R * inner : R;
    pts.push(`${n(50 + r * Math.cos(t))},${n(50 + r * Math.sin(t))}`);
  }
  return `<polygon ${SOFT} points="${pts.join(' ')}"/>`;
}
const poly = (pts) => `<polygon ${SOFT} points="${pts}"/>`;
const reg = (k, R, rot = -90) => poly(Array.from({ length: k }, (_, i) => {
  const t = ((rot + (360 / k) * i) * Math.PI) / 180;
  return `${n(50 + R * Math.cos(t))},${n(50 + R * Math.sin(t))}`;
}).join(' '));

// Egg outline (convex), used both to draw Togepi's egg and to clip its colored shell triangles to it.
const eggPts = Array.from({ length: 72 }, (_, i) => {
  const t = (i / 72) * Math.PI * 2;
  return [50 + 37 * Math.sin(t) * (1 - 0.2 * Math.cos(t)), 54 - 42 * Math.cos(t)];
});
// Sutherland-Hodgman: clip polygon `subj` to the convex polygon `clip` (both clockwise on screen).
function clipConvex(subj, clip) {
  let out = subj;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const f = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const input = out; out = [];
    input.forEach((p, j) => {
      const q = input[(j + input.length - 1) % input.length];
      if (f(p) >= 0 !== f(q) >= 0) {
        const t = f(q) / (f(q) - f(p));
        out.push([q[0] + t * (p[0] - q[0]), q[1] + t * (p[1] - q[1])]);
      }
      if (f(p) >= 0) out.push(p);
    });
  }
  return out;
}
const toPts = (pts) => pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
const RED = '#E0463A', BLUE = '#3F6FD1';
const shellTeeth = Array.from({ length: 7 }, (_, k) => {
  const x0 = 2 + k * 14;
  return `<polygon points="${toPts(clipConvex([[x0, 104], [x0 + 7, 60], [x0 + 14, 104]], eggPts))}" fill="${k % 2 ? BLUE : RED}"/>`;
}).join('');
const tuft = (pts, c) => `<polygon points="${pts}" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`;

const bodies = [
  { id: 'circle', svg: `<circle ${F} cx="50" cy="50" r="43"/>` },
  { id: 'oval', svg: `<ellipse ${F} cx="50" cy="50" rx="47" ry="35"/>`, fs: 1.05 },
  { id: 'squircle', svg: `<rect ${F} x="8" y="8" width="84" height="84" rx="26"/>` },
  { id: 'pill', svg: `<rect ${F} x="5" y="24" width="90" height="52" rx="26"/>`, fs: 0.8 },
  { id: 'hexagon', svg: reg(6, 42, 0) },
  { id: 'octagon', svg: reg(8, 42, -22.5) },
  { id: 'clover', svg: lobed(4, 0.14) },
  { id: 'trefoil', svg: lobed(3, 0.18), fy: 3 },
  { id: 'cloud', svg: lobed(8, 0.09) },
  { id: 'flower', svg: lobed(12, 0.07) },
  { id: 'scallop', svg: lobed(16, 0.045) },
  { id: 'sun', svg: star(10, 0.72) },
  { id: 'sparkle', svg: star(4, 0.3), fs: 0.8 },
  { id: 'asterisk', svg: star(8, 0.55), fs: 0.95 },
  { id: 'burst', svg: star(14, 0.84) },
  { id: 'ghost', svg: `<path ${F} d="M9 88V48A41 41 0 0 1 91 48V88Q80 76 70 88T50 88T30 88T9 88Z"/>`, fy: -4 },
  { id: 'arch', svg: `<path ${F} d="M10 92V50A40 40 0 0 1 90 50V92H66V70A16 16 0 0 0 34 70V92Z"/>`, fy: -10, fs: 0.95 },
  { id: 'dome', svg: `<path ${F} d="M5 78A45 45 0 0 1 95 78Z"/>`, fy: 8, fs: 1.1 },
  { id: 'heart', svg: `<path ${F} d="M50 90C10 60 4 30 26 18C38 12 50 22 50 31C50 22 62 12 74 18C96 30 90 60 50 90Z"/>`, fy: -6 },
  { id: 'triangle', svg: poly('50,10 92,86 8,86'), fy: 12, fs: 0.9 },
  { id: 'trapezoid', svg: poly('24,16 76,16 94,86 6,86'), fy: 2 },
  { id: 'bean', svg: `<path ${F} d="M18 32C28 8 70 4 86 24C98 42 82 90 52 88C30 86 30 72 20 62C8 52 12 44 18 32Z"/>` },
  { id: 'crown', svg: poly('10,90 10,30 30,48 50,14 70,48 90,30 90,90'), fy: 6, fs: 0.95 },
  { id: 'drip', svg: `<path ${F} d="M8 68C8 30 30 12 50 12C70 12 92 30 92 68V76Q92 90 82 90Q72 90 72 76V66H28V76Q28 90 18 90Q8 90 8 76Z"/>`, fy: -8, fs: 0.95 },
  { id: 'stack', svg: `<g ${F}><rect x="12" y="8" width="76" height="36" rx="18"/><rect x="6" y="32" width="88" height="36" rx="18"/><rect x="12" y="56" width="76" height="36" rx="18"/></g>`.replace(/fill="\{\{body\}\}"/, 'fill="{{body}}"').replace(/<rect/g, `<rect ${F}`), fs: 1.05 },
  { id: 'quarter', svg: `<path ${F} d="M10 90V12A80 80 0 0 1 90 90Z"/>`, fx: -10, fy: 6, fs: 0.9 },
  // --- v1 expansion ---
  { id: 'clover3-wide', svg: lobed(3, 0.2, 43, 1.1, 0.9), fy: 2 },
  { id: 'cloud-wide', svg: lobed(6, 0.1, 43, 1.1, 0.82) },
  { id: 'cloud-tall', svg: lobed(6, 0.1, 43, 0.82, 1.1), fy: 2 },
  { id: 'jelly', svg: lobed(5, 0.07, 43, 0.9, 1) },
  { id: 'daisy', svg: lobed(8, 0.2, 44) },
  { id: 'gear', svg: lobed(10, 0.1, 44) },
  { id: 'wavy-oval', svg: lobed(10, 0.06, 44, 1.1, 0.8), fs: 1.05 },
  { id: 'pebble-a', svg: pebble(3) },
  { id: 'pebble-b', svg: pebble(11, 6, 0.3) },
  { id: 'pebble-c', svg: pebble(29, 8, 0.25, 1.1, 0.85) },
  { id: 'pebble-d', svg: pebble(47, 6, 0.32, 0.9, 1) },
  { id: 'pebble-e', svg: pebble(71, 7, 0.3) },
  { id: 'pebble-f', svg: pebble(97, 9, 0.2, 1.1, 0.9) },
  { id: 'egg', svg: `<path ${F} d="M50 8C72 8 86 36 86 58C86 78 70 92 50 92C30 92 14 78 14 58C14 36 28 8 50 8Z"/>`, fy: 6 },
  { id: 'raindrop', svg: `<path ${F} d="M50 6C58 28 86 44 86 64C86 82 70 94 50 94C30 94 14 82 14 64C14 44 42 28 50 6Z"/>`, fy: 12, fs: 0.9 },
  { id: 'diamond', svg: poly('50,6 94,50 50,94 6,50'), fs: 0.85 },
  { id: 'kite', svg: poly('50,6 90,38 50,94 10,38'), fy: -2, fs: 0.9 },
  { id: 'pentagon', svg: reg(5, 44), fy: 4 },
  { id: 'house', svg: poly('50,10 92,42 92,90 8,90 8,42'), fy: 8, fs: 0.95 },
  { id: 'shield', svg: `<path ${F} d="M10 14H90V50C90 74 70 88 50 94C30 88 10 74 10 50Z"/>`, fy: -2 },
  { id: 'mountain', svg: poly('6,90 30,38 42,56 58,20 94,90'), fy: 14, fs: 0.78 },
  { id: 'cheese', svg: poly('14,22 90,12 86,88 14,88'), fx: -2 },
  { id: 'molar', svg: `<path ${F} d="M18 12H82Q94 12 90 30Q86 50 80 66Q76 92 66 90Q58 88 56 70Q54 62 50 62Q46 62 44 70Q42 88 34 90Q24 92 20 66Q14 50 10 30Q6 12 18 12Z"/>`, fy: -12, fs: 0.92 },
  { id: 'tulip', svg: `<path ${F} d="M10 90V18Q30 18 36 34L50 12L64 34Q70 18 90 18V90Q50 98 10 90Z"/>`, fy: 4, fs: 0.95 },
  { id: 'grass', svg: poly('8,92 12,38 28,62 36,14 50,56 64,10 72,60 90,34 92,92'), fy: 14, fs: 0.85 },
  { id: 'cat', svg: poly('10,92 10,16 34,36 66,36 90,16 90,92'), fy: 8, fs: 0.95 },
  { id: 'bell', svg: `<path ${F} d="M6 88Q14 80 14 62C14 34 28 10 50 10C72 10 86 34 86 62Q86 80 94 88Z"/>`, fy: 2 },
  { id: 'octopus', svg: `<path ${F} d="M10 56C10 28 28 8 50 8C72 8 90 28 90 56V80Q90 94 80 90Q72 88 70 76L68 62H62L60 84Q58 94 50 94Q42 94 40 84L38 62H32L30 76Q28 88 20 90Q10 94 10 80Z"/>`, fy: -10, fs: 0.95 },
  { id: 'ghost2', svg: `<path ${F} d="M10 90V50A40 40 0 0 1 90 50V90L74 76L58 90L42 76L26 90Z"/>`, fy: -4 },
  { id: 'blob-drip', svg: `<path ${F} d="M12 30C12 14 30 8 50 8C70 8 88 14 88 30C88 46 74 46 74 62C74 92 56 92 56 70C56 56 44 56 44 70C44 94 26 94 26 64C26 46 12 46 12 30Z"/>`, fy: -16, fs: 0.82 },
  { id: 'tall-heart', svg: `<path ${F} d="M50 94C14 62 12 30 30 16C42 8 50 20 50 28C50 20 58 8 70 16C88 30 86 62 50 94Z"/>`, fy: -8, fs: 0.85 },
  { id: 'cross', svg: poly('36,8 64,8 64,36 92,36 92,64 64,64 64,92 36,92 36,64 8,64 8,36 36,36'), fs: 0.85 },
  { id: 'bowtie', svg: `<path ${F} d="M6 18Q6 8 18 14L42 36Q50 40 58 36L82 14Q94 8 94 18V82Q94 92 82 86L58 64Q50 60 42 64L18 86Q6 92 6 82Z"/>`, fs: 0.95 },
  { id: 'butterfly', svg: `<path ${F} d="M8 14Q10 6 22 14Q38 24 50 38Q62 24 78 14Q90 6 92 14Q96 40 70 50Q96 60 92 86Q90 94 78 86Q62 76 50 62Q38 76 22 86Q10 94 8 86Q4 60 30 50Q4 40 8 14Z"/>`, fs: 0.8 },
  { id: 'star5', svg: star(5, 0.55), fy: 5, fs: 0.85 },
  { id: 'star6', svg: star(6, 0.6), fs: 0.9 },
  { id: 'burst8', svg: star(8, 0.8) },
  { id: 'wavy-flag', svg: `<path ${F} d="M8 20Q28 8 50 20T92 20V80Q72 92 50 80T8 80Z"/>`, fs: 0.95 },
  { id: 'half-pill', svg: `<path ${F} d="M6 80V50A44 44 0 0 1 50 6H94V80Z"/>`, fx: 2, fy: 4 },
  { id: 'leaf', svg: `<path ${F} d="M10 90C10 40 40 8 92 8C92 60 62 92 10 90Z"/>`, fy: 2, fs: 0.85 },
  { id: 'cloud-puff', svg: `<path ${F} d="M28 82A24 24 0 0 1 22 38A26 26 0 0 1 70 26A26 26 0 0 1 78 80Z"/>`, fy: 2 },
  { id: 'ufo', svg: `<path ${F} d="M6 62Q6 52 22 50Q26 14 50 14Q74 14 78 50Q94 52 94 62Q94 76 50 76Q6 76 6 62Z"/>`, fy: -4, fs: 0.85 },
  { id: 'u-shape', svg: `<path ${F} d="M10 14H90V60A40 36 0 0 1 10 60Z"/>`, fy: -8 },
  // --- dinos: back = behind the body, front = details over the body but under the face. {{shade}} = darker body color ---
  { id: 'dino-stego', svg: `<path ${F} d="M12 70C12 40 30 24 50 24C70 24 88 40 88 70C88 86 72 92 50 92C28 92 12 86 12 70Z"/>`,
    back: `<g ${SH}><polygon points="20,42 25,14 40,30"/><polygon points="38,28 50,4 62,28"/><polygon points="60,30 75,14 80,42"/></g>`, fy: 8, fs: 0.9 },
  { id: 'dino-trex', svg: `<path ${F} d="M8 56C8 32 28 18 50 18C74 18 92 32 92 56C92 80 74 92 50 92C26 92 8 80 8 56Z"/>`,
    back: `<g ${SH}><polygon points="30,24 36,6 44,22"/><polygon points="44,20 50,2 56,20"/><polygon points="56,22 64,6 70,24"/></g>`,
    front: `<circle cx="44" cy="58" r="1.8" fill="{{shade}}"/><circle cx="56" cy="58" r="1.8" fill="{{shade}}"/>`, fy: 2 },
  { id: 'dino-tricera', svg: `<circle ${F} cx="50" cy="56" r="36"/>`,
    back: lobed(14, 0.07, 46, 1, 1, 'fill="{{shade}}"') + `<g fill="#F3E6C8" stroke="#F3E6C8" stroke-width="3" stroke-linejoin="round"><polygon points="24,34 28,6 40,28"/><polygon points="60,28 72,6 76,34"/></g>`, fy: 6, fs: 0.92 },
  { id: 'dino-longneck', svg: `<path ${F} d="M22 36C22 10 78 10 78 36C78 50 64 54 62 66V86C62 95 38 95 38 86V66C36 54 22 50 22 36Z"/>`,
    front: `<circle cx="50" cy="80" r="3" fill="{{shade}}"/><circle cx="50" cy="68" r="2.4" fill="{{shade}}"/>`, fy: -14, fs: 0.66 },
  { id: 'dino-spots', svg: `<circle ${F} cx="50" cy="54" r="38"/>`,
    back: `<circle cx="13" cy="46" r="9" ${F}/><circle cx="87" cy="46" r="9" ${F}/><path d="M38 20V10M62 20V10" fill="none" stroke="{{shade}}" stroke-width="4" stroke-linecap="round"/><circle cx="38" cy="9" r="4.5" fill="{{shade}}"/><circle cx="62" cy="9" r="4.5" fill="{{shade}}"/>`,
    front: `<g fill="{{shade}}"><circle cx="30" cy="34" r="5"/><circle cx="68" cy="28" r="4"/><circle cx="22" cy="62" r="4.5"/><circle cx="80" cy="64" r="5"/><circle cx="50" cy="82" r="4"/></g>`, fy: 4, fs: 0.95 },
  { id: 'dino-crest', svg: `<path ${F} d="M20 56C20 30 34 20 50 20C66 20 80 30 80 56C80 82 66 92 50 92C34 92 20 82 20 56Z"/>`,
    back: `<path d="M50 24L32 4M50 24V0M50 24L68 4" fill="none" stroke="{{shade}}" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="4" r="4" fill="{{shade}}"/><circle cx="50" cy="2" r="4" fill="{{shade}}"/><circle cx="68" cy="4" r="4" fill="{{shade}}"/>`, fy: 4 },
  { id: 'dino-ptero', svg: `<path ${F} d="M16 60C16 36 32 22 52 22C74 22 88 38 88 60C88 82 72 92 52 92C32 92 16 82 16 60Z"/>`,
    back: `<path d="M56 26C44 8 22 2 4 8C22 14 32 22 40 36Z" fill="{{shade}}" stroke="{{shade}}" stroke-width="4" stroke-linejoin="round"/>`, fx: 2, fy: 4, fs: 0.95 },
  { id: 'dino-hatch', svg: `<path ${F} d="M16 52C16 26 32 8 50 8C68 8 84 26 84 52V66H16Z"/>`,
    front: `<path d="M6 60L18 50L28 62L40 48L52 62L64 50L74 62L86 52L94 62V80C94 92 72 98 50 98C28 98 6 92 6 80Z" fill="#F7F1E3"/>`, fy: -6, fs: 0.9 },
  { id: 'dino-ankylo', svg: `<path ${F} d="M6 66C6 40 26 26 50 26C74 26 94 40 94 66C94 84 72 90 50 90C28 90 6 84 6 66Z"/>`,
    front: `<g ${SH}><polygon points="14,40 18,22 28,34"/><polygon points="32,30 38,14 46,28"/><polygon points="54,28 62,14 68,30"/><polygon points="72,34 82,22 86,40"/></g><g fill="{{shade}}"><circle cx="50" cy="38" r="2.4"/><circle cx="30" cy="80" r="3"/><circle cx="70" cy="80" r="3"/></g>`, fy: 10, fs: 0.9 },
  { id: 'dino-sail', svg: `<circle ${F} cx="50" cy="58" r="34"/>`,
    back: `<path d="M12 56C12 22 34 6 50 4C66 6 88 22 88 56Z" fill="{{shade}}"/><path d="M50 8V40M32 14L38 42M68 14L62 42M20 30L30 46M80 30L70 46" stroke="{{body}}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`, fy: 8, fs: 0.92 },
  // --- togepi-style egg (inspired by the Pokemon): cream shell, red/blue triangles, head tufts ---
  { id: 'togepi', svg: `<polygon ${F} stroke="{{body}}" stroke-width="2" stroke-linejoin="round" points="${toPts(eggPts)}"/>`,
    back: tuft('30,20 34,4 44,16', RED) + tuft('44,14 50,-1 56,14', BLUE) + tuft('56,16 66,4 70,20', RED) +
      `<ellipse cx="10" cy="62" rx="9" ry="7" ${F}/><ellipse cx="90" cy="62" rx="9" ry="7" ${F}/>`,
    front: shellTeeth, fy: -14, fs: 0.82 },
  { id: 'block', svg: `<rect ${F} x="0" y="0" width="100" height="100"/>`, block: true },
];

// ---- eyes ---------------------------------------------------------------
const L = 36, R = 64, Y = 46;
const dot = (cx, cy, r, side) => `<g data-part="pupil-${side}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/></g>`;
const white = (cx, cy, r, pr, side, ey = cy, ry = r) =>
  `<g data-part="eye-${side}"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" fill="#fff"/>${dot(cx, ey, pr, side)}</g>`;
const pair = (fn) => fn(L, 'l') + fn(R, 'r');
const line = (d, w = 3.5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const lid = (side, pts) => `<g data-part="lid-${side}"><polygon points="${pts}" fill="{{lid}}"/></g>`;

const blob = {
  open: [
    pair((x, s) => white(x, Y, 10, 5, s)),
    pair((x, s) => white(x, Y, 8, 4.5, s, Y, 12)),
    pair((x, s) => white(x, Y, 11, 6, s, Y + 4)),
    white(38, Y, 12, 5.5, 'l') + white(62, Y, 12, 5.5, 'r'),
    pair((x, s) => white(x, Y, 8, 4, s)),
  ],
  wide: [pair((x, s) => white(x, Y, 11, 2.8, s))],
  halflid: [
    white(L, Y, 10, 5, 'l') + lid('l', '24,34 48,34 48,46 24,46') + white(R, Y, 10, 5, 'r') + lid('r', '52,34 76,34 76,46 52,46'),
  ],
  angry: [
    white(L, Y, 10, 5, 'l') + lid('l', '24,32 48,32 48,47 24,39') + white(R, Y, 10, 5, 'r') + lid('r', '52,32 76,32 76,39 52,47'),
  ],
  closedUp: [line(`M28 45Q${L} 53 44 45`) + line(`M56 45Q${R} 53 72 45`)],
  closedDown: [line(`M28 49Q${L} 40 44 49`) + line(`M56 49Q${R} 40 72 49`)],
  stressed: [line('M28 40L42 46L28 52') + line('M72 40L58 46L72 52')],
  swirl: [
    white(L, Y, 10, 4.5, 'l') +
      `<g data-part="eye-r"><circle cx="${R}" cy="${Y}" r="10" fill="#fff"/><g data-part="pupil-r"><path d="M${R} ${Y}a2.2 2.2 0 0 1 3-1.5a5 5 0 0 1-3.5 6.5a8 8 0 0 1-8.2-8" fill="none" stroke="#F08A2C" stroke-width="2.6" stroke-linecap="round"/></g></g>`,
  ],
};
const mark = {
  open: [pair((x, s) => dot(x, Y + 1, 3.8, s)), pair((x, s) => `<g data-part="pupil-${s}"><ellipse cx="${x}" cy="${Y}" rx="3" ry="5.5" fill="${INK}"/></g>`)],
  wide: [pair((x, s) => dot(x, Y, 5.5, s))],
  halflid: [pair((x, s) => `<g data-part="pupil-${s}">${line(`M${x - 7} 47H${x + 7}`)}</g>`)],
  angry: [`<g data-part="pupil-l">${line('M28 42L44 48')}</g><g data-part="pupil-r">${line('M72 42L56 48')}</g>`],
};
const minimal = {
  open: [pair((x, s) => dot(x, Y, 3.2, s))],
  wide: [pair((x, s) => dot(x, Y, 4.6, s))],
};

// ---- brows / mouths -------------------------------------------------------
const brows = {
  none: '',
  bar: `<rect data-part="brow" x="24" y="26" width="52" height="6" rx="3" fill="${INK}"/>`,
  arch: `<g data-part="brow">${line('M27 34Q36 27 45 34', 3)}${line('M55 34Q64 27 73 34', 3)}</g>`,
  worried: `<g data-part="brow">${line('M27 37L45 31', 3)}${line('M73 37L55 31', 3)}</g>`,
  raised: `<g data-part="brow">${line('M27 35H45', 3)}${line('M55 29Q64 22 73 29', 3)}</g>`,
};
const mouths = {
  none: '',
  smile: line('M40 66Q50 75 60 66'),
  wide: line('M34 63Q50 84 66 63'),
  tiny: line('M46 67Q50 71 54 67'),
  flat: line('M42 68H58'),
  frown: line('M40 72Q50 63 60 72'),
  smirk: line('M40 70Q52 74 62 65'),
  cat: line('M40 65Q45 72 50 65Q55 72 60 65'),
  wobble: line('M38 69q3.5-5 7 0t7 0t7 0'),
  oSmall: `<circle cx="50" cy="70" r="3.5" fill="${INK}"/>`,
  oBig: `<ellipse cx="50" cy="71" rx="6" ry="7.5" fill="${INK}"/>`,
  grin: `<path d="M36 63H64Q64 82 50 82Q36 82 36 63Z" fill="${INK}"/><path d="M38 63H62V68H38Z" fill="#fff"/>`,
  tongue: `<path d="M38 64Q50 77 62 64Z" fill="${INK}"/><path d="M46 69Q52 81 58 68Z" fill="#F06A8A"/>`,
  fang: line('M40 66Q50 75 60 66') + `<path d="M50 71.5L55.5 69L53.5 78Z" fill="#fff"/>`,
};

// ---- accessories (optional; face-frame coords, eyes at y=46) --------------
// back = drawn behind the body, front = drawn over the face. {{acc}} = user/seed-chosen accent color.
const A = '{{acc}}';
const fa = `fill="${A}"`;
const sa = (w) => `fill="none" stroke="${A}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const softA = `fill="${A}" stroke="${A}" stroke-width="3.5" stroke-linejoin="round"`;
const GOLD = '#E8B923';
const lens = (d) => `<path d="${d}" fill="${INK}"/>`;
const glint = (x, y) => `<path d="M${x} ${y}l5-4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>`;
const acc = (id, front, back = '') => ({ id, front, back });

const accessories = {
  top: [
    acc('bow', `<path d="M70 20L88 10V30ZM70 20L52 10V30Z" ${fa} stroke="${A}" stroke-width="2" stroke-linejoin="round"/><circle cx="70" cy="20" r="4.5" ${fa}/><circle cx="70" cy="20" r="4.5" fill="#000" opacity=".18"/>`),
    acc('horns', '', `<path d="M28 32L20 6L44 22ZM72 32L80 6L56 22Z" ${softA}/>`),
    acc('ears', '', `<polygon ${softA} points="22,34 26,6 48,22"/><polygon ${softA} points="78,34 74,6 52,22"/>`),
    acc('halo', `<ellipse cx="50" cy="12" rx="20" ry="5.5" fill="none" stroke="${GOLD}" stroke-width="4"/>`),
  ],
  eyes: [
    acc('shades-round', `<g data-part="acc-eyes">${lens('M24 46a12 12 0 1 0 24 0a12 12 0 1 0-24 0')}${lens('M52 46a12 12 0 1 0 24 0a12 12 0 1 0-24 0')}<path d="M47 44Q50 42 53 44" fill="none" stroke="${INK}" stroke-width="2.5"/>${glint(30, 42)}${glint(58, 42)}</g>`),
    acc('shades-wide', `<g data-part="acc-eyes">${lens('M20 40H80V50Q80 60 70 60H58Q52 60 50 52Q48 60 42 60H30Q20 60 20 50Z')}${glint(28, 48)}${glint(58, 48)}</g>`),
    acc('aviator', `<g data-part="acc-eyes"><path d="M23 38H48Q48 60 36 60Q22 60 23 38Z" fill="${INK}" opacity=".9"/><path d="M52 38H77Q78 60 64 60Q52 60 52 38Z" fill="${INK}" opacity=".9"/><path d="M48 40H52" stroke="${INK}" stroke-width="2.5"/>${glint(29, 46)}${glint(58, 46)}</g>`),
    acc('glasses-round', `<g data-part="acc-eyes"><circle cx="36" cy="46" r="13" ${sa(3)}/><circle cx="64" cy="46" r="13" ${sa(3)}/><path d="M49 45Q50 43 51 45" ${sa(3)}/></g>`),
    acc('glasses-square', `<g data-part="acc-eyes"><rect x="22" y="35" width="25" height="21" rx="5" ${sa(3)}/><rect x="53" y="35" width="25" height="21" rx="5" ${sa(3)}/><path d="M47 42H53" ${sa(3)}/></g>`),
    acc('monocle', `<g data-part="acc-eyes"><circle cx="64" cy="46" r="13" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M75 55Q84 70 80 88" fill="none" stroke="${GOLD}" stroke-width="1.8"/></g>`),
    acc('eyepatch', `<g data-part="acc-eyes"><path d="M12 32L88 42" stroke="${INK}" stroke-width="2.5"/><ellipse cx="36" cy="46" rx="13" ry="11" fill="${INK}"/></g>`),
  ],
  face: [
    acc('handlebar', `<path d="M50 63C44 58 36 60 33 64C30 68 31 72 35 72C33 68 38 66 44 67L50 66L56 67C62 66 67 68 65 72C69 72 70 68 67 64C64 60 56 58 50 63Z" ${fa}/>`),
    acc('walrus', `<path d="M30 64Q40 57 50 63Q60 57 70 64Q73 74 62 72Q54 70 50 68Q46 70 38 72Q27 74 30 64Z" ${fa}/>`),
    acc('pencil', `<path d="M37 64Q50 59 63 64" ${sa(3.5)}/>`),
    acc('chevron', `<path d="M33 62Q50 55 67 62L63 69Q50 62 37 69Z" ${fa}/>`),
    acc('goatee', `<path d="M41 78Q50 96 59 78Q50 83 41 78Z" ${fa}/>`),
    acc('beard', `<path d="M22 56Q24 94 50 95Q76 94 78 56Q76 78 50 80Q24 78 22 56Z" ${fa}/>`),
  ],
  cheeks: [
    acc('blush', `<ellipse cx="27" cy="58" rx="7.5" ry="4.5" fill="#FF5C86" opacity=".45"/><ellipse cx="73" cy="58" rx="7.5" ry="4.5" fill="#FF5C86" opacity=".45"/>`),
    acc('freckles', `<g fill="#7A4A2A" opacity=".7">${[[28, 58], [34, 62], [33, 55], [72, 58], [66, 62], [67, 55]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`),
    acc('tear', `<path d="M30 56Q24 65 30 69Q36 65 30 56Z" fill="#6EC1FF"/>`),
    acc('sweat', `<path d="M78 24Q72 33 78 37Q84 33 78 24Z" fill="#6EC1FF"/>`),
    acc('bandaid', `<g transform="rotate(-30 67 60)"><rect x="57" y="56" width="20" height="8" rx="4" fill="#F2C7A1"/><rect x="64" y="56" width="6" height="8" fill="#E3AE82"/></g>`),
  ],
};
const accColors = ['#111111', '#7A4A2A', '#D2691E', '#F0C75E', '#FFFFFF', '#E84A3C', '#2B66E8', '#EE6FB0', '#2FA35A', '#7A4FC2'];
const accChance = { top: 30, eyes: 15, face: 10, cheeks: 25 };

// ---- palettes & moods -----------------------------------------------------
const palettes = [
  ['pink', '#F4A3C9'], ['hotpink', '#EE6FB0'], ['red', '#E84A3C'], ['orange', '#F08A2C'], ['amber', '#F5A83A'],
  ['yellow', '#F7C531'], ['green', '#2FA35A'], ['teal', '#4FB39F'], ['sky', '#4DA3F5'], ['blue', '#2B66E8'],
  ['navy', '#3A4A9C'], ['purple', '#9966C6'], ['lavender', '#AC8AD6'],
].map(([id, color]) => ({ id, color }));

const moods = {
  neutral: { eye: 'open' },
  happy: { eye: 'open', mouth: 'wide' },
  joyful: { eye: 'closedDown', mouth: 'wide' },
  excited: { eye: 'wide', mouth: 'grin', brow: 'arch' },
  grateful: { eye: 'closedUp', mouth: 'smile' },
  sad: { eye: 'open', brow: 'worried', mouth: 'frown', gaze: [0, 0.6] },
  hurt: { eye: 'closedUp', brow: 'worried', mouth: 'flat' },
  angry: { eye: 'angry', mouth: 'frown' },
  stressed: { eye: 'stressed', mouth: 'wobble' },
  bored: { eye: 'halflid', mouth: 'flat', gaze: [0.5, -0.8] },
  confused: { eye: 'swirl', brow: 'raised', mouth: 'wobble' },
  insecure: { eye: 'open', brow: 'worried', mouth: 'tiny', gaze: [-1, 0.3] },
  guilty: { eye: 'open', brow: 'worried', mouth: 'smirk', gaze: [-0.4, 1] },
  surprised: { eye: 'wide', brow: 'arch', mouth: 'oBig' },
  sleepy: { eye: 'halflid', mouth: 'oSmall', gaze: [0, 0.5] },
  smug: { eye: 'halflid', mouth: 'smirk' },
  thinking: { eye: 'open', brow: 'raised', mouth: 'smirk', gaze: [0.85, -0.9], overlay: 'dots' },
  sleeping: { eye: 'closedUp', mouth: 'oSmall', overlay: 'zzz' },
};

// Whole-shape motion per mood. Pure data: every runtime (web/Android/Mac) animates from these numbers.
// base = resting scale (slump/shrink), bob = lift px, squash = stretch amount, sway = tilt deg, shake = tremble px, blink = seconds between blinks.
const BASE_MOTION = { base: 1, bob: 0, bobHz: 0.3, squash: 0, sway: 0, swayHz: 0.3, shake: 0, shakeHz: 18, roam: 1, blink: [2, 4.5] };
const motions = {
  neutral: { roam: 1, bob: 2, squash: 0.02 },
  happy: { roam: 1.2, bob: 4, bobHz: 0.9, squash: 0.04, sway: 2, swayHz: 0.45, blink: [2, 4] },
  joyful: { roam: 1.7, bob: 8, bobHz: 1.6, squash: 0.08, sway: 3, swayHz: 0.8, blink: [3, 6] },
  excited: { roam: 2.2, bob: 9, bobHz: 2.4, squash: 0.09, sway: 4, swayHz: 1.2, shake: 0.5, blink: [1.5, 3] },
  grateful: { roam: 0.8, base: 0.99, bob: 2, bobHz: 0.25, squash: 0.03, sway: 1.5, swayHz: 0.2, blink: [3, 5.5] },
  sad: { roam: 0.5, base: 0.95, bob: 1, bobHz: 0.2, squash: 0.01, blink: [1.2, 2.6] },
  hurt: { roam: 0.5, base: 0.96, bob: 1, bobHz: 0.25, shake: 0.5, shakeHz: 7, blink: [1.5, 3] },
  angry: { roam: 1.6, base: 1.02, bob: 0, squash: 0.02, bobHz: 0.8, shake: 1.3, shakeHz: 26, blink: [4, 8] },
  stressed: { roam: 1.9, bob: 1.5, bobHz: 3, shake: 1.8, shakeHz: 22, sway: 1.5, swayHz: 2.5, blink: [0.7, 1.6] },
  bored: { roam: 0.4, base: 0.96, bob: 1.5, bobHz: 0.15, sway: 3, swayHz: 0.12, blink: [3, 6] },
  confused: { roam: 0.8, bob: 1, bobHz: 0.4, sway: 5, swayHz: 0.5, blink: [1.5, 3] },
  insecure: { roam: 0.7, base: 0.93, bob: 0.8, bobHz: 0.5, shake: 0.5, shakeHz: 9, blink: [1, 2.2] },
  guilty: { roam: 0.6, base: 0.94, bob: 0.8, bobHz: 0.3, blink: [1.5, 3] },
  surprised: { roam: 1, base: 1.05, bob: 1, bobHz: 0.5, squash: 0.05, blink: [4, 8] },
  sleepy: { roam: 0.3, base: 0.98, bob: 3, bobHz: 0.18, squash: 0.04, sway: 3, swayHz: 0.1, blink: [0.8, 2] },
  smug: { roam: 0.9, bob: 1, sway: 1.5, swayHz: 0.25, blink: [3, 6] },
  thinking: { roam: 0.6, bob: 1.2, bobHz: 0.25, sway: 4, swayHz: 0.35, blink: [2.5, 5] },
  sleeping: { roam: 0.05, base: 0.98, bob: 3, bobHz: 0.16, squash: 0.05, sway: 1.5, swayHz: 0.08, blink: [60, 120] },
};
for (const m of Object.keys(moods)) moods[m].motion = { ...BASE_MOTION, ...motions[m] };


// Floating overlays shown over a mood (thought bubble, snoring). Each is a list of frames; the runtime steps through them
// at `fps`, and a static render shows the `still` frame. Drawn in the full 100x100 canvas, above the avatar.
const zPath = (x, y, s) => `M${x} ${y}h${s}l-${s} ${s}h${s}`;
const zee = (x, y, s) => `<path d="${zPath(x, y, s)}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${zPath(x, y, s)}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const bubble = (lit) =>
  `<circle cx="55" cy="27" r="2" fill="#fff" stroke="#E4DDCC" stroke-width="1.2"/><circle cx="58" cy="23" r="3" fill="#fff" stroke="#E4DDCC" stroke-width="1.2"/>` +
  `<rect x="60" y="3" width="36" height="19" rx="9.5" fill="#fff" stroke="#E4DDCC" stroke-width="1.5"/>` +
  [69, 78, 87].map((x, i) => `<circle cx="${x}" cy="12.5" r="3" fill="${i < lit ? INK : '#DAD5CC'}"/>`).join('');
const overlays = {
  dots: { fps: 2.2, still: 2, frames: [bubble(1), bubble(2), bubble(3), bubble(0)] },
  zzz: { fps: 1.3, still: 2, frames: [zee(64, 24, 6), zee(64, 24, 6) + zee(73, 14, 8), zee(64, 24, 6) + zee(73, 14, 8) + zee(83, 3, 10), zee(73, 14, 8) + zee(83, 3, 10)] },
};

const styles = {
  'blob-face': { weight: 5, eyes: ['blob'], brows: true },
  'mood-mark': { weight: 3, eyes: ['mark', 'blob'], brows: false },
  'block-eyes': { weight: 2, eyes: ['blob'], brows: true, defaultBrow: 'bar', bodies: ['block'] },
  minimal: { weight: 2, eyes: ['minimal', 'mark', 'blob'], brows: false },
};

const pack = {
  version: 1,
  viewBox: 100,
  ink: INK,
  styles,
  palettes,
  bodies,
  eyes: { blob, mark, minimal },
  brows,
  identityBrows: [['none', 6], ['arch', 1], ['raised', 1]],
  mouths,
  identityMouths: [['smile', 4], ['wide', 2], ['tiny', 3], ['flat', 2], ['smirk', 2], ['cat', 1], ['grin', 1], ['fang', 1], ['tongue', 1]],
  moods,
  overlays,
  accessories,
  accColors,
  accChance,
};

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/parts.json', import.meta.url), JSON.stringify(pack, null, 1));
// The npm package bundles the same data as a module, so installs need no JSON import support.
writeFileSync(new URL('../js/src/parts.js', import.meta.url), `// GENERATED by core/tools/build-parts.mjs. Do not edit.\nexport default ${JSON.stringify(pack)};\n`);
console.log('bodies', bodies.length, 'moods', Object.keys(moods).length);
