# HELI-FIRE-BUCKET

Make the firefighting water bucket for Kestrel One's cable, as a Blender recipe.

Owner: Claude (ART; built by the main design session, 14 October 2026).
Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds
state, needs and locks.

Packet section 14, the bucket contract: recipe `tools/blender/fire-bucket.py`,
output `public/assets/heli/fire-bucket.glb`. Orange and black fabric body,
steel rim, release valve, four rigging lines to a top ring; origin at the top
ring, +Y up, metres; about 1.1 m across, body 1.3 m tall, rigging 2.5 m.
Nodes `bucket`, `rigging`, `valve`, `water` (full shows it at the rim, empty
hides it, the game moves it by fill) and `bucket_dented` (hidden by default).
At most 3,000 triangles and 1K textures, PBR. At most three rounds, sheets
under `docs/board/looks/heli-fire/`. No game code.
