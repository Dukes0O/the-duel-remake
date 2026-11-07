# TOWN-ART-FOOD round 6

## Changed

- Rebuilt the soup kitchen only. The other food buildings keep their round-5 geometry.
- Added `soup-kitchen-wall.jpg`, a matching 712×532 clean front photo of the tin wall, posts and earth, with the roof, awning, shelf and cooking pieces removed.
- Replaced the kitchen's joined photo carve and small rear card with one full rear wall, four ground-standing posts, a pitched tin roof with overhang, traced sagging front awning, and the side curtain on its post.
- Made the shelf deep and separate, with photo-wearing cans and pans. Turned the open pot from its front-photo profile, with a dark soup surface and separate rim. Added a grounded ring of cylindrical logs, small embers and several flame blades. Bench legs reach the earth.
- Exported and reviewed the GLB. It is 1,928,036 bytes. The round-6 comparison sheet is 132,838 bytes, below 500 KB.

## Checks

- Blender 4.5.13 rebuilt and reimported the exported family GLB; front, both three-quarter views, bay view and mayor view rendered. I inspected the renders and the submitted sheet.
- `node --test --test-name-pattern="TOWN-ART-FOOD keeps every food plot selectable inside its footprint budgets" tools/test-blender-output.mjs`: passed, 321 checks. The first run caught oversized embedded photos; the recipe now packs 256×192 copies while keeping the source photos full resolution.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: failed 3 of 9 checks. Two unrelated checks still expect 6 November paths and the deleted round-5 sheet; one audio check could not start `ffmpeg` (`EPERM`). The review-JPG publication check passed. No assertions were changed.
- No lane tier, game build, browser check or game race ran. Claude should inspect the front photo/model pair, both three-quarter views, the bay, and the mayor view on the round-6 sheet.

## Changed assertions

None.

## Race fingerprints

None. This art-only change does not touch simulation code.

## Removed

- Replaced the round-5 soup-kitchen carve, flat rear card, and curved sheet awning with the measured, separate pieces above.
- Recycled `round-5.jpg` and `round-5-review.md` after submitting round 6.
- Removed this round's temporary photo grids, render images, sheet-builder scratch and test logs after making the review sheet.
