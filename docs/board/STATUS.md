# Build status

Observed at: 2026-10-26T14:48:38.145Z

Observation commit: 582199f679e983fdface00974846cac06b01d250

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 582199f679e983fdface00974846cac06b01d250

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
| codex/deep-finish | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish |
| codex/gp-career-live | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/gp-career-live |
| codex/heli-landed | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-landed |
| codex/map-finish | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/map-finish |
| codex/perf-high-night | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/rescue-finish | 0 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/rescue-finish |
| codex/ski-finish | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-finish |
| codex/wild-art-src | 11 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/gp-career-live | unknown | 2026-10-26T07:47:11-07:00 | 0 | last commit 2026-10-26T07:47:11-07:00 | docs/DRIVING_LESSONS.md, docs/HELICOPTER.md, docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/GP-CAREER-LIVE.md |
| codex/heli-landed | unknown | 2026-10-26T07:46:59-07:00 | 0 | last commit 2026-10-26T07:46:59-07:00 | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/HELI-LANDED.md, docs/changes/HELI-LANDED.md, src/app.js |
| codex/map-finish | unknown | 2026-10-26T07:45:25-07:00 | 0 | last commit 2026-10-26T07:45:25-07:00 | docs/board/STATUS.md, docs/board/looks/pilot-map/look-1.jpg, docs/changes/MAP-FINISH.md, src/heli/heli-fire-view.js, src/heli/pilot-map-view.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 11 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/ski-finish | unknown | 2026-10-26T07:45:59-07:00 | 0 | last commit 2026-10-26T07:45:59-07:00 | docs/board/STATUS.md, docs/board/cards/SKI-FINISH.md, docs/board/looks/ski-finish/look-1.jpg, docs/board/looks/ski-finish/look-1.md, docs/changes/SKI-FINISH.md |
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
| Review `looks/` | 24,178,024 B | +696 B | 20,000,000 B |
| Added bytes in last merge | 151,212 B | +0 B | 5,000,000 B |
| All `public/` | 335,886,295 B | +0 B | unavailable |
| Git objects | 756,574,208 B | +378,880 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8f6f966748b6ed5661a7000ee40e3943d341d2ab
- Local main: missing
- Local integration/wasteland: 2d3967284890fe7580bd0e5403fd1dfa541ce445

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8f6f966748b6ed5661a7000ee40e3943d341d2ab.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: behind local; cached commit 5fed2c4628671e2891400ee60080f1ffb9201b2b.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/gp-career-live: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/gp-career-live' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/gp-career-live/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/gp-career-live
Issue: codex/heli-landed: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-landed' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-landed/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-landed
Issue: codex/map-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/map-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/map-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/map-finish
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/rescue-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/rescue-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/rescue-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/rescue-finish
Issue: codex/ski-finish: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-finish' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-finish/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-finish
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
