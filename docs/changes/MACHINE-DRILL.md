# MACHINE-DRILL

The drill has repeatable ground layers and water, a recoverable jam, and a town command that adds a drilled well. The yard has a driveable rig, a mast, controls, sounds and wellheads that last for the visit. Q now steps through the drill in the yard. Connecting a yard well to a player's town is a later card.

The review fix keeps every existing test pit unchanged, including a pit still being dug. The drill test now repeats a whole hole, compares another place, and checks old and drilled town saves and water recovery.

Checks after merging integration: `test-machine-drill`, all six other machine suites, `test-the-dig` and `test-town-ground` passed. Combat replay fingerprints passed 12 checks across four encounters. Race replay fingerprints passed 297 checks across 33 cases, three frame rates and three runs. The lane tier passed 36 of 37 suites; `test-review-evidence` failed when starting ffmpeg returned `EPERM`, the same failure as the prior run and standalone retry. World composition passed. The build passed.

Sound cues: `drill-engine`, `drill-feed`, `drill-clay`, `drill-gravel`, `drill-rock`, `drill-jam`, `drill-reverse` and `drill-water`.

## For Claude to run

Run `tools/scenarios/machine-drill.mjs` with an isolated memory-only profile: drive, lower the mast, drill through the layers, jam and reverse the bit, reach water, inspect the wellhead, and revisit the yard to confirm it is gone. The normal feed can take several minutes. Check the look and sounds. The independent save review and save checks are assigned to a second job. Rerun `test-review-evidence.mjs` where ffmpeg can start; the earlier lane run failed with `EPERM` there.

## Changed assertions, for Claude to review

None. New assertions cover the review findings.

## Codex decided (Claude to review)

Hard feed above three quarters in rock jams the bit. Reversing the feed frees it. Layer boundaries vary with the seed and place and end at the water depth. The rig stops before the mast can feed, and yard wellheads last only for that visit. Tab selects work or travel; Space feeds steadily, Space with W feeds hard, and S reverses the bit.

## Removed

The earlier stop note was replaced. No game feature was removed.
