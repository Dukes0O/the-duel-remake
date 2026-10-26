# Build status

Observed at: 2026-10-26T22:42:32.513Z

Observation commit: 9e6093fa153b88b7d2b42e76fceb55af7a18dbac

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 9e6093fa153b88b7d2b42e76fceb55af7a18dbac

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-26T19:14:51.586Z; tested commit: f514c85925f3c50c2fa4ef6bc9b786b9e6a573df.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-finish | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish |
| codex/lab-brian-fix | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-brian |
| codex/lab-lessons-flying | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-flying |
| codex/lab-lessons-workshop | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-workshop |
| codex/perf-high-night | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/wild-art-src | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-finish | unknown | 2026-10-26T07:49:02-07:00 | 0 | last commit 2026-10-26T07:49:02-07:00 | docs/THE_DEEP.md, docs/board/STATUS.md, docs/board/looks/deep-finish/round-1.jpg, docs/board/looks/deep-finish/round-1.md, docs/changes/DEEP-PLACES.md |
| codex/lab-brian-fix | unknown | 2026-10-26T15:29:55-07:00 | 0 | last commit 2026-10-26T15:29:55-07:00 | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/DRIVE-LESSON-ANY-COURSE.md, docs/board/cards/RESCUE-FINISH.md, docs/board/looks/lab-2/look-5.jpg |
| codex/lab-lessons-flying | unknown | 2026-10-26T15:42:19-07:00 | 0 | last commit 2026-10-26T15:42:19-07:00 | docs/board/STATUS.md, docs/board/looks/lab-2/lab-lessons-flying-1-review.md, docs/board/looks/lab-2/lab-lessons-flying-1.jpg, docs/changes/LAB-LESSONS-FLYING.md, src/lab/benches/altitude.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 11 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
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
| Review `looks/` | 29,875,630 B | -308 B | 20,000,000 B |
| Added bytes in last merge | 1,837,171 B | +0 B | 5,000,000 B |
| All `public/` | 344,148,818 B | +0 B | unavailable |
| Git objects | 808,427,520 B | +1,213,440 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 12b5629f27c44e428d85a9618f7044e832d259e1
- Local main: missing
- Local integration/wasteland: 8cfe3309bea6ad08565c58533210c7d9c14be447

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 12b5629f27c44e428d85a9618f7044e832d259e1.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 8cfe3309bea6ad08565c58533210c7d9c14be447.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/deep-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish
Issue: codex/lab-brian-fix: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-brian' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-brian/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-brian
Issue: codex/lab-lessons-flying: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-flying' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-flying/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-flying
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
