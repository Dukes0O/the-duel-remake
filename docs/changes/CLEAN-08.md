# CLEAN-08: after-merge janitor and status sweep

Status: ready to merge.

## Changed

- The playbook now gives the exact after-merge order: commit the verdict,
  delete used evidence, unlink the integration-only dependency junction,
  remove the clean worktree normally, delete its merged lane branch, then
  refresh STATUS and record sizes. It also names the end-of-run and
  ten-merge sweep: list idle branches without deleting them, fold and delete
  old notes, remove only proven-unused paths through a gated lane, compare
  size targets and log before/after sizes.
- `build-status` now reports every size target, the current measurement and
  the change since the previous STATUS observation. Git size includes loose
  and packed objects; merge-added bytes count every newly reachable blob in
  lane history, including smaller replacements and binaries added then deleted.
  A missing prior value or missing build is shown as unavailable.
  It lists unmerged lane branches with inferred card, last commit date and
  retained committed and uncommitted file paths. Dirty worktrees have unknown
  exact activity time, so they are not labelled idle. It never deletes or
  prunes branches. By default it does not inspect the live checkout.
- Fixture checks cover size growth, shrinkage, repeated observations, missing
  and invalid prior observations, replacement blobs, loose Git growth,
  missing live metadata by default, unmerged branch details and the existing
  full-tier provenance cases.

## Removed

- Removed the old playbook wording that said D8 integration push approval was
  still pending. The current rule is a push only after a passing full tier
  and approved compaction; a history rewrite or release still requires Kyle's
  written approval. No branch, evidence, runtime asset or save was removed by
  this card.

## Checks

- Final lane tier passed 8/8 suites in 45.05 seconds; its status fixture passed
  245 checks. Production build passed. `node tools/test-replays.mjs` passed all
  162 unchanged fingerprints. `git diff --check` passed.
- Independent review found and then cleared the loose-object, transient-blob
  and dirty-branch reporting cases. No production source, replay fixture,
  runtime asset or save changed.
