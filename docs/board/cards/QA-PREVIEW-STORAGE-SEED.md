# QA-PREVIEW-STORAGE-SEED

From the full check of 5 November 2026 (`docs/changes/NIGHT-FIXES-1105.md`). preview-storage fails at first startup with a badge but no seeded player. Kyle and Gratian no longer use the Preview (31 October), so decide whether this scenario still earns its place or whether the seed broke when QA builds stopped copying public/. Rule 4: 30 minutes, then a note.

## Codex decided (Claude to review)

Keep `preview-storage`: it checks that opening and reloading the QA Preview does not open native IndexedDB and that a fresh disposable player has the required access seed. Kyle and Gratian no longer use the desktop Preview, but this remains a useful QA isolation check.

The current scenario reports a missing badge/player when the badge text has the new `PREVIEW · BUILT …` suffix. `tools/preview.js` seeds and saves the player before production startup; the scenario separately checks gate discovery, Sal's hold, and Titan ownership. This points to a stale exact-text badge expectation, not evidence that the seed broke when QA stopped copying `public/`. Chrome is unavailable in this lane, so Claude should confirm in the browser and review updating the scenario to recognize the built badge while retaining all seed and native-storage assertions. No assertion was changed here.