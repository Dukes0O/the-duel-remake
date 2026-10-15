# SKIN-ART-GEAR (part 1)

Claude, 14 October 2026. `tools/blender/skin-gear.py` builds six original
gear models into `public/assets/heli/gear/` (drop-sight, heat-camera,
zoom-camera, nose-camera, cargo-net, main-rotor-quiet), each with its origin at
its mount point. Two rounds; sheet and verdict in `docs/board/looks/heli-skins/`.
Not loaded until SKIN-VIEW.

Still to do on this card (part 2): add the `mount_nose`, `mount_belly` and
`mount_side_right` empties to `tools/blender/kestrel-one.py` at the positions in
the review note, after the H1 release (the H1 session is preparing a release
that ships `kestrel-one.glb`, so the model stays untouched until then).

Changed assertion: `tools/test-blender-output.mjs` lists the new recipe in its
generator table. No existing check changed.

Tests: lane tier and build. No game code.

Removed: nothing.
