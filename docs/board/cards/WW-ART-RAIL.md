# WW-ART-RAIL

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/there-is-no-2-15.md` sections 1 to 3 and 6. **Files you own:** `tools/blender/rail-trains.py`, `public/assets/models/wasteland/rail/rail-trains.glb`, its sheet and note, one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-RAIL.md` with a Removed section.

**One at a time, in this order. Start with the first and make it pass.**
- `the-2-15`: a real works passenger engine of about 60 tonnes, with three old wooden-bodied carriages and a guard's van, dead for decades, blasted pale by salt, half under a drift, with its doors open. Two states: buried, and dug out. This is the picture the whole strand turns on.
- `wednesday`: a very small saddle-tank shunting engine, 30 tonnes, about the size of a shed, with a dented chimney.
- `coal-heap`: a sand heap with coal showing, in three depths, with Wednesday under it.
- `token-ring`: a real brass single-line token and its hoop, big enough to read from the cab. `hook-and-ladle`, the ring on a hook by a ladle, for Old Tam's kitchen.
- `pim-mark`, a white platform mark, `brake-board`, `sand-drag`, `branch-post`, and `bare-lever`, the points lever under a heap.
- `case-*`: the load props for Lost Property, one each: chalk box, coffee tin, small horseshoe magnet with a tag, ticket punch, two sums books, jam jar of teeth, forge gloves, paper megaphone, very good umbrella, case fourteen, tin car. Each large enough to read on a car roof, as the game's other load props are.

Budget: 80,000 triangles, 5 MB, read back from the glb. Original designs, gritty and heavy, never toy-like, except the tin car.

Render each sheet from the exported GLB imported into an empty Blender scene, beside its generated photo at the same angle. Use `make_materials` and `export_glb` from `tools/blender/town_base.py`, no atlas, metallic at or under 0.3. Project the photo from a matching camera with planar UVs, and do not tile swatches. Name every mesh's picture layer `UVMap` before joining, and check the GLB has only `TEXCOORD_0`, with values covering a range. Recipe pictures go in `public/assets/models/wasteland/rail/textures/` with a `CREDITS.md` line. `town_base.cube` size is (x, y, z), with y up. **Build one piece really well before the rest** (art lesson 9). **Rounds:** up to six (Kyle, 5 November), keeping only the last sheet and note, `docs/board/looks/ww-art-rail/round-N.jpg` with `round-N-review.md` beside it, JPG at most 500 KB. Art jobs do not run the lane tier or a build.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`. No frame timing on art. Not wired into the game here. No new dependency, network request or key.

Design: [docs/story/there-is-no-2-15.md](../../story/there-is-no-2-15.md), [docs/story/iron-mule.md](../../story/iron-mule.md) and [docs/MACHINES.md](../../MACHINES.md) section 2. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice in the change note and carry on with it.

## Claude answers
