# WW-ART-FOLK

The short board entry controls current state, ownership, dependencies and locks.

People, design section 9.

**Files you own:** `tools/blender/scablands-folk.py`, `public/assets/models/wasteland/scablands/folk.glb`, `docs/board/looks/ww-art-folk/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** Re-dress from `tools/blender/crew-fighters.py` and art-library donors: Auntie Solder, Moss, three townsfolk who stand and turn, and Ash Men raider looks (grey, soot, goggles), rigged as the raiders are so `src/raiders.js` can use them. Not a new fighter rig. 8,000 triangles each, 2 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-folk/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-FOLK.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: no, start again.** These are toy dolls: big round heads, sausage arms, ball hands. That breaks "never toy-like", and I agree with the builder's 2 of 10.
- Start from the real body in 	ools/blender/crew-fighters.py, as the card says, with its proportions, hands and neck. Check beside a shipped crew model.
- Everyone has the same outline. Auntie Solder and Moss must be told apart by shape alone: height, build, and clothes such as a welder's mask and apron.
- Ash Men should look like a threat from far off: long grey dust coats, scarves, goggles, soot.
- One row, larger, on a mid-tone ground, side by side with a crew model.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.
