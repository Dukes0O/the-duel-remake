# TOWN-ART-FUN round 5

Rebuilt the tavern from the start using `carve_object` with separate side, front, rear and overhead photos. The two-metre doorway set the scale. A `keep` cut leaves the entry open, with a separate dark interior panel behind it. The crashed pickup is a second four-photo carve under `tavern:truck`; its bounds overlap the tavern and its wheels reach the ground. The rest of the family, including the fountain and big wheel, was left unchanged.

The exported family GLB is 2,624,908 bytes. Bounds from Blender XYZ: tavern X -3.450 to 3.838 m, Y -3.080 to 3.065 m, Z 0.020 to 6.680 m; truck X -2.913 to -0.357 m, Y 0.482 to 6.188 m, Z -0.018 to 2.818 m. The truck overlaps the tavern bounds. Tavern ground contact is within half the 0.045 m carve voxel; truck contact is within the 0.035 m voxel.

The first Blender-output check found 8,044 tavern-family triangles against the 5,000 limit. Reduced the body and truck carve targets, regenerated the GLB, and reran the check successfully. No assertions changed. Added the top-view `forward` pixel-order fault to `docs/ART_LINE.md`.

**Checks:** Blender 4.5.13 export and imported-GLB renders completed. `node tools/test-blender-output.mjs` passed, 336 checks, 0 failed after the triangle-budget correction. `node tools/test-repo-hygiene.mjs` passed; repository size targets are advisory. `node tools/test-review-evidence.mjs` failed twice at the unrelated audio-analysis case because `spawnSync ffmpeg` returned EPERM; the other 8 subtests passed each run. No lane tier or build ran, as directed. Browser checks were not run; Claude should inspect the round-5 sheet and the photo/model comparisons listed in its review note. No race fingerprints apply to this art-only change.

## Removed

- Replaced the one-photo tavern carve table and removed its obsolete `tavern.jpg` source.
- Deleted the round-4 sheet and its review note as requested.
- No fountain, wheel, game runtime code or test assertions were removed or changed.
