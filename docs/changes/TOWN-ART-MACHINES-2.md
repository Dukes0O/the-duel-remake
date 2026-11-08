# TOWN-ART-MACHINES-2 — round 9

## Changed

- Restored round 7's single whole-truck carve. Generated and credited drum-free side, front, rear and straight-down photos of the bonneted worn yellow truck; padded the end photos so mask edge seeds land on grey ground.
- Removed round 8's unused cab photos and credit entry. Removed duplicate procedural body pieces already shown in the carve. The drum remains a lathe under the sole `mixer-truck:drum` pivot, with a closed front cone and open rear mouth. Wheels use `tyre` and front-photo spacing; the chute keeps its own pivot.
- Added a channel cut to preserve the open space between the chassis rails. The orthographic review renders hide the separate drum to match the photos; rest/work renders show the assembled machine.

## Checks

- Blender 4.5.13 export and imported-GLB comparison renders completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run).
- Family GLB: **4,107,232 bytes**, under 8 MB. Mixer: **11,644 triangles**, under 15,000. Wheel lower bounds are 0 m. Drum and chute bounds overlap the carved body envelope.
- `round-9.jpg`: **285,744 bytes**, under 500 KB. It compares side, front, rear and top references with matching body-only views, and includes assembled rest/work poses.
- No assertions changed. No gameplay code changed; no race fingerprints apply.
- Browser checks were not run. Claude should judge side quality against round 7, projection seams and lower-frame panels, front/rear symmetry, wheel stance, drum ends and drum/chute movement.

## Removed

- Removed four unused round 8 cab photos and their credit entry.
- Removed the round 8 cab-only and duplicate chassis/fitting recipe in favor of the whole-truck carve. Retained the isolated drum photo and its credit.
