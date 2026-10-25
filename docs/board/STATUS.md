# Build status

Observed at: 2026-10-25T19:13:33.762Z

Observation commit: 90c47a40959606d76a8a2b793802a341e61ef942

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 90c47a40959606d76a8a2b793802a341e61ef942

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
| codex/deep-playtest-1 | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-playtest |
| codex/lab-fan | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-fan |
| codex/perf-high-night | 10 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/racecraft-ardennes | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/racecraft-ardennes |
| codex/wild-art-src | 10 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-playtest-1 | unknown | 2026-10-25T12:08:05-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/THE_DEEP.md, docs/board/board.yaml, docs/board/cards/DEEP-PLAYTEST-1.md, docs/board/cards/SAVE-RECORDS-IDB.md, docs/board/run-log.md |
| codex/lab-fan | unknown | 2026-10-25T02:22:16-07:00 | 0 | last commit 2026-10-25T02:22:16-07:00 | docs/board/STATUS.md, docs/changes/LAB-FAN.md, src/config.js, src/earned-cars-ui.js, src/heli/heli-jobs.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 10 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
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
| Review `looks/` | 20,672,006 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 142,558 B | +0 B | 5,000,000 B |
| All `public/` | 329,342,047 B | +0 B | unavailable |
| Git objects | 800,734,208 B | +16,384 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 2d0e281eb7b26f3513de8e11f3b24b946f062870
- Local main: missing
- Local integration/wasteland: 005ec1d8d102821f2f38eb0270caaf26ba745126

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 2d0e281eb7b26f3513de8e11f3b24b946f062870.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 005ec1d8d102821f2f38eb0270caaf26ba745126.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
