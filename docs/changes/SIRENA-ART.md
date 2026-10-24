# SIRENA-ART: the Falcone Sirena, wreck, parts, lift bag and abalone

Switch `the-deep` (dev); nothing here is registered in the roster or the game
yet (SIRENA-CAR adds `falcone_sirena` to the config, DEEP-SIRENA-VIEW draws the
wreck and parts). Built by the local Sonnet session on `claude/sirena-art`,
Claude judges each look round (at most three).

## Design questions settled in writing, before code

1. **Where the car lives.** `src/sirena-vehicle.js`, a new file beside the
   classic cars that imports the same helper set (`originalVehicleParts`), as
   the Enzo, F1 and Bolide do. Not added to `classic-vehicles.js`: a key in
   `CLASSIC_VEHICLE_DIMENSIONS` would route the Sirena through the classic path
   and enter every test that pins the two classics. The router entry comes
   with SIRENA-CAR, which owns the config.
2. **How the underwater models are made.** Not Blender. One seeded Node recipe,
   `tools/art/sirena-props.mjs`, cuts the wreck, bonnet and door from the car's
   own body surface (`sirenaBodyGeometry()`), so they really are the same car
   after sixty years, and writes eight single-mesh vertex-coloured GLBs with a
   manifest. It rebuilds byte for byte (the test proves it). Blender is used only
   to render the look sheets (`tools/blender/car-review.py` for the car, the new
   `tools/blender/sirena-review.py` for models of any size).
3. **What "restored" and "wreck" show.** Restored: red, white nose stripe,
   covered headlamps, white roundel with a black 7 on each door, wire wheels,
   cut-off tail, side-exit pipes. Wreck: doors, bonnet, glass, steering wheel and
   the left front wheel gone (each is one of the five loose parts), rust holes,
   algae, barnacles, weed, sunk to the hubs in sand.
4. **Orientation and size.** +Z forward on the car and the wreck; loose parts
   rest with their lowest point at y = 0 (the door and wheel lie flat); real
   sizes in metres; the wreck's sand surface is y = 0.

## What was built

- `src/sirena-vehicle.js`: `createSirenaVehicle`, 1.96 x 4.45 x 1.06 m, 42,300
  triangles and 49 draws (budget 73,600 and 66), the standard contract (driver,
  steering, four wheels, front axle steers, brake lights, two boost flames,
  paint, directional damage and glass cracks, crush, exact reset).
- `public/assets/models/sirena/`: `wreck`, `badge`, `steering-wheel`, `wheel`,
  `bonnet`, `door`, `lift-bag`, `abalone` (`.glb`) and `manifest.json`;
  884,776 bytes together (limit 1.5 MB).
- `tools/art/sirena-props.mjs`, `tools/art/sirena-sheet.py`,
  `tools/blender/sirena-review.py`; credits note in
  `public/assets/models/CREDITS.md`.
- `tools/test-sirena-vehicle.mjs` (502 checks): the contract and shape, size
  budget, tire grounding, damage, crush and reset, tumbling, and the eight models
  (manifest bytes, one mesh each, real sizes, rebuild byte for byte).
- `tools/test-blender-output.mjs`: one added entry for `sirena-review.py`
  (placement only; no assertion weakened).
- Look rounds: `docs/board/looks/sirena/round-<n>.jpg` with review notes.

## Tests and gates

- Look: accepted by Claude, round 2 of 3 (`docs/board/looks/sirena/round-2.jpg`
  and `round-2-review.md`); round 1's sheet was removed when round 2 was committed.
- `node tools/test-sirena-vehicle.mjs`: 502 checks pass (car 42,300 triangles and
  49 draws; eight models 884,776 bytes, rebuilt byte for byte).
- Lane tier from PowerShell (`node tools/run-tests.mjs --tier lane --changed
  --jobs 4 --keep-going`): 39 passed, 0 failed, 0 not run. `npm run build` passes.
- No frame check (rule 9), no sound, no locks. Nothing is registered in the game:
  SIRENA-CAR adds the `falcone_sirena` config and router entry, DEEP-SIRENA-VIEW
  draws the wreck and parts and does the in-game look.

## Removed

Nothing replaced and nothing removed: all files are new. Scratch renders live
under `.evidence/` (ignored) and are deleted after the verdicts.
