# TOWN-ART-FUN change note

## Changed

Round 11 rebuilds the drive-in only. The photo-traced billboard frame, legs and braces stay in place. The front face of `drive-in:screen` now wears an original faded desert film still and uses a dim emissive material. The screen sits in front of the complete rear photo, so the patched backing shows from behind.

Ten photo-traced cars replace the repeated dark lumps. Five use the scrapyard's red, brown and blue wreck side photos; five use the new uncrushed rusty sedan photo. The cars face the screen in two shallow curved rows and all touch the ground. A small projector hut stands behind the rear row.

Added and credited the generated still and sedan photo sources. The full family GLB is 3,510,540 bytes; the drive-in contains 4,758 triangles. Blender printed bounds for all 24 drive-in mesh pieces. Every piece keeps at least 0.5 m of clearance inside the 4x3 footprint; the hut roof ends at z=10.9 m; all cars have y=0. The round-11 comparison sheet is 397,709 bytes.

## Checks and review

- Blender export and imported-model renders completed. Bounds and contact checks passed.
- `node tools/test-blender-output.mjs`: 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. It found a missing matching review note for the unrelated town-art-outposts round-15 sheet, and the audio-analysis check could not spawn `ffmpeg` (`EPERM`).
- Browser and look checks were not run by Codex. Claude should judge the screen's dusk brightness and rear visibility, backing photo, car variety and direction, the curved rows, grounding, and projector-hut placement.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

Replaced the flat orange screen and repeated blue wreck placement. Removed the round-10 sheet and note as requested. Kept rounds 6 and 9. No other building or source was removed.
