# Build status

Observed at: 2026-10-25T06:37:15.611Z

Observation commit: 253700a31f7d37a638440d17c34729f1aeec7369

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 253700a31f7d37a638440d17c34729f1aeec7369

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-25T00:18:16.896Z; tested commit: 69ab7b6a9336af97e747f89c0f06ece6b522b1c6.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/perf-high-night | 9 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/speirling-tries | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/speirling-tries |
| codex/wild-art-src | 9 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 9 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 9 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,065,012 B | +908,564 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 20,131,615 B | +3,269,762 B | 20,000,000 B |
| Added bytes in last merge | 1,533,772 B | -97,047 B | 5,000,000 B |
| All `public/` | 329,122,409 B | +25,602,324 B | unavailable |
| Git objects | 766,276,608 B | +55,919,616 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 9279efa44cbfd3a28445c8835b77b1056e4f9a11
- Local main: missing
- Local integration/wasteland: e99b9ca83ccf2bf51893b0d3bbf05c8803e4aa7d

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 9279efa44cbfd3a28445c8835b77b1056e4f9a11.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit e99b9ca83ccf2bf51893b0d3bbf05c8803e4aa7d.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
