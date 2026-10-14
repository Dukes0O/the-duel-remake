# RELEASE-CONTROLS

Final controls change before the 13 October release: the on-screen corner warning is taken out, and the trackside signs stay larger.

## Kyle's decision (13 October 2026, evening)

After seeing the FIX-RACE-SCREEN build, Kyle said: "oh no - this is not what we want. I was thinking of little sign posts like what you've already got at Tremblant, just to make them a bit bigger, that's all. They're too small to really notice."

So the big panel at the top centre (arrow, 150/100/50 countdown, red BRAKE) goes. The signs beside the road are the cue, and they stay larger.

## Removed

- `src/corner-warning.js`, the helper that worked out which corner was next and what the panel should say.
- `tools/test-corner-warning.mjs`, its test.
- The panel markup (`#corner-warning`) and the code that filled it each frame in `src/screen-hud.js`.
- The panel's styles in `src/screen-hud.css`, including its narrow-window rule.
- In `tools/scenarios/release-controls.mjs` (the private native screen check): the 480 warning samples per run, the helper that worked out what each sample should show, the corner-list lookup that fed them, the two course-intel imports only they used, the warning size and position checks, and `#corner-warning` in the list of readouts that must not overlap.

No other file named in the brief mentioned the warning. `src/app.js`, `src/game.js`, `tools/track-review.mjs`, `tools/test-track-review.mjs`, `tools/onfoot-balance.mjs`, `tools/test-combat-balance.mjs` and `tools/test-sal-fight.mjs` were read and searched. They held no warning code and no guard for it, so none was changed. No test list or allow-list named the warning either: suites are found by file name, so deleting the test file removes it from the run.

A search of the whole repository for `corner-warning`, `cornerWarning` and `CornerWarning` finds only this note, the FIX-RACE-SCREEN card note and the FIX-RACE-SCREEN change note (history).

## One small layout follow-on

The in-race message line (`.in-race .race-callout`) had been placed below the mirror and the warning panel. With the panel gone, it now sits 24 px below the mirror instead (`calc(90px + 30vw / 3.2 + 24px)`). It still clears the larger mirror at every size.

## What stays exactly as it was

- The route map fix (right turn on the map is a right turn on the road) and its larger size, 432 px panel and 384 px map at 1080p.
- The larger rear-view mirror, 30% of the screen width, centred at the top.
- The four camera views (chase, hood, wide, back), with old choices falling back to chase.
- The race clock move (top 70 px), which was a separate fix.
- Everything from FIX-DRIVING-FEEL.

## Trackside signs, checked on both paths

Both are in place and left alone. Sizes today:

| Sign | Path | Before | Now |
| --- | --- | --- | --- |
| Braking boards (procedural courses) | `addBoards` in `src/track-script-scene.js` | 1.5 m wide, 0.95 m tall | 3.0 m wide, 1.9 m tall (double) |
| Braking boards 150, 100 and 50 (course kit models, used on Tremblant Woods) | `brakingBoardFaceMatrix` in `src/track-kits.js` | back plate 1.05 m by 0.58 m, writing panel 0.92 m by 0.49 m | back plate 2.1 m by 1.17 m, writing panel 1.84 m by 0.97 m (double); post, placement and ground height unchanged |
| Turn chevrons | `addTurnSigns` in `src/world-props.js` | 1.2 m wide, 1.35 m tall | 1.8 m wide, 2.025 m tall (1.5 times) |
| ICE boards | `addBoards` | unchanged | unchanged |

The kit model sizes are read from the model files themselves (the 100 board; the 150 and 50 boards use the same shape with different lettering). The existing real-model check in `tools/test-track-kits.mjs` still confirms the doubled face and the unchanged post and placement.

## Changed or removed assertions

- `tools/test-corner-warning.mjs`: the whole file is deleted, with the 8 groups of checks it held (the corner list for named Harbour Lights and Tremblant Woods corners, the 150/100/50 values and red BRAKE at the braking point, the cases where nothing shows, and the Woods chicane where the first corner not yet passed wins). Reason: the feature they test no longer exists. Nothing else was relaxed to make up for it.
- `tools/scenarios/release-controls.mjs`: removed the per-corner warning samples and the "Warning dimensions/under mirror" check, and `#corner-warning` from the overlap list. Reason: same. The map size, mirror size and centring, readout overlap and C-key camera checks are unchanged. The packet it writes no longer has a `warnings` list.
- No other assertion, tolerance or hash was touched. World signatures, replay fingerprints and the practice-map pin are unchanged.
- The native 1080p and 1440p run recorded in FIX-RACE-SCREEN (480 warning samples) is history for a feature that is gone. The map, mirror and camera parts of that run still describe the screen as it is. The native screen check has not been rerun after this removal.

## Gates

- Checked first that no more than two other heavy jobs were running: one other lane gate (cockpit tracking) was active; the rest were dev servers.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` (PowerShell): 42 passed, 0 failed, 0 not run, 294.59 s. This included the replay fingerprints (198 checks), world composition (41 checks) and the opponent and test-runner suites, all unchanged.
- `npm run build`: exit 0.
- Not run: the full tier (the release run does that on the final commit), and the native 1080p and 1440p screen check with the corner panel removed. The browser scenario file still parses (`node --check`).
