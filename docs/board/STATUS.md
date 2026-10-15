# Build status

Observed at: 2026-10-15T12:46:28.961Z

Observation commit: ad800a87555f121d7af717feada1ae83cffe505d

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: ad800a87555f121d7af717feada1ae83cffe505d

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-15T03:31:23.814Z; tested commit: aa95cf955aced2d8982deec008f25b3ec0509f55.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-art-src | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src |
| codex/heli-art-src | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/heli-art-src |
| codex/p4-ardennes | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-ardennes |
| codex/p4-finish | 3 | unknown | false | false | unknown |
| codex/p4-gp-existing | 1 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 2 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 4 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/p4-summit | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-summit |
| codex/p4-yeti | 1 | unknown | false | false | unknown |
| codex/p4-yeti-native | 0 | unknown | true | false | unknown |
| codex/perf-high-night | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/perf-high-night |
| codex/qa-browser-sweep | 0 | unknown | false | false | unknown |
| codex/tools/callback-diagnostics | 10 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| codex/wild-art-src | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/wild-art-src |
| lane/audio/aud-10 | 20 | unknown | true | false | unknown |
| lane/audio/aud-12 | 20 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 19 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/p4-ardennes | P4-ARDENNES | 2026-10-15T01:11:32-07:00 | 0 | last commit 2026-10-15T01:11:32-07:00 | docs/board/looks/ardennes-art/round-1-review.md, docs/board/looks/ardennes-art/round-1.jpg, docs/board/looks/ardennes-art/round-2-review.md, docs/board/looks/ardennes-art/round-2.jpg, docs/board/looks/ardennes-art/round-3-review.md |
| codex/p4-finish | unknown | 2026-10-11T16:22:18-07:00 | 3 | last commit 2026-10-11T16:22:18-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 4 | uncommitted changes; exact activity time unknown | docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js, src/game.js |
| codex/p4-yeti | unknown | 2026-10-13T22:46:01-07:00 | 1 | last commit 2026-10-13T22:46:01-07:00 | docs/changes/P4-YETI.md, tools/scenarios/yeti.mjs |
| codex/perf-high-night | PERF-HARBOUR-AO-HALF | 2026-10-15T00:10:54-07:00 | 0 | last commit 2026-10-15T00:10:54-07:00 | docs/changes/PERF-HIGH-NIGHT.md, src/ambient-shading.js, tools/full-check.mjs, tools/scenarios/frame-pacing.mjs, tools/test-full-check.mjs |
| codex/qa-browser-sweep | unknown | 2026-10-14T09:01:33-07:00 | 0 | last commit 2026-10-14T09:01:33-07:00 | docs/changes/QA-BROWSER-SWEEP.md, tools/scenarios/audio-crash-peak.mjs, tools/scenarios/convoy-raid.mjs, tools/scenarios/grand-prix-pay.mjs, tools/scenarios/tollkeeper.mjs |
| codex/tools/callback-diagnostics | GATE-CALLBACK-DIAGNOSTICS | 2026-10-04T20:18:20-07:00 | 10 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |
| codex/wild-art-src | WILD-ART-SRC | 2026-10-15T00:56:24-07:00 | 0 | last commit 2026-10-15T00:56:24-07:00 | docs/changes/WILD-ART-SRC.md, tools/art/wildlife-north-woods.json, tools/blender/wildlife-north-woods.py, tools/test-blender-output.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 302,171,760 B | +0 B | 250,000,000 B |
| Wasteland models | 112,189,772 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 19,633,553 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 523,148 B | +0 B | 5,000,000 B |
| All `public/` | 299,940,281 B | +0 B | unavailable |
| Git objects | 430,551,040 B | +86,016 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: d34bf40f6ef6b0525ead5229e55b2f09d2338852
- Local main: missing
- Local integration/wasteland: ad800a87555f121d7af717feada1ae83cffe505d

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit d34bf40f6ef6b0525ead5229e55b2f09d2338852.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit 14a6392154b9eb1eb0d9d7bbc03361aa49586216.

Issue: Circuit manifest summit-time-attack.js has unknown or malformed literal metadata.
