# QA-BURNED-CAMP-SMOKE
Cause: the scenario assumed seed 1250 would draw burned-camp after more storylines joined the director's pool.
At failure: burned-camp record null, night 3, dawn, holds [], with stranded-hauler's sign instead of smoke.
Player impact: none; a selected burned-camp still supplies its smoke. No game code, player words or save code changed.
Fix: prepare burned-camp through the narrowed hearth director, wait for the loaded roam, and retain failure diagnostics.
The later radio check also released F between simulation frames; sample the held key before releasing it.
Regression: the scenario fixture starts at sign, burns the Glasshouse, and supplies smoke with every storyline loaded.
Validation: e0ce4b74e plus this commit's QA changes; only this note and STATUS were added after the checks.
Browser: six-scenario batch 5/6; scout, pen, rescue, runaway and Dace passed. Camp timed out at the radio, also alone.
After the F fix: camp passed end to end (4 screenshots, zero warnings/errors); all browser saves were memory-only.
Suites: test-burned-camp, test-burned-camp-rescue and test-open-threads passed (3/3, jobs 2).
Guards: core 804, replay 306, combat replay 12 and world composition 65 checks passed; fingerprints unchanged.
Build: npm run build passed (chunk-size and dynamic-import warnings). No game event or sound cue added.
Assertions: added fixture/start/sign checks; no existing assertion or tolerance changed. Claude review at handoff.
**Removed**: the seed-dependent scenario setup and the F tap that could miss a simulation step; no game feature removed.
