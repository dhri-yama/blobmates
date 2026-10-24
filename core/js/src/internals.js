// Pieces of the seed and string logic that other ports must reproduce exactly. They live here, apart from
// index.js, so the test-vector generator (core/tools/generate-vectors.mjs) uses the very same code.
// Not part of the public API: package.json "exports" does not expose this file.

// FNV-1a over the UTF-8 bytes of the seed, as an unsigned 32-bit integer.
export const fnv1a = (s) => {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h >>> 0;
};

// mulberry32: returns a function that yields the next unsigned 32-bit integer on each call.
export const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
};

// Number to text with at most 2 decimals and no trailing zeros. JavaScript's toFixed rounds exact ties up
// (2.625 -> "2.63"), which printf-style formatting in other languages does not.
export const num = (x) => String(+x.toFixed(2));

// Darker tint of the body color for details (plates, spots, frills). Integer math so ports match.
export const shade = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return '#' + [1, 3, 5].map((i) => Math.floor((parseInt(hex.slice(i, i + 2), 16) * 78) / 100).toString(16).padStart(2, '0')).join('');
};
