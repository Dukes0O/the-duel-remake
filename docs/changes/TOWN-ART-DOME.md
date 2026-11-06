# TOWN-ART-DOME

## Changed

- Widened the road-side wall opening; corrected the road view and removed road tracks and hanging chains.
- Lowered the sign bridge onto bus-roof height. Removed surface details that fought with the bus-front photos; kept wheels and bumpers.
- Mapped the bus fronts across the full 2.5 m by 4.4 m front faces. Used the valid left-front crop on both noses. Switched full-length sides, roof and rear to the 2 m repeating red-paint photo to remove mapped pink streaks.
- Changed the outer wall to twelve mirrored UV spans with safe wrap coordinates. Reduced grounded wrecks to eight and added a tarp at the wall foot.
- Exported and reviewed the model from an empty Blender scene. Added round 6 sheet and review.

## Checks

- Blender export and sheet render: passed. `dome.glb` is 1,213,824 bytes.
- `node tools/test-blender-output.mjs`: passed, 251 checks.
- `node tools/test-repo-hygiene.mjs`: passed. It reported existing advisory size targets in unrelated files; no placement or sheet-size failures.
- GLB audit: 39 primitives, each has only `TEXCOORD_0` with a non-zero range; 12 embedded images, separate textures, no atlas, maximum metallic factor 0.22.
- Browser and in-game look checks: not run; Claude should review the road, mayor and 40 m wall views in `docs/board/looks/town-art-dome/round-6.jpg`.
- Changed assertions: none. Race fingerprints: not applicable to art-only work.

## Removed

- Removed round 4 and round 5 review sheets and notes, superseded by round 6.
- Removed unsupported floating wall wrecks, duplicate bus windows/radiators/bars, hanging sign chains, curved road tracks and guard rails.
