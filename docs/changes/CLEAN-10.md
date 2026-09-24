# CLEAN-10: tested binary compaction routine

Status: ready to merge.

## Changed

- Added `tools/compact-binaries.mjs` for a future approved rewrite of
  `master..integration/wasteland`. It requires an explicit `--execute` and a
  written approval JSON bound to the exact repository path and current master
  and integration commits. It refuses master, a dirty worktree, unexpected
  local branches, an unverified bundle or a changed ref. It has no push or
  release step.
- Before changing a ref, the tool creates and verifies a `git bundle --all`
  outside the repository. It marks the backup for at least seven days of
  retention and writes the old-to-new commit map beside it. A private Git
  index rebuilds development commits, preserving their text trees, modes,
  parent graph, authors, dates and messages while dropping superseded binary
  versions. Master stays unchanged; the final integration tree must match
  exactly before a compare-and-swap ref update.
- Added throwaway-repository tests for the exact tip tree, one current binary
  version, deleted and transient binaries, smaller replacements, a real merge
  commit, renamed paths with spaces, binary-to-text conversion, executable
  text mode, bundle recovery, dirty/master/approval refusals, a late-NUL
  unknown binary with a late NUL byte, ANSI-escaped text history, conflicting
  text-extension content, global and nested Git attribute rules, ambiguous
  runtime data refusal, and a linked backup directory. Fixtures have no
  remotes.

## Removed

- The tool removes superseded binary objects only from a future rewritten
  development branch's reachable history after written approval. This card
  removed no project history, branch, runtime asset, save or evidence.

## Checks

- Lane tier passed 238/238 suites in 356.36 seconds, including 632 temporary
  repository compaction checks, 162 unchanged replay fingerprints and 48/48
  expansion drives. Production build passed. `git diff --cached --check`
  passed. Independent review found and cleared backup-link, binary-content
  and Git-attribute precedence cases. No real history rewrite was run.
