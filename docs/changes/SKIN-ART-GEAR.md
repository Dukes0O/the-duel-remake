# SKIN-ART-GEAR (part 1)

Claude, 14 October 2026. `tools/blender/skin-gear.py` builds six original
gear models into `public/assets/heli/gear/` (drop-sight, heat-camera,
zoom-camera, nose-camera, cargo-net, main-rotor-quiet), each with its origin at
its mount point. Two rounds; sheet and verdict in `docs/board/looks/heli-skins/`.
Not loaded until SKIN-VIEW.

Changed assertion: `tools/test-blender-output.mjs` lists the new recipe in its
generator table. No existing check changed.

Tests: lane tier and build. No game code.

Removed: nothing.

## Part 2: the three mount empties

Claude, 15 October 2026. `tools/blender/kestrel-one.py` now adds `mount_nose`,
`mount_belly` and `mount_side_right`, parented to the root `kestrel_one` like
`cable_hook` and `pilot_eye`, with no rotation (the same frame as the gear
files). `public/assets/heli/kestrel-one.glb` was rebuilt from the recipe.

The numbers in the part 1 review note hung in the air, so each mount moved onto
the body surface (glTF metres, +Y up, nose toward +Z; measured by casting rays
at the built model):

| Mount | Part 1 note | Final | Body surface there |
|---|---|---|---|
| mount_nose | (0, 0.85, 2.30) | (0, 1.08, 2.30) | chin underside y = 1.083 |
| mount_belly | (0, 0.76, 1.50) | (0, 0.74, 1.50) | belly underside y = 0.737 |
| mount_side_right | (-0.78, 1.55, 0.45) | (-0.60, 1.55, 0.45) | hull side x = -0.604 |

The same three values were updated in the comment of `tools/blender/skin-gear.py`
and in `docs/board/looks/heli-skins/round-2-review.md`. The gear GLBs do not
carry these numbers (each file's origin is its mount point), so none were
rebuilt.

Model check: still 12,580 triangles; the nine original nodes keep their names
and positions; the only new nodes are the three mounts at the positions above.
The rebuild is not byte for byte the old file: the vertex and material data are
the same, but 215 float values differ by at most 2e-7 m and some triangle index
lists are in a different order. The geometry is unchanged.

Quick look: one Blender render each of the nose camera, belly drop sight and the
rescue winch mounted at the three empties (review picture only, under
`.evidence/`, not committed). Nose camera and drop sight sit on the hull. The
winch (RESCUE-PROPS) has its arm reaching along +X, which is toward the hull on
the right side (-X), so with no rotation the arm points into the cabin; the game
must turn the winch half a turn about the vertical axis (or mirror it) when it
is fitted at `mount_side_right`. Turned that way it sits on the hull with the
arm reaching outward. The searchlight is a belly light and uses `mount_belly`.

Tests: `node tools/test-blender-output.mjs` (71 checks), `test-heli-view` (98),
`test-heli-mode` (154), `test-fire-view` (50) and `test-repo-hygiene` pass, then
the lane tier (32 suites passed, 0 failed, 1,013 s) and `npm run build` (built). No release or frame-check hold was open in the inbox. No assertion changed; no test pins the
model's node list. No game code changed.

Removed: the part 1 "still to do" paragraph (it is done now). No code or model removed.

