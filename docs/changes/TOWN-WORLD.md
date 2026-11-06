# TOWN-WORLD fourth pass

## Changed

- The town screen's DRIVE button now saves the town, closes THE TOWN, and starts a drive with that saved layout.
- Town-drive admission now works from the Scrapdome yard while `story-everburn` is off. Story jobs keep their existing switch gate.
- DRIVE does nothing during a read-only town visit.
- The town layout clears when the drive reaches the Scrapdome gate, ends in a wreck, or returns to the menu. The shared world-job cleanup also clears it when the player gives up or presses Escape.
- The browser scenario now opens THE TOWN, creates a town, places a hall and road, and starts the drive with the town's DRIVE button.

## Checks

- `node tools/test-town-world.mjs`: passed, 6 tests. Added cleanup coverage for gate, Escape, wreck, giving up and menu return; verified the next ordinary Scablands job or race sees its original obstacles.
- `node tools/test-everburn-easy.mjs`: passed; all nine jobs finished 10/10.
- `node tools/test-replays.mjs`: passed, 297 replay checks across 33 cases.
- `node tools/test-world-composition.mjs`: passed, 63 checks across twenty events.
- `node tools/test-town-visits.mjs`: passed; visit lifecycle and read-only save checks stayed green.
- `npm.cmd run build`: passed. Existing dynamic import and large-chunk warnings remain.
- Browser scenario and look check: Claude should run `tools/scenarios/town-world.mjs`, confirm the saved hall and road appear in the Scablands picture, check the gate prompt and Scrapdome panel, and leave the drive another way to confirm the yard and THE TOWN remain available.
- The lane tier was not run, as directed. No browser check was run in this lane.
- Race fingerprints: no fixtures or expected fingerprints changed; replay checks passed.
- Changed assertions: none loosened. Added assertions for drive teardown and the next job or race's obstacle set.

## Removed

- No files, tests, or behavior were removed.
