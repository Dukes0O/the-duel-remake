# WW-GROUND

## Changed

- Centered the Scablands oval frame at world origin and used the Salt Flats
  normal projection for nearest-point queries. Other courses keep their old
  frame and projection.
- Fighters now use the full 1.4 km by 1.0 km Scablands bounds; other arenas
  keep their current limits. The venue frame bounds sit past the map so the
  ridge remains the driving limit.
- Widened the road surface band to 36 m so an ordinary car can stay on the
  route at speed between all eight places.
- Settled the vehicle and fighter map bounds on the card before these code
  changes.

## Checks

- `node tools/test-scablands-ground.mjs`: passed, 5 tests.
- `node tools/test-world-composition.mjs`: passed.
- `node tools/test-replays.mjs`: passed; replay fingerprints unchanged.
- `npm.cmd run build`: passed. PowerShell blocked `npm run build` through its
  script shim; `npm.cmd` ran the same package build. Vite reported existing
  chunk-size and dynamic-import warnings.
- Lane tier and browser checks: Claude runs them.
- Changed assertions: none.

## Removed

No prior venue path or asset was replaced.
