# QA-DEEP-LIFE-TIMING

## Cause

The sea-life frame cost check in `tools/test-deep-life.mjs` timed 600 updates
with the wall clock. When the lane tier runs several suites at once, the
operating system pauses this process while another one takes its turn, and the
wall clock counts that waiting as work. That is how the check read 4.287 ms in
the DEEP-PLAYTEST-1 lane run and 1.751 ms alone. The game code did not change.

## Fix

Two small changes, no new machinery and no change to the 4 ms limit.

- `tools/test-deep-life.mjs`: the check now adds up the processor time the
  process used (`process.cpuUsage`) instead of the clock on the wall. Processor
  time counts only the time this process was actually running, which is the
  cost of the update itself, so it measures the same work without the waiting.
  The wall-clock figure is still printed beside it for comparison. The limit
  stays at 4 ms a frame.
- `tools/run-tests.mjs`: the runner already had a quiet-run hook for the native
  audio timing suite (it waits for running suites to finish, runs alone, and
  holds later suites until it ends). The same hook now also covers
  `tools/test-deep-life.mjs`, a suite of about three seconds. The processor
  time is still slightly higher when the laptop is crowded (shared cores run
  slower), so running it alone keeps the number close to the quiet figure.

All 23 behaviour checks in `test-deep-life.mjs` are unchanged.

## Numbers (this laptop, 20 logical cores, other lanes also running)

Quiet, three runs: 2.94, 2.71, 2.68 ms of processor time (wall clock 2.97, 2.72,
2.76 ms).

With 40 busy node loops competing, four runs, processor time against wall clock:

| Run | Processor time | Wall clock |
|-----|----------------|------------|
| 1 | 3.02 ms | 13.92 ms |
| 2 | 3.49 ms | 5.76 ms |
| 3 | 3.15 ms | 3.20 ms |
| 4 | 3.00 ms | 3.03 ms |

The old wall-clock measurement would have failed the 4 ms limit in runs 1 and
2. The processor-time measurement stayed between 3.0 and 3.5 ms, under the
limit, and all 23 checks passed in every run.

## Changed assertions

- `test-deep-life.mjs` "a frame of sea life is cheap": the 4 ms limit assertion
  is the same line and the same limit. Only the way the figure is measured
  changed, from wall-clock time to processor time. Reason: the wall clock
  includes time spent waiting for a turn while other suites run, which is not
  the cost of the update. Nothing is loosened: processor time counts every
  thread of the process, so it is the same as the wall clock on a quiet laptop
  and can only be smaller when the process is made to wait.

## Checks

- Lane tier --changed --jobs 4 --keep-going: the change to un-tests.mjs selects all 507 suites. 506 passed on the first run, run from Git Bash while 24 busy loops competed. 	est-drive-through failed there (the known Git Bash tar problem) and passed on its own from PowerShell, so 507 of 507 pass.
- 	est-deep-life.mjs alone from PowerShell: 23 of 23, 1.927 ms of processor time a frame.
- 
pm run build: built; build output deleted.

## Removed

Nothing removed. The old wall-clock timing lines were replaced in place.
