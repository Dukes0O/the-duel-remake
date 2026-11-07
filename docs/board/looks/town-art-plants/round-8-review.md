# TOWN-ART-PLANTS - wellhead - round 8

## Changed

- Added the wellhead as its own child of `town-plants`; the accepted crusher and batch plant remain unchanged.
- Added orthographic side, front, rear and overhead reference photos with credits. The comparison sheet shows each beside the exported model at the matching camera, then two three-quarter views and the mayor view.
- Built the open pump-jack frames and beam from traced slabs. The beam has a separate pivot at the measured bearing. The casing, valve, flywheel and wheel use turned profiles; the casing now has a visible cream `07` and the flywheel has eight spokes.
- The recipe reports mesh bounds and contact checks. The model fits the 7 m usable width of its 1x1-cell footprint. The wellhead uses 1,552 triangles (limit 1,800). The full plants GLB is 2,630,984 bytes; the sheet is 282,226 bytes.

## Look scores

| Silhouette | Proportions | Materials and color | Detail and wear | Readability | Grounding | Consistency | Frame cost |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 4/5 | 3/5 | 4/5 | 3/5 | 4/5 | 4/5 | 4/5 | 4/5 |

The side, front and rear views read as the same pump jack. Its number is visible, and the open frame reads from the road and mayor views. The generated overhead reference conflicts with the three elevation photos: it shows a much wider frame. The model follows the measured end views, so it is narrower than the overhead photo.

## Five largest differences

1. The overhead photo and the front/rear photos disagree on frame width; the model follows the end views.
2. Cross-ties are straighter and more uniform than the reference's varied braces and welds.
3. The motor has less ribbing and cabling than the reference.
4. The flywheel's eight straight spokes simplify the photographed hub and fittings.
5. The valve and casing omit some of the reference's flanges and small fittings.

Claude should judge the conflicting overhead scale, the exposed flywheel and valve, the opening through the frame, and the full mayor view. Browser and in-game look checks are Claude's.

## Checks

- Blender recipe and exported-model renders: passed. Every wellhead piece printed bounds and passed the ground-or-contact check; the wellhead stayed inside its footprint and triangle budget.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed. The failures are an unrelated missing `town-art-outposts/round-15-review.md` and `spawnSync ffmpeg` returning `EPERM`. The round-8 sheet publication check passed.
- Lane tier and build: not run; art-card instructions exclude them.
- Browser checks: not run; Claude owns them.
- Changed assertions: the family child list now includes `wellhead`; checks require the named rocking beam and hand-painted number and enforce the 1,800-triangle budget. No assertion was weakened.
- Race fingerprints: not applicable; no race code changed.

## Removed

- No earlier building, recipe, model or round sheet was removed. Temporary renders, grids, draft sheets and logs are removed after these checks. The four reference JPGs, credits, exported family model and round-8 sheet stay.
