# WW-ART-CREW

The short board entry controls current state, ownership, dependencies and locks.

The small props for `docs/story/the-notice-board.md`. Most of this strand happens in places already on the map.

**Files you own:** `tools/blender/crew-favours.py`, `public/assets/models/wasteland/scablands/crew-favours.glb`, `docs/board/looks/ww-art-crew/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-CREW.md` with a Removed section. Pictures the recipe needs go in `public/assets/models/wasteland/scablands/textures/` with a `CREDITS.md` line.

**Recipe,** each a named part:
- `regret-door`, `regret-bonnet`, `regret-engine` (with a stubborn little tree growing through it) and `regret-wheel`, bits of one sun-faded red old car, from the game's own car models.
- `dynamite-box`: a wooden crate, dark with damp, with old paper-wrapped sticks showing and a hand-written label reading SMALL.
- `open-engine`: a big old engine on a stand with its head off, so you can see the pistons, in the Boneyard, and a bird's nest in its exhaust pipe.
- `wren-flag`: a small rag on a thin pole. Rook, Dune, Tusk and the rest should know it for Wren's, so give it a little knot of yellow.
- `dune-airliner`: an airliner like those in the Boneyard, reuse it, with a fallen ladder at the foot and a small camp on the wing.
- `gerald` and `gerald-box`: a real-looking desert lizard about 30 cm long, from a wildlife donor, and a box with holes in it. A person should not mistake this lizard for a toy.
- `piano-upright`: an old upright piano on Big Bess's bed, roped down, one panel gone.
- `jax-harpoon`: a real old whaling harpoon about 2.5 m long, oak and iron, hung head down on a wall, with a shoe-shop sign behind it.
- `ash-hat`: the small hat, on a walker. It should be slightly too small.

Show each from car height at 8 m on one sheet, in even overcast light, and name each on the sheet. Render the sheet from the exported GLB imported into an empty Blender scene, because glTF cannot carry Blender's node maths. Use `make_materials` and `export_glb` from `tools/blender/town_base.py`. Keep metallic at or under 0.3.

Budget: 40,000 triangles, 2 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Generate a photo of each real thing first, and judge your model beside it.

**Rounds:** one rendered sheet each, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key. No lane tier and no build: those are Claude's.

## Claude answers
