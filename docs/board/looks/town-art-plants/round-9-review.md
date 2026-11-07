# TOWN-ART-PLANTS - wellhead - round 9

The side frame and beam now use a global studio-grey colour mask. I checked the mask beside the source photo: the gaps inside the A-frame and beneath the beam are black. The motor is a traced slab wearing the side photograph. The casing and valve are rust-textured lathes, and the `07` remains readable. The valve wheel now sits to the side of the casing as in the reference.

The accepted beam, horse-head, A-frame, base and flywheel are kept. The pump jack still reads clearly from the side and three-quarter views. The family model is 2,514,888 bytes after resampling embedded photo copies to 85%; original texture photos are unchanged. The wellhead uses 1,716 triangles (limit 1,800). The sheet is 205,601 bytes.

## Look scores

| Silhouette | Proportions | Materials and color | Detail and wear | Readability | Grounding | Consistency | Frame cost |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 4/5 | 3/5 | 4/5 | 3/5 | 4/5 | 4/5 | 4/5 | 4/5 |

## Remaining differences

1. The front and rear photos still disagree with the overhead photo about frame width; the model follows the end photos.
2. The motor is simplified to its traced side silhouette, and some of the photo's smaller fittings are omitted.
3. The cross-ties are straighter and more uniform than the photographed braces.
4. The flywheel and valve wheel simplify the photographed hubs and fittings.

Claude should inspect the side mask beside the photo, the open frame gaps, the traced motor color, the casing's `07`, the valve-wheel connection, and the full mayor view. In-game and browser look checks are Claude's.

## Checks

- Blender recipe, export and review renders: passed. Wellhead 1,716 triangles; family GLB 2,514,888 bytes.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed, including the round-9 sheet check. The audio-analysis subtest failed on `spawnSync ffmpeg EPERM` and failed the same way on its one rerun.
- Lane tier and build: not run; art-card instructions exclude them.
- Browser and in-game look checks: not run; Claude owns them.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

## Removed

- Removed the former generic motor lathe and replaced it with a traced photo piece.
- Removed the round-8 sheet and review note as requested. Rounds 6 and 7 remain.
- Original reference photos stay unchanged; only the embedded copies in the family GLB are resampled to meet the 3 MB file budget.
- Temporary renders, masks, sheet builder and logs are removed after checks.
