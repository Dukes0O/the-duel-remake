---
task: TRACK-01
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

Added `node tools/build-status.mjs` to write `docs/board/STATUS.md`. Options
`--root`, `--live-root`, `--now` and `--json` support isolated fixtures and
machine-readable reports. The report names its observation commit, integration
source state, live Git commit and build identity, feature switches, lane ages,
unmerged work and clean merged worktree removal candidates.

Backup reporting shows local branch refs, the rollback build manifest and cached
remote-tracking refs for master, main and integration/wasteland. It does not
claim that these cached refs verify current remote contents or that a rollback
manifest proves the full build is intact. Inspection does not fetch, push,
remove worktrees, access player saves or contact a browser/server. Output paths
that resolve into the live checkout are rejected.

The runner hook records full-tier evidence before and after a complete unfiltered
full-tier attempt. A crash leaves failed/incomplete evidence. A passing status
requires every selected test result, clean source at both ends and an unchanged
commit. The reader requires every ledger field with its expected type, positive
whole-number suite counts, completed coverage equal to the total and no failures.
Only the ledger itself is excluded from source dirt. Filtered runs, listing
commands and other tiers preserve the previous ledger. Injected runner tests
can record only when given an explicit fixture project root.

The generated page is a snapshot. Committing it makes a later metadata commit
that needs its own full run; no document changes inherit a passing check.

## Evidence

- Independent acceptance tests committed first as `6b570be`. The red baseline
  had 18 failing scenarios: the status tool and persistent runner evidence were
  missing.
- `node tools/test-build-status.mjs`: 201 checks, zero failing scenarios after
  the reviewed schema regressions (the original set passed 117 checks).
  Throwaway repositories cover stale/missing/failed/dirty evidence, current
  source edits, metadata commits, missing manifests/remotes, lane cleanup
  eligibility, full-run source/HEAD changes, ledger exclusion and partial runs.
  Network/save access guards and byte snapshots confirm inspection side effects.
- `node tools/test-test-runner.mjs`: 124 checks passed; 207 suites discovered.
- Independent lane gate, build and code review are pending at builder handoff.
- Integration must generate and commit its status page after merging. No real
  status snapshot or full-tier pass is claimed by the builder.
- Browser checks: not required for this CLI-only change. No live browser used.

## Behavior and test changes

No gameplay changes or race fingerprint changes. New independent acceptance
tests use temporary repositories and fictional build metadata. No runtime
dependencies were added.

Review found that the first reader accepted passing evidence with missing
provenance fields or contradictory completion and failure counts. Independent
regressions in `f4aa57d` strengthen the evidence fixtures to match the actual
writer and reject missing, mistyped and contradictory fields. The reviewer
approved those test changes; no assertion was weakened. The reader now validates
the full ledger schema and all passing conditions before granting exact HEAD.

## Independent gate and review

The reviewer confirmed the P1 fix in 3c20dce and approved the stronger
fixtures in f4aa57d; no blocker remains. On combined lane HEAD 3da6c9f,
`node tools/run-tests.mjs --tier lane --changed --jobs 8` passed six selected
suites (1,483 checks) in 39.25 seconds. The production build passed in 1.66
seconds with the existing chunk-size advisory. The tree stayed clean.
The changed-file gate did not select campaigns or replay suites; game and
fingerprint files are unchanged. No extra broad run is claimed.
