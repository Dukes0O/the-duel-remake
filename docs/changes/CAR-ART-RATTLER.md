# CAR-ART-RATTLER

## Design

Built an original chopped pickup hot rod in metres, with +Y up and +Z forward. The cab is short and open, with a visible engine, short side exhausts, larger rear tyres, a welded roll hoop, bare steel and small repair plates. Wheel centers sit at the ground plane and retain a conventional two axle layout for later handling work. The GLB is 310,260 bytes and the recipe reports 2,996 triangles, inside the card limits.

## Checks and review

- Blender 4.5.13 rendered five views for round 1; the final comparison sheet is 59,506 bytes. Raw renders are in ignored `.evidence/2026-11-05/CAR-ART-RATTLER/round-1/` for this review only.
- `node tools/test-blender-output.mjs`: passed, 232 checks, 0 failed.
- Browser check: Claude to judge the round 1 sheet; this card does not require a browser run. Claude should inspect the chopped cab, engine read, rear tyre size, hoop fit and person scale. The scale figure is partly obscured in the angled view.
- Race fingerprints: not applicable; no race code or handling changed.
- Changed assertions: none.

## Removed

- No prior Rattler model, recipe or test entry existed to remove. The generated editable `.blend` source was used to make this GLB and is not retained; the Blender recipe remains the rebuild source.
