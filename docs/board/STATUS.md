# Build status

Observed at: 2026-10-26T17:22:28.074Z

Observation commit: b8daac8c8eec88f96f5e1f13c11006ce447a9247

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: b8daac8c8eec88f96f5e1f13c11006ce447a9247

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-26T16:31:45.349Z; tested commit: de0555b0c7b00120884236c9b1c598ac16b85e73.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-finish | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish |
| codex/heli-logbook | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-logbook |
| codex/lab-lift-2 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-lift |
| codex/perf-high-night | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/summit-build-time-2 | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-build |
| codex/summit-finish-area | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish |
| codex/wild-art-src | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-finish | unknown | 2026-10-26T07:49:02-07:00 | 0 | last commit 2026-10-26T07:49:02-07:00 | docs/THE_DEEP.md, docs/board/STATUS.md, docs/board/looks/deep-finish/round-1.jpg, docs/board/looks/deep-finish/round-1.md, docs/changes/DEEP-PLACES.md |
| codex/heli-logbook | unknown | 2026-10-26T10:01:44-07:00 | 0 | last commit 2026-10-26T10:01:44-07:00 | docs/board/STATUS.md, docs/board/cards/HELI-LOGBOOK.md, docs/changes/HELI-LOGBOOK.md, public/assets/heli/skins/rank-chief.png, public/assets/heli/skins/rank-commercial.png |
| codex/lab-lift-2 | unknown | 2026-10-26T10:13:28-07:00 | 0 | last commit 2026-10-26T10:13:28-07:00 | docs/board/looks/lab-2/brian-source.md, docs/changes/LAB-LIFT-2.md, public/assets/models/lab/brian.glb, src/lab/lab-view.js, src/lab/lab-walk-room.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 11 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/summit-finish-area | unknown | 2026-10-26T10:02:31-07:00 | 0 | last commit 2026-10-26T10:02:31-07:00 | docs/board/STATUS.md, docs/board/looks/summit/finish-area/round-1-review.md, docs/board/looks/summit/finish-area/round-1.jpg, docs/board/looks/summit/finish-area/round-2-review.md, docs/board/looks/summit/finish-area/round-2.jpg |
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
| Review `looks/` | 26,459,231 B | +174,265 B | 20,000,000 B |
| Added bytes in last merge | 2,074,624 B | -1,197,135 B | 5,000,000 B |
| All `public/` | 335,886,295 B | +0 B | unavailable |
| Git objects | 773,074,944 B | +1,715,200 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 416b8d6ebfecfc778d5a9971eb49652cdb661cf1
- Local main: missing
- Local integration/wasteland: 70fca6648a3045cea0bd2584db9d4df44847bf08

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 416b8d6ebfecfc778d5a9971eb49652cdb661cf1.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 70fca6648a3045cea0bd2584db9d4df44847bf08.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/deep-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish
Issue: codex/heli-logbook: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-logbook' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-logbook/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-logbook
Issue: codex/lab-lift-2: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-lift' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-lift/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-lift
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/summit-finish-area: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-finish
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
