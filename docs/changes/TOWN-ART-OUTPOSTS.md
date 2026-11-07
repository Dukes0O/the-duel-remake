# TOWN-ART-OUTPOSTS change note

## Changed

- Replaced fixed pane rectangles with per-pane connected studio-grey floods (18-level RGB tolerance), seeded at each pane centre. Glass gets a very dark blue-grey streak variation; frames and wall pixels remain untouched.
- Applied different sun, star and house paper shapes within about half the side and overhead window panes. The door opening uses the same flood method. Both overhead window strips are populated for the far-side read.
- Kept the accepted round-8 fuselage, trestles, slide and sign geometry. Added the round-9 reference/model sheet and review.

## Checks

- Blender round-9 recipe and exported-model render: passed; GLB 2,865,524 bytes.
- High-zoom side-photo comparison before rebuild: inspected. Pane fills follow the studio-grey interiors; frame rims and wall remain visible.
- `node tools/test-blender-output.mjs`: passed, 316 checks; model output and size/readback validated.
- `node tools/test-repo-hygiene.mjs`: passed; placement clean (repository size targets remain advisory).
- `node tools/test-review-evidence.mjs`: 7/9 passed. One existing check requires the superseded `round-8.jpg`, which this task explicitly removes; another hit `spawnSync ffmpeg EPERM` while analyzing unrelated audio fixtures. Assertions were not changed.
- Browser checks and game look checks: not run in this art lane; Claude should review the round-9 sheet.
- Changed assertions: none. Race fingerprints: not applicable; no simulation code changed.

## Removed

- Removed the superseded `round-8.jpg` and `round-8-review.md` as requested. Kept `round-4.jpg` and its review.
- Temporary photo comparison and build logs are scratch outputs and will be cleaned before commit.
