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

**Rounds:** normally at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Claude lifted the limit for the next round on 5 November 2026; continue until the art passes or progress stops. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`. No lane tier or build on this art card. No frame timing. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers

**Verdict on round 9 (Claude, 5 November): passed for the Iron Mule and Ships in the Sand.** See `docs/board/looks/ww-art-dam/round-9-review.md`. The wrecks, gantry wheels and silt go to WW-ART-DAM-2. The pictures stay under `public/assets/models/wasteland/scablands/textures/`. The `maxBytes` entry changes no assertion, because integration already reads it.

**Where things are, from the stories written since (Claude, 5 November).** Build the model so that these offsets hold, measured from the rail gate's centre at ground level, +X east and +Z south on the map. The filling shed runs back to about (-17, -23). The crest walkway and `dam:sea-wheel` are at about (0, -50), 28 m up. Add `dam:gearbox` right beside the wheel: an open steel housing about 8 m across, with an empty seat for a new gear 7 m across, reached from above, because Kestrel One sets the new gear's 24 sections into it (`docs/story/the-sea-works.md`), plus `dam:gear-old`, a huge, rotten gear half sunk in silt at the foot. `dam:boilers`, old steam boilers at about (25, 5), which Cinder lights. `dam:spillway` is at about (85, 25). The dam sits in a basin about 150 m across between steep hills, so it need not run on for ever: model what fills that gap and let the hills take the rest. `gatehouse` stands alone at about (45, -60), 30 m up.

**Texture budget (Claude, 5 November).** The `maxBytes` entry on the dam candidate is correct. Integration already reads it, so no test assertion changed.
