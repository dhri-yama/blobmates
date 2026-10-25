# core/spec: the contract every port follows

Blobmates exists in more than one language (JS and Swift now; Kotlin planned). For the same name they must draw the
**same picture**, byte for byte. This folder is how that is kept true.

| File | What it is |
|---|---|
| `ALGORITHM.md` | The exact steps from name and options to an SVG string: hashing, random numbers, draw order, picture assembly, number formatting. |
| `MOTION.md` | How live avatars move over time: formulas, constants, blinking, roaming, tap reaction. Behavior to match, not bytes. |
| `render-grids.json` | **Fixed data.** Drawing fingerprints (a coarse grid of colors per picture) measured in Chrome. A native renderer must stay close to them. |
| `motion-traces.json` | **Generated** by `core/tools/generate-motion-traces.mjs` from the real JS runtime with a fake clock: 13 scenarios of 300 frames. A port replays them and must match. |
| `vectors.json` | **Generated.** About 480 pictures (name + options → SHA-256 of the SVG) plus checks for the hash, the random numbers and number formatting. |

## How a port uses the vectors

For every entry in `cases`: build the picture from `seed` and `options`, take the SHA-256 of its UTF-8 text, and compare it
with `sha256`. The first few cases also carry the full `svg` so a mismatch can be diffed. `resolved` shows what the seed chose
(body, color, mouth, ...), which helps find where a port went wrong. If every case matches, the port is correct. If they don't,
check in this order: `prng` (hash and random numbers), `formatting` (numbers), then the `resolved` fields, then the text.

The JS library replays the same file in `core/js/test/vectors.test.mjs`. The Swift package replays everything in this folder with `swift run BlobmatesCheck` (it is a program, not XCTest, so it runs with only the Command Line Tools).

## When the vectors change

```bash
node core/tools/generate-vectors.mjs
```

Regenerating is deliberate. If the diff shows pictures changing, that is what users would see after upgrading, so read it,
bump the parts version if picks changed (see `CLAUDE.md`), and update every port. The vectors record the hash of
`core/assets/parts.json`, so a test fails if the data changed without regenerating.

## Rules for changing the library

- Keep the draw order. New draws go at the end.
- Keep number formatting and the placeholder replacement order exactly as written, or the text (and every hash) changes.
- Anything a port must know goes in these files, not only in the JS code.
