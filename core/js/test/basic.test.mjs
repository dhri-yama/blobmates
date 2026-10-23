import test from 'node:test';
import assert from 'node:assert/strict';
import { blobmate, makeBlobmate, parts, moods, bodies, accessories } from '../src/main.js';

test('same seed and options give the identical SVG', () => {
  assert.equal(blobmate('sagar', { mood: 'happy' }), blobmate('sagar', { mood: 'happy' }));
});

test('different seeds give different avatars', () => {
  const seeds = ['a', 'b', 'c', 'sagar', 'blobmate', 'alain00'];
  assert.equal(new Set(seeds.map((s) => blobmate(s))).size, seeds.length);
});

test('every body renders in every mood with no leftover placeholders', () => {
  for (const body of bodies) {
    for (const mood of moods) {
      const svg = blobmate('x', { body, mood, style: body === 'block' ? 'block-eyes' : 'blob-face' });
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${body}/${mood}`);
      assert.ok(!svg.includes('{{'), `placeholder left in ${body}/${mood}`);
    }
  }
});

test('every accessory renders', () => {
  for (const [slot, ids] of Object.entries(accessories)) {
    for (const id of ids) assert.ok(!blobmate('x', { body: 'circle', [slot]: id }).includes('{{'), `${slot}/${id}`);
  }
});

test('pins win over the seed, and "none" removes an accessory', () => {
  assert.equal(blobmate.resolve('sagar', { body: 'cloud' }).body.id, 'cloud');
  assert.equal(blobmate.resolve('sagar', { color: 'pink' }).color, '#F4A3C9');
  for (const s of ['a', 'b', 'c', 'd', 'e', 'f']) assert.equal(blobmate.resolve(s, { top: 'none' }).acc.top, null);
});

test('thinking and sleeping draw an overlay, others do not', () => {
  assert.ok(blobmate('x', { mood: 'thinking' }).includes('data-part="overlay"'));
  assert.ok(blobmate('x', { mood: 'sleeping' }).includes('data-part="overlay"'));
  assert.ok(!blobmate('x', { mood: 'happy' }).includes('data-part="overlay"'));
});

test('gaze and blink change the drawing', () => {
  assert.notEqual(blobmate('x', { gaze: [1, 0] }), blobmate('x', { gaze: [-1, 0] }));
  assert.notEqual(blobmate('x', { blink: 1 }), blobmate('x'));
});

test('makeBlobmate works with the bundled parts', () => {
  assert.equal(makeBlobmate(parts)('sagar'), blobmate('sagar'));
});

test('the runtime can be imported on a server (no DOM needed at import)', async () => {
  const rt = await import('../src/runtime.js');
  assert.equal(typeof rt.animate, 'function');
});

test('bundled parts match the shared parts.json', async () => {
  const { readFileSync } = await import('node:fs');
  const json = JSON.parse(readFileSync(new URL('../../assets/parts.json', import.meta.url), 'utf8'));
  assert.deepEqual(parts, json);
});
