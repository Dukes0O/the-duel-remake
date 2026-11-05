# BOWL-ART-TRUCKS ? round 2

**Status:** Round 2 committed for Claude's art review; not promoted into runtime assets.

**Changed:** Expanded and separated the five Titan bolt-on silhouettes, added rival paint colors and blackened welded edges, and improved the Blender review cameras. Rendered 20 views with the existing Titan and Cinder for scale. Replaced the round 1 image with one compressed comparison sheet at `docs/board/looks/bowl-art-trucks/round-2.jpg` (164,877 bytes) and added honest round 2 scores. The Titan paint colors in review renders are temporary Blender overrides; the candidate GLB contains bolt-ons only. The generated 386,772-byte GLB remains in ignored `.qa-dist/` pending Claude's pick.

**Design:** Followed `docs/WASTELAND_WORLD.md` sections 7 and 9 and the round 1 verdict. No design question remained.

**Checks:** `node tools/test-blender-output.mjs` passed (193 checks, including per-rival triangle and file budgets). Lane tier: 25 suites passed; `tools/test-review-evidence.mjs` failed with `spawnSync ffmpeg EPERM`. Reran that suite alone; the same failure reproduced. `tools/test-repo-hygiene.mjs` passed in the lane tier. `npm.cmd run build` passed (636 modules). No game code or test assertions changed.

**Browser and look checks:** Claude runs the browser check. Claude should judge the comparison sheet and especially the head-on attachment readability, the 40 m silhouettes, the smooth surface wear, and the fact that full Titan paint variants are only previewed in Blender. No frame check was run, as required for art.

**Race fingerprints:** Not run; the change is limited to the Blender recipe and art review. No simulation or course files changed.

**Removed:** Replaced `docs/board/looks/bowl-art-trucks/round-1.jpg` with the combined round 1 and round 2 comparison sheet. No prior review note or runtime asset was removed.
