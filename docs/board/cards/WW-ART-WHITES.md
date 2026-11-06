# WW-ART-WHITES

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/there-is-no-2-15.md` section 6, The Whites. **Files you own:** `tools/blender/rail-whites.py`, `public/assets/models/wasteland/rail/whites.glb`, its sheet and note, one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-WHITES.md` with a Removed section.

**One at a time, in this order. Start with the first and make it pass.** Each from car height.
- `works-platform`: a small station on a salt plain, with a clock with no hands, and a tin canopy.
- `salt-pan`: a pale square pan with crust and low walls. `salt-heap`.
- `dead-conveyor`: a long rusted conveyor on legs, with its belt rotted away.
- `canteen`, `school-hut`, `pay-office`: three plain works huts with their doors open and everything stripped by the wind.
- `vane-fence`: a tall fence with a very clean white Vane sign on it, the only clean thing in the place.

The ground is near white and it must look nothing like the Scablands. Budget: 60,000 triangles, 5 MB, read back from the glb.

Render each sheet from the exported GLB imported into an empty Blender scene, beside its generated photo at the same angle. Use `make_materials` and `export_glb` from `tools/blender/town_base.py`, no atlas, metallic at or under 0.3. Project the photo from a matching camera with planar UVs, and do not tile swatches. Name every mesh's picture layer `UVMap` before joining, and check the GLB has only `TEXCOORD_0`, with values covering a range. Recipe pictures go in `public/assets/models/wasteland/rail/textures/` with a `CREDITS.md` line. `town_base.cube` size is (x, y, z), with y up. **Build one piece really well before the rest** (art lesson 9). **Rounds:** up to six (Kyle, 5 November), keeping only the last sheet and note, `docs/board/looks/ww-art-whites/round-N.jpg` with `round-N-review.md` beside it, JPG at most 500 KB. Art jobs do not run the lane tier or a build.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`. No frame timing on art. Not wired into the game here. No new dependency, network request or key.

Design: [docs/story/there-is-no-2-15.md](../../story/there-is-no-2-15.md), [docs/story/iron-mule.md](../../story/iron-mule.md) and [docs/MACHINES.md](../../MACHINES.md) section 2. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice in the change note and carry on with it.

## Claude answers
