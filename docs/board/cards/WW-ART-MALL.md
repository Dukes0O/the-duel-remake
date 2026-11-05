# WW-ART-MALL

The short board entry controls current state, ownership, dependencies and locks.

The half-buried mall, design section 3 and 9.

**Files you own:** `tools/blender/scablands-mall.py`, `public/assets/models/wasteland/scablands/mall.glb`, `docs/board/looks/ww-art-mall/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** An open, roof-fallen shell, so the on-foot camera always sees the sky; invented shop signs (no real brands); a stuck escalator; sand drifts; Ash Men's lamps as named parts. The heist's path as an empty named line. 50,000 triangles, 2 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-mall/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-MALL.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**Round 1: not yet, go to round 2, with a new sheet.** I agree with the builder's 1 of 5. The views look up from below or through the model, and nothing reads as a mall.
- Show it from the ground: from car height at the entrance, and on foot inside the atrium.
- Needs readable shopfronts with invented signs, the open roof, the stuck escalator and sand drifts. The escalator is the best part, keep it.
- The long orange poles look like strays: remove them, or make them braces that hold something up.
- 12,208 of 50,000 triangles: there is plenty of room for real walls and rubble. No model on the branch yet.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.

**Round 2: no, do not merge. Round 3 is the last.** Still dark tilted views of grey ground, and still not a mall. The entrance view with its three pillars and sand drift is the one good start. The shop signs are not readable in any view.
- First, the sheet: flat ground and level camera, plain daylight. Copy the working cameras from ww-art-tintown (	ools/blender/scablands-tintown.py).
- Large invented shop signs readable from 40 m, shopfronts with broken glass, a floor of cracked tile and sand. Someone must be able to say "that's a mall" from one picture.
- Show the stuck escalator from the floor, with a person beside it.

**Round 3: merge, at the cap, not good enough to release as it stands.** It now reads as a row of shops: tile floor, shopfronts, signs, stuck escalator, and the camera is right. But it is clean, pale and small, with no grit. Fixes for WW-SCENE, none of them new art rounds:
- Darker, dirtier materials in the game, with rust streaks and soot.
- Signs in strong contrast: "DRY GOODS" grey on green is hard to read from a distance.
- Kit rubble, sand drifts and the Ash Men lamps dressed through it. Scale it up if a car feels cramped.
- The upright orange rods on the shopfronts read as stray sticks: remove them if the model allows it, or hide them with rubble.
- I judge it again in the game at WW-FINISH.
