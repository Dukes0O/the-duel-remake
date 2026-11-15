# MACHINE-DRILL

The card adds repeatable water and ground layers, drill feed and recoverable jams, and the town command that records a drilled well. The yard simulation has a driveable rig, a stopped-before-drilling check, and visible visit-only wellheads. The rig has a mast, drill, keyboard controls and distinct sounds. A yard well is for the visit only; the town handoff is a later card.

Checks: `node tools/test-machine-drill.mjs` passed, including sound playback, mute, wellhead drawing and cleanup. `node tools/test-town-ground.mjs` passed in the earlier round. The card test also covers driving, stopping before feed, and a visit-only wellhead. `npm.cmd run build` passed. The lane tier, replay and world-signature checks have not run yet. No race fingerprint was recorded.

Sound cues: `drill-engine`, `drill-feed`, `drill-clay`, `drill-gravel`, `drill-rock`, `drill-jam`, `drill-reverse`, and `drill-water`.

## For Claude to run

The browser scenario remains to be built. An independent save review and save checks are required at merge.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Hard feed above three quarters in rock jams the bit. Reversing the feed frees it. Layer boundaries vary with the seed and place and end at the water depth. The rig stops before the mast can feed, and yard wellheads last only for that visit. Tab selects work or travel; Space feeds steadily, Space with W feeds hard, and S reverses the bit.

## Removed

The earlier stop note was replaced by this progress note. No game feature was removed.
