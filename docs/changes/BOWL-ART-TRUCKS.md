# BOWL-ART-TRUCKS — round 3

**Changed:** Updated `tools/blender/bowl-trucks.py`: Dragon Wagon now uses black paint with furnace-red details, rival fittings are enlarged about 50%, and review renders give every Titan body visible mud, rust chips and worn paint. Exported `public/assets/models/wasteland/bowl/trucks.glb` (385,988 bytes) for Claude's art decision. The Titan body paint and wear in the review renders are temporary overrides; the GLB contains the five bolt-on sets.

Rendered the same front, side, 40 m car-height and close three-quarter views for all five trucks, with packed dirt and Cinder for scale. The compressed comparison sheet is `docs/board/looks/bowl-art-trucks/round-3.jpg` (270,309 bytes). It includes rounds 1 and 2 plus round 3. The review note records honest scores and limits.

**Design:** Followed `docs/WASTELAND_WORLD.md` sections 7 and 9 and every item in Claude's round 2 verdict. No open design question remained.

**Checks:**

- Blender export completed. GLB readback: Rust Rhino 716, Big Kettle 1,408, Tin Lizard 840, Old Bess 676, Dragon Wagon 1,024 triangles; all below 8,000. GLB is 385,988 bytes; below 1 MB.
- `node tools/test-blender-output.mjs`: 192 checks passed, one failed. Its existing `artCandidates` entry for `bowl-trucks` requires the GLB to be absent from `public/` until art approval. This conflicts with the round 2 verdict's explicit instruction to commit that path. The assertion was not changed; the GLB is included for Claude's review.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 45 passed, 3 failed, 0 not run. Failures: the same candidate-publication assertion; Eifel loudness measurement (`FFmpeg loudness measurement failed`); review-evidence audio decode (`spawnSync ffmpeg EPERM`). Reran Eifel and review-evidence once each on this commit; both reproduced the FFmpeg failure. No game code or test assertions changed.
- `npm.cmd run build`: passed, 636 modules transformed. Existing dynamic-import and large-chunk warnings remain.
- Race fingerprints: 297 checks passed across 33 cases, 31 events, 9 categories and three frame rates. No simulation code changed.

**Browser and look checks:** Chrome/browser checks are Claude's. Claude should judge `docs/board/looks/bowl-art-trucks/round-3.jpg`, focusing on Big Kettle's boiler from the front, Dragon Wagon's black-and-red read at 40 m, and the enlarged fittings' welded fit. The renders do not establish in-game distance readability or frame cost. No frame check was run because this is art.

**Changed assertions:** None.

**Removed:** Replaced the prior round sheets and round notes with one round 3 comparison sheet and review note covering all three rounds. No earlier model or runtime asset was removed.
