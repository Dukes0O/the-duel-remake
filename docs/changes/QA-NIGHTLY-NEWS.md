# QA-NIGHTLY-NEWS

- Standing failures are recorded with their first observed dates and latest known causes.
- The nightly runner classifies results as passed, standing or failed. Strict runs ignore the standing list. Passing entries are removed when the result is published.
- `node tools/test-full-check.mjs`: 47 passed; the real temporary Git-copy check failed because `pwsh` could not start (`EACCES`). Claude should rerun it on the laptop.
- Changed assertions: none.
- Race fingerprints: unchanged. New game events and sound cues: none.
- Still to build: changed-area browser selection and the status line. Final card checks remain.

## Removed

Nothing.
