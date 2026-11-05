# WW-SAVE

- **Status:** Built in lane `codex/ww-save`.
- **Kind:** Additive save support.
- **Design:** `profile.story.ember` uses `registerStory` with optional `read`, six ordered job marks, and `end`. Unknown job names survive normalization; marks only rise. Job 3 saves the flamethrower through the existing Wasteland weapon ownership data, and job 6 adds Cinder through `wasteland.crew.unlocked`. Job 1's loan remains temporary. `profile.world.found` is optional and grows by union. Reading either save view adds no fields. A future Wasteland schema refuses story job writes.
- **Files:** `src/story/ember-save.js`, `src/world/world-save.js`, `tools/test-ember-save.mjs`.
- **Checks:** `node tools/test-ember-save.mjs` — 52 checks passed, including every JSON file in `tools/fixtures/saves/` through memory-only load/save round-trips. Save checker also ran `tools/test-save-fixtures.mjs` — 1,103 checks passed — `tools/test-storage-budget.mjs` — 3.73 MB of 4 MB — and 8 malformed/partial normalization cases without throws. Credit-safety suites passed (280 busted-quit, 225 police-fine checks and 6 combat-credit subtests). `npm.cmd run build` — passed (632 modules). The `npm` PowerShell wrapper was blocked by execution policy; the Windows command shim ran the same build successfully. Existing Vite chunk-size and mixed static/dynamic import warnings remain.
- **Review:** Independent code review and save review passed with no remaining findings.
- **Lane tier:** Not run; Claude runs it.
- **Browser/look checks:** Claude runs. Check a memory-only legacy career for unchanged saved fields, job 1's loan remaining temporary, job 3's permanent flamethrower unlock, job 6's Cinder unlock, and save/reload persistence for the new story marks and world finds.
- **Changed assertions:** No existing assertions changed. The new test's initial setup was corrected to complete prerequisite jobs before testing ordered marks and the ending; no tolerance or acceptance rule was loosened.
- **Race fingerprints:** None changed; this card changes only optional save helpers.
- **Removed:** None.
