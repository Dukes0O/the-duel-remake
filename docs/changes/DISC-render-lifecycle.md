---
task: DISC
status: review
kind: rendering-lifecycle-fix
flag: none
player_facing: no
---

## What changed

The renderer now retires the Time Trial ghost model as soon as playback has no pose. It restores the model's original materials before disposal and refreshes ambient-shading exclusions. Returning to the menu or starting a different mode in the same car no longer keeps a hidden ghost model in the scene.

## Evidence

- A private `ghost-lifecycle` browser scenario used memory-only saves to finish a real Time Trial, record a ghost, replay it, and enter a Duel in the same car. It checked that the ghost had been removed from the scene and that ambient shading refreshed. Private port 6051; zero warnings and zero errors. Report: ignored `.qa-dist/browser-output/ghost-lifecycle-2026-09-23T05-39-59-104Z/report.json`.
- `node tools/test-ghost.mjs`: 86 assertions passed.
- `node tools/test-render-warmup-passes.mjs`: 143 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 152/152 suites passed in 246.39 seconds; replay fingerprints stayed unchanged and all 48 expansion races completed and won.
- `npm run build`: passed with the existing large-chunk warning.

## Behavior and test changes

No simulation rule or existing assertion changed. The new browser scenario covers the production renderer path and temporary player storage.
