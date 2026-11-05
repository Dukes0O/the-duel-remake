# QA-REVIEW-EVIDENCE-MIDNIGHT

## Changed

Review evidence planners now use the UTC calendar date in JavaScript and
Blender. This keeps browser, fidelity and Blender paths in the same day folder
when local time is ahead of or behind UTC.

## Checks

- `node --test tools/test-review-evidence.mjs`: passed, 9 tests and 415 checks.
  The first sandboxed run hit `EPERM` starting `ffmpeg`; its required same-code
  rerun with process permission passed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic import and
  large chunk warnings.
- Browser and look checks: Claude should review test 4's browser, Blender and
  fidelity path agreement at a UTC date boundary. No browser or look check was
  run in this lane.
- Changed assertions: none.
- Race fingerprints: not run; the change only affects review evidence paths.

## Removed

None.
