# TOWN-ART-FOOD: soup kitchen round 6 and market hall round 1

## Soup kitchen round 6

- Rebuilt the soup kitchen only. The other food buildings keep their round-5 geometry.
- Added `soup-kitchen-wall.jpg`, a matching 712×532 clean front photo of the tin wall, posts and earth, with the roof, awning, shelf and cooking pieces removed.
- Replaced the kitchen's joined photo carve and small rear card with one full rear wall, four ground-standing posts, a pitched tin roof with overhang, traced sagging front awning, and the side curtain on its post.
- Made the shelf deep and separate, with photo-wearing cans and pans. Turned the open pot from its front-photo profile, with a dark soup surface and separate rim. Added a grounded ring of cylindrical logs, small embers and several flame blades. Bench legs reach the earth.
- Exported and reviewed the GLB. It is 1,928,036 bytes. The round-6 comparison sheet is 132,838 bytes, below 500 KB.

### Soup kitchen checks

- Blender 4.5.13 rebuilt and reimported the exported family GLB; front, both three-quarter views, bay view and mayor view rendered. I inspected the renders and the submitted sheet.
- `node --test --test-name-pattern="TOWN-ART-FOOD keeps every food plot selectable inside its footprint budgets" tools/test-blender-output.mjs`: passed, 321 checks. The first run caught oversized embedded photos; the recipe now packs 256×192 copies while keeping the source photos full resolution.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: failed 3 of 9 checks. Two unrelated checks still expect 6 November paths and the deleted round-5 sheet; one audio check could not start `ffmpeg` (`EPERM`). The review-JPG publication check passed. No assertions were changed.
- No lane tier, game build, browser check or game race ran. Claude should inspect the front photo/model pair, both three-quarter views, the bay, and the mayor view on the round-6 sheet.

### Soup kitchen removed

- Replaced the round-5 soup-kitchen carve, flat rear card, and curved sheet awning with the measured, separate pieces above.
- Recycled `round-5.jpg` and `round-5-review.md` after submitting round 6.
- Removed this round's temporary photo grids, render images, sheet-builder scratch and test logs after making the review sheet.

## Market hall round 1

- Replaced the old market hall geometry with a photo-carved open hall using
  `carve_object`, measured from the 2 m storage door. The front and rear table
  entries both state their measured roof `top`; the open bay uses a keep box.
- Added five separate stall fronts, goods panels, counters, posts and awnings.
  The Blender recipe prints and checks bounds for the market pieces.
- Exported `food.glb` at 1,946,716 bytes. Added `market-round-1.jpg` (196,452
  bytes) and its review. The prior `round-6.jpg` remains in place.
- Retained the generated PNG reference originals from the earlier uncommitted
  work and credited them alongside the JPEG recipe copies.

### Market hall checks

- Blender recipe and exported-GLB renders passed. The Blender log includes
  bounds for every market mesh; the hall shell and stall fronts touch ground,
  goods panels touch their counters, and all pieces stay inside the footprint.
- Photo masks were inspected beside the source images. The open front bay is
  removed from the carve mask and kept visible.
- The rendered sheet was inspected beside the source photo. The front match,
  both three-quarter views, road view and mayor view are included. Review notes
  record visible shortcomings for Claude.
- `node tools/test-blender-output.mjs`: passed, 331 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: failed placement for the required
  `market-round-1.jpg` name; this filename does not match the check's allowed
  review-sheet pattern. The requested name is retained.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; audio analysis
  failed because spawning `ffmpeg` returned `EPERM` in this environment. The
  sheet size and JPG publication checks passed.
- Browser and look checks were not run here. Claude should inspect the gable
  and photo alignment, stall depth and placement, and mayor view framing.
- Changed assertions: none. Race fingerprints: not applicable to this art-only
  change.

### Market hall removed

- Removed the previous hand-built 3x3 market hall roof, frame and stall
  geometry from `tools/blender/town-food.py`.

## Market hall round 2

- Rescaled the photo-carved hall to a 9.45 m by 9.45 m plan while keeping the
  source side-photo height scale and the accepted patched roof.
- Built a rusted steel frame with five bays along each side and posts across
  the front and rear. Sloped rafters meet the roof at its eaves and ridge.
- Added earth under the full roof, a one-bay galvanized store with a timber
  door at the road-side corner, and six deep stalls in two facing rows. Each
  stall has separate photo-wearing goods and base faces, a counter, shelf,
  steel legs, and a projecting canvas awning.
- Printed every market piece's bounds and checked footprint containment,
  floor contact, post height and awning-arm connections.
- Blender 4.5.13 exported and reimported `food.glb` at 2,018,328 bytes.
  The complete food family is 29,452 triangles. `round-7.jpg` is 155,422
  bytes and shows six full-building views. `round-6.jpg` remains.
- `node --test --test-name-pattern="TOWN-ART-FOOD keeps every food plot selectable inside its footprint budgets" tools/test-blender-output.mjs` passed: 331 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` passed. `node tools/test-review-evidence.mjs` passed 8 of 9 checks on both runs; its audio-analysis check failed both times because spawning `ffmpeg` returned `EPERM`. The bounded review-JPG publication check passed.
- No lane tier, game build, browser check or race ran. Claude should review the full-building views, roof framing, store and door, both stall rows, goods faces, awnings, clear aisle, and floor contact on the round-7 sheet.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

### Market hall round 2 removed

- Replaced the market hall's empty-bay carve supports and flat stall strips with the measured steel frame and deep stall modules.
- Deleted the superseded `market-round-1.jpg` and `market-round-1-review.md`; kept `round-6.jpg`.
- Removed this round's review renders, masks, Blender file and test logs after preparing the submitted sheet and model.

## Canteen round 8

- Replaced the primitive canteen bus with a rounded body carved from measured side, front, rear and true overhead roof photos. The earlier slanted roof reference showed side windows; the true overhead reference removes that roof distortion.
- Added the road-side hatch recess, serving counter, patched canvas awning, wheels and benches as separate parts. Reduced shell and wheel detail to keep the 2 by 1 plot within its 5,000-triangle budget.
- Blender 4.5.13 exported and reimported the family GLB at 1,897,688 bytes. The canteen is 3,352 triangles; the family has 28,675 triangles. The round-8 sheet is 141,634 bytes.
- `node tools/test-blender-output.mjs`: passed 361 checks, 0 failed on the final run. Its first run caught the canteen photos exceeding the per-image 256 px bound; the recipe now packs 256 px copies and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: failed 1 of 9 checks on both runs because spawning `ffmpeg` returned `EPERM`; the review-JPG publication check passed. No assertions changed.
- No lane tier, build, browser check or in-game look check ran. Claude should inspect the body match, the awning and counter attachment, the wheel wells and the roof from above on the round-8 sheet.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

### Canteen round 8 removed

- Replaced the previous primitive bus body, flat canvas board and oversized photo-carved shell with the measured hull and separate service parts.
- Removed the unused four-view source collage after retaining its individual side, front and rear views and the corrected overhead view.
- Removed the scratch sheet builder, raw render and mask captures, temporary Blender outputs and test logs after recording the review evidence.
