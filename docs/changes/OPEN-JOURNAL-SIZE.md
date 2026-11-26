# OPEN-JOURNAL-SIZE

- Bank-success in `settleNight2` folds old audit rows; `settleOpenWorld` enforces a 512-row target.
- Pure summaries keep choice prefixes, night ranges and row counts; all rule inputs stay exact.
- Current and last-banked nights, thread rows, burns and unknown rows survive; overflow warns and keeps progress.
- Replay replacement, the legacy ledger bank, recollection data and save loading stay unchanged.
- Checks use memory-only saves on `24670d73e` plus this card's working tree.
- PASS: `node tools/test-open-state.mjs` (10,000 rows, bank/roam reload, old save, repeat choices, both ceiling cases).
- Lane tier (`--changed --jobs 2`): all 32 selected suites passed; two extra Night 2 checks also passed.
- Environment retries: `test-full-check` needed PowerShell access; hygiene fixtures needed a Git discovery ceiling inside local TMP.
- PASS: `npm run build`; chunk-size/dynamic-import warnings only.
- Assertions: added fixture checks only; no existing assertions or replay fingerprints changed.
- For Claude to run: independent save review; deferred night suites `test-convoy-tanker-art`, `test-first-person-polish`.
- Browser scenarios were not run, as requested; no new game event or sound cue.
- **Removed**: unbounded old audit rows on bank/ceiling writes; obsolete questions replaced with Claude-answer acknowledgement.
