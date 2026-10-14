# FIRE-BURNT-LOOK (part 1 of 2)

Claude, 14 October 2026 (main design session).

- `tools/blender/burnt-forest.py` and
  `public/assets/burnt/tremblant-woods/burnt-props.glb` (2,760 triangles):
  scatter props for the burnt course: three charred snags, a fallen log, a
  stump, green shoots (stage "shoots") and a fireweed clump (stage
  "fireweed", under 300 triangles). Two rounds; sheet and verdict in
  `docs/board/looks/burnt-forest/`.
- Still to do (part 2, same card): charred versions of each tree Tremblant
  Woods places, and the ground looks per stage, with the four-stage sheet from
  the Lakeshore straight and from 150 m (packet section 14).

Tests: lane tier and build. No game code.

Removed: nothing.

## Part 2 (same day)

- `tools/art/burnt-ground.py` and three tiling 1K ground textures in
  `public/assets/burnt/tremblant-woods/`: `ground-black.jpg`,
  `ground-shoots.jpg`, `ground-fireweed.jpg` (one per stage in packet
  section 8.4). Sheet and verdict: `docs/board/looks/burnt-ground/`.
- Charred trees: Tremblant Woods' forest is drawn in code (the scenery
  `forest` rows and hill pines), not placed as tree models, so charring it is
  drawing work: FIRE-VIEW hides the crowns and colours the trunks charcoal
  (linear about 0.012, 0.011, 0.010, roughness 0.55, matching
  `burnt-props.glb`), and scatters the snags among them. Written on FIRE-VIEW.

Tests: lane tier and build. No game code.
