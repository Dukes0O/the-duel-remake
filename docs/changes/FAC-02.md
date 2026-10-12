---
task: FAC-02
status: merged
kind: tooling
flag: none
player_facing: no
---
# FAC-02: merge on green

## Design settled before code

The integrator consumes a caller-supplied JSON packet pinned to the exact clean
lane commit. It requires the original green targeted runner result (lane,
changed, jobs 1 to 4, zero failures and unrun suites), a successful production
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
These are script acceptance fixtures, not real feature-gate evidence.
The first lane run stopped at 12 passed / 1 failed / 4 unrun (102.96 s).
Its new retained-branch test expected display text without Git's checked-out
“+” marker. Before editing that assertion: verify the exact surviving branch
commit instead. This directly proves preservation, with no weakened bound. First green candidate d4c3aee5: canonical targeted lane 17/17, zero failed
or unrun, 149.10 s, jobs 4; integrator fixtures 10/10; production build
1210 ms. Root review clears the script and acceptance tests. Current accepted
AGENTS/FACTORY now allow six build lanes across all lines, at most three course
lanes. Correct only those stale doc limits and the note encoding, then freeze
the review correction for one fresh targeted lane/build and quick delta review.

## Behavior and test changes

No game rules, saves, assets or replay fingerprints change. New acceptance cases
cover two prompt green merges, actual evidence validation, stale and dirty
source, conflicts, metadata persistence and cleanup limits.

## Removed

Remove the old merge queue wait, clean-merge rerun, full-run deadline, conflicting
lane limits and historical integration path from current workflow instructions.
Keep release approval and the exact-release-commit full gate.

Final corrected source306468b5: canonical17/17 in298.83s,jobs4, build1360ms,
Director review clear; actual integrator merged it at60ede817 and committed
metadata immediately. Its own clean lane and branch were safely recycled/removed.
The actual FAC-03 selector and FAC-07 merges were 5 minutes 5 seconds apart
(02790f14 at 13:39:27 PT; c2dcc973 at 13:44:32 PT). Both green lanes merged
promptly, but this pair does not establish the five-minute acceptance.
The controlled independent two-merge fixture does; no actual timing pass is
claimed for that pair.

Actual independent green merges now establish the factory timing: FAC-04
(de2d0813, 309/309, build/review clear) at 14:15:14 PT and Claude's accepted
night-balance design (469f0a1d, source 00a2b3a2, 13/13, build/review clear)
at 14:15:44 PT were 30 seconds apart. Exact commit times and both gate
verdicts are in Git and run-log. No queue wait or clean-merge rerun.
