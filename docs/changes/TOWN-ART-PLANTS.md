# TOWN-ART-PLANTS

## Changed

- Added `pump-station`, a 2x2-cell brick pump house carved from four separate
  orthographic reference photos. Added a traced open fence with a road opening
  and two flanged lathed pipes through its side wall.
- Kept every previously accepted building in the family. Added five generated
  reference photos to the town texture folder; OpenAI image generation is
  credited in the Blender recipe.
- Added the round 12 comparison sheet and review note. The top-down render had
  an unnecessary quarter-turn camera roll; the final matched view now follows
  the photo's roof orientation. Added this camera-roll lesson to `ART_LINE.md`.

## Checks

- Blender recipe and exported GLB: passed. Pump station: 4,944 triangles; family
  file: 3,058,912 bytes. Body, fence and pipe bounds were printed; every part
  touches the ground or another part and stays inside the footprint.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean and size
  targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. Audio analysis
  failed with `spawnSync ffmpeg EPERM`; its one rerun failed the same way.
- Browser and in-game look checks: not run; Claude owns them. See the review
  note for the specific details to judge.
- Lane tier and build: not run, as directed for this art card.

## Changed assertions

- The town family root now requires the new `pump-station` child. The test names
  its carved body, inlet and outlet lathes, traced fence panels, and 5,000-triangle
  cap. No assertion was weakened.

## Race fingerprints

- Not applicable; no race code changed.

## Removed

- No accepted buildings, previous sheets, or texture sources were removed.
- Temporary photo grids, masks, renders, and logs are removed after checks.
