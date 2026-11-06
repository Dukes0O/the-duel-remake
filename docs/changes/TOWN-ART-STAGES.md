# TOWN-ART-STAGES round 4

## Changed

- Kept the round 3 `scaffold-2` frame and added the requested deck wear: darker stain patches, scattered planks and a small tool pile. Added foundation trenching, spare blocks and spoil at ground level.
- Made `scaffold-1` a pegged and strung plot, `scaffold-3` an open framed building with scaffold, and `scaffold-4` a partly clad building with patched tin roofing and a scaffold bay coming down. All sit within their cell footprints and have no ground plate.
- Reworked the rubble and burned families with larger debris fields, fallen tin and collapsed members. Reused the credited town photos in `public/assets/models/wasteland/town/textures/`; no new runtime picture was added.
- Added individual street prop renders and retained each required named root and emissive `:lamp`/`:ember` part.
- Normalized recipe UV layer names to `UVMap`. The test now reads UV float data from the exported GLB and checks that every material primitive has only `TEXCOORD_0` with values spanning both axes.
- Added `round-4.jpg` (265,526 bytes). Its model images were rendered from the exported GLB imported into an empty Blender scene. The sheet includes the round 3 construction photo beside the stage views and the charred timber photo tile beside the ruin.
- Final family GLB: 1,964,028 bytes and 59,444 triangles; below the 3 MB and 60,000 triangle limits.

## Checks

- Blender recipe, GLB export and review renders: passed.
- `node tools/test-blender-output.mjs`: passed, 238 checks. Includes ids, family size, triangle budget and UV checks.
- Two earlier exports exceeded the 60,000-triangle cap; optional tin and debris were trimmed until the final GLB passed at 59,444 triangles.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets remain advisory.
- Browser and in-game look checks: not run in this lane. Claude should review: whether the 1-to-4 stages read as a clear progression; the stage 3 and 4 frame thickness; the ruin's charred darkness and rubble density; each street prop at town scale; and the mayor view's deck contrast and clutter.
- Changed assertions: none were weakened. Added a GLB UV-range assertion that reads the binary accessor values because this Blender export omits accessor `min`/`max` metadata. No race or simulation code changed; race fingerprints are unchanged.

## Removed

- Replaced the prior candidate `stages.glb` in place; kept no backup.
- Removed this run's raw Blender renders, test logs and sheet-building scratch file after creating the review sheet. No game code, player data or credited texture source was removed.
