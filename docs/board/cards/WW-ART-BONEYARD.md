# WW-ART-BONEYARD

The short board entry controls current state, ownership, dependencies and locks.

The airliner graveyard, design section 3 and 9.

**Files you own:** `tools/blender/scablands-boneyard.py`, `public/assets/models/wasteland/scablands/boneyard.glb`, `docs/board/looks/ww-art-boneyard/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** An original generic airliner hull broken into pieces, tails up, wings off, one or more hulls open at both ends and wide enough to drive through (5 m clear), low wings that make natural jumps, engine pods on the ground. No airline names. 45,000 triangles, 2 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-boneyard/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-BONEYARD.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: not yet, go to round 2, with a new sheet.** "Yard quarter" looks straight down with the ground as a tilted slab; "Open hull" has empty space under the ground.
- The body is a square box. Make it a round tube, with ribs showing at the torn open end.
- Wings are flat slabs with square tips: taper them, break the ends, let flaps hang. Keep the low wing jump shapes and the 5.1 m clear width.
- The tail is a stick with a box on it: make a swept fin, the landmark seen from far off. Engines are good, keep them.
- Airliners are aluminium, so they do not rust orange all over: faded white paint, grey metal, soot, with rust only on steel parts.
- Show the drive-through from inside at car height. Add a proper field of scrap, with larger pieces.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.
