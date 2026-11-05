# WW-ART-VEHICLES

The short board entry controls current state, ownership, dependencies and locks.

Story vehicles, design sections 5 and 9.

**Files you own:** `tools/blender/scablands-vehicles.py`, `public/assets/models/wasteland/scablands/vehicles.glb`, `docs/board/looks/ww-art-vehicles/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** Big Bess, a slow bulbous gas truck; Old Smoke's rolling furnace with three side vents as named parts and glow looks, chimney, on great iron wheels; a thin thief buggy. 12,000 triangles each, 1.5 MB. Shape like the tanker recipe `tools/blender/convoy-tanker.py`.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-vehicles/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-VEHICLES.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: no, new sheet and rebuild.** One view with the ground standing as a wall and the three vehicles piled together, so it cannot be judged. What shows is a barrel on boxes.
- One clear view per vehicle, wheels on flat ground, beside a yard car. (The builder's scores say no reference exists: use the items below.)
- Big Bess: start from the shipped convoy tanker's recipe; a long banded tank and a cab, scarred and sooty, no clean cream.
- Old Smoke's furnace is the final chase: huge and frightening, with a chimney, glowing doors and heavy wheels.
- Thief buggy: light open frame, plainly fast, plainly a different size from the other two.
- No model on the branch yet.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.
