# WW-ART-KIT

The short board entry controls current state, ownership, dependencies and locks.

Rocks, signs and small props, design section 9.

**Files you own:** `tools/blender/scablands-kit.py`, `public/assets/models/wasteland/scablands/kit.glb`, `docs/board/looks/ww-art-kit/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** Cliff and rock pieces, road signs, the tall radio mast, Ash Men's burnable barricades with whole and burnt looks, the ember pot that sits on a roof, side-job flags. 30,000 triangles, 1.5 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-kit/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-KIT.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: close, one small round more.** Keep the mast and the ember pot.
- Missing from the plan: cliffs and lamps. The Ridge round the whole map depends on the cliffs. Add them. (2,600 of 30,000 triangles used.)
- Barricades read as new timber benches. Build them from welded sheet, tyres, pipe and spikes. The charred one is nearer the mark.
- Rocks have good shapes but are too pale and clean: Scablands tan and dark basalt, half buried.
- Signs: painted scrawl with real words, not raised bars. The job pennant is too small: double it.
- No model on the branch yet.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.
