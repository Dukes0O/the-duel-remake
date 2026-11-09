# TOWN-ART-MACHINES-2 - round 32

## Changed

Replaced only the old block drill rig with a photo-carved worn yellow truck, six measured dark tyres, frame rails, outriggers, a traced open-lattice mast and a steel feed string. The cab end is at Blender +Y; the mast hinge origin is at the rear at Blender -Y. The mast rests along the deck, raises upright, and carries a sliding pipe that reaches below ground in the work pose. Added the four mast-free truck photos and the separate mast photo, with credits. Other six machines were left unchanged.

Exported rest bounds (Blender metres): body `(-1.462, -3.436, 0.383)` to `(1.508, 3.372, 2.795)`; cab end `(-1.462, 1.575, 0.383)` to `(1.508, 3.372, 2.767)`; mast `(-0.120, -2.812, 1.249)` to `(0.120, 3.041, 2.130)`; string `(-0.105, -2.700, 1.825)` to `(0.105, 3.000, 2.035)`. Mast pivot: `(0, -2.700, 1.750)`. Raised work string minimum Z: `-0.250`.

## Checks

- Blender recipe export and rig bounds/contact checks: passed.
- `node tools/test-blender-output.mjs`: 389 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement clean, size targets advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. One unrelated audio-analysis subtest failed twice at `spawnSync ffmpeg EPERM`; no game code or test assertions changed.
- Lane tier and build: not run, as directed.
- Browser/look checks: Claude runs. Claude should review the four photo comparisons, axle spacing, cab/deck seams, +Y cab end, rear mast hinge, rest/work poses, and below-ground string.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed the old drill-rig reference picture and its credit entry after replacing its recipe references.
- Removed the drill rig's old block geometry and crawler-track assembly.
- No other machine geometry, tests, or files were removed.
