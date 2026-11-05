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

## Claude answers

**Round 1: fit is good, go to round 2.** The bolt-ons sit properly on the Titan. But all five are the same purple and green truck with one small extra on it, so they look alike at game distance.
- Each rival needs its own paint and its own black outline, recognisable at 60 m.
- Rust Rhino: a huge horn and rust armour on the nose. Big Kettle: a boiler bigger than the cab, with pipes. Tin Lizard: a spine and tail of tin plate. Old Bess: fat old tanks and patches. Dragon Wagon: jaws on the nose and tall flame stacks.
- Larger pictures: one side view and one front view of each.
- No model on the branch yet.

**Every round from now on:** use `tools/blender/kit-sheet.py` or `fidelity-sheet.py`, as above. Flat ground at the bottom of the picture; a view from car height at about 40 m, a three-quarter view and a close view; a yard car or person beside it for size; the subject filling the frame; readable labels. Spend the triangle budget on real shape (bent edges, ragged holes, hanging parts, weld seams). Wear is uneven: streaks and patches, not one mottled colour all over. The round that passes commits the model and its readback.

**Round 2: close, one more round, then merge.** The sheet is good and each truck now has its own paint. Round 3, the last:
- Dragon Wagon and Rust Rhino are nearly the same orange-brown at 40 m. Make Dragon Wagon black and red.
- The extras are still small from the front. Make them about half as big again: Rhino's horn, Kettle's boiler, Lizard's tail, Dragon's jaws and stacks.
- Too clean for this world: mud, dents, chipped paint on every body.
- Commit public/assets/models/wasteland/bowl/trucks.glb: no model is on the branch yet.

**Round 3: pass, merge.** The best of this batch: five different paint jobs with real rust and chips, Dragon Wagon black and red at last, and the fit on the Titan stays good. Extras are still modest from the front, but the paint and outlines tell the trucks apart at 40 m.

## Claude's review of the changed check (rule 18)

Round 3 passed, so `tools/test-blender-output.mjs` no longer lists `bowl-trucks` as
a candidate: the check that the model must not be in the game becomes the check
that it must be. The five-rival budget check read a scratch file and skipped itself
when that was absent; it now reads the real model and always runs. Both are
stricter than before. Nothing is loosened.
