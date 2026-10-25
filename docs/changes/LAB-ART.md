# LAB-ART: the Lab hangar and its benches

Switch `lab` (dev); nothing here is wired into the game yet (LAB-VIEW places and
animates these models). Built by the local Sonnet session on `claude/lab-art`;
Claude judged each look round (two of three used).

## Design questions settled in writing, before code

1. **How the models are made.** Not Blender, and not `tools/blender/lab.py` as the
   card named it. One seeded Node recipe, `tools/art/lab-props.mjs` (rooms and
   benches in `lab-hangar.mjs`, `lab-dressing.mjs`, `lab-benches.mjs`,
   `lab-benches2.mjs`, `lab-benches3.mjs`; a small kit in `lab-kit.mjs` and
   `lab-common.mjs`), writes GLBs with vertex colours (no textures) that rebuild byte
   for byte. Blender is used only to render the look sheets. Same choice as the
   Sirena, accepted by Claude there; it keeps the sources small and the output
   exact.
2. **One model per bench, with movable parts.** Each model is a glTF group with one
   mesh per part; a part's node sits at its pivot, so LAB-VIEW can spin the fan or
   rotor, swing a cord or the plumb bob, tip the lid, slide the carriage, move the
   ram, turn the arm and hide `reverse-switch` until the secret opens. The manifest
   lists every part and pivot, and where each bench stands in the hangar
   (`layout`, `sweepRadius` for the turning arm).
3. **Reuse.** Kestrel One, the cars and tyres, the fire and smoke effects and the
   Deep's crust are the game's own models and effects: the weighing pad, turning-arm
   cradle and tunnel belt are empty stages for them, and LAB-VIEW puts them in.
   Nothing is copied.
4. **Size and orientation.** Metres, Y up, each model's origin on the floor, +Z
   facing the player; the hangar is 30 x 18 m with its door on +Z. Budget about 6 MB.

## What was built

- `public/assets/models/lab/`: `hangar.glb` and thirteen bench models
  (`weighing-pad`, `weights-and-cans`, `drop-tower`, `fire-pit`, `pendulum-frame`,
  `rotor-stand`, `bending-rig`, `nail-jars`, `turning-arm`, `map-table`,
  `snow-trays`, `wind-tunnel`, `launcher-ramp`) and `manifest.json`: 4,579,740 bytes
  together.
- The recipe and kit files above; review tools `tools/blender/lab-review.py` and
  `tools/art/lab-sheet.py`; credits note in `public/assets/models/CREDITS.md`.
- `tools/test-lab-art.mjs` (329 checks): committed bytes match the manifest, one
  model per file with the movable parts the benches need at their pivots, real
  sizes, no bench overlaps another or leaves the hangar (the turning arm by its
  swept circle), and the whole set rebuilds byte for byte.
- `tools/test-blender-output.mjs`: one added entry for `lab-review.py`
  (placement only; no assertion weakened).
- Look rounds: `docs/board/looks/lab/round-2.jpg` with `round-2-review.md`
  (accepted by Claude, round 2 of 3); round 1's sheet was removed when round 2 was
  committed.

## Tests and gates

After merging current `integration/wasteland` (clean, no conflicts), once, from PowerShell:

- `node tools/test-lab-art.mjs`: 329 checks pass (14 models, 4,579,740 bytes; rebuilt
  byte for byte).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 35 passed,
  0 failed, 0 not run. `npm run build` passes.
- Look: accepted by Claude, round 2 of 3. No frame check (rule 9), no sound, no locks.

## Removed

Nothing replaced and nothing removed: every file is new. Scratch renders live under
`.evidence/` (ignored) and are deleted after the verdicts.
