# WW-GROUND

## Changed

- Registered `gear-find` and `titan-bowl` as dev switches in the feature-flag
  inventory check and added both to the private Preview URL. The inventory
  count increases by two; the assertion still verifies the same catalogue
  membership and each switch's dev state.
- Refreshed the generated shortcut source fingerprint after the `def.scablands`
  course branches changed generation code. All 15 preset road entries are
  byte-identical; only the recorded source hash changed
  (`dfd677c9…` to `4915b2c4…`).
- `test-course-kit` test 8 failed because its copied `test-feature-flags` guard
  had a fixed catalogue count. The two registered dev switches made that count
  stale. The Scablands remains an `ARENA_VENUES` entry only, outside `COURSE`
  and the circuit picker; no venue registration change was needed.
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
- Follow-up suites for the merged world cards: `test-feature-flags` (129
  checks), `test-preview-launcher` (23),
  `node tools/test-shortcut-presets.mjs --verify-solvers` (286 checks, 15
  solver comparisons), `test-course-kit`
  (8/8), `test-scablands-ground` (5/5), and `test-world-composition` (63
  checks): all passed.
- `node tools/test-replays.mjs`: passed; replay fingerprints unchanged.
- `npm.cmd run build`: passed. PowerShell blocked `npm run build` through its
  script shim; `npm.cmd` ran the same package build. Vite reported existing
  chunk-size and dynamic-import warnings.
- Lane tier and browser checks: Claude runs them.
- Changed assertions: none.

## Removed

No prior venue path or asset was replaced.
