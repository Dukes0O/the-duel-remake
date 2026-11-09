# TOWN-ART-MACHINES-2 — round 16: pipe truck

## Result

First photo-carve round for the pipe truck. This model is for Claude's look review; this note does not decide the art verdict.

The four generated views show the same worn yellow salvage flatbed with its pipes removed. The recipe carves the body above the frame rails and splits the front and rear projections at the cab back wall. It builds the axles, fuel and air tanks, six wide dark tyres, flatbed and stakes separately. Five rusty pipes are individual cylinders with named pivots, stacked between the stakes. The work pose rolls four pipes off the bed in sequence; one remains aboard.

Mixer and crane geometry was not changed. The old block pipe-truck pieces and their unused four-view source image were removed. The rear photo split is printed by the recipe. Piece bounds and contacts are printed; each tyre meets the ground, and each other measured piece touches the body or a neighboring piece. The pipe truck is 5,600 triangles. The family GLB is 5,316,400 bytes.

## Review

The sheet compares side, front, rear, overhead, rest and work views from the exported GLB. Source and camera scales are matched. Claude should inspect the projection seams around the cab and folded loading crane, the front and rear proportions, the black frame visibility below the bed, the rust texture and separation of the four unloaded pipes.

## Checks

- Blender 4.5.13 candidate export and imported model renders completed.
- `node tools/test-blender-output.mjs`: **389 checks, 0 failed** on the final family GLB.
- No lane tier or build was run, as required for an art card.
- No browser check was run; Claude owns the look review.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the old `machines2-pipe-truck-views.jpg` image and its credit line after the recipe stopped using it.
- Removed the old block geometry for `pipe-truck`; mixer and crane geometry stayed unchanged.
