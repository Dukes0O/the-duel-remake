# TOWN-ART-SERVICES — round 3

## Changed

- Replaced the Town Hall flat front facade with a `carve_object` body using the
  existing measured side, front, rear and top photos. The carve uses a 3,000
  triangle target and 0.09 m voxels.
- Removed the Scrapyard's front and overhead photo slabs, which hid the gantry
  and yard. Removed the Workshop's photo roof plate.
- Rebuilt `services.glb` at 2,521,920 bytes (2.40 MiB), below both the 3 MB card
  budget and 8 MB family limit.
- Added `round-3.jpg` (406,607 bytes) and this round's review. The sheet includes
  the four featured buildings and a three-quarter view of each of the twelve
  named building roots.

## Checks

- `node tools/test-blender-output.mjs`: **309 checks, 0 failed** after lowering
  the Hall carve target. The first run found the Hall at 9,621 triangles,
  621 over its plot budget; the target reduction fixed this without changing
  assertions.
- `node tools/test-repo-hygiene.mjs`: **passed**. Reported repository size
  targets are advisory.
- Blender 4.5.13 exported the GLB and rendered the imported-model review views.
  Its command exited 1 after all renders because the final status print used
  an undefined variable; the variable was corrected in the recipe afterward.
  The final GLB was produced by the same corrected geometry before that print.
- No browser checks, lane tier or build were run. Claude should do the look
  review described in `round-3-review.md`.
- No assertions were changed. Race fingerprints: not applicable to this
  art-only family.

## Removed

- Removed the Hall's flat front slab, the Scrapyard's photo front and overhead
  slabs, and the Workshop's overhead photo plate.
- Removed the older round-1 and round-2 sheets and round-2 review note after
  using round 2 as the starting reference.

## Remaining work

The round review records the unfinished forge roof, scrapyard lattice and
carving, missing side/rear/overhead photo sets and carves for Forge and
Workshop, and remaining buildings that still need their own photo sets.
