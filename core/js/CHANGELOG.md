# Changelog

All notable changes to `blobmates`. Versions follow [semver](https://semver.org). See "Versioning" in `CLAUDE.md` for what counts as a patch, minor or major change.

## 0.1.0 - 2026-10-23

First release.

- `blobmate(seed, options)` returns a deterministic SVG. 81 shapes, 4 styles, optional accessories, 18 moods.
- Every part can be pinned (`body`, `color`, `mouth`, `top`, `eyes`, ...); the name decides the rest.
- `blobmates/runtime`: blinking, pointer-following eyes, mood-driven movement, roaming, tap reactions.
- `blobmates/react`: `Blobmate` and `LiveBlobmate`.
- TypeScript types for all entries.
- Parts data version: 1.
