# WW-EVERBURN-WIRE

## Changed

- Added the `story-everburn` development switch and desktop Preview flag.
- Registered the Everburn Story card, Hollis note, yard Story Wall rows, Next up button, and result tick. Job buttons start the corresponding locked `world-job` definition at the Scablands through the App arena path.
- Added a world-job case to arena settlement so a completed Everburn job pays once through the existing settlement helper, then records the story mark and permanent reward through `ember-save.js`. Direct starts reject locked steps. Quitting follows the existing arena exit path and does not settle a reward.
- Added live world HUD fields for step instructions, on-foot F prompts, defend wave count and well health. The HUD reads the live job state.
- Added Claude's memory-only browser scenario at `tools/scenarios/everburn-play.mjs`.

## Checks

- `node tools/test-replays.mjs`: 297 checks passed across 33 cases; replay fingerprints unchanged.
- `node tools/test-combat-replays.mjs`: 12 checks passed across 4 encounters.
- `node tools/test-everburn-easy.mjs`: all nine jobs completed 10/10 on Easy.
- `node tools/test-world-job-mode.mjs`: passed, including live App launch, locked-step rejection, live HUD model checks for reach and defend steps, and one-time reward settlement.
- `node tools/test-feature-flags.mjs`: 129 checks passed.
- `node tools/test-preview-launcher.mjs`: 23 checks passed.
- `npm run build`: passed.
- Browser scenario: not run here; Claude runs it.
- Lane tier: not run, as requested.
- Assertions changed: none.
- Race fingerprints: pending replay-check report.

## Removed

- Nothing was replaced or removed.
