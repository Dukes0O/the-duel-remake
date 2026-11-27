# WW-ART-MULE: the Iron Mule, rounds 1 and 2

Claude session, 27 November 2026. An art card: no game file reads the model yet (MULE-SCENE wires it in).

**Changed.** New `tools/blender/scablands-mule.py` builds `public/assets/models/wasteland/scablands/mule.glb` (32,666 triangles, 1,964,212 bytes) from fifteen credited photographs, `textures/mule-*.jpg`. Root `iron-mule`: `mule-cab`; `mule-tank-wagon-1` and `-2` with the roof plates `tank-wagon-1` and `tank-wagon-2` standing 22 m and 42 m behind the engine's front and 3.5 m up, as `src/world/jobs/steps/board.js` runs them; `mule-guard-wagon`; `mule-box-wagon` with `box-wagon-door`; four couplings (`cab-coupling` 12 m back); `mule-rail`; `mule-bridge-span`. One entry and one block of assertions in `tools/test-blender-output.mjs`. `docs/ART_LINE.md` gains "Trains, and white things".
**Checks, on ca40c2178.** `node tools/test-blender-output.mjs`: 445 checks, 0 failed (it reads the triangle and file budget, 40,000 and 2 MB, and the named parts and their places back from the glb). `node tools/test-repo-hygiene.mjs` and `node tools/test-board.mjs`: pass. `npm run build`: pass. No lane tier, because no suite or game file reads the model; no frame check on an art round (rule 9).
**Looks.** `docs/board/looks/ww-art-mule/round-1.jpg` and `round-2.jpg`, each with its review beside a real photograph. My pick is round 2. Nobody has seen it in the game yet.
**For the Director.** Each tank wagon is 20 m long because the job code stands the plates 20 m apart (round 2's review says what shorter wagons would need). No station is built: `rail-halt` is TOWN-ART-OUTPOSTS's. No drip is modelled: the empties `tank-wagon-N:drip-1` and `-2` mark where the game draws it. `docs/board/STATUS.md` is not rebuilt here.
**Sound.** No game event added.
**Removed.** Nothing: the model is new and replaces no file. The photographs' PNG originals and all trial renders were in the ignored `.qa-dist/ww-art-mule/` and are deleted.
