# TOWN-ART-FUN change note

## Changed

Round 11 rebuilds the drive-in only. The photo-traced billboard frame, legs and braces stay in place. The front face of `drive-in:screen` now wears an original faded desert film still and uses a dim emissive material. The screen sits in front of the complete rear photo, so the patched backing shows from behind.

Ten photo-traced cars replace the repeated dark lumps. Five use the scrapyard's red, brown and blue wreck side photos; five use the new uncrushed rusty sedan photo. The cars face the screen in two shallow curved rows and all touch the ground. A small projector hut stands behind the rear row.

Added and credited the generated still and sedan photo sources. The full family GLB is 3,510,540 bytes; the drive-in contains 4,758 triangles. Blender printed bounds for all 24 drive-in mesh pieces. Every piece keeps at least 0.5 m of clearance inside the 4x3 footprint; the hut roof ends at z=10.9 m; all cars have y=0. The round-11 comparison sheet is 397,709 bytes.

### Fountain, round 12

The fountain's first round carves the bonnet into a hollow basin from four views, gives its two exhaust pipes separate curved elbows, and adds the water as its own named piece. The water uses the clean center of the overhead reference, so it does not print the photo's pipes a second time. The taller pipe sits behind the shorter one. Review renders hide other town meshes at the same origin by name.

The full family GLB is 3,702,100 bytes. The round-12 comparison sheet is 233,206 bytes. The photos show the fountain from above, the mayor's view and all four sides. Claude's verdict is pending; the round note records the remaining likeness gaps.

## Checks and review

- Blender export and imported-model renders completed. Bounds and contact checks passed.
- `node tools/test-blender-output.mjs`: 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. It found a missing matching review note for the unrelated town-art-outposts round-15 sheet, and the audio-analysis check could not spawn `ffmpeg` (`EPERM`).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 13 passed, 1 failed, 33 not run. The unrelated Eifel suite failed its `ffmpeg` loudness measurement; its required solo rerun failed the same way. No Eifel game code changed.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` wrapper, so the same build ran through `npm.cmd`.
- Browser checks were not run. Claude should judge the drive-in screen's dusk brightness and rear visibility, backing photo, car variety and direction, curved rows, grounding and projector-hut placement. The fountain sheet and round note are ready for Claude's art verdict.
- No fountain browser or frame check: it is not wired into the game. Its round-12 comparison sheet is the art evidence.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

Replaced the flat orange screen and repeated blue wreck placement. Replaced the fountain's flat dark water shader with the photo-textured pool. Removed the round-10 sheet and note as requested. Kept rounds 6 and 9. No other building or source was removed.
