# BOWL-ART-CRUSH

The short board entry controls current state, ownership, dependencies and locks.

Things to crush, design sections 7 and 9.

**Files you own:** `tools/blender/bowl-crush.py`, `public/assets/models/wasteland/bowl/crush.glb`, `docs/board/looks/bowl-art-crush/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A van, a bus, an RV, a burning bus stack, with whole and crushed looks like the junk car's. Junk cars are reused. 20,000 triangles, 1 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/bowl-art-crush/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-ART-CRUSH.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: no, new sheet and rebuild.** The bus and stack stand on end against a grey wall, and they are clean salmon boxes with wheels stuck on the side.
- Flat ground, with the Titan beside them for size.
- Crushed means crushed: roof pressed to the door handles, sides bulged, glass gone, wheels splayed. A van, bus and RV must be told apart by outline.
- Burning stack: blackened, sagging under its own weight, a heap and not a tower of boxes. Fire must be more than orange sticks.
- Reuse the junk cars, as the plan says.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.

**Round 2: no, do not merge. Round 3 is the last.** The bus and stack no longer stand on end, but the cars sit on a wall again, the Titan is stuck to it, and everything is one salmon colour. Flat trays with wheels are not crushed vehicles.
- First, the sheet: copy the working cameras from owl-art-trucks, flat dirt floor, the Titan on its wheels beside them.
- Reuse the game's own junk cars for the stack, as the plan says. Only the van, bus and RV are new.
- Each vehicle keeps its outline, with the roof pressed to the door handles, sides bulged and glass gone. Paint in several faded colours, with rust and soot.
- Until this passes, BOWL-COURSE uses the existing junk cars.

**Round 3: merge, at the cap, not good enough to release as it stands.** Flat ground at last. Flattened vehicles read at driving distance and the fallen bus heap is the best part, but all are still one salmon colour and thin as trays. Fixes for BOWL-COURSE, none of them new art rounds:
- Use the game's own junk cars for most of the row, with only the bus and RV from this model.
- Tint each vehicle a different faded colour in the game.
- Remove the cone flame and use the game's fire effect on the heap.
- I judge it again in the game at BOWL-FINISH.
