# WW-ART-MULE

The short board entry controls current state, ownership, dependencies and locks.

The train for the second story, design sections 3 and 6.

**Files you own:** `tools/blender/scablands-mule.py`, `public/assets/models/wasteland/scablands/mule.glb`, `docs/board/looks/ww-art-mule/`, one entry in
`tools/test-blender-output.mjs`, credits for anything from `C:/Users/kyleb/dev/art-library/`.

**Recipe:** A scrap-armoured loco and two wagons with walkable roofs (plates as named parts), couplings as named parts, one stretch of rail, a bridge span and a small station. 40,000 triangles, 2 MB.

Reuse first: read the existing yard, Rustwall, Salt Flats, tanker and crew recipes, and take
their materials and rust. Original shapes only, gritty, never toy-like. Metres, +Y up, one root
empty, named parts as the Magnus recipe does (`tools/blender/magnus-magnet.py`).

**Rounds:** at most three, each with one Blender-rendered sheet (`tools/blender/kit-sheet.py` or
`fidelity-sheet.py`), JPG at most 500 KB, under `docs/board/looks/ww-art-mule/`, and a short note.
Then set `waiting_on: claude`: Claude judges each round and sends the pick to Kyle. Do not time frames
on art.

**Checks:** `tools/test-blender-output.mjs` for this recipe; the file and triangle budget above,
read back from the glb; `tools/test-repo-hygiene.mjs`.

Not wired into the game here: that is WW-SCENE or BOWL-COURSE.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-ART-MULE.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Claude answers

**5 November: the train has changed, from the next round on.** The story now makes the Mule Mrs Vane's secret water train (`docs/story/iron-mule.md`), not a scrap train. Keep the rails and bridge span, but the train is: a cab; **two tank wagons** with walkable roofs (named roof plates `tank-wagon-1`, `tank-wagon-2`); a guard wagon; and one old **box wagon with a barred door** for the prisoners. Couplings are named parts, and `cab-coupling` is the one you blow. It was once painted company white and is now filthy, dents and rust through the white, no lights on it at all, and a slow drip of water from under the tanks. It still has to look heavy and mean from car height. Rounds used so far still count toward the cap of three. The station is no longer needed here: `rail-halt` is on TOWN-ART-OUTPOSTS.
