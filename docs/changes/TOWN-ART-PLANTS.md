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
