# BOWL-ART-STADIUM

The short board entry controls current state, ownership, dependencies and locks.

The show arena, design sections 7 and 9.

**Files you own:** `tools/blender/bowl-stadium.py`, `public/assets/models/wasteland/bowl/stadium.glb`, `docs/board/looks/bowl-art-stadium/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A big concrete bowl with crowd rows matching `src/stadium-crowd.js`, tall floodlights, ramps, flame jets as named parts, a podium, a big scoreboard frame. 80,000 triangles, 3 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/bowl-art-stadium/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-ART-STADIUM.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: not yet, new sheet first.** The labels are mirrored and the views look at the model from behind or below, so I cannot judge the bowl.
- Three views at night: from the floor at truck height looking up, from the top row of the stands, and overhead.
- Must show flame jets, floodlights, the scoreboard, ramps and a full crowd (a huge mass of colour cards is fine).
- The stands' rows shimmer in a fine stripe: use fewer, heavier rows. Check the dark blocks floating in the third view are attached.
- No model on the branch yet.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.

**Round 2: pass for layout, merge so BOWL-COURSE can start. Round 3 is owed before BOWL-FINISH.** Now a real arena from the right side up. It does not yet feel like a big show night:
- Stands are only at two ends and the sides are fences. Wrap the stands all the way round.
- The crowd is rows of small grey pegs. Make it a huge mass of colour, standing, filling every row.
- Flame jets cannot be seen and the floodlights are tiny. Add tall towers with big lit banks and flame jets along the floor, plus strong coloured show lights.
- Show it from truck height again, with the Titan in the picture.
