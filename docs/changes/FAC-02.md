---
task: FAC-02
status: ready-to-merge
kind: tooling
flag: none
player_facing: no
---
# FAC-02: merge on green

## Design settled before code

The integrator consumes a caller-supplied JSON packet pinned to the exact clean
lane commit. It requires the original green targeted runner result (lane,
changed, jobs 1Ã¢â‚¬â€œ4, zero failures and unrun suites), a successful production
build with its retained log, and one named clear review of that commit.
It checks both Git worktrees and their shared repository before mutation.
It never runs tests, builds, browser checks or release commands. Two independent
green lanes merge immediately; only the brief Git mutation is serial.
A conflict aborts the unfinished merge and returns the lane for a conflict fix,
one new targeted lane run/build and review. A conflict-free merge does not rerun.

The merge writes one sentence from the actual runner/build verdict to run-log,
refreshes STATUS and commits shared metadata immediately. Optional caller updates
are limited to board, inbox and STATUS. All arguments are passed without a shell.
A janitor is opt-in with an explicit current-run creation receipt. It accepts
only the caller's clean, merged codex lane, validates the exact dependency
junction against integration, recycles the checkout and prunes its registration.
It never permanently deletes or force-removes a lane; retained lanes stay.
Tests use small throwaway Git repositories and injected recycling/status calls.

## Evidence

Acceptance tests failed first because the module was absent. Initial seven Git
fixture checks pass (19.14 s); two independent green fixture merges took 2.99 s.
The Windows relative-path check was fixed; no assertion was weakened. Additional
identity, unrelated-registration and Recycle Bin failure cases are included.
These are script acceptance fixtures, not real feature-gate evidence. Lane/build
and root review remain pending on the frozen implementation below.

## Behavior and test changes

No game rules, saves, assets or replay fingerprints change. New acceptance cases
cover two prompt green merges, actual evidence validation, stale and dirty
source, conflicts, metadata persistence and cleanup limits.

## Removed

Remove the old merge queue wait, clean-merge rerun, full-run deadline, conflicting
lane limits and historical integration path from current workflow instructions.
Keep release approval and the exact-release-commit full gate.
