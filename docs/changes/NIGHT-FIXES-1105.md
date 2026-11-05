# Night fixes, 5 November 2026

## Findings and changes

- **career-writer-lock, lap-telemetry, preview-storage, warlord-pay:** the QA preview uses MPA routing and does not copy public files, so the preview-only request for `/preview-build.json` reached the 404 handler. Added a successful QA-only JSON response for that exact endpoint. Other missing paths still use the normal 404 response. No assertions changed.
- **wildlife-view:** wildlife was released on 3 November and is now on by default. The old “switch off” page used no flag override, so it was testing the released default. The scenario now explicitly disables wildlife for its negative control. No assertions changed.
- **warlord-cards:** opening Story Wall called `openStory('water')`, which marks Water Road notes read and saves the profile before displaying the wall. Removed that write from the screen navigation. Reading the Water Road story card still uses its explicit read action. No assertions changed.
- **drive-lesson-run:** the browser check's new-player expectations are fixed to three exact course choices and three “Opens later” rows. The current lesson screen derives course choices from `driveLessonCourses` plus player course ownership, while locked lesson text depends on the engine-curve switch and lesson progress. The mismatch is browser-rendered output, and cannot be identified more precisely without the requested Chrome run. Claude should compare the live board output with those current access rules and decide whether the scenario or game copy/access is stale. No assertion changed here.
- **heli-jobs:** the scenario failed on crate-job card text after checking the current offer across the route. The wording is rendered by `src/heli/heli-job-card.js`; its current copy and the assertion's expected phrase need a browser comparison to tell whether the released card copy changed deliberately. Claude should make that comparison and update the check only if it is stale. No assertion changed here.
- **ski-finish:** `Runtime.evaluate` timed out twice after the 3 November ski-drop changes. The scenario's first awaited operation is waiting for the Summit scene after taking a drop and autopiloting to Devils Playground. Without Chrome, the timeout cannot distinguish a slow or failed scene load from a changed drop destination. Claude should inspect the browser trace and confirm the current drop destination before changing the scenario or game. No assertion changed here.
- **arena-shove and test-drive-through:** both unpack Git archives by invoking bare `tar`, which resolves to Git Bash's `tar.exe` on this Windows PATH and misreads `C:`. They now call Windows' `C:\Windows\System32\tar.exe` on Windows and retain `tar` on other platforms. No assertions changed.
- **p4-audio:** left for the existing unreliable-check card, `QA-P4-AUDIO-FRAME-GAP`.

## Checks

- `node tools/test-preview-launcher.mjs` — passed, 23 checks.
- `node tools/test-wildlife-view.mjs` — passed, 3,829 checks.
- `node tools/test-water-screens.mjs` — passed, 63 checks.
- `node tools/test-warlord-cards.mjs` — passed, 3 tests.
- `node tools/test-drive-through.mjs` — passed, 7 tests, including current and historical archive extraction.
- `npm.cmd run build` — passed. Existing large-chunk and dynamic-import warnings remain.
- No browser scenarios run, as directed.

## Removed

- Removed the accidental Water Road read/save side effect from Story Wall navigation.
- No generated assets, tests, or other files were replaced.
