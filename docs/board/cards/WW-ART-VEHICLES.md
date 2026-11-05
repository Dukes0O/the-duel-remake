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
