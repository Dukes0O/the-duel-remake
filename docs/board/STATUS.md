# Build status

Observed at: 2026-10-26T15:50:01.831Z

Observation commit: 736b90d317cfe5d50c08c7441df6cb41b9f5a572

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 736b90d317cfe5d50c08c7441df6cb41b9f5a572

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-26T04:52:49.204Z; tested commit: 591d924505dc51e82f20e974a4cf564b905d2449.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-finish | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish |
| codex/heli-return-loads | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/return-loads |
| codex/lab-lesson-frame | 0 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-frame |
| codex/perf-high-night | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/ski-tune | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-tune |
| codex/summit-finish-area | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish |
| codex/wild-art-src | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-finish | unknown | 2026-10-26T07:49:02-07:00 | 0 | last commit 2026-10-26T07:49:02-07:00 | docs/THE_DEEP.md, docs/board/STATUS.md, docs/board/looks/deep-finish/round-1.jpg, docs/board/looks/deep-finish/round-1.md, docs/changes/DEEP-PLACES.md |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 11 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/ski-tune | unknown | 2026-10-26T08:48:13-07:00 | 0 | last commit 2026-10-26T08:48:13-07:00 | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/QA-SUMMIT-GLACIER-EDGE.md, docs/board/cards/SKI-FINISH.md, docs/board/cards/SUMMIT-FINISH-AREA.md |
| codex/summit-finish-area | unknown | 2026-10-26T08:48:30-07:00 | 0 | last commit 2026-10-26T08:48:30-07:00 | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/QA-SUMMIT-GLACIER-EDGE.md, docs/board/cards/SKI-FINISH.md, docs/board/cards/SUMMIT-FINISH-AREA.md |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 11 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,830,428 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 25,706,737 B | +363,793 B | 20,000,000 B |
| Added bytes in last merge | 1,430,037 B | -189,899 B | 5,000,000 B |
| All `public/` | 335,886,295 B | +0 B | unavailable |
| Git objects | 761,969,664 B | +1,658,880 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8f6f966748b6ed5661a7000ee40e3943d341d2ab
- Local main: missing
- Local integration/wasteland: a283fe226d2e89318a1b0419fbf10d900857a2b1

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8f6f966748b6ed5661a7000ee40e3943d341d2ab.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit a283fe226d2e89318a1b0419fbf10d900857a2b1.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/deep-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish
Issue: codex/lab-lesson-frame: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-frame' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-frame/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-frame
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/ski-tune: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-tune' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-tune/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-tune
Issue: codex/summit-finish-area: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
