# WW-ART-EVERBURN

The short board entry controls current state, ownership, dependencies and locks.

The gas well, design section 3 and 9.

**Files you own:** `tools/blender/scablands-everburn.py`, `public/assets/models/wasteland/scablands/everburn.glb`, `docs/board/looks/ww-art-everburn/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A well head with a rusted cap, a big hand-wheel valve as a named part, a tall flame stack, charred ground dressing. Capped and burning looks as named parts; reuse `src/arsenal` flame textures for the flame. 20,000 triangles, 1 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-everburn/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-EVERBURN.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: close, one small round more.** Right shape, and burning and capped are clearly different. Keep the well head, collar, hand wheel and stack.
- The flame is a solid pink faceted spike. Make it layers: white-yellow core, orange shell, ragged tongues, wider at the base, with no pink.
- The slag ring is a neat circle of same-size bricks, which looks like a toy. Scatter it unevenly, with larger pipe and plate pieces.
- Hide the square slab: sink the base into scorched ground with an uneven edge.
- This is a story landmark seen from across the map. Make the stack much taller, as tall as a building, with guy wires and a ladder.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.

**Round 2: pass for the well, merge.** Tall stack, guy wires, ladder, scattered scrap and a worker for size, all as asked. The well head is the part to keep.
The flame is still pale salmon, my first note last round. This may come from Blender's render colour settings, so judge it in the game once WW-SCENE places it. If it is still pink there, use round 3 on the flame alone: white-yellow core, orange shell, ragged tongues.
