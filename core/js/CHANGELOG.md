# Changelog

All notable changes to `polypals`. Versions follow [semver](https://semver.org). See "Versioning" in `CLAUDE.md` for what counts as a patch, minor or major change.

## 0.1.0 (unreleased)

First release.

- `polypal(seed, options)` returns a deterministic SVG. 81 shapes, 4 styles, optional accessories, 18 moods.
- Every part can be pinned (`body`, `color`, `mouth`, `top`, `eyes`, ...); the name decides the rest.
- `polypals/runtime`: blinking, pointer-following eyes, mood-driven movement, roaming, tap reactions.
- `polypals/react`: `Polypal` and `LivePolypal`.
- TypeScript types for all entries.
- Parts data version: 1.
