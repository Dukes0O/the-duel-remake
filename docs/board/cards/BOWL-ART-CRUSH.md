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
