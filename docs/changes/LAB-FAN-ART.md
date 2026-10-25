# LAB-FAN-ART: the McMurtry Speirling and the Project Fan blueprint

Switch `lab` (dev); nothing here is registered in the roster or the game yet
(LAB-FAN adds `mcmurtry_speirling` to the config and the router, LAB-FAN-VIEW places
the blueprint and the REVERSE switch). Built by the local Sonnet session on
`claude/lab-fan-art`; Claude judged each look round (four rounds: Kyle lifted the three-round cap for the last one).

## Design questions settled in writing, before code

1. **How the car is made.** Code-built, like the Bolide: `src/speirling-vehicle.js`
   (`createSpeirlingVehicle`, key `mcmurtry_speirling`) with the shared car helpers and
   the standard vehicle contract (driver, steering, four wheels, front axle steers,
   brake lights, two boost flames, paint, directional damage and glass cracks, crush,
   exact reset). Not `tools/blender/speirling.py` as the card named it: the contract
   needs the in-code builder, as for every earned car. The maker's name lives in the
   config, as for the other real cars; the model carries no badge or logo.
2. **The fans.** Hidden behind the two rear mesh grilles, as two nodes of their own
   (`userData.fans`) so a viewer can spin them; each grille also gets a nitro plume.
3. **The blueprint.** One small model, `tools/art/speirling-blueprint.mjs`: a
   curling 1.2 x 0.85 m blueprint on four pins with the Chaparral 2J (1970), the
   Brabham BT46B (1978) and the Speirling (2022) as line drawings and the
   Speirling in side and plan view with the air's path. Hung from its top edge.
4. **Likeness.** This session could not open photographs (its browser tool failed the
   policy check every time). Round 1 followed a written description and was wrong; for
   the last round Kyle supplied a dozen real photographs to Claude, who described them,
   and the car was rebuilt to that description: a very low, wide car like a small Le Mans
   prototype, a narrow central bubble canopy, tall separate front fenders, a wide flat
   black bat-wing nose, big rear haunches with intakes, a tall central spine between two rear
   mesh grilles, red ring lights on the haunches, a large wing on swan-neck mounts, dark multi-spoke slicks, metallic
   blue-grey over a black lower body.

## What was built

- `src/speirling-vehicle.js`: 1.64 x 3.47 x 1.24 m, 49,099 triangles and 57 draws
  (cap 50,000 triangles; Jesko's 73,600 / 66 for the other cars).
- `public/assets/models/speirling/project-fan.glb` and `manifest.json` (361 KB).
- `tools/art/speirling-blueprint.mjs`, `tools/art/speirling-sheet.py`;
  `tools/blender/lab-review.py` gained a `wall` view; credits note in
  `public/assets/models/CREDITS.md`.
- `tools/test-speirling-vehicle.mjs` (434 checks): the contract and shape (about 3.4 m
  long, 1.6 m wide, a metre to the canopy; a narrow central bubble inside the tub; tall
  front fenders higher than the nose; haunches over the rear wheels; a wing well above
  the tail; two black mesh grilles either side of a tall central spine; skirt near the road), size budget, tire grounding, damage, crush and reset,
  tumbling, and the blueprint's bytes, size and byte-for-byte rebuild.
- Look rounds: `docs/board/looks/speirling/round-4.jpg` with `round-4-review.md`
  (earlier sheets removed as each round was committed).

## Tests and gates

After merging current `integration/wasteland` (nothing new to merge at the end), once,
from PowerShell:

- `node tools/test-speirling-vehicle.mjs`: 437 checks pass (49,099 triangles / 57 draws;
  the blueprint rebuilds byte for byte).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 41 passed, 0
  failed, 0 not run. `npm run build` passes.
- Look: round 4 (final; Kyle lifted the three-round cap for it) built to the photographs
  Kyle sent to Claude, rear corrected from the rear-view photos. No frame check (rule 9),
  no sound, no locks.

## Removed

Nothing replaced and nothing removed: every file is new except the added `wall` view
in `tools/blender/lab-review.py`. Scratch renders live under `.evidence/` (ignored) and
are deleted after the verdict.
