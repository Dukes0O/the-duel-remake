# TOWN-ART-OUTPOSTS — Round 1

## Changed

- Merged `integration/wasteland` into `codex/town-art-outposts` before building. That merge supplied `tools/blender/photo_model.py` and the rail-train example.
- Added `tools/blender/town-outposts.py` and a photo-built Dot's Diner candidate in `public/assets/models/wasteland/town/outposts.glb`.
- Saved generated side, front and overhead source photos in the ignored lane evidence folder, then added compressed JPEG recipe inputs and credits under `public/assets/models/wasteland/town/textures/`.
- Added `docs/board/looks/town-art-outposts/round-1.jpg` and its review with honest scores.
- Added a readback entry for the outposts GLB in `tools/test-blender-output.mjs`.

## Measured parts

| Part | Source photo | Measured outline or stations | Model method |
| --- | --- | --- | --- |
| Aircraft fuselage | Side and front | Side silhouette stations at x=25, 60, 120, 205, 300, 400, 500 and 605 px; rounded front radius checked against the front photo | `photo_model.lathe` |
| Bus body | Side | Photo mask within x=420–1435, y=455–760 px | `photo_model.trace` + `photo_model.slab` |
| Roof | Overhead | Photo mask within x=18–2055, y=132–455 px | `photo_model.trace` + `photo_model.slab` |
| DOT'S sign | Front | Photo mask within x=550–1225, y=20–192 px | `photo_model.trace` + `photo_model.slab` |
| Porch and pump | Side/front | Porch x=345–1255 px, depth 3.1 m; pump x=70–119 px | `photo_model.box` |

Scale anchor: 1,420 side-photo pixels map to 29.0 m. The diner footprint target
is 4×3 cells (32×24 m); the rendered shell is inside it. Dot's current GLB is
567,108 bytes. The family GLB budget is 5 MB; this round uses one model. The
three JPEG recipe inputs total 322,288 bytes.

## Checks

- `node tools/test-blender-output.mjs`: passed, 296 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. The existing oversized-file and review-directory notices are advisory targets.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; the audio-analysis subtest failed twice because this job cannot start `ffmpeg` (`spawnSync ffmpeg EPERM`). This test does not inspect this card's art.
- Blender export and empty-scene import succeeded. Rendered mayor, driver, side and overhead views.
- Browser/scene look check: not run here; Claude should inspect the mayor and road-side driver views in the sheet and GLB.
- Race fingerprints: not applicable; no race code or simulation rules changed.
- Changed assertions: none.

## Removed

- No prior recipe, model, test, or asset was replaced.

## Missing

- `plane-school`, `rail-halt`, `deck-town`, and `hermit-camp` are not in this submission.
- Dot's needs substantial shape and surface work. Round 1 has duplicated photo surfaces in the mayor view, a detached pump, and a poorly joined aircraft/bus silhouette. Scores and fixes are in the round review.
