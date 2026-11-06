# TOWN-ART-MACHINES-2 · Round 4

**Status:** committed for Claude's art review. This packet does not claim that the family passes its look gate.

## Design and changes

Built the other six machines around their own working silhouettes and kept the articulated loader. The mixer has a tapered tilted drum with helical flights, ladder and hinged chute. The roller has a smooth front drum in a yoke, rounded rear engine body and four-post open canopy. The paver has a wide front hopper, open platform, tracked base and hinged screed. The drill rig has a tracked base and lattice mast with a feed string. The crane uses a turret, hinged boom and hook. The pipe truck carries round steel pipes between stakes, and one pipe rolls from a pivot at the bed edge.

All bodies use worn olive-yellow paint, with a separate photographic galvanized-steel tile and a separate dusty-rubber tile. Cab glass is dark and framed by painted rails. Each exported part has `TEXCOORD_0`; metallic factors stay at or below 0.29. The exported GLB is 2,828,316 bytes. The current model is below 15,000 triangles per machine.

## Evidence and review

`docs/board/looks/town-art-machines-2/round-4.jpg` is 459,061 bytes. It shows a reference crop beside rest and work poses rendered from the exported GLB imported into an empty Blender scene. Claude should compare all seven silhouettes, paint and steel surfaces, cab framing, tyre lug shape, and hinge poses against the photo crops. The family is not wired into the game, so no browser or in-game look check was run.

Blender exported and rendered all seven machines. It reported three warnings that meshes `Cube.321`, `Cube.044` and `Cube.361` may export wrongly. The GLB checks below passed; Claude should inspect those areas on the sheet.

## Checks

- `tools/test-blender-output.mjs`: **passed**, 274 checks; this includes the machine roots, added paver screed joint, triangle and file budgets, UV channel/range rules, and metallic cap.
- `tools/test-repo-hygiene.mjs`: **passed**; repository placement passed. Reported size targets are advisory.
- `tools/test-review-evidence.mjs`: **7 of 9 subtests passed; 2 failed**. One failure is the test's hard-coded expectation that `round-2.jpg` exists; this task explicitly required deleting round 2. The other failure is `spawnSync ffmpeg EPERM` in the unrelated audio-analysis subtest. I did not change that test.
- No lane tier or build was run, as instructed for this art card. No browser check was run.
- Race fingerprints: not applicable to this model-only art change.

## Changed assertions

Added an expected `paver:screed` joint, required a positive triangle count within the 15,000 cap, checked for only ranged `TEXCOORD_0` UVs on each primitive, and capped every material's `metallicFactor` at 0.3. No existing assertion was loosened.

## Removed

Deleted the superseded `round-2.jpg`, `round-2-review.md` and `round-3.jpg` from the looks folder as directed. No round-3 review note was present. Removed this run's temporary Blender renders, generated sheet helper, test logs and scratch blend before committing.
