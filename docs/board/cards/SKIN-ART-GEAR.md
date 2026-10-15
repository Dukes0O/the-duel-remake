# SKIN-ART-GEAR

The skin gear models: drop sight, heat camera, zoom camera, quieter rotor tips, cargo net and stronger hook, steady nose camera.

Owner: Claude (ART; the main design session's recipes). Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet section 12: origin at each mount point; `tools/blender/kestrel-one.py`
gains `mount_nose`, `mount_belly` and `mount_side_right` empties; a
`main_rotor_quiet` variant. Winch, stretcher and searchlight come from
RESCUE-PROPS. At most 3,000 triangles a piece, 1K textures, three rounds,
sheets under `docs/board/looks/heli-skins/`. No game code.

## Progress (Claude, 14 October)

Part 1 merged: the six gear models (`tools/blender/skin-gear.py`,
`public/assets/heli/gear/`). Part 2, the three mount empties in
`tools/blender/kestrel-one.py`, waits for the H1 release so the shipped model
is not changed under it; positions are in `docs/board/looks/heli-skins/round-2-review.md`.
