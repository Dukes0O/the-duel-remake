# Build status

Observed at: 2026-10-26T04:24:50.247Z

Observation commit: 8306d8500e443d3abeba875a35dc4c048be0b29a

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 8306d8500e443d3abeba875a35dc4c048be0b29a

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-26T01:08:36.931Z; tested commit: 4a53aa1fde06c70325be75b8fee3128d9de134fd.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/drive-lesson1-prep | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lesson1-prep |
| codex/earn-finish-prep | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/earn-prep |
| codex/perf-high-night | 10 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/ski-audio | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-audio |
| codex/wild-art-src | 10 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/drive-lesson1-prep | unknown | 2026-10-25T21:22:59-07:00 | 0 | last commit 2026-10-25T21:22:59-07:00 | docs/board/STATUS.md, docs/changes/DRIVE-LESSON-FINISH.md, src/lessons/drive-lesson-ui.js, tools/drive-lesson-finish-sheet.py, tools/drive-lesson-finish.mjs |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 10 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/ski-audio | unknown | 2026-10-25T21:22:54-07:00 | 0 | last commit 2026-10-25T21:22:54-07:00 | docs/board/STATUS.md, docs/changes/SKI-AUDIO.md, public/assets/audio/ski/carve.ogg, public/assets/audio/ski/gate.ogg, public/assets/audio/ski/land-hard.ogg |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 10 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | unavailable | unavailable | 250,000,000 B |
| Wasteland models | 114,830,428 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 23,970,221 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 873,786 B | +0 B | 5,000,000 B |
| All `public/` | 335,681,495 B | +0 B | unavailable |
| Git objects | 753,928,192 B | +107,520 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 010e350c209661dad42ae929502e34203411e0a4
- Local main: missing
- Local integration/wasteland: 58490c9a7232bbabb7f83e1fef0ef51829fccd72

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 010e350c209661dad42ae929502e34203411e0a4.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: behind local; cached commit 40be223cedfd525646b06bd5232ba6056572a93e.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
Issue: codex/drive-lesson1-prep: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lesson1-prep' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/lesson1-prep/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/lesson1-prep
Issue: codex/perf-high-night: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night
Issue: codex/ski-audio: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-audio' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-audio/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/ski-audio
Issue: codex/wild-art-src: Git inspection failed (status): fatal: detected dubious ownership in repository at 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src' 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src/.git' is owned by: 	Kyle_Laptop/kyleb (S-1-5-21-3145047164-4149896009-1733930501-1001) but the current user is: 	Kyle_Laptop/CodexSandboxOffline (S-1-5-21-3145047164-4149896009-1733930501-1003) To add an exception for this directory, call:  	git config --global --add safe.directory C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src
