# TOWN-ART-MACHINES-2 — round 30

## Changed

Turned the loader's front and rear frame positions, arm pivot, arm geometry,
bucket position and bucket photo mapping to Blender +Y, matching the carve.
Re-signed the work-pose rotations. Lowered the arm tips and bucket pivot
together so the scoop rests on the ground. Added GLB readback bounds output
and checks for `loader:arms` and `loader:bucket`. Updated only loader review
cameras; the other machines' geometry and poses are unchanged.

Exported GLB readback bounds at rest:

- `loader:arms`: min `(-1.300, 0.710, -0.001)`, max `(1.300, 3.943, 1.631)`.
- `loader:bucket`: min `(-1.300, 2.995, -0.001)`, max `(1.300, 3.943, 0.999)`.
- Both are at Y > 0; bucket min Y exceeds 2.6. Its low Z is within 1 mm of ground.
- `round-30.jpg` is 223,360 bytes. All machines remain within the 15,000-triangle cap.

## Checks

- Blender 4.5.13 recipe export and loader renders: passed; GLB readback bounds passed.
- `node tools/test-blender-output.mjs`: 389 checks, 0 failed.
- Lane tier and build: not run, as this art card forbids them.
- Browser/look review: not run; Claude should review the four photo comparisons,
  loader at rest, work pose, and the listed points in the round review.
- Changed assertions: none. Race fingerprints: not applicable; no simulation code changed.

## Removed

- No prior model parts, files, tests or docs were removed.
