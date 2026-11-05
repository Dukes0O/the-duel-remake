# CAR-ART-LONGHAUL

## Changed

- Added `tools/blender/longhaul.py`, a reproducible Blender recipe for an
  original six-wheel desert truck with three axles, twin side tanks, a bull
  bar, tool rack, spare wheels, welded panels, and worn materials.
- Exported `public/assets/models/wasteland/cars/longhaul.glb` (22,570
  triangles, 1,559,884 bytes; within the 25,000 triangle and 8 MB limits).
- Added the recipe to `tools/test-blender-output.mjs`.
- Rendered front three-quarter, rear three-quarter, side, top, and scale views.
  The contact sheet at
  `docs/board/looks/car-art-longhaul/round-1.jpg` includes a crop of the
  generated photo reference and is 227,350 bytes.
- Recorded an honest 2/5 look score and findings in the round review note.
  The model does not meet the visual acceptance bar: its cab is hard to read,
  its body still looks plate-heavy, and the scale marker is weak. Stop this
  card at round 1 for Claude's judgment; do not treat the model as approved art.

## Checks

- `tools/test-blender-output.mjs`: passed, 232 checks, as part of the lane tier.
- Lane tier: all 47 selected suites passed; replay fingerprints passed (297
  checks across 33 cases). The first PowerShell wrapper stopped while a suite
  printed a Three.js texture warning. The rerun captured native stderr; its
  final summary line was lost when PowerShell stalled printing the full log.
  I reviewed the captured output: every suite has a PASS line and none has a
  FAIL line. The scratch log was removed after review.
- `npm.cmd run build`: passed. It reported the existing dynamic import and
  large-chunk warnings; no build error.
- No browser, frame, or in-game look check was run in this lane. Claude should
  judge the reference match, cab readability, wheel and rack attachments, and
  whether this shape warrants another art pass.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation or race code changed.

## Removed

- None.
