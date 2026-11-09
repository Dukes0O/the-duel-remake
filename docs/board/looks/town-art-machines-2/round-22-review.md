# TOWN-ART-MACHINES-2 — round 22: roller

## Result

Third roller round of six. Replaced the four carve references with views of one bare worn-yellow body; the drum, yoke arms, canopy and all four posts are absent from every source view. The recipe no longer cuts across the body. The canopy, posts, yoke arms and drum remain separate built pieces. The body bounds are 4.52 × 2.12 × 1.72 m. Its longitudinal bounds contain the rear axle at z -0.453 m, and its base at y 0.54 m is close above the 0.65 m tyre radius. The canopy top is 2.905 m; the drum reaches the ground at y 0.00 m. Roller count: 1,492 triangles.

The model remains **not a pass**. The rendered comparisons show the body carve as detached image fragments; the side, end and top views do not read as one complete roller. The separate canopy and drum also appear apart from the body in the three-quarter views. Claude should inspect the source scale and photo projection against the rendered sheet and choose the next repair. The mixer truck, crane truck and pipe truck geometry is unchanged by recipe edits.

## Checks

- Blender 4.5.13 exported the family (5,858,400 bytes) and rendered the roller side, front, rear, overhead, rest and work views from the exported GLB.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed**. This check confirms every machine remains under 15,000 triangles and the family under 8 MB.
- No lane tier, build, browser scenario or look test was run. Claude should inspect body continuity, projection seams, the body/rear-axle placement, drum/yoke contact, canopy/post attachment and the three unchanged trucks.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Replaced the four round 20/21 roller body photos and their credit entry. Kept the separate round 20 drum photo.
- Removed the round 21 cuts that crossed the body; only empty image margins are excluded now.
