# Build status

Observed at: 2026-10-26T15:15:44.524Z

Observation commit: 197d5142ca502f4508085869a46834f03888abd2

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 197d5142ca502f4508085869a46834f03888abd2

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
| codex/deep-finish | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-finish |
| codex/ghost-save-message | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/ghost-message |
| codex/heli-return-loads | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/return-loads |
| codex/lab-walk | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/lab-walk |
| codex/perf-high-night | 11 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/summit-ground-gaps | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-ground |
| codex/summit-tunnel-wall | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/summit-tunnel |
| codex/wild-art-src | 11 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-finish | unknown | 2026-10-26T07:49:02-07:00 | 0 | last commit 2026-10-26T07:49:02-07:00 | docs/THE_DEEP.md, docs/board/STATUS.md, docs/board/looks/deep-finish/round-1.jpg, docs/board/looks/deep-finish/round-1.md, docs/changes/DEEP-PLACES.md |
| codex/ghost-save-message | unknown | 2026-10-26T08:03:22-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/GHOST-SAVE-MESSAGE.md, docs/board/run-log.md, docs/changes/GP-CAREER-LIVE.md |
| codex/heli-return-loads | unknown | 2026-10-26T08:12:11-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/GHOST-SAVE-MESSAGE.md, docs/board/cards/HELI-RETURN-LOADS.md, docs/board/cards/RESCUE-FINISH.md |
| codex/lab-walk | unknown | 2026-10-26T08:11:43-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/LAB-WALK.md, src/feature-flags.js, src/lab/lab-scene.js, src/lab/lab-view.js, src/lab/lab-walk-room.js |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 11 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/summit-ground-gaps | unknown | 2026-10-26T08:08:04-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/STATUS.md, docs/board/board.yaml, docs/board/cards/GHOST-SAVE-MESSAGE.md, docs/board/cards/RESCUE-FINISH.md, docs/board/looks/heli-rescue-finish/round-1-review.md |
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
| Review `looks/` | 24,900,308 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 239,340 B | +0 B | 5,000,000 B |
| All `public/` | 335,886,295 B | +0 B | unavailable |
| Git objects | 758,480,896 B | +1,293,312 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8f6f966748b6ed5661a7000ee40e3943d341d2ab
- Local main: missing
- Local integration/wasteland: 531734a1b03f83cf0f0effe64625759ca76e3e3f

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8f6f966748b6ed5661a7000ee40e3943d341d2ab.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: matches local; cached commit 531734a1b03f83cf0f0effe64625759ca76e3e3f.

Issue: Circuit manifest harbour-lights-dusk.js has unknown or malformed literal metadata.
