# Changelog

All notable changes to `blobmates`. Versions follow [semver](https://semver.org). See "Versioning" in `CLAUDE.md` for what counts as a patch, minor or major change.

## 0.2.0 - 2026-10-28

- Swift package (macOS 13+, iOS 16+): `Blobmates.svg`, `BlobmateView`, `LiveBlobmateView`, PNG, `NSImage` and `UIImage` output, with its own Core Graphics renderer and the same motion as the web runtime.
- Shared contract in `core/spec`: stored test vectors that the JS and Swift code both pass.
- No change to what any name picks. Parts data version stays 1. The JS package itself only changed internally (hash and number helpers moved to `internals.js`).

## 0.1.0 - 2026-10-23

First release.

- `blobmate(seed, options)` returns a deterministic SVG. 81 shapes, 4 styles, optional accessories, 18 moods.
- Every part can be pinned (`body`, `color`, `mouth`, `top`, `eyes`, ...); the name decides the rest.
- `blobmates/runtime`: blinking, pointer-following eyes, mood-driven movement, roaming, tap reactions.
- `blobmates/react`: `Blobmate` and `LiveBlobmate`.
- TypeScript types for all entries.
- Parts data version: 1.
