# Build status

Observed at: 2026-10-25T20:21:00.193Z

Observation commit: fe47ef90246a0fae208aaf0913849b0a7829ecf7

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: fe47ef90246a0fae208aaf0913849b0a7829ecf7

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-25T17:52:43.930Z; tested commit: 2b4d3926db22c1903ec366a58a5225111d0cf4d1.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-explorer | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-explorer |
| codex/deep-playtest-1 | 0 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-playtest |
| codex/deep-ramp-2 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-ramp-2 |
| codex/lab-fan | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-fan |
| codex/perf-high-night | 10 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/racecraft-ardennes | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/racecraft-ardennes |
| codex/wild-art-src | 10 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-ramp-2 | unknown | 2026-10-25T13:12:22-07:00 | 0 | last commit 2026-10-25T13:12:22-07:00 | docs/board/STATUS.md, docs/board/looks/deep-ramp-2/review.md, docs/board/looks/deep-ramp-2/round-1.jpg, docs/changes/DEEP-RAMP-2.md, src/coastal-water.js |
| codex/lab-fan | unknown | 2026-10-25T02:22:16-07:00 | 0 | last commit 2026-10-25T02:22:16-07:00 | docs/board/STATUS.md, docs/changes/LAB-FAN.md, src/config.js, src/earned-cars-ui.js, src/heli/heli-jobs.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 10 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/racecraft-ardennes | unknown | 2026-10-25T12:14:16-07:00 | 0 | last commit 2026-10-25T12:14:16-07:00 | docs/board/STATUS.md, docs/changes/GP-RACECRAFT-ARDENNES.md |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 10 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,065,012 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 20,970,003 B | +226,118 B | 20,000,000 B |
| Added bytes in last merge | 239,107 B | +96,549 B | 5,000,000 B |
| All `public/` | 329,342,047 B | +0 B | unavailable |
| Git objects | 802,040,832 B | +1,262,592 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 2d0e281eb7b26f3513de8e11f3b24b946f062870
- Local main: missing
- Local integration/wasteland: 6a35e8f620d3e09516d31fdbf96dd0685e250379

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 2d0e281eb7b26f3513de8e11f3b24b946f062870.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 6a35e8f620d3e09516d31fdbf96dd0685e250379.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/deep-playtest-1: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-playtest' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-playtest/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-playtest
Issue: codex/deep-ramp-2: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-ramp-2' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-ramp-2/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-ramp-2
Issue: codex/lab-fan: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-fan' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-fan/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-fan
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/racecraft-ardennes: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/racecraft-ardennes' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/racecraft-ardennes/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/racecraft-ardennes
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
