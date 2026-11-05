# WW-HUD

## Changed

- Added a read-only model for the current world-job instruction, target marker, compass bearing, place list and found ticks.
- Added the active job HUD and an M-key Scablands map with player and goal markers. Escape and the Close button close the map.
- The HUD reads the active step state so on-foot, heist, rescue and exploration instructions advance with the job.

## Checks

- `node tools/test-world-hud.mjs` — passed. It covers the line, target marker and compass bearing for each of the nine step kinds, job progress transitions, found ticks and read-only behavior.
- `npm.cmd run build` — passed. PowerShell blocked the `npm` script wrapper before it started; the Windows `npm.cmd` executable ran the same build successfully. Vite reported the existing dynamic-import notice and large-chunk warning.
- Lane tier — not run; Claude runs it.
- Browser and look checks — Claude runs. Please inspect the active job line and arrow across step types; M/Escape map controls; map place names, player and job markers; found and unfound ticks; and confirm the HUD is absent outside a world-job run.
- Replay fingerprints — not run. This change only reads job state and adds presentation; no race or job simulation rules changed.
- Existing assertions changed — none. The card's new test was added.

## Removed

- Nothing.
