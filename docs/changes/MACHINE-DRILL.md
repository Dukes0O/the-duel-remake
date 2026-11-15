# MACHINE-DRILL

The card adds repeatable water and ground layers, drill feed and recoverable jams, and a town command that records a drilled well. The yard has a driveable rig, a mast, controls, sounds, and visible wellheads that last for the visit. Connecting a yard well to a player's town is a later card.

Checks on lane commit `faa8783bc`: `node tools/test-machine-drill.mjs` and `node tools/test-town-ground.mjs` passed. The lane tier passed 36 of 37 suites; `test-review-evidence.mjs` failed because starting ffmpeg returned `EPERM`. One standalone retry had the same result. Replay fingerprints passed 297 checks across 33 cases, including three frame rates and three runs. Combat replays and world composition passed. `npm.cmd run build` passed. The browser scenario was written and syntax checked, but was not run. The added second-visit check was syntax checked after the build; it changes no game code.

Sound cues: `drill-engine`, `drill-feed`, `drill-clay`, `drill-gravel`, `drill-rock`, `drill-jam`, `drill-reverse`, and `drill-water`.

## For Claude to run

Bring this branch up to `integration/wasteland` and rerun the card checks, lane tier and build. This job forbids merging. Rerun `test-review-evidence.mjs` where ffmpeg can start. Run `tools/scenarios/machine-drill.mjs` with an isolated memory-only profile: drive, lower the mast, drill through the layers, jam and reverse the bit, reach water, inspect the wellhead, and revisit the yard to confirm it is gone. The normal feed can take several minutes. Check the look and sounds. An independent save review and save checks are required in a second job.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Hard feed above three quarters in rock jams the bit. Reversing the feed frees it. Layer boundaries vary with the seed and place and end at the water depth. The rig stops before the mast can feed, and yard wellheads last only for that visit. Tab selects work or travel; Space feeds steadily, Space with W feeds hard, and S reverses the bit.

## Removed

The earlier stop note was replaced. No game feature was removed.
