# TOWN-ART-TRUCKS-1

## Changed

- Removed the water tanker's two black raised walkway strips. The hatch stays on the tank, and tanker fittings are now parented to the tanker root so they do not appear in other truck renders.
- Corrected the supply cargo overhead mask crop, excluded the neighboring vehicle edge from the body mask, and kept all family fittings under their own truck roots.
- Removed the photographed hook block and hoist line from the tow boom mask, leaving the separately built named hook and cable. Small disconnected photo-mask flecks under 35 pixels are ignored.
- Added three new mask and parenting lessons to `docs/ART_LINE.md`.

## Checks

- Blender render from imported GLB: passed; 40,882 total triangles. Family GLB: 3,289,624 bytes. Review sheet: 221,936 bytes.
- `tools/test-blender-output.mjs`: passed, 312 checks.
- `tools/test-repo-hygiene.mjs`: passed.
- `tools/test-review-evidence.mjs`: 7/9 subtests passed; one older `town-art-power/round-4.jpg` note is missing, and the audio subtest cannot start `ffmpeg` (`EPERM`). Both failed again on the single rerun. Its round JPG publication check passed.
- Browser and in-game look checks: Claude should judge round 13; no browser run in this art lane.
- Changed assertions: none. Race fingerprints: not applicable; static art only.

## Removed

- Round 12 sheet and note are removed. Round 9 is retained.
- The tanker walkway boxes and duplicated tow hook pixels are removed from the recipe.


