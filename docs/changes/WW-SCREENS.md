# WW-SCREENS

## Changed

- Added `ember-road.js` to derive the Everburn's open job, completed ticks and notice-board availability from saved progress.
- Added `ember-ui.js` for the Story choice, Story Wall, Next up, free-drive gate, side-job list and won-job result line. Screen code reads props and emits actions; it does not save progress or change race state.
- Added the Everburn screen test and the browser scenario for Claude.

The shared app, yard and menu hook files were outside this card's owned files, and the WW-HOOKS dependency is not present in this checkout. The scenario expects the hook owner to wire `storyProps('ember')`, the screen modules and the named action attributes before Claude runs it. The screen contract is ready for that wiring; this lane does not claim the live app is fully connected.

## Checks

- `node tools/test-ember-screens.mjs`: passed, 23 checks.
- `npm.cmd run build` (PowerShell `npm` shim was blocked by execution policy): passed. Vite reported the existing dynamic-import and large-chunk warnings.
- Lane tier: not run, per Kyle's lane instruction; Claude runs it.
- Browser scenario `tools/scenarios/everburn.mjs`: Claude runs after WW-HOOKS and WW-SAVE integration. No browser check or look check was run in this lane.

## Changed assertions

- None. The new focused test adds behavior checks; existing assertions were not changed.

## Race fingerprints

- None captured. This is screen presentation code and does not touch race simulation.

## Removed

- None.
