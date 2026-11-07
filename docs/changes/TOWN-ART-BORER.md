# TOWN-ART-BORER round 4 change note

Replaced the old barrel mesh with `carve_object` and a photo table measured from the gridded side, front, rear and overhead references. Removed the old barrel code and open-cap edit. Added a plain dark disc behind the cutter face openings while keeping the traced cutter-face slab. Replaced the loose gantry framework with a fused deck-and-rails mesh; kept the conveyor as `borer:belt` and gave the fused mesh a ranged `UVMap`. Reduced exported geometry to fit the card budget.

The exported GLB has 34,575 triangles and is 3,914,600 bytes. `node tools/test-blender-output.mjs`: passed, 309 checks, 0 failed. `node tools/test-repo-hygiene.mjs`: passed placement; repository-wide size targets remain advisory. `node tools/test-review-evidence.mjs`: 7 passed, 2 failed after the round-4 note was added. The failures are an unrelated missing review note for `town-art-power/round-4.jpg` and `spawnSync ffmpeg EPERM` in the audio-analysis subtest. No test assertions changed. No race fingerprints changed; this art-only export does not touch race code.

No lane tier or build was run. No browser or in-game look check was run. Claude should inspect the front, side and overhead views, check whether pink remains in the cutter openings, verify that the tube meets the gantry on its rails, and check that every machine part touches another. The self-review failed on visible gantry separation and grounding; the machine needs Claude's art verdict.

## Removed

- Removed the old `Shield barrel` cylinder and its end-face removal code.
- Removed the loose gantry legs, rails, cross beams, cab framing, ladders and handrails.
- Removed the round-2 and round-3 JPG sheets after creating the round-4 sheet.
