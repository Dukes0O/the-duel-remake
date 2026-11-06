# CAR-ART-LONGHAUL

## Changed

- Updated `tools/blender/longhaul.py` for round 5. The cab roof is lower and supported by thick painted pillars. A full-width steel panel closes the cab front to the bumper. Glass is lighter and dusty, with the dark seat and steering wheel behind it.
- Kept the approved side shape, fuel tanks, rusted paint, dusty rubber and six wheel assemblies. The bull bar uses rounded tube lamp guards. Two round roof work lamps replace the four blocks. The recovery crane is a raised ochre-yellow A-frame with a pulley, chain and hook. Bed rails remain tubes and the toolbox is darker rust red.
- Re-exported `public/assets/models/wasteland/cars/longhaul.glb`. Blender rendered five views from the exported GLB imported into an empty scene. The model is 2,085,380 bytes; the output checker confirms it remains within the card budget.
- Added `docs/board/looks/car-art-longhaul/round-5.jpg` (223,745 bytes) and `round-5-review.md`. The sheet places the prior generated photo beside the new front three-quarter view and includes rear, side, top and person-scale views.
- Existing runtime textures and their prompts and credits are unchanged.

## Checks

- `tools/test-blender-output.mjs`: passed, 232 checks.
- `tools/test-repo-hygiene.mjs`: passed; placement is valid and reported size targets are advisory.
- No lane tier or build was run, as directed for this art card.
- Browser and in-game look checks were not run in this lane. Claude should inspect the cab-to-bumper closure, seat and steering wheel behind the glass, round lamp guards, yellow A-frame with hanging hook and chain, tubular bed rails, and the ground horizon seam in the round-5 sheet. The side profile, wheels, paint and tanks passed in round 4.
- Changed assertions: none. Race fingerprints: unchanged; no simulation or race code changed.

## Removed

- Removed the superseded `round-3.jpg` and `round-3-review.md`.
- Replaced the four roof marker blocks and low brown recovery frame. Temporary Blender renders and logs will be removed before commit.
