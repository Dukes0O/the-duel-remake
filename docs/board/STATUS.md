# Build status

Observed at: 2026-10-05T14:38:59.135Z

Observation commit: 2e7862fb99386353bd983664e878a17243cf02b6

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 2e7862fb99386353bd983664e878a17243cf02b6

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: dirty; exact HEAD passed: no.

Last recorded full run: 2026-10-05T08:52:55.312Z; tested commit: 2e7862fb99386353bd983664e878a17243cf02b6.

## Feature switches

| Switch | State |
| --- | --- |
| convoy-raid | dev |
| arsenal-wave3 | dev |
| career-backup | dev |
| hidden-road | on |
| fuel-run | on |
| bounty-hunt | on |
| arsenal | on |
| salt-flats | on |
| crew-gear | on |
| fight-voices | dev |
| cpu-crews | dev |
| ambush-alley | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/cmb/convoy-raid | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/convoy |
| codex/cmb/gunn | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/gunn |
| codex/foot/cpu-crews | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/cpu-crews |
| codex/tools/callback-diagnostics | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 10 | unknown | true | false | unknown |
| lane/audio/aud-12 | 10 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 10 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/cmb/convoy-raid | unknown | 2026-10-05T07:21:17-07:00 | 0 | last commit 2026-10-05T07:21:17-07:00 | docs/changes/ARENA-07.md, docs/playtest-inbox.md, public/assets/models/CREDITS.md, public/assets/models/wasteland/convoy-tanker.glb, src/app.js |
| codex/cmb/gunn | unknown | 2026-10-05T07:34:58-07:00 | 0 | last commit 2026-10-05T07:34:58-07:00 | docs/board/looks/gunn/round-1.jpg, docs/board/looks/gunn/round-1.md, docs/board/looks/gunn/round-2.jpg, docs/board/looks/gunn/round-2.md, docs/changes/WAR-03a.md |
| codex/foot/cpu-crews | unknown | 2026-10-05T07:13:51-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/CREW-04.md, src/arsenal/rockets.js, src/audio.js, src/combat-ai.js, src/combat-projectiles.js |
| codex/tools/callback-diagnostics | unknown | 2026-10-04T20:18:20-07:00 | 0 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 264,760,521 B | +0 B | 250,000,000 B |
| Wasteland models | 104,568,988 B | +2,287,396 B | 60,000,000 B |
| Largest runtime file | 23,283,392 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 498,188 B | +0 B | 500,000 B |
| Review `looks/` | 15,178,539 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 1,522,457 B | +0 B | 5,000,000 B |
| All `public/` | 262,961,504 B | +2,288,109 B | unavailable |
| Git objects | 340,959,232 B | +803,840 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8cf7979fa83218d5e15360253e7841ddd18db743
- Local main: missing
- Local integration/wasteland: 2e7862fb99386353bd983664e878a17243cf02b6

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
