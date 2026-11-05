# BOWL-ART-REX

The short board entry controls current state, ownership, dependencies and locks.

The show's dinosaur, design sections 7 and 9.

**Files you own:** `tools/blender/bowl-scrapasaurus.py`, `public/assets/models/wasteland/bowl/scrapasaurus.glb`, `docs/board/looks/bowl-art-rex/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A two-storey dinosaur of crushed cars and girders, on a rail bogie, jaw and tail on bones, three battery boxes on its back as named parts with whole and smashed looks. Scary, funny, gritty. 60,000 triangles, 2.5 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/bowl-art-rex/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-ART-REX.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: no, go to round 2.** It lies on its side in the picture and the views are cropped, and what shows is a ladder of girders, not a dinosaur. The bolted frame and wheels are good material, so keep them inside the body.
- First, the sheet: copy the working cameras from owl-art-trucks, feet on a flat floor, the Titan beside it, the whole animal in frame.
- The test: its black outline from the side must read as a dinosaur to a child. Big head, open jaw with teeth, thick neck, heavy legs, long tail.
- Build the skin from crushed car bodies, bonnets and doors over the frame. Headlights for eyes.
- The battery boxes must be seen as targets from the truck, but the two small dots on each make them look like cartoon faces. Remove the dots, and use bright cables and hazard paint instead.
- Show jaw and tail moving (two poses) and the fire breath's nozzle. Commit public/assets/models/wasteland/bowl/scrapasaurus.glb and read back its size: no model is on the branch yet.
