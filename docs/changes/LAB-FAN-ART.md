# LAB-FAN-ART: the McMurtry Speirling and the Project Fan blueprint

Switch `lab` (dev); nothing here is registered in the roster or the game yet
(LAB-FAN adds `mcmurtry_speirling` to the config and the router, LAB-FAN-VIEW places
the blueprint and the REVERSE switch). Built by the local Sonnet session on
`claude/lab-fan-art`; Claude judged each look round (three of three used).

## Design questions settled in writing, before code

1. **How the car is made.** Code-built, like the Bolide: `src/speirling-vehicle.js`
   (`createSpeirlingVehicle`, key `mcmurtry_speirling`) with the shared car helpers and
   the standard vehicle contract (driver, steering, four wheels, front axle steers,
   brake lights, two boost flames, paint, directional damage and glass cracks, crush,
   exact reset). Not `tools/blender/speirling.py` as the card named it: the contract
   needs the in-code builder, as for every earned car. The maker's name lives in the
   config, as for the other real cars; the model carries no badge or logo.
2. **The fans.** Hidden inside the tail, but two nodes of their own
   (`userData.fans`) so a viewer can spin them; each round exit also gets a nitro plume.
3. **The blueprint.** One small model, `tools/art/speirling-blueprint.mjs`: a
   curling 1.2 x 0.85 m blueprint on four pins with the Chaparral 2J (1970), the
   Brabham BT46B (1978) and the Speirling (2022) as line drawings and the
   Speirling in side and plan view with the air's path. Hung from its top edge.
4. **Likeness.** This session could not open photographs (the browser tool was
   unavailable), so the shape follows Claude's round 1 description: a closed teardrop
   coupe, a jet-fighter canopy, two round exits on a cut-off tail, a black floor skirt,
   black wheels with fenders over their top halves, matte charcoal with a thin green line.

## What was built

- `src/speirling-vehicle.js`: 1.48 x 3.36 x 1.21 m, 49,326 triangles and 57 draws
  (cap 50,000 triangles; Jesko's 73,600 / 66 for the other cars).
- `public/assets/models/speirling/project-fan.glb` and `manifest.json` (361 KB).
- `tools/art/speirling-blueprint.mjs`, `tools/art/speirling-sheet.py`;
  `tools/blender/lab-review.py` gained a `wall` view; credits note in
  `public/assets/models/CREDITS.md`.
- `tools/test-speirling-vehicle.mjs` (434 checks): the contract and shape (about 3.2 m
  long, 1.5 m wide, 1.2 m tall; roof peak over the driver; low nose; glass over the
  cockpit and not behind it; fenders over the wheels; two dark round exits on the tail
  face; skirt near the road), size budget, tire grounding, damage, crush and reset,
  tumbling, and the blueprint's bytes, size and byte-for-byte rebuild.
- Look rounds: `docs/board/looks/speirling/round-3.jpg` with `round-3-review.md`
  (earlier sheets removed as each round was committed).

## Tests and gates

PLACEHOLDER

## Removed

Nothing replaced and nothing removed: every file is new except the added `wall` view
in `tools/blender/lab-review.py`. Scratch renders live under `.evidence/` (ignored) and
are deleted after the verdict.
