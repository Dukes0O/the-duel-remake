# TOWN-ART-OUTPOSTS — Round 2

## Changed

- Replaced the flat side/top sheet construction with one `carve_object` call from `photo_carve.py`, using the four-view workflow and `hull_model.py` through the shared kit.
- Added generated front and rear reference JPEGs and their source notes. The measured pixel anchors are in `tools/blender/town-outposts.py`; grid overlays were reviewed during modelling.
- Added a continuous photo-carved fuselage and bus shell. Rebuilt the porch as placed geometry with ground-contact posts, connected deck, tables with legs and a canopy that meets the shell. Placed the pump at the porch end on a ground plate.
- Rebuilt DOT'S as a thick sign slab with separate front/back UV direction so the wording reads correctly on both sides.
- Added the round-2 photo/model sheet and review. Removed round-1 sheet and review.

## Measurements and budgets

- Side: 1024 × 768 px; nose 15 px, tail 1011 px, ground 558 px; 29 m length.
- Front: 1312 × 1199 px; centre 656 px, ground 1112 px; hull width 8.2 m mapped over 896 px.
- Rear: 1312 × 1199 px; centre 615 px, ground 1120 px; hull width 8.2 m mapped over 819 px. Extra aircraft wings are cut from the rear mask.
- Overhead: 1024 × 341 px; front 12 px, rear 1012 px, centre line 161 px. Porch and sign are cut from the hull mask and built as placed pieces.
- GLB size: 929,960 bytes. Triangle budget: 14,000. Metallic factor target: at most 0.3. Sheet: 165,236 bytes (limit 500 KB).

## Checks

- `node tools/test-blender-output.mjs`: passed, 308 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. The size-target report lists repository-wide advisory overages; no placement check failed.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed on both runs. The first run and same-worktree rerun fail because this repository test still stats the explicitly removed `round-1.jpg`, and the unrelated audio subtest cannot launch `ffmpeg` (`spawnSync ffmpeg EPERM`). Assertions were not changed. The round-1 check needs a Claude-reviewed update to match this card's delete-old-round instruction.
- Blender export and empty-scene import: passed; five review angles rendered.
- Browser/look check: not run here. Claude should inspect the sheet's three matched views, both three-quarter views, both sign faces, porch contact and remaining photo seams.
- Race fingerprints: not applicable; no race code or simulation rules changed.
- Changed assertions: none.

## Removed

- Removed `round-1.jpg` and `round-1-review.md` as requested. The old flat-sheet recipe and GLB were replaced by this round's carve and model.
- No tests or assertions were removed or weakened.

## Not built

- `plane-school`, `rail-halt`, `deck-town` and `hermit-camp` remain for later rounds.
