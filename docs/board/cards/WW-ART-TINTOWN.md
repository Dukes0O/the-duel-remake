# WW-ART-TINTOWN

The short board entry controls current state, ownership, dependencies and locks.

Tin Town, design section 3 and 9.

**Files you own:** `tools/blender/scablands-tintown.py`, `public/assets/models/wasteland/scablands/tintown.glb`, `docs/board/looks/ww-art-tintown/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** Tin shacks stacked on scaffolds around a cold forge with a great chimney, narrow alleys 2 to 3 m wide with collision boxes for the walkable ground, washing lines, a notice board, three forge lamps as named parts with a lit and an unlit look. 60,000 triangles, 2.5 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-tintown/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-TINTOWN.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: not yet, go to round 2.** Reads as crates with plank lids on a dirt pad, not a town built of tin.
- Roofs: rusted corrugated sheet at different slopes, overhanging and patched. Remove the hard black stripes between panels.
- No two shacks the same size or square to each other. Add doors and windows at person height so walking scale reads.
- The scaffold braces, upper walkways, washing lines and notice board cannot be seen in any view. Build them and show them.
- The Cold Forge view shows roofs. The forge is the centre of town: a big stack, a hearth and an anvil, framed on its own.
- Lose the straight-cut edge of the pad; drift sand against the walls.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.
