# TOWN-ART-OUTPOSTS

Status: deck-town round 13 model and sheet ready for Claude's review.

## Changed

Cut the deck's rail regions out of its photo carve, then traced and slabbed the side and end rails with their openings intact. Cut the home top masks to a rectangle and added thin roof skins mapped from the existing red side-photo roofs. Added a ladder from deck level to each home door. Kept the washing lines and named `deck-town:bell` at the deck end. Kept all eight source photos and the homes' photo-carved walls.

Reduced each repeated home's carve target to 1,600 triangles after the first output check found the deck-town total above budget. Final deck-town count is 13,216 triangles; family GLB is 4,834,532 bytes.

## Checks and review

- Blender 4.5.13 export and review renders completed.
- `node tools/test-blender-output.mjs`: pass, 356 checks, 0 failed. Ran to completion after the budget adjustment.
- `node tools/test-repo-hygiene.mjs`: pass. Existing size targets reported as advisory.
- `node tools/test-review-evidence.mjs`: 8 pass, 1 fail (repeated once). The unrelated audio-analysis subtest cannot spawn `ffmpeg` (`spawnSync ffmpeg EPERM`); the JPG publication check passed. No test assertions changed.
- Sheet: 324,709 bytes, below the 500 KB limit.
- No lane tier or build run, as directed. Browser and in-game look checks are for Claude.
- Claude should inspect the deck and home masks beside their photos; open rails on all four edges; the straight rectangular home top and red roof; ladders meeting raised doors; laundry between homes; bell and frame touching the deck; the deck-town footprint; and the full sheet.
- Race fingerprints: not applicable.

## Removed

Removed the superseded round-12 sheet and review note. Kept rounds 4, 9 and 10. Blender renders, masks, logs and scratch outputs from this work are temporary and will be removed before handoff.
