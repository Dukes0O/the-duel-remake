# WW-ART-SEA change note

## Changed

- Added `sea-works.py` and `sea-works.glb` with named `old-gear`, `gear-section`, `gear-whole`, `harbour-wall` and `causeway` parts under one root.
- Added six `sea-*.jpg` source photos and photo credits. The old gear face is a traced slab with spoke openings; the rim and hub use separate photo material. The new wheel repeats one traced annular sector 24 times. The wall and causeway recipes blend their image ends in memory for repeat seams.
- Added the single `test-blender-output.mjs` candidate entry with the card's 50,000-triangle and 3 MB budgets.
- Added the unlabelled round-1 photo/render sheet and this review note.

## Checks

- `node tools/test-blender-output.mjs`: passed, 308 checks, 0 failed. One first run found missing `--paths-only`; the recipe now reports its output paths and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed, exit 0. Size targets are advisory.
- Blender export: passed for all five named pieces; recipe-reported expanded scene triangles total 22,440. The GLB stores 8,352 triangles across unique mesh primitives, uses 31 nodes (including the 24 gear instances), and is 2,206,532 bytes (read from the exported GLB).
- Browser/look checks: no browser run in this lane. Claude should review the sheet, especially the new wheel's missing spokes and the wall/causeway repeat views.
- Changed assertions: none. Race fingerprints: not applicable; this art-only card does not change race rules.

## Removed

No tracked source files were removed or replaced. Temporary Blender renders and test logs under `.qa-dist/` are removed before handoff.
