# QA-PREVIEW-STORAGE-SEED

## Findings and decision

Keep `preview-storage`. It protects the QA Preview's memory-only save boundary and checks the seeded player on first startup and same-tab reload. Kyle and Gratian no longer use the desktop Preview, but the scenario remains useful as a QA isolation check.

The reported failure matches the scenario's exact badge comparison. After `/preview-build.json` succeeds, `tools/preview.js` adds a built-time suffix to the visible `PREVIEW` badge. The scenario checks seeded profile fields separately, and the entry seeds and saves the player before importing production startup. This does not point to missing `public/` files breaking the seed. A browser run is still needed to confirm the current behavior.

Claude should check first startup and same-tab reload in Chrome, then review changing the badge check to accept the built badge while keeping every seed and native IndexedDB assertion. No assertion changed in this lane.

## Checks

- `node tools/test-preview-launcher.mjs`: passed, 23 acceptance checks.
- `node tools/test-qa-storage.mjs`: passed, 56 isolation, fail-closed and fixture bootstrap checks.
- `npm.cmd run build`: passed. Existing dynamic-import and large-chunk warnings remain. `npm run build` could not start because this PowerShell blocks `npm.ps1`; `npm.cmd` ran the same build script successfully.
- Browser scenario and look check: not run in this lane. Claude should verify the badge, seeded gate, Sal hold, Titan, and unchanged native IndexedDB inventory on first startup and same-tab reload.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation files changed.

## Removed

Nothing.