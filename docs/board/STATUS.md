# Build status

Observed at: 2026-10-11T20:29:44.167Z

Observation commit: 79ba1a96d8c01044900d3c1c56368adaf21ae80d

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 79ba1a96d8c01044900d3c1c56368adaf21ae80d

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: 1046076a90623c26c76ffe623e9589dbf5717490

Live build version: 20261010195525-87b479fc74c0

Full tier: dirty; exact HEAD passed: no.

Last recorded full run: 2026-10-11T20:28:51.997Z; tested commit: 79ba1a96d8c01044900d3c1c56368adaf21ae80d.

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
| grand-prix | dev |
| panorama-ridge | dev |
| harbour-lights | dev |
| tremblant-woods | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/p4-gp-existing | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/p4-snow | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-snow |
| codex/tools/callback-diagnostics | 6 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 16 | unknown | true | false | unknown |
| lane/audio/aud-12 | 16 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 16 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/p4-gp-existing | unknown | 2026-10-11T13:12:34-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, src/app.js, src/course.js, src/ghost.js, src/leaderboard.js |
| codex/p4-panorama | unknown | 2026-10-11T13:12:42-07:00 | 0 | last commit 2026-10-11T13:12:42-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PANORAMA.md, src/app.js |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js |
| codex/p4-snow | unknown | 2026-10-11T13:16:23-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md, docs/board/looks/p4-snow/round-2.jpg, docs/board/looks/p4-snow/round-3-review.md |
| codex/tools/callback-diagnostics | unknown | 2026-10-04T20:18:20-07:00 | 6 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 270,047,923 B | +0 B | 250,000,000 B |
| Wasteland models | 112,189,772 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 17,671,624 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 2,341,813 B | +1,609,662 B | 5,000,000 B |
| All `public/` | 288,151,563 B | +0 B | unavailable |
| Git objects | 422,594,560 B | +441,344 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 1046076a90623c26c76ffe623e9589dbf5717490
- Local main: missing
- Local integration/wasteland: 79ba1a96d8c01044900d3c1c56368adaf21ae80d

Local rollback build (dist-previous): 20261010012052-a7177c289a56. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: behind local; cached commit e4b82b0bfaa5bdc6a587b42f842c33ac3458792d.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
