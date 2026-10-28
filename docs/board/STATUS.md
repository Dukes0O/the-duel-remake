# Build status

Observed at: 2026-10-28T21:46:27.126Z

Observation commit: 802242568c216c3e265b8249f2c3e97246d9d25f

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 802242568c216c3e265b8249f2c3e97246d9d25f

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-28T19:32:20.796Z; tested commit: aedca4490d01c820825f0500d2871fae8a87fd72.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/codex-lab | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-lab |
| codex/codex-qa-slow | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-qa-slow |
| codex/perf-high-night | 13 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/wild-art-src | 13 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/codex-qa-slow | unknown | 2026-10-28T14:15:08-07:00 | 0 | last commit 2026-10-28T14:15:08-07:00 | docs/board/cards/QA-INSTRUCTOR-ANY-CAR-SLOW.md, docs/changes/QA-INSTRUCTOR-ANY-CAR-SLOW-downloads.md, docs/changes/QA-INSTRUCTOR-ANY-CAR-SLOW.md, tools/browser-harness.mjs, tools/run-tests.mjs |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 13 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 13 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,830,428 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 32,874,545 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 2,641,307 B | +0 B | 5,000,000 B |
| All `public/` | 348,530,686 B | +0 B | unavailable |
| Git objects | 792,570,880 B | +0 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8012f4d6d4c9485848ae87fc684e3bf5e54947c0
- Local main: missing
- Local integration/wasteland: a0aec648ec506b0b06df64f24596918cd6c6380e

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8012f4d6d4c9485848ae87fc684e3bf5e54947c0.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: behind local; cached commit 8012f4d6d4c9485848ae87fc684e3bf5e54947c0.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/codex-qa-slow: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-qa-slow' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-qa-slow/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-qa-slow
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
