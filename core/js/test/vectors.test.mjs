// Replays core/spec/vectors.json against the JS library. If this fails, either the library changed what it draws
// (regenerate the vectors on purpose, and read the diff) or something broke by accident.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { blobmate, parts } from '../src/main.js';
import { fnv1a, mulberry32, num } from '../src/internals.js';

const V = JSON.parse(readFileSync(new URL('../../spec/vectors.json', import.meta.url), 'utf8'));
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

test('vectors were generated from the current parts data', () => {
  const current = sha256(readFileSync(new URL('../../assets/parts.json', import.meta.url)));
  assert.equal(V.parts.sha256, current, 'parts.json changed: run node core/tools/generate-vectors.mjs');
});

test('number formatting', () => {
  for (const [x, expected] of V.formatting.num) assert.equal(num(x), expected, `num(${x})`);
  for (const [x, expected] of V.formatting.shortest) assert.equal(String(x), expected, `String(${x})`);
});

test('seed hash and random numbers', () => {
  for (const { seed, fnv1a: h, draws } of V.prng) {
    assert.equal(fnv1a(seed), h, `fnv1a(${JSON.stringify(seed)})`);
    const next = mulberry32(h);
    assert.deepEqual(draws.map(() => next()), draws, `draws for ${JSON.stringify(seed)}`);
  }
});

test(`all ${V.cases.length} picture cases`, () => {
  assert.ok(V.cases.length > 400);
  for (const c of V.cases) {
    const svg = blobmate(c.seed, c.options);
    assert.equal(sha256(svg), c.sha256, `${c.group}/${c.id}`);
    assert.equal(svg.length, c.length, `${c.group}/${c.id} length`);
    const r = blobmate.resolve(c.seed, c.options);
    assert.equal(r.body.id, c.resolved.body, `${c.id} body`);
    assert.equal(r.style, c.resolved.style, `${c.id} style`);
    assert.equal(r.color, c.resolved.color, `${c.id} color`);
    assert.equal(r.mouth, c.resolved.mouth, `${c.id} mouth`);
    assert.equal(r.eyeScale, c.resolved.eyeScale, `${c.id} eyeScale`);
    if (c.svg) assert.equal(svg, c.svg, `${c.id} full svg`);
  }
});

test('the parts data used by the library is the one the vectors describe', () => {
  assert.equal(parts.version, V.parts.version);
});
