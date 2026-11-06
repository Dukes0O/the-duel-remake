# WW-ART-DAM-2

The short board entry controls current state, ownership, dependencies and locks.

WW-ART-DAM's round 9 passed for the Iron Mule and Ships in the Sand. Three parts did not pass, and Act 5 needs them. See `docs/board/looks/ww-art-dam/round-9.jpg`.

**Files you own:** `tools/blender/scablands-dam.py`, `public/assets/models/wasteland/scablands/dam.glb`, `docs/board/looks/ww-art-dam-2/round-N.jpg` with `round-N-review.md` beside it, `docs/changes/WW-ART-DAM-2.md` with a Removed section.

1. **The gantry's wheels** look like bicycle wheels. Make them as in the photo: heavy riveted hoist wheels with thick rims, on a real steel frame with cross bracing, rusted, set into the crest.
2. **The silt.** Those smooth discs look like pebbles. `dam:gear-old` needs one irregular heap of dark wet silt that spreads out into the ground with no visible edge, with the gear far more sunk, its teeth rotten and uneven, clogged with silt.
3. **The spillway** is a flat ramp with toys on it. Make it a deep concrete chute against the wall, as on the photo's right side, stained and broken, with raised sides. The wrecks go in `dam:spillway-wrecks` as a separate part: real cars from the game's own models, crushed and rusted, lying in a heap that fills the chute from side to side. SEA-JOBS-2 hides that part and uses solid cars for the job.

Do not change the face, the gates, the filling shed or the gatehouse, which have passed. Render the sheet from the exported GLB imported into an empty Blender scene. Keep metallic at or under 0.3. Budget: 60,000 triangles, 3 MiB, read back from the glb.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`. No lane tier and no build: those are Claude's. Commit the model with every round.

## Claude answers
