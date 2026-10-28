// Writes the pictures used in README.md to docs/images/. Run after art changes: node core/tools/make-readme-images.mjs
import { writeFileSync } from 'node:fs';
import { blobmate } from '../js/src/main.js';

const out = (name, text) => writeFileSync(new URL(`../../docs/images/${name}`, import.meta.url), text);
const BG = '#F7F3EA';
const font = 'font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"';
// A picture placed at x, y with a given size. Nested <svg> keeps each one's own viewBox.
const place = (seed, x, y, size, options = {}) =>
  blobmate(seed, { shape: 'circle', ...options, size }).replace('<svg ', `<svg x="${x}" y="${y}" `);

// Hero: a row of different names, one line of text under it.
const names = ['sagar', 'ada', 'maya', 'noor', 'kai', 'luna', 'ravi', 'zoe'];
const W = 880, H = 230, S = 96, gap = (W - names.length * S) / (names.length + 1);
out('hero.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Eight different Blobmates, each made from a name">
<rect width="${W}" height="${H}" rx="24" fill="${BG}"/>
${names.map((n, i) => place(n, Math.round(gap + i * (S + gap)), 28, S)).join('\n')}
<text x="${W / 2}" y="178" text-anchor="middle" ${font} font-size="20" font-weight="600" fill="#2B2A33">One name in, one friend out.</text>
<text x="${W / 2}" y="204" text-anchor="middle" ${font} font-size="14" fill="#6B6877">Deterministic, editable, animated. JavaScript, React and Swift.</text>
</svg>
`);

// Moods: the same name in every mood.
const moods = ['neutral', 'happy', 'joyful', 'excited', 'grateful', 'sad', 'hurt', 'angry', 'stressed', 'bored', 'confused', 'insecure', 'guilty', 'surprised', 'sleepy', 'smug', 'thinking', 'sleeping'];
const cols = 6, cell = 140, rows = Math.ceil(moods.length / cols), MW = cols * cell, MH = rows * 150 + 20;
out('moods.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}" height="${MH}" role="img" aria-label="The same Blobmate in ${moods.length} moods">
<rect width="${MW}" height="${MH}" rx="24" fill="${BG}"/>
${moods.map((m, i) => {
  const cx = (i % cols) * cell, cy = Math.floor(i / cols) * 150 + 14;
  return `${place('sagar', cx + 20, cy, 100, { mood: m })}\n<text x="${cx + 70}" y="${cy + 124}" text-anchor="middle" ${font} font-size="13" fill="#6B6877">${m}</text>`;
}).join('\n')}
</svg>
`);
console.log('wrote docs/images/hero.svg and moods.svg');
