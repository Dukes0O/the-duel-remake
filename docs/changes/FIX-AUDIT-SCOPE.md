# FIX-AUDIT-SCOPE

Status: implementation; independent review and lane gate pending.

## Design before code

Add repeatable `--skip-lane <exact branch>` to repo-audit and optional `audit(root, {skipLanes: []})`. Validate nonempty branch strings. For excluded registered lanes, use only integration refs and worktree registration text; do not invoke Git or filesystem inspection inside the folder. Keep dirty unknown, inspection explicitly skipped and cleanupCandidate/removable false. Preserve normal default inspection, candidate scans and size calculations. Exact matching prevents a similar branch from being silently skipped. This matches the existing status interface and is reversible by omitting the option when the owner permits inspection.

The required janitor sweep will pass `--skip-lane lane/audio/aud-10`. No actual external folder is used by tests. A temporary Git wrapper rejects any command rooted inside the excluded throwaway lane. Independent reds precede implementation; review, lane gate and build follow.

## Tests and review

Independent test author ran three guarded throwaway-repository scenarios against the old helper: one passed and two failed, proving rejected CLI syntax and a forbidden Git call from the direct audit API. Tests and design were committed as82704eb before implementation. The unchanged three tests now pass in2.45 seconds. Tests intercept filesystem and Git calls under an excluded fixture lane and retain ordinary/prefix-name lane checks. No assertions changed. Review and normal lane/build gate pending.

## Removed

No runtime or asset replacement. No branch or evidence removal is justified by this helper change; normal after-merge cleanup removes this QA lane once its verdict is committed.
