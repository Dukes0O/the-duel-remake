# MACHINE-DRILL

This round added repeatable water and ground layers, drill feed and recoverable jams, and the town command that records a drilled well. The yard simulation now has a driveable rig state, a stopped-before-drilling check, and visit-only wellheads. It is not yet selectable or visible in the machine yard. A yard well is for the visit only; the town handoff is a later card.

Checks: `node tools/test-machine-drill.mjs` passed. `node tools/test-town-ground.mjs` passed. The card test also covers driving, stopping before feed, and a visit-only wellhead. The build passed with `npm.cmd run build`. The lane tier, replay and world-signature checks have not run yet. No race fingerprint was recorded.

Sound cues named in the rules: `drill-clay`, `drill-gravel`, `drill-rock`, `drill-jam`, `drill-reverse`, and `drill-water`. Engine and feed sounds and playback remain to be built with the yard rig.

## For Claude to run

The yard view, controls, sound playback and browser scenario remain to be built. An independent save review and save checks are required at merge.

## Changed assertions, for Claude to review

None.

## Codex decided (Claude to review)

Hard feed above three quarters in rock jams the bit. Reversing the feed frees it. Layer boundaries vary with the seed and place and end at the water depth. The rig stops before the mast can feed, and yard wellheads last only for that visit.

## Removed

The earlier stop note was replaced by this progress note. No game feature was removed.
