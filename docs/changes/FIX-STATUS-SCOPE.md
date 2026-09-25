---
task: FIX-STATUS-SCOPE
status: test-first
kind: qa-safety
---

# Build-status lane inspection scope

## Design

Add a repeatable `--skip-lane <exact branch>` option and a matching
`collectStatus({skipLanes: [...]})` input. A skipped branch stays in the report
using refs from the integration checkout. Its worktree path and commit remain
visible, but its dirty state is unknown, removal is false, and its activity says
inspection was skipped. The collector must make no Git or filesystem call
inside the skipped worktree. Other lanes keep their current inspection.

The option takes a full branch name, such as `codex/audio-work`. A prefix or
similar name does not skip another branch. Repeated options select multiple
exact branches. Missing values fail before status collection or file output.

## Tests before implementation

Extend `tools/test-build-status.mjs` with throwaway merged and unmerged skipped
worktrees plus a dirty ordinary worktree. The test process guards child Git
`-C` and filesystem calls against each skipped worktree path. It checks CLI
and direct collector input, exact-name behavior, retained branch refs,
unknown dirty state, explicit skipped activity, and `removable:false`.

Focused red: `node tools/test-build-status.mjs` finished 253 checks with two
intended failures. The CLI rejects a valid `--skip-lane` as unknown, and the
missing-value case cannot yet name that option. The old scenarios passed.
No real status collection or external audio worktree inspection was run.

After the helper change, the same focused command passes 275 checks with zero
failures. The child guard would throw on Git `-C` or filesystem access under
either skipped worktree; the test also rejects a caught guard error hidden in
the report's issues. A similar dirty branch is still inspected normally.
The test's expected Windows path was normalized to the forward slashes Git
reports; no product assertion was relaxed.

Independent diff review found that skipped worktrees are selected by exact
branch name, before the only per-worktree Git status call. Branch commit,
merge state and committed holds still come from integration refs. The skipped
row records `dirty:null`, explicit activity text and `removable:false`.
Other rows keep their previous path.

## Removed

The unsafe assumption that every registered worktree may be inspected is
removed. The status collector now leaves requested branches visible without
opening their worktrees.
