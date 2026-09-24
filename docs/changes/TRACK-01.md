---
task: TRACK-01
status: review
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
full-tier attempt. A crash leaves failed/incomplete evidence. A pass requires
every selected test result, clean source at both ends and an unchanged commit.
Only the ledger itself is excluded from source dirt. Filtered runs, listing
commands and other tiers preserve the previous ledger. Injected runner tests
can record only when given an explicit fixture project root.

The generated page is a snapshot. Committing it makes a later metadata commit
that needs its own full run; no document changes inherit a passing check.

## Evidence

- Independent acceptance tests committed first as `6b570be`. The red baseline
  had 18 failing scenarios: the status tool and persistent runner evidence were
  missing.
- `node tools/test-build-status.mjs`: 117 checks, zero failing scenarios.
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

No gameplay changes, race fingerprint changes or existing assertion changes.
New independent acceptance tests use temporary repositories and fictional
build metadata. No runtime dependencies were added.
