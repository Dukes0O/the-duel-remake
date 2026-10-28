# Build status

Observed at: 2026-10-28T21:14:21.679Z

Observation commit: 7347c830d0704ca2617e8f691475a76f82f1d59e

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 7347c830d0704ca2617e8f691475a76f82f1d59e

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
| codex/codex-lab | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-lab |
| codex/codex-qa-slow | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-qa-slow |
| codex/codex-rescue-flaky | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-rescue-flaky |
| codex/perf-high-night | 13 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/wild-art-src | 13 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/codex-lab | unknown | 2026-10-28T14:13:56-07:00 | 0 | last commit 2026-10-28T14:13:56-07:00 | docs/changes/LAB-BENCH-PANELS-REMOVE.md, docs/changes/LAB-TRY-PICTURES-DIAL.md, src/lab/lab-markup.js, src/lab/lab-ui.css, src/lab/lab-view.js |
| codex/codex-rescue-flaky | unknown | 2026-10-28T14:04:31-07:00 | 0 | last commit 2026-10-28T14:04:31-07:00 | docs/changes/QA-RESCUE-FINISH-FLAKY.md, tools/scenarios/rescue-finish.mjs |
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
| Git objects | 792,078,336 B | +168,960 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 243a2879498706572d8676ee0ed29776b4a143e8
- Local main: missing
- Local integration/wasteland: 49b773d437a3fa744f1c985f21ae82e6ce81f468

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 243a2879498706572d8676ee0ed29776b4a143e8.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: behind local; cached commit 8730074d138b7f5cf9aa9c16c06686143ce9afee.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/codex-lab: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-lab' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-lab/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-lab
Issue: codex/codex-rescue-flaky: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-rescue-flaky' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-rescue-flaky/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/codex-rescue-flaky
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
