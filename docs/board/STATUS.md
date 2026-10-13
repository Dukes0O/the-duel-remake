# Build status

Observed at: 2026-10-13T00:07:39.266Z

Observation commit: 957f16c7a31b66f662dbe722fc831ef8cf3c2f5f

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 957f16c7a31b66f662dbe722fc831ef8cf3c2f5f

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-12T16:37:15.724Z; tested commit: 1a7a77e77c55a481edc766e97e4a60fdb7c28ced.

## Feature switches

| Switch | State |
| --- | --- |
| seeker-rockets | on |
| convoy-raid | on |
| tollkeeper | on |
| blackiron | on |
| warlord-cards | on |
| arsenal-wave3 | on |
| career-backup | dev |
| hidden-road | on |
| fuel-run | on |
| bounty-hunt | on |
| arsenal | on |
| salt-flats | on |
| crew-gear | on |
| fight-voices | on |
| cpu-crews | on |
| ambush-alley | on |
| gunn | on |
| grand-prix | on |
| grand-prix-career | dev |
| snow-world | dev |
| tremblant-woods | on |
| tremblant-snow | on |
| harbour-lights | on |
| panorama-ridge | dev |
| the-deep | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-art-src | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src |
| codex/deep-audio | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-audio |
| codex/deep-zone-format | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-zone-format |
| codex/p4-finish | 1 | unknown | false | false | unknown |
| codex/p4-gp-existing | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 1 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/p4-summit | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-summit |
| codex/qa-lane-native-relief | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/qa-lane-native-relief |
| codex/tools/callback-diagnostics | 7 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 17 | unknown | true | false | unknown |
| lane/audio/aud-12 | 17 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 17 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-art-src | DEEP-ART-SRC | 2026-10-12T15:14:54-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/deep-art/round-1-review.md, docs/board/looks/deep-art/round-1.jpg, docs/changes/DEEP-ART-SRC.md, public/assets/models/CREDITS.md, tools/art/catalog.json |
| codex/deep-zone-format | DEEP-ZONE-FORMAT | 2026-10-12T17:06:48-07:00 | 0 | last commit 2026-10-12T17:06:48-07:00 | docs/changes/DEEP-ZONE-FORMAT.md, src/deep/deep-zone.js, tools/test-deep-look.mjs, tools/test-deep-zone-format.mjs |
| codex/p4-finish | unknown | 2026-10-11T16:22:18-07:00 | 1 | last commit 2026-10-11T16:22:18-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 1 | uncommitted changes; exact activity time unknown | docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js, src/game.js |
| codex/p4-summit | P4-SUMMIT | 2026-10-12T17:02:08-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/p4-summit/round-1-review.md, docs/board/looks/p4-summit/round-1.jpg, docs/changes/P4-SUMMIT.md, src/camera-clearance.js, src/circuits/summit-run.js |
| codex/qa-lane-native-relief | QA-LANE-NATIVE-RELIEF | 2026-10-12T16:05:06-07:00 | 0 | last commit 2026-10-12T16:05:06-07:00 | docs/changes/QA-LANE-NATIVE-RELIEF.md, tools/run-tests.mjs, tools/test-test-runner.mjs |
| codex/tools/callback-diagnostics | GATE-CALLBACK-DIAGNOSTICS | 2026-10-04T20:18:20-07:00 | 7 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 270,047,923 B | +0 B | 250,000,000 B |
| Wasteland models | 112,189,772 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 16,840,032 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 188,790 B | -91,711 B | 5,000,000 B |
| All `public/` | 288,685,549 B | +0 B | unavailable |
| Git objects | 401,540,096 B | +103,424 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 161e01a0aae942e25359ce3b7ae1e1963fc12e4c
- Local main: missing
- Local integration/wasteland: 957f16c7a31b66f662dbe722fc831ef8cf3c2f5f

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 161e01a0aae942e25359ce3b7ae1e1963fc12e4c.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
