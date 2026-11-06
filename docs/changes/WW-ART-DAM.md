# WW-ART-DAM: Dry Dam art candidate

**Source base:** `5f085fcc9b81cb5d7eb7ce1f8f196f3c91049149` (`integration/wasteland`, fast-forwarded before the final gate).

## Design settled before implementation

Follow Claude's 5 November offsets from the rail gate centre at ground level: the filling shed near (-17, -23); the sea gate, wheel and 7 m gear seat near (0, -50), with the wheel at 28 m; the boilers near (25, 5); the spillway near (85, 25); and the gatehouse on its own pad near (45, -60), 30 m up. The basin is about 150 m across. Model its near floor and side flanks, but leave the far side and ocean out. Keep the original named rail-gate states and one empty root. No game wiring is in this card.

## Work

- Added a repeatable Blender recipe that exports the named dam parts and reimports the GLB for its review renders.
- Added the paired rail gates, filling shed and interior equipment, high shut gate and wheel, empty gearbox seat, buried old gear, boilers, wrecked spillway and separate gatehouse.
- After round 1, darkened the embedded concrete and metal images, reframed the car-height and lake-bed views, and added lift joints and face cracks.
- After round 2, replaced the display slab and straight shoulder beams with an irregular silt bowl and steep basin flanks. Reframed the shed render to show its tanks.
- Added the dam recipe to the Blender output guard.
- Marked the dam entry as a candidate so the existing GLB readback check applies its triangle and byte limits. The check now uses each candidate's configured byte limit; the dam's 3 MiB limit is no longer an unused setting.

## Art review

- Round 1: resemblance 2, readability 3, grounding 3, consistency 3, frame cost 4. The face was pale and uniform, the rail gate was out of view and the filling shed looked like a wall. See [round 1 review](../board/looks/ww-art-dam/round-1-review.md).
- Round 2: resemblance 3, readability 3, grounding 2, consistency 3, frame cost 4. The wider view exposed beam-shaped shoulders, a square floor and an unclear tank room. See [round 2 review](../board/looks/ww-art-dam/round-2-review.md).
- Round 3: resemblance 3, readability 4, grounding 3, consistency 3, frame cost 4. The required parts and scale views read; the wall proportions, faceted reddish hills, tight shed and small context details remain for Claude's judgment. See [round 3 review](../board/looks/ww-art-dam/round-3-review.md).
- Round 3 is the card's art cap. The candidate is ready for Claude's look verdict; do not start another art round in this card.

## Checks

- `node tools/test-blender-output.mjs` - passed in the lane tier, 246 checks; the dam GLB is 37,190 triangles and 2,610,348 bytes. Its 60,000-triangle and 3 MiB limits are checked. The retained town-machines-1 checks also passed.
- `node tools/test-repo-hygiene.mjs` - passed; no placement failure. Size targets remain advisory.
- `node tools/test-review-evidence.mjs` - 8 of 9 subtests passed (445 checks). The audio-analysis subtest failed because `ffmpeg` could not be found (`spawnSync ffmpeg ENOENT`). A same-commit rerun failed at the same subtest. The WinGet entry has no `ffmpeg.exe`, and `FFMPEG_PATH` is unset.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4` - 12 suites passed, one failed, and 34 did not run after the failure. The Eifel audio-loudness check could not start FFmpeg. A same-commit `node tools/test-circuit-eifel.mjs` rerun passed 17 of 18 subtests and failed the same measurement. No assertion or tolerance changed.
- `npm run build` - passed on the current integration base. Vite reported the existing mixed dynamic/static import and large-chunk warnings.

The lane gate is not green because the Eifel and review-evidence checks cannot start FFmpeg. The art verdict also remains with Claude; round 3 is the candidate submitted for that verdict.

## Independent review

- The review confirmed that the dam had no effective GLB budget assertion. The candidate guard now reads the exported GLB and checks its configured triangle and byte limits.
- Assertion update: the candidate byte check now reads `generator.maxBytes`, keeping the existing 2,500,000-byte default and applying the dam's declared 3 MiB limit. Existing candidate limits stay the same. The card requires Claude's written review of assertion changes before merge.
- The review also asked to move the four JPEG inputs out of `public/`. They are authoring inputs, but the card's exact owned-file list does not include them or a source-art directory. This needs a Director scope update before changing their location and the recipe's source path.
- This lane started from an older base. I fast-forwarded to current integration and kept its `town-machines-1` registration and dedicated GLB checks alongside the dam entry.

## Removed

- Removed the round 1 and 2 square display floor and straight shoulder beams from the Blender recipe. Round 3 replaces them with the silt bowl and basin flanks.
- Replaced the prior round's generated GLB with the current round 3 GLB. No superseded binary was kept.
