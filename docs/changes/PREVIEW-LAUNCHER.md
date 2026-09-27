# PREVIEW-LAUNCHER

## Decision

The desktop preview builds the QA entry from the integration checkout and
serves it on `127.0.0.1:5195` with a strict port check. It uses the established
tab-scoped local storage facade and a tab-scoped in-memory career backup store
before production startup. It never opens or changes native IndexedDB. A fresh
tab receives one temporary player with the gate found, Sal's hold at 100
percent and the Titan unlocked. Reloading keeps temporary progress; closing
the tab discards it.

The launcher uses only the locked local dependencies. It needs no account,
paid tool, network request, administrator access or change to port 5174.

## Changed

- Added the preview launcher and the current-user desktop shortcut installer.
- Added the QA preview page, visible PREVIEW badge and temporary player recipe.
- Added the preview page to the QA build and documented its use.
- Allowed the two card-owned root scripts in the repository placement check.
- Added a QA-only startup hook for the in-memory career backup and budget store.
- Made second-click reuse require the built Preview page, badge and hashed
  Preview entry script. An ordinary or old Duel server now fails closed.
- Added focused storage, launcher identity and private browser regressions.

## Tests

- `node tools/test-preview-launcher.mjs`: 21 checks passed.
- `node tools/test-qa-storage.mjs`: 39 isolation, fail-closed and memory-store
  checks passed. Existing physical namespace checks remain unchanged.
- `node tools/test-launcher-port.mjs`: passed, including exact Preview reuse
  and rejection of a fake ordinary or old Duel server.
- `node tools/test-career-budget.mjs`: passed.
- `node tools/test-career-backup.mjs`: passed.
- `node tools/browser-harness.mjs scenario preview-storage`: passed on a
  private random port with a disposable browser profile. Before and after
  first startup and same-tab reload, the native IndexedDB inventory was equal
  and no native `open()` call occurred. The seeded player and PREVIEW badge
  remained present. There were no warnings or errors.
- `npm run qa:build`: passed; `.qa-dist/tools/preview.html` was produced.
- `npm run build`: passed with the existing large-chunk warnings.
- `git diff --check`: passed.

The broad lane gate was not rerun after the review fixes. The Director will
run it after independent review is clean, as requested.

Browser launch is waiting for Kyle after the lane merges and the shortcut is
installed from the durable integration checkout.

## Changed assertions

None. The acceptance test was committed red before implementation.

## Race fingerprints

Not changed. This card adds a separate QA entry and does not change simulation.

## Removed

Nothing. This adds the first dedicated playtest preview launcher.
