# TOWN-ART-PLANTS

## Changed

- Added `pump-station`, a 2x2-cell brick pump house carved from four separate orthographic reference photos. Added a traced open fence with a road opening and two flanged lathed pipes through its side wall.
- Kept every previously accepted building in the family. Added five generated reference photos to the town texture folder; OpenAI image generation is credited in the Blender recipe.
- Added the round 12 comparison sheet and review note. The top-down render had an unnecessary quarter-turn camera roll; the final matched view now follows the photo's roof orientation. Added this camera-roll lesson to `ART_LINE.md`.

## Checks

- Blender recipe and exported GLB: passed. Pump station: 4,944 triangles; family file: 3,058,912 bytes. Body, fence and pipe bounds were printed; every part touches the ground or another part and stays inside the footprint.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. Audio analysis failed with `spawnSync ffmpeg EPERM`; its one rerun failed the same way.
- Browser and in-game look checks: Claude owns them. See the round-12 review for the visual details to judge.
- Lane tier and build: not run, as directed for this art card.

## Changed assertions

- The town family root requires the `pump-station` child. The test names its carved body, inlet and outlet lathes, traced fence panels, and 5,000-triangle cap. No assertion was weakened.

## Race fingerprints

- Not applicable; no race code changed.

## Removed

- No accepted buildings, previous sheets, or texture sources were removed.
- Temporary photo grids, masks, renders, and logs are removed after checks.

## Follow-up: conveyor, round 13

- Added two modular 8 m ground conveyor pieces. Both have open, photo-traced side frames and rollers under a rubber belt. The end module adds a return drum. Added separate side, front, rear and overhead reference photographs at 1024 pixels wide, with their ImageGen credit.
- Each conveyor exports under 1,800 triangles: straight 904; end 976. The family GLB is 3,196,888 bytes.
- Added the round-13 comparison sheet and review note. I reviewed the photos and exported renders at matching orthographic cameras, and both three-quarter views and the mayor view for both pieces. The frames and top belt read; the end views read more simply than the photos.
- Direct Blender export and render, Blender 4.5.13, `-t 4`: passed. Per-piece bounds and contact checks passed; both modules fit the one-cell footprint, and each part contacts ground or its assembly.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- Browser and in-game look checks: Claude to inspect the round-13 sheet before merge. Lane tier and build: not run, as directed for this art card.
- No existing assertions changed; added conveyor node and budget assertions. Race fingerprints: not applicable to this art-only follow-up.

## Removed

- No accepted buildings or earlier sheets were removed.
- Temporary renders and logs from round 13 were removed after review and checks.

## Design decision: formwork

- The four forms use the largest footprints that preserve the required 0.5 m edge clearance: 1x1 cell is 6.8x6.8 m; 1x2 is 6.8x14.8 m; 2x1 is 14.8x6.8 m; and 2x2 is 14.8x14.8 m. This makes the four IDs useful as all rotations of the one-cell and two-cell forms while staying inside the town grid.
- Each form is a low, four-sided braced timber mould with two distinct concrete states, `wet` and `set`, and visible steel stakes. The concrete surfaces sit inside the timber, at a height that keeps both states visible from the mayor and road views.
- Round 14 is the first submitted formwork sheet. The earlier flat-colour and oversized-slab render was an internal iteration, replaced in this sheet. Claude's art verdict is pending.

## Follow-up: formwork, round 14

- Textured the wet and set concrete from the overhead photo and set separate material roughness. Fitted both slabs to the inside of the timber opening. Added the four generated orthographic references and the round-14 comparison sheet and review note.
- Formwork footprints are 6.8 x 6.8 m, 6.8 x 14.8 m, 14.8 x 6.8 m and 14.8 x 14.8 m. Blender printed bounds, triangle counts and part contact checks.
- The exported family is 3,448,256 bytes. This exceeds the general contract's 3 MB statement, but is below the specific 8 MB family limit in the requested task brief and the output test. The preceding family already measured 3,196,888 bytes. Claude should settle the discrepancy before more buildings are added.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures. `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory. `node tools/test-review-evidence.mjs`: 8 of 9 passed twice; audio analysis failed both times because `ffmpeg` could not start (`spawnSync ffmpeg EPERM`).
- The task brief says art cards do not run the lane tier or a build. The lane tier was run by mistake against the broader AGENTS gate and stopped after 13 suites passed, 1 failed and 33 were not run; the failure was the same ffmpeg audio-analysis issue. No build was run. No browser, in-game or frame check was run; Claude owns the look verdict.
- Changed assertions add the four formwork roots, each wet/set and timber/stake child, and each footprint's triangle cap. No existing assertion was weakened. Race fingerprints are not applicable.

## Removed

- No accepted models, prior sheets, source photos or assertions were removed. Temporary render images and logs from this run are removed after recording this comparison sheet.
## Follow-up: formwork, round 15

- Separated the concrete states. Each slab fills the complete inside opening with repeated UVs from only its wet or set region of the overhead source photo. Wet keeps roughness 0.28; set keeps 0.92.
- Grounded and raised the photo-traced wall profile to 1.7 m. Extended both wall pairs to the footprint corners; added four timber corner posts and diagonal braces on every wall. Moved all four rebar rods to the inside corners. They start at the 0.93 m slab top, rise 0.6 m, and have no geometry below ground.
- Added round 15's review sheet and note. Added assertions for corner posts and braces, and an art-line rule for cropping a photo that shows multiple material states. The Blender recipe printed bounds and contact for every piece. Family GLB: 3,614,464 bytes; formwork-1: 324 triangles, formwork-2: 372 triangles; both remain under the existing caps.
- Blender 4.5.13 export and source-matched renders: passed. Isolated wet/set renders and a shallow side match were rendered from the exported GLB. (Full test results recorded below after the card checks.)
- Claude should inspect the isolated states, side match, corner closures/braces, rod placement and height, and the mayor views of the larger forms. No browser, in-game or frame check was run; Claude owns those checks. No race code changed; fingerprints are not applicable. No assertions were loosened.

## Removed

- Deleted the superseded round-14 sheet and review note, as requested. Temporary round-14-internal and round-15 renders, the temporary Blender project, sheet-builder scripts, and logs are removed after card checks.
## Round 15 check results

- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 8/9 subtests passed. Audio analysis failed with `spawnSync ffmpeg EPERM`; the one rerun failed at the same ffmpeg launch. The JPG publication and 500 KB review-sheet check passed.
- Browser/in-game look checks and frame timing: not run; Claude owns those checks, as directed. Lane tier and build: not run for this art card.
- Changed assertions: added required corner-post and diagonal-brace node names. No existing assertion changed or loosened. Race fingerprints are not applicable.
