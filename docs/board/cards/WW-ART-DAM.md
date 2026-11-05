# WW-ART-DAM

The short board entry controls current state, ownership, dependencies and locks.

Nothing on the board draws the Dry Dam, and two stories and Act 5 need it. This is the biggest thing on the map.

**Files you own:** `tools/blender/scablands-dam.py`, `public/assets/models/wasteland/scablands/dam.glb`, `docs/board/looks/ww-art-dam/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-DAM.md` with a Removed section.

**Recipe:** a huge cracked concrete dam, far too big to fit in a view, stained with old water lines high above you and dark wet streaks low down. Named parts:
- `dam:face`, the wall, with the cracks in it.
- `dam:rail-gate`, a steel door at the foot, big enough for a train, with rails running under it; and `dam:rail-gate-broken`, the same door burst inwards, shown after job 6.
- `dam:filling-shed`, a long room behind the rail gate: rows of big tanks, pipes coming through the back wall, and that wall wet and white with salt crust. It must read as wet from the cab of a train.
- `dam:sea-gate`, the great gate high in the middle, plainly shut for a very long time; and `dam:sea-wheel`, a wheel as big as a house on a walkway.
- `dam:spillway`, a channel down one side, choked with decades of wrecks (Act 5).
- `gatehouse`, a small stone hut with a dead lamp and a bench, on its own pad, and `gatehouse:door`.

The other side of the dam is never modelled. Nobody sees the ocean until Act 5. Show the sheet from car height at 40 m and from the lake bed at 200 m, as well as the filling shed from inside.

Budget: 60,000 triangles, 3 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like, clean or pale. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Reuse the materials and rust of the yard, Tin Town and tanker recipes first. Earlier rounds failed for these reasons, so do not repeat them: ground standing as a wall (check your up axis first), dark sheets, subjects too small in the frame, one mottled colour. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`.

**Rounds:** at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers
