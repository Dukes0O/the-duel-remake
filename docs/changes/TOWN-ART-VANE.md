# TOWN-ART-VANE

Status: ready for Claude art verdict
Kind: art

## Design settled

Build Vane Reach as a tall, slim 70 m landmark with a white steel frame, cobalt
glass service shaft, white crown tank and blue drop mark. Keep the kiosk, tank,
depot, fence and billboard neat and white, with dust and worn concrete at the
ground. Preserve the six-cell tower footprint and show the landmark from the
mayor's 45-degree view and from a driver's seat 40 m away.

## Evidence

Round 1 exposed a framing fault: the driver view aimed at 14 m and cropped most
of the tower. Round 2 fixes that framing and batches fixed geometry into 34
mesh primitives. Its review scores detail 3 and wear 2 because the kiosk bottles
are hidden and the dust banks are too small. Round 3 moves the bottles onto the
counter and makes the dust banks wider and flatter. The final re-imported GLB is
1,518,032 bytes, with 23,460 triangles in 34 mesh primitives. Per-building
counts are: kiosk 948, tank 4,716, depot 2,144, fence 1,296, billboard 1,708,
and tower 12,648.

## Tests and checks

Blender 4.5.13 rebuilt the round 3 GLB and all eight raw views; re-import
render completed. `node tools/test-blender-output.mjs` passed (280 checks), and
`node tools/test-repo-hygiene.mjs` passed. `npm.cmd run build` passed.

`node tools/test-review-evidence.mjs` passed 8 of 9 tests on both runs. Its
audio-analysis test failed because FFmpeg could not start (`spawnSync ffmpeg`
returned `EPERM`). The lane tier (`node tools/run-tests.mjs --tier lane --changed
--jobs 4`) passed 12 suites, then stopped in `tools/test-circuit-eifel.mjs`
when FFmpeg loudness measurement failed; 34 suites did not run. The single
same-commit rerun of that suite failed at the same FFmpeg call. No frame check
or browser check applies to this uninstalled art.

## Changed assertions

Added a TOWN-ART-VANE check for the six node names, lamp node, per-building
triangle caps, file size and one usable `TEXCOORD_0` UV channel. It first caught
a duplicate text UV channel. `town-vane.py` now reuses its existing UV layer;
the check passes. No existing assertion was changed or weakened.

## Removed

Removed the generator's unnecessary `photo_model` import and its dependency on
an ignored reference image at build time. The measured dimensions remain in the
recipe, and the approved source reference remains in the round 1 comparison.
Fixed meshes are joined by building and material, reducing the family from
hundreds of separate objects to 34 mesh primitives. The named tower lamp stays
separate.
