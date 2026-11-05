# WW-ART-SHIPS

The short board entry controls current state, ownership, dependencies and locks.

Nothing on the board draws the ship hulls or the lighthouse. `deck-town` on TOWN-ART-OUTPOSTS sits on the deck of one of these hulls.

**Files you own:** `tools/blender/scablands-ships.py`, `public/assets/models/wasteland/scablands/ships.glb`, `docs/board/looks/ww-art-ships/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-SHIPS.md` with a Removed section.

**Recipe:** three big rusted ships aground in the sand, each leaning its own way and sunk to a different depth, with their anchor chains lying out across the dead sea bed. Each has a walkable deck about 7 m above the sand, ladders up, and a chart room you can read from a distance. Named parts: `ship-good-hope`, `ship-marigold` (half her rail is gone), `ship-patience`, and `ship-patience:mast` with a ladder and a small platform 14 m above the deck, plus a bell, `ship-patience:bell`, which Act 5 rings. Each ship's name is painted on its bow, large and readable.

`lighthouse`: tall and salt-stained, no water anywhere near it, with a door, stairs and three landings at about 8, 16 and 24 m (drawings on the walls of the first, a box of letters on the second), `lighthouse:lamp` as an emissive part and `lighthouse:beam` as a part the game turns. It looks looked after, and the step is swept.

`pilot-boat`: a forty-foot pilot boat on a big wheeled trailer, `pilot-boat:hitch` at the front. It must make you laugh when you see it being towed across a desert.

Show the sheet from car height at 40 m and at dusk with the lamp on, as well as from above.

Budget: 50,000 triangles, 3 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like, clean or pale. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Reuse the materials and rust of the yard, Tin Town and tanker recipes first. Earlier rounds failed for these reasons, so do not repeat them: ground standing as a wall (check your up axis first), dark sheets, subjects too small in the frame, one mottled colour. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`.

**Rounds:** at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers
