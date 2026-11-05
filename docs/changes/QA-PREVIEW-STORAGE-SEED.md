# QA-PREVIEW-STORAGE-SEED

## Findings and decision

Keep `preview-storage`. It protects the QA Preview's memory-only save boundary and verifies the seeded player on first startup and same-tab reload. Kyle and Gratian no longer use the desktop Preview, but the scenario remains useful as a QA isolation check.

The reported failure is consistent with the scenario's exact badge comparison: `tools/preview.js` changes the visible badge from `PREVIEW` to `PREVIEW · BUILT …` after `/preview-build.json` succeeds. The same scenario checks the seeded profile fields separately, and the current entry seeds and saves the player before importing production startup. This does not point to missing `public/` files breaking the seed. The browser result is still needed to confirm the scenario's current behavior.

Claude should check the preview in Chrome and review changing the scenario badge check to accept the built badge while keeping all seed and native IndexedDB assertions. No test assertion was changed in this lane.

## Checks

- Pending: `node tools/test-preview-launcher.mjs`.
- Pending: `node tools/test-qa-storage.mjs`.
- Pending: `npm run build`.
- Browser scenario and look check: not run in this lane; Claude should check first startup and same-tab reload, including badge, gate, Sal hold, Titan, and unchanged native IndexedDB inventory.
- Changed assertions: none.
- Race fingerprints: unchanged; no simulation files changed.

## Removed

Nothing.