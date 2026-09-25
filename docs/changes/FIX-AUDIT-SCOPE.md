# FIX-AUDIT-SCOPE

Status: design; independent tests pending.

## Design before code

Add repeatable `--skip-lane <exact branch>` to repo-audit and optional `audit(root, {skipLanes: []})`. Validate nonempty branch strings. For excluded registered lanes, use only integration refs and worktree registration text; do not invoke Git or filesystem inspection inside the folder. Keep dirty unknown, inspection explicitly skipped and cleanupCandidate/removable false. Preserve normal default inspection, candidate scans and size calculations. Exact matching prevents a similar branch from being silently skipped. This matches the existing status interface and is reversible by omitting the option when the owner permits inspection.

The required janitor sweep will pass `--skip-lane lane/audio/aud-10`. No actual external folder is used by tests. A temporary Git wrapper rejects any command rooted inside the excluded throwaway lane. Independent reds precede implementation; review, lane gate and build follow.

## Tests and review

Pending.

## Removed

No runtime or asset replacement. No branch or evidence removal is justified by this helper change; normal after-merge cleanup removes this QA lane once its verdict is committed.
