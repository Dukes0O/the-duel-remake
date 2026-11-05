# WW-SCREENS

## Changed

- Added `ember-road.js` to derive the Everburn's open job, completed ticks and notice-board availability from saved progress.
- Added `ember-ui.js` for the Story choice, Story Wall, Next up, free-drive gate, side-job list and won-job result line. Screen code reads props and emits actions; it does not save progress or change race state.
- Added the Everburn screen test and the browser scenario for Claude.
- Added a world-job results branch beside the arena results. It names the job under THE EVERBURN, shows its story completion sentence and saved scrap/item reward, and omits arena metrics. Won jobs offer the next open job; failed and quit jobs offer a retry without rewards.
- Wired NEXT JOB and TRY AGAIN through the existing Everburn start action. Quitting a live job now opens its no-reward results screen before the player returns to the yard.
- Pointed jobs with suitable completion captions to their existing WW-LINES entries; added a whole-sentence result line to each job definition with no suitable caption.
- Extended the world-job wiring test for won, failed and quit results, the result actions, and duplicate settlement. Extended Claude's Everburn scenario to reject arena results and advance from Hot Delivery to Get Out and Walk.

The existing App story action starts the jobs, and the screen router handles the next-job, retry, yard and menu actions. Water Road and all arena modes keep their existing result presentation.

## Checks

- `node tools/test-everburn-easy.mjs`: passed; all nine jobs finished 10/10 on Easy.
- `node tools/test-world-job-mode.mjs`: passed, including won, failed and quit results, action markup, and one-time reward settlement.
- `node tools/test-replays.mjs`: passed; 297 checks across 33 cases, fingerprints unchanged.
- `node tools/test-combat-replays.mjs`: passed; 12 checks across 4 encounters.
- `npm.cmd run build`: passed. Vite reported the existing dynamic-import and large-chunk warnings.
- Browser scenario `tools/scenarios/everburn-play.mjs`: not run here; Claude runs it. No browser check or look check was run in this lane.
- Lane tier: not run, as requested.

## Changed assertions

- None. The wiring test adds behavior checks; existing assertions were not changed.

## Race fingerprints

- Replay and combat fingerprints unchanged. This is screen presentation and result navigation; race rules are unchanged.

## Removed

- No existing files or modes were removed; world jobs now take their own results branch.
