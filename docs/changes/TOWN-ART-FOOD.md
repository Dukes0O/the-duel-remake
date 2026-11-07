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
