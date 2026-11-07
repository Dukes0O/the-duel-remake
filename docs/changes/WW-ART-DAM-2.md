# WW-ART-DAM-2

## Changed

Added measured side and axle-end reference photos for a heavy riveted dam-gate hoist wheel. The Blender recipe builds the two existing 3.15 m wheels with `lathe`, uses the end photo for the .59 m rim, and traces the photographed steel support plates and cross braces with `slab`. The wheel centers remain at x = -7.5 and 7.5, y = 60.3, z = -62.75. Only the gantry and its wheels changed; the silt, spillway, dam face, gates, shed and gatehouse were not edited.

The source photos remain full resolution beside the dam textures. The recipe scales only the embedded GLB copies to 256 px on the long edge to stay within the file budget.

## Checks

- Blender 4.5.13 export and GLB reimport render: passed. Read back 55,688 triangles and 3,132,988 bytes (under 60,000 triangles and 3 MiB).
- `node tools/test-blender-output.mjs`: passed, 347 checks; 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- Browser/look check: Claude to review the wheel/photo match, lower frame seam, end-on rim depth, crest-height gantry view and 60 m dam view on `round-1.jpg`.
- Changed assertions: none.
- Race fingerprints: not applicable; no simulation or gameplay code changed.
- Lane tier and build: not run; this art card assigns them to Claude.

## Removed

Removed the old thin torus wheels, narrow hubs and ten delicate spoke beams. Replaced the previous gantry legs and light braces with a heavier cross-braced frame and traced wheel support plates. No unrelated dam parts or files were removed.

## Round 2: the old gear and its silt, finished by Claude

The silt is one heap laid out in rings round the gear, about 14 m across, highest against the gear, with a ragged round edge at ground height and no straight edge. The gear is now traced from `sea-old-gear.jpg`, the old gear that passed on WW-ART-SEA, 7 m across, tilted and sunk with its centre 1.05 m below the ground. About one tooth in four is broken off at its own depth, and the rim is eaten unevenly. Its embedded copy is 320 px. The file reads back at 3,128,212 bytes, under the card's 3 MiB.

### Removed

The six smooth silt blobs, the regular ring gear with its separate tooth blocks, and the rotten-tooth picture, which the traced gear does not need.
