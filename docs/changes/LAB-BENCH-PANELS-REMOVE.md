# LAB-BENCH-PANELS-REMOVE

Design: keep the passed-lesson page for Restore and the secret fan, and the
Rust protection challenge. Remove the old general-purpose dials, Run, readout
and challenge panel. Teaching still uses the same pure bench rules to prove
its challenge goals. The player test keeps every lesson's dial settings.

Checks: repository audit before and after; every tools/test-lab*.mjs directly;
Lab browser scenarios (Restore, fan, Tune, polish and tunnel at both sizes);
lane tier with two jobs and production build.

Changed assertions: the old markup tests required generic dials, Run, Brian's
experiment replay, a disabled challenge button and select-option labels. Those
controls and their label helper are removed. The replacements check replay,
escaped text and the absence of the old interface for every lesson, plus all
Rust choices and their feedback. Restore's old assertion that an ordinary
bench still has Run now checks that the passed page has no legacy controls.
A new first-pass test proves Restore appears beside Rust's protection results.
No rule, reward, physics, tolerance or fingerprint assertion changed.

Review: independent review found that first-pass Rust results hid Restore.
The panel now appends the current Restore offer; the reviewer confirmed the fix.
All 21 tools/test-lab*.mjs suites passed directly, including 32 view tests,
19 Restore tests, all sixteen player dial scripts, and 215 tuning checks.
The radio test's sandbox run stopped at FFmpeg measurement; its native retry
passed all 791 checks. No assertions changed for that retry.

Repository audit before and after: 3,610 tracked files; 426,706,069 to
426,702,807 bytes. No unused module candidates in either audit. No new
unused exports.

Final shared validation for both cards, on source commit 80224256:

- Lane gate: node tools/run-tests.mjs --tier lane --changed --jobs 2 passed
  all 29 suites in 433.42 seconds. The 225 replay fingerprint checks and 47
  complete-scene checks passed unchanged. No fingerprints were re-recorded.
- All six browser runs passed with memory-only saves and zero warnings or
  errors: lab-lessons-tunnel at 1280 x 800 and 1440 x 900, lab-restore,
  lab-fan-view, lab-tune-view and lab-polish. Browser batches used --jobs 1.
- Production build passed via npm.cmd run build -- --configLoader=runner.
  The first npm.ps1 invocation dropped the option and treated runner as a
  folder. npm.cmd forwarded it correctly. No game or test change was needed.
  Vite still reports large chunks and an ineffective dynamic import.
  Built output was 355,166,721 bytes before recycling.
- Independent code review is clear after the Rust fix. Claude's two-picture
  look check and written review of the changed UI assertions remain pending.

Claude's scratchpad holds codex-lab-try-1280.png at the requested path and
codex-lab-try-1440.png beside it. Raw evidence and scratch/build output are
recycled after recording these results. The final amendment changes only
these results and the required STATUS snapshot.

## Removed

Generic control/option markup, dials, Run and Brian replay buttons, numeric
experiment readouts and the old challenge-button wrapper; their input/click
handlers, automatic legacy-bench pass path, explained state and unused styles.
Pure bench controls, runs and goal rules remain, including BENCH_SCRIPT and
the player test for all sixteen lessons. Fan sliders/readouts and Rust
protection and restoration styles remain in use.
