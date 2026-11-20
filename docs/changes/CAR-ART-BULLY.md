# CAR-ART-BULLY

- **What:** the Bully's model, `public/assets/models/wasteland/cars/bully.glb`: a short school bus cut down and
  armoured, mesh over the windows, a plough with a painted grin, a stop paddle. Model only: no game code, no switch,
  no sound cue (no game event is added).
- **How:** `tools/blender/bully.py` carves the body from four generated dead-on pictures and builds wheels, plough,
  push arms, headlamps and paddle as their own pieces. Eight pictures in `cars/textures/`, credited there.
- **Contract:** root `bully`, +Z forward, metres, origin at the middle of the whole length; four wheel nodes on their
  hubs; eight `vehicle-socket-*` nodes by `src/vehicle-sockets.js`; sizes in the root's extras. 21,036 triangles,
  3.74 MB (limits 25,000 and 8 MB).
- **Look:** round 7, `docs/board/looks/car-art-bully/round-7.jpg` and its review. Claude's verdict: passes on paper.
  **Not loaded in the game** (the card forbids Chrome); CAR-DRIVE-WASTE loads it and its look is judged there.
- **Checks:** `test-repo-hygiene`, `test-review-evidence`, `test-board` and `test-blender-output` (one new entry,
  `bully`); results in the commit message. No lane tier or build: nothing a suite imports or the game loads changed.
  No changed assertions, no race fingerprints.
- **Lessons:** seven in `docs/ART_LINE.md` under Vehicles, two under Sheets.
- **Removed:** nothing here. Codex's box-built rounds 1 to 6 of 5 November are only on the unmerged branch
  `codex/car-art-bully`, which this replaces; delete that branch when this merges.
