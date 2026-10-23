# CLAUDE.md

Guidance for working in this repo. For what the project is, see `README.md`. For visual rules, see `DESIGN.md`.

## What this is

Polypals: deterministic blob avatars. `avatar(seed, options)` returns an SVG string; `animate(host, avatar, options)` makes one alive in the browser. A React site in `web/` (landing, editor, docs) shows it off.

## Commands

```bash
node tools/build-parts.mjs     # regenerate assets/parts.json (run after ANY art or mood change)
cd web && npm install
cd web && npm run dev          # dev server
cd web && npm run build        # static site in web/dist
node tools/serve.mjs           # serves the repo root on :5173 (PORT=... to change); the built site is at /web/dist/index.html
```

There are no automated tests yet. Verify changes by rebuilding and looking at the page.

## Layout

- `assets/parts.json` is GENERATED. Never edit it by hand. All art and mood data lives in `tools/build-parts.mjs`.
- `packages/js/src/index.js` is the core (seed to SVG). It must stay free of DOM and browser APIs so it can run on a server and be ported.
- `packages/js/src/runtime.js` is browser-only (motion, blink, gaze, roam, tap reaction).
- `web/src/` is the React app. It imports the library and `parts.json` with relative paths from outside `web/`, so build it from this repo, not from a copy of `web/`.
- `preview/` is the old plain-HTML pages. Superseded by `web/`.

## Rules that are easy to break

- **Seed draw order is a contract.** In `resolve()` (`index.js`) every random draw happens in a fixed order, even for unused values. Add new draws at the END, never in the middle, or every existing avatar changes. Adding or removing bodies, mouths or accessories also changes what some seeds pick, so treat a released parts set as a version.
- **Integer math only in seed logic** (`Math.imul`, `>>>`, `%` on integers). No floats or locale-dependent formatting in anything that decides a choice, because Kotlin and Swift ports must match exactly.
- **Placeholders in art fragments:** `{{body}}` (fur color), `{{acc}}` (accessory color), `{{shade}}` (darker body color), `{{lid}}` (eyelid color). They are replaced once at the end of `avatar()`.
- **Coordinate system:** everything is drawn on a 100x100 viewBox. The face has its own frame: eyes at y=46, x=36 and x=64, mouth around y=66 to 75. Bodies position the face with `fx`, `fy`, `fs`. Bodies can have a `back` layer (behind the body) and `front` layer (over the body, under the face). The whole avatar is scaled to 0.88 inside the viewBox so shapes fit a circular crop.
- **Anatomy hooks:** parts carry `data-part="..."` (`eyes`, `pupil-l`, `pupil-r`, `mouth`, `overlay`, ...). The runtime relies on them. Do not remove or rename them.
- **Motion is data.** Per-mood motion numbers (bounce, tilt, tremble, roam speed, blink interval) live under `moods.<name>.motion` in `parts.json`. Change the numbers in `build-parts.mjs`, not the runtime. Mood overlays (thought bubble, snoring) are frame lists in `overlays`.
- **The runtime re-renders the SVG string** when gaze, blink or an overlay frame changes. Keep per-frame work cheap, and quantize anything that would otherwise change every frame.

## Web app notes

- Routing is a tiny hash router (`router.js`), so any static host works. Add pages in `web/src/pages/` and register them in `App.jsx`.
- Code samples in the editor and docs come from `web/src/snippets.js`. Update it when the public API changes, and update the Docs page (`pages/Docs.jsx`) in the same change. Only the JavaScript, React and HTML samples are known to run; Vue, Svelte and Angular are untested.
- The package is not published, so every sample imports local paths like `./polypals/index.js`.
- Editor controls use "pins": an unpinned axis follows the seed. Keep that behavior when adding controls (a pin is an option key, `undefined` means auto).

## Gotchas learned the hard way

- After editing `styles.css` with scripted find-and-replace, check that braces are balanced. A stray `@media(...){` once swallowed every rule after it and left the site unstyled on wide screens only.
- The preview pane here is narrow (around 540 CSS px). Layouts that switch at 560px, 760px or 1100px need an emulated viewport to check.
- Rebuild `web/dist` (`npm run build`) after changing the app, or the preview server shows the old version.

## Conventions

- Plain ES modules, no TypeScript, no build step for the library.
- Match the surrounding style: short comments that explain why, not what.
- Do not publish, push or deploy without being asked. The GitHub repo is public.

## Known gaps

No tests or stored seed outputs, no Kotlin or Swift ports, no npm package, no React component package, no license chosen. The `togepi` shape is inspired by a Nintendo/Pokémon character, so flag it if the project is ever distributed commercially.
