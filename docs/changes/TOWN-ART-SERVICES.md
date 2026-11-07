# TOWN-ART-SERVICES change note

## What changed

Rebuilt the motor pool as a long open-front service shed across its 4×2 plot. The carve keeps the long back wall and the two closed ends; the -Z road face stays open. The roof uses two thin pitched planes with the straight-down patched-tin photo and a ridge. Timber posts and braces frame four bays. Concrete floor sections surround the recessed inspection pit, with racks and fuel drums inside.

The exported motor-pool meshes total 13,260 triangles, within the 14,000 limit. The four motor-pool source photos were retained. The Town Hall, Forge, Workshop and scrapyard were not edited in the recipe.

## Checks

- Blender 4.5.13 recipe/export and printed per-piece bounds: passed. Plot and ground/contact audit passed.
- `node --test --test-name-pattern="TOWN-ART-SERVICES" tools/test-blender-output.mjs`: passed, 377 checks, 0 failed. The first run found 17,260 motor-pool triangles; the carve target was lowered and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed; reported pre-existing advisory size targets only.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed; rerun gave the same result. Failures: missing `docs/board/looks/town-art-outposts/round-15-review.md` (other card) and `spawnSync ffmpeg EPERM`. Round-7 image publication checks passed. No unrelated file was changed.
- Browser and game look checks: Claude runs. Review the road-facing opening, side and end orientation, pitched roof and overhang, straight-down roof, pit and floor, and the three-quarter/mayor silhouette in `round-7.jpg`.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

## Removed

Deleted the superseded round-5 sheet and review note as directed. No source photos were removed.

## Trading post, round 8

Added a 3×3-cell trading post built from four retained JPG references. The carved body, deep porch, loading dock, goods, sign and brackets are distinct named pieces. The recipe prints each piece's bounds and checks that it stays within the plot and touches the ground or another piece. Other passed building recipe branches were not changed.

The exported family is 6,865,036 bytes, below 8 MB. The trading post stayed within its 9,000-triangle limit after lowering only the new body's carve target. The initial output check found 10,568 triangles; the corrected run passed.

### Checks

- Blender 4.5.13 export and review renders: passed; trading post footprint and piece-contact audit passed.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- Browser and in-game look checks: Claude runs. Please inspect the side/end carve match, the roof-metal plan reference, body width, and sign readability from above in `round-8.jpg`.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

### Removed

- No earlier building models, sheets or review notes were removed.
