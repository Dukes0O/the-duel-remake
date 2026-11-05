# BOWL-ART-TRUCKS

The short board entry controls current state, ownership, dependencies and locks.

Rival trucks, design sections 7 and 9.

**Files you own:** `tools/blender/bowl-trucks.py`, `public/assets/models/wasteland/bowl/trucks.glb`, `docs/board/looks/bowl-art-trucks/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** Bolt-ons fitted to `titan_monster`'s sockets: Rust Rhino's horn, Big Kettle's boiler, Tin Lizard's tail, Old Bess's tanks, Dragon Wagon's flame stacks, plus paints. Own names only, no real monster truck names. 8,000 triangles each, 1 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/bowl-art-trucks/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-ART-TRUCKS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
