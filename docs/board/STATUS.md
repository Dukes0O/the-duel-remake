# Build status

Session verdict: the one end full passed 395/395, with zero failures or unrun suites, in 1283.17s on 13a0313c. The remaining working-tree changes are STATUS.md, the full-tier ledger, run-log.md and playtest-inbox.md. The generated dirty/release guard below remains in force; this is not a release approval.

Observed at: 2026-10-12T03:48:02.007Z

Observation commit: 13a0313c579224d8f3fe1d944752a2914163fed5

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 13a0313c579224d8f3fe1d944752a2914163fed5

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: dirty; exact HEAD passed: no.

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
| codex/p4-finish | 0 | unknown | false | false | unknown |
| codex/p4-gp-existing | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/tools/callback-diagnostics | 7 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 16 | unknown | true | false | unknown |
| lane/audio/aud-12 | 16 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 16 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/p4-finish | unknown | 2026-10-11T16:22:18-07:00 | 0 | last commit 2026-10-11T16:22:18-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md |
| codex/p4-gp-existing | unknown | 2026-10-11T15:28:44-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, src/app.js, src/course.js, src/ghost.js, src/leaderboard.js |
| codex/p4-panorama | unknown | 2026-10-11T15:28:47-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PANORAMA.md, src/app.js |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/P4-GP-EXISTING.md, docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js |
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
| Review `looks/` | 19,976,677 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 4,255,440 B | +4,130,229 B | 5,000,000 B |
| All `public/` | 288,151,563 B | +0 B | unavailable |
| Git objects | 430,654,464 B | +807,936 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8513dc1d3b248da7ee96ff2830c784ab4f2d6af6
- Local main: missing
- Local integration/wasteland: 13a0313c579224d8f3fe1d944752a2914163fed5

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8513dc1d3b248da7ee96ff2830c784ab4f2d6af6.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.

## Held lane purposes

The unmerged branches above stay in place:

- `codex/p4-finish`: combined GP, Panorama and Qualifying work, plus the mountain-cap fix; field decisions remain open.
- `codex/p4-gp-existing`: Azure GP field work; opening check passed, broader balance decision is with Claude.
- `codex/p4-panorama`: first full track and third-round materials; field targets failed and require Claude’s next bounded design decision.
- `codex/p4-qualifying`: accepted qualifying source and native evidence; integration waits for the coupled GP source.
- `codex/tools/callback-diagnostics`: older unmerged callback diagnostics; preserved for its owner.
