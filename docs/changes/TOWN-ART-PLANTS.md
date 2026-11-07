# TOWN-ART-PLANTS — follow-up

## Changed

- Added only `wellhead` to the plants family. The accepted crusher and batch plant remain separate children, with their recipes intact.
- Added four separate orthographic reference photos for the wellhead (side, front, rear and straight above) and their credits.
- Traced the open side frames and moving beam with `trace` and `slab`. `wellhead:beam` pivots at its measured bearing. The casing, valve and flywheel use turned profiles.
- Added a visible worn-cream `07` mesh on the casing and an eight-spoke flywheel. The recipe prints each mesh's bounds and contact check and enforces the one-cell footprint and 1,800-triangle budget.
- Added the round-8 comparison sheet: four matched photo/model views, two three-quarter views and the mayor view. The wellhead uses 1,552 triangles. The family GLB is 2,630,984 bytes; the sheet is 282,226 bytes.

## Checks

- Blender recipe and exported-model renders: passed; each wellhead piece passed its contact and footprint checks.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed. One unrelated check found the missing `town-art-outposts/round-15-review.md`; audio analysis failed because `spawnSync ffmpeg` returned `EPERM`. The round-8 sheet publication check passed.
- Lane tier and build: not run; art-card instructions exclude them.
- Browser and in-game look checks: not run; Claude owns them. Claude should review the overhead width against the front and rear photos, the valve and flywheel details, and the full mayor view.
- Changed assertions: the plants-family child list now includes `wellhead`; checks cover the named rocking beam and hand-painted number and the 1,800-triangle limit. No existing assertion was weakened.
- Race fingerprints: not applicable; no race code changed.

## Removed

- No earlier building, recipe, model or round sheet was removed. Temporary renders, grids, draft sheets and logs were removed. The four required reference JPGs, credits, exported family model and round-8 sheet stay.
