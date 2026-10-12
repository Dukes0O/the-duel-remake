# Build status

Observed at: 2026-10-12T04:53:49.891Z

Observation commit: 5092a01865887432ce609be0eed942f60605a2ba

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 5092a01865887432ce609be0eed942f60605a2ba

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-12T03:44:47.959Z; tested commit: 13a0313c579224d8f3fe1d944752a2914163fed5.

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
| snow-world | dev |
| panorama-ridge | dev |
| harbour-lights | dev |
| tremblant-woods | on |
| the-deep | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/janitor-overnight-2026-10-12 | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/janitor-overnight-2026-10-12 |
| codex/p4-finish | 0 | unknown | false | false | unknown |
| codex/p4-gp-existing | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/p4-qualifying-final | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying-final |
| codex/p4-summit | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-summit |
| codex/tools/callback-diagnostics | 7 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 16 | unknown | true | false | unknown |
| lane/audio/aud-12 | 16 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 16 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/janitor-overnight-2026-10-12 | unknown | 2026-10-11T21:45:11-07:00 | 0 | last commit 2026-10-11T21:45:11-07:00 | docs/board/STATUS.md, docs/board/board.yaml, docs/board/checks/full-tier.json, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg |
| codex/p4-finish | unknown | 2026-10-11T16:22:18-07:00 | 0 | last commit 2026-10-11T16:22:18-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md |
| codex/p4-gp-existing | unknown | 2026-10-11T21:14:55-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, src/app.js, src/course.js, src/ghost.js, src/leaderboard.js |
| codex/p4-panorama | unknown | 2026-10-11T21:15:42-07:00 | 0 | last commit 2026-10-11T21:15:42-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PANORAMA.md, src/app.js |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js |
| codex/p4-qualifying-final | unknown | 2026-10-11T21:23:39-07:00 | 0 | last commit 2026-10-11T21:23:39-07:00 | docs/changes/P4-QUALIFYING.md, src/app.js, src/game.js, src/lap-telemetry.js, src/qualifying.js |
| codex/p4-summit | unknown | 2026-10-11T21:49:33-07:00 | 0 | last commit 2026-10-11T21:49:33-07:00 | docs/changes/P4-SUMMIT.md, src/camera-clearance.js, src/circuits/index.js, src/circuits/summit-run.js, src/course-access.js |
| codex/tools/callback-diagnostics | unknown | 2026-10-04T20:18:20-07:00 | 7 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 270,047,923 B | +0 B | 250,000,000 B |
| Wasteland models | 112,189,772 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 16,099,486 B | -3,877,191 B | 20,000,000 B |
| Added bytes in last merge | 1,204,780 B | -3,050,660 B | 5,000,000 B |
| All `public/` | 288,151,563 B | +0 B | unavailable |
| Git objects | 432,852,992 B | +2,198,528 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8513dc1d3b248da7ee96ff2830c784ab4f2d6af6
- Local main: missing
- Local integration/wasteland: 5092a01865887432ce609be0eed942f60605a2ba

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8513dc1d3b248da7ee96ff2830c784ab4f2d6af6.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
