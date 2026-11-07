# TOWN-ART-FUN change note

## Changed

Round 11 rebuilds the drive-in only. The photo-traced billboard frame, legs and braces stay in place. The front face of `drive-in:screen` now wears an original faded desert film still and uses a dim emissive material. The screen sits in front of the complete rear photo, so the patched backing shows from behind.

Ten photo-traced cars replace the repeated dark lumps. Five use the scrapyard's red, brown and blue wreck side photos; five use the new uncrushed rusty sedan photo. The cars face the screen in two shallow curved rows and all touch the ground. A small projector hut stands behind the rear row.

Added and credited the generated still and sedan photo sources. The full family GLB is 3,510,540 bytes; the drive-in contains 4,758 triangles. Blender printed bounds for all 24 drive-in mesh pieces. Every piece keeps at least 0.5 m of clearance inside the 4x3 footprint; the hut roof ends at z=10.9 m; all cars have y=0. The round-11 comparison sheet is 397,709 bytes.

### Fountain, round 12

The fountain's first round carves the bonnet into a hollow basin from four views, gives its two exhaust pipes separate curved elbows, and adds the water as its own named piece. The water uses the clean center of the overhead reference, so it does not print the photo's pipes a second time. The taller pipe sits behind the shorter one. Review renders hide other town meshes at the same origin by name.

The full family GLB is 3,702,100 bytes. The round-12 comparison sheet is 233,206 bytes. The photos show the fountain from above, the mayor's view and all four sides. Claude's verdict is pending; the round note records the remaining likeness gaps.

### Fountain, round 13

The second fountain pass replaces the straight cylinder segments with smooth swept elbows. The pipes use the existing rusted-steel swatch so rust stays visible around the full tube instead of sampling background pixels from one photo. Two tapered falling streams now connect the exhaust mouths to the pool. They remain in the existing `fountain:water` node.

Claude's round-13 verdict: keep the bonnet basin and water; reposition the two exhausts to the back edge, side by side across the width. Make the streams pale, thin and partly transparent, falling straight down into the water with landing ripples.

### Fountain, round 14

The exhausts now share a line on the back rim, about a third of the bonnet width apart. Each rises from a lathed rim flange, then bends inward and forward above the basin before turning its open mouth down. Two narrow, partly transparent blue-white streams fall vertically into the pool, each with a small ripple ring. The exported water material uses glTF `BLEND` alpha. The bonnet carve and its photo-textured water surface remain as before.

The fountain has 1,754 triangles against the 1,800 limit. Its Blender bounds and contact checks passed. The family GLB is 3,700,516 bytes; the round-14 comparison sheet is 239,621 bytes. Claude's visual verdict is pending.

## Checks and review

- Round 14 Blender export and imported-GLB renders completed. Bounds and contact checks passed. The family GLB is 3,700,516 bytes; fountain triangle count is 1,754, under its 1,800 limit.
- `node tools/test-blender-output.mjs`: 377 checks passed, 0 failed on the updated export.
- Round 14 visual evidence: `round-14.jpg` is 239,621 bytes. Raw renders stay in ignored `.evidence` until review, then are removed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 of 9 passed. One failure expects `round-13.jpg`, which this task explicitly removes. The other cannot spawn `ffmpeg` (`EPERM`). No assertions were changed.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. It found a missing matching review note for the unrelated town-art-outposts round-15 sheet, and the audio-analysis check could not spawn `ffmpeg` (`EPERM`).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 13 passed, 1 failed, 33 not run. The unrelated Eifel suite failed its `ffmpeg` loudness measurement; its required solo rerun failed the same way. No Eifel game code changed.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` wrapper, so the same build ran through `npm.cmd`.
- Browser checks were not run. Claude should judge the drive-in screen's dusk brightness and rear visibility, backing photo, car variety and direction, curved rows, grounding and projector-hut placement. The fountain sheet and round note are ready for Claude's art verdict.
- No fountain browser or frame check: it is not wired into the game. Its round-12 comparison sheet is the art evidence.
- Round 14: Blender exported and rendered the imported GLB for side, front, rear, above, three-quarter and mayor views. No browser or frame check: the fountain is not wired into the game. Claude should judge the pipe locations and bends against the photos, plus stream transparency and ripple visibility at town distance.
- Round 13 `node tools/test-blender-output.mjs`: 377 checks passed before Claude's pipe-placement verdict. `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- Round 13 `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. It reports the existing missing town-art-outposts round-15 review note and cannot spawn `ffmpeg` (`EPERM`).
- Round 13 lane tier: 13 suites passed, then `tools/test-circuit-eifel.mjs` failed its FFmpeg loudness measurement; 33 suites did not run. A solo rerun passed 17 checks and failed the same loudness measurement. No game code changed, and the test assertion was not changed.
- Round 13 `npm.cmd run build`: passed. The existing large-chunk and dynamic-import warnings remain.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

Replaced the flat orange screen and repeated blue wreck placement. Replaced the fountain's flat dark water shader with the photo-textured pool. Removed the round-10 and round-13 sheets and review notes as requested. Kept rounds 6, 9, 11 and 12. No other building or source was removed.
