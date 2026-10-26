# GHOST-SAVE-MESSAGE

Status: ready for integration. Kind: bug fix. Existing ghost and Grand Prix features.

## Design before code

Follow Claude's card: show `SAVING BEST GHOST…` while the write is pending,
then `BEST GHOST SAVED` after success. A failed ghost write says the ghost
is available for this session and the race result is safe. A full GP ghost
store keeps its existing recordings and explains the capacity limit.
Keep the existing session ghost retention rules; add a separate write status.
Include both ghost write statuses in the results render cache key.
No new sound cue: this corrects an existing status line.

Checks: pending/saved/failed deferred writes and result text; existing ghost
and GP coverage in the lane tier; grand-prix-pay browser scenario and picture.
No frame timing.

## Evidence

- New message tests pass with deferred in-memory writes, including failures.
- Lane command: `node tools/run-tests.mjs --tier lane --changed --jobs 4`:
  51 passed, one sandbox-blocked `ffmpeg` spawn, 11 not run (355.95 s).
  Retried only that suite plus the 11 unrun suites outside the sandbox:
  12 passed, zero failed/not run (107.88 s). All 63 selected suites covered.
- Replay guard: 225 checks, 25 cases; world composition: 47 exact checks pass.
  Native GP career on/off fingerprint unchanged:
  `d051abb03c0979635e332caf490579bb980731c37018585ea9b1cf7006870f0b`.
- Independent reviewer: clear after fixing the stopped browser scenario's
  missing presentation tick following the asynchronous write.
- Production `npm run build` passed (542 modules, 1.63 s), invoked through
  `npm.cmd` because PowerShell blocks npm.ps1. Vite needed an unsandboxed
  run for its shared dependency-folder temp config. Existing chunk warnings.
- `grand-prix-pay` passed on private port 14498, memory-only storage, zero
  warnings/errors. Native three-lap sixth place paid 300 credits; the visible
  line changed to `BEST GHOST SAVED`. One 1280 × 720 picture inspected:
  saved line readable below the finishing table. Evidence recycled after review.
  No frame timing or real save access.
- Session Cockpit sync ran; GHOST-SAVE-MESSAGE has no mapped Cockpit task yet.

## Changed assertions

No existing assertions changed or weakened. Added assertions cover deferred
write status/completion, pending text without a false failure/success,
pending/saved/failed result text in Duel, Time Trial and GP, GP capacity text,
and all three cache-key inputs. The GP browser scenario now additionally
requires the visible `BEST GHOST SAVED` line after the real asynchronous write.

## Removed

Replace the false pending-save failure messages and stale render cache key.

## Claude review (26 October 2026)

Approved and merged: only new checks. Live with the next release.
