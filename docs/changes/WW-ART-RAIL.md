# WW-ART-RAIL

## Changed

- Added the round 1 Blender recipe for the 2:15 works passenger engine and its
  removable salt drift. The recipe samples the generated side photo for a
  64-bin silhouette trace, builds the engine at about 11 m by 2.9 m by 4 m,
  projects side/front/rear photos, and exports with `town_base.export_glb`.
- Added side, front, rear and salt JPG sources with credits, and the review
  sheet at `docs/board/looks/ww-art-rail/round-1.jpg`.
- The GLB has separate `the-2-15-engine` and `the-2-15-drift` nodes. It contains
  13,996 triangles and is 1,296,880 bytes. The model is below the 30,000
  triangle and 2 MB limits. Every primitive exports only `TEXCOORD_0`, with
  a range of UV values; material metallic factors are at or below 0.3.

## Checks

- Blender 4.5 export and fresh-empty-scene GLB import renders: passed.
- `node tools/test-blender-output.mjs`: passed, 275 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Reported repository size targets
  are advisory and do not fail this check.
- Lane tier, build, browser and in-game look checks: not run. This is an art
  card; Claude owns browser and look review.
- Replay fingerprints: none. No race code or race rules changed.

## Assertions

- Added a card-specific candidate check for the named engine/drift nodes,
  triangle and file budgets, `TEXCOORD_0` ranges and metallic factors. No
  existing assertion was changed or weakened.

## Review status

Round 1 is **not ready to approve**. The side render is recognizable, but the
fresh GLB renders show visible projection seams and flat patches, especially
from the three-quarter camera. The model does not yet meet the card's look
acceptance. Claude should review the sheet and choose the next modelling fix.
No other card props were built.

## Removed

- Reverted the alpha-cutout material experiment and the inner side-photo plane
  after their fresh GLB renders looked worse. They are not in the final model.
- Removed the generated `.blend`, trial renders and check logs before handoff;
  only the card's recipe, runtime GLB, JPG sources, sheet and notes remain.
