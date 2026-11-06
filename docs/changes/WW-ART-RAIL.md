# WW-ART-RAIL: carriage and guard van, round 4

Date: 6 November 2026

## Changed

- Rebuilt `rail-trains.glb` from the Blender recipe and rendered review views by importing that GLB into an empty Blender scene.
- Thickened the carriage and guard-van underframes with photo-traced frames, central tanks and round truss rods. Kept the guard van's photographed single axle pair.
- Added the guard-van cargo floor and refined its lookout, end panels and roof edge. Adjusted the carriage roof edge and underframe details.
- Published `docs/board/looks/ww-art-rail/round-4.jpg` and its review note. The engine and drift remain accepted from the previous art review; this round works on the carriage and guard van.

## Checks

- Blender 4.5.13 rebuilt and exported the GLB, then imported it into an empty scene for the renders.
- `node tools/test-blender-output.mjs`: passed, 284 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; the current `round-4` sheet is 447,163 bytes and stays below the 500 KB cap.
- No lane tier, build, browser check or frame timing; the card says this art is not wired into the game.
- Art verdict is pending Claude's review. Round 4 improves the visible underframes; the review note calls out the remaining roof and lookout joins for a final decision.

## Changed assertions

None.

## Race fingerprints

None. This asset is not wired into a playable scene.

## Removed

- Removed the superseded carriage/van round 2 sheet and review note, and the earlier engine round 3 sheet and review note after carrying forward their verdicts and useful findings here.
- Removed temporary Blender renders, masks, the sheet-making scratch script, and the generated `.blend` file after making the review sheet.
