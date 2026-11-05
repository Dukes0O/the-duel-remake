# LAB-CLASSROOM-GFORCE

## Changed

- Added a G-force classroom lesson and steel workshop board. The lesson reads the existing `lateralG` bench rule, supports two-way speed and radius controls, updates the meter and formula, and records three distinct free-test settings.
- Added the lesson to the existing classroom registry. The G-force lap challenge and its goal, reward, progress, save and notebook identifiers remain unchanged. Existing vocabulary ids `gforce`, `one-g` and `radius` are retained.
- Added lesson acceptance checks and a keyboard-only browser scenario at 1920 by 1000.
- Added the required written script to the card and committed that script separately as `f9280db743895a9de848b5d29addd571ed9beda1`.

## Tests and browser checks

- `node --test tools/test-lab-classroom.mjs`: 20/20 tests passed after the final edits, including the G-force registration, live bench formula, three distinct free settings, changed-setting solo target, wrong-answer explanations, and board controls.
- Browser scenario: blocked before the scenario started. The standard browser runner's QA build and preview both failed with `EPERM` while Vite tried to write `node_modules/.vite-temp`; this lane's `node_modules` junction points to the protected live-game folder. A QA bundle built with Vite's runner config loader, but the browser harness preview still uses the default loader and failed the same way. The memory-only browser scenario therefore ran no screens and produced no screenshots.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 42 suites passed. `tools/test-review-evidence.mjs` failed because Windows returned `spawnSync ffmpeg EPERM`. The one required rerun failed the same way (8/9 checks). No game or audio code changed; this does not involve the G-force lesson.
- Production build (`npm.cmd run build -- --configLoader runner`): passed. Vite reported its existing dynamic-import and large-chunk warnings.

## Changed assertions

- None.

## Race fingerprints

- No race simulation code changed. No race fingerprint was recorded.

## Proposed Brian voice lines

These shared lines are not changed in this lane. At merge, update the existing G-force intro to define km/h, m/s and radius in complete sentences. Update the explain line to use the exact lesson rule and units. Update the pass line to remove the informal phrase “proper corner” and explain what the challenge opens. Claude should record the matching audio lines in the shared audio pass.

## Removed

- No files removed. The old G-force lesson files remain available until the classroom switch is cleared for the legacy path.
