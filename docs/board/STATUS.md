# Build status

Observed at: 2026-11-05T04:39:45.070Z

Observation commit: 9a0975b10dd63f960f518e15253e13ed5f37299d

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 9a0975b10dd63f960f518e15253e13ed5f37299d

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-11-03T20:43:44.193Z; tested commit: 8361997b97acd4b3ec62ade182fa97a6ebd54e2a.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/eifel-c3 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/eifel-c3 |
| codex/lab-gforce | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-gforce |
| codex/perf-high-night | 20 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/eifel-c3 | unknown | 2026-11-04T21:04:34-07:00 | 0 | last commit 2026-11-04T21:04:34-07:00 | docs/changes/EIFEL-CROWN-C3.md, src/race-field.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 20 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 117,929,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 37,757,113 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 5,511,628 B | +0 B | 5,000,000 B |
| All `public/` | 388,729,335 B | +0 B | unavailable |
| Git objects | 885,854,208 B | +0 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 601a96f8b59d62ad734f942e51eb840ada2e5452
- Local main: missing
- Local integration/wasteland: 56ac80bd7294d36cc45b6bb26c6b61758689b3be

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 601a96f8b59d62ad734f942e51eb840ada2e5452.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 56ac80bd7294d36cc45b6bb26c6b61758689b3be.

Issue: Circuit manifest eifel-crown.js has unknown or malformed literal metadata.
Issue: codex/eifel-c3: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/eifel-c3' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/eifel-c3/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/eifel-c3
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
