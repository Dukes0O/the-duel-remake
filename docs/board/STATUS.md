# Build status

Observed at: 2026-10-05T16:40:33.820Z

Observation commit: 872ea0b11a9a44070dcc6edd850da4743abd1598

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 872ea0b11a9a44070dcc6edd850da4743abd1598

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

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
| gunn | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/cmb/gunn | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/gunn |
| codex/cmb/tollkeeper | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/tollkeeper |
| codex/foot/cpu-crews | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/cpu-crews |
| codex/tools/callback-diagnostics | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| codex/vis/convoy-frames | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/convoy-frames |
| lane/audio/aud-10 | 10 | unknown | true | false | unknown |
| lane/audio/aud-12 | 10 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 10 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/cmb/gunn | unknown | 2026-10-05T09:17:41-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/gunn/round-1-review.md, docs/board/looks/gunn/round-1.jpg, docs/board/looks/gunn/round-2-review.md, docs/board/looks/gunn/round-2.jpg, docs/changes/WAR-03a.md |
| codex/foot/cpu-crews | unknown | 2026-10-05T08:30:37-07:00 | 0 | last commit 2026-10-05T08:30:37-07:00 | docs/changes/CREW-04.md, src/arsenal/rockets.js, src/audio.js, src/combat-ai.js, src/combat-projectiles.js |
| codex/tools/callback-diagnostics | unknown | 2026-10-04T20:18:20-07:00 | 0 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |
| codex/vis/convoy-frames | unknown | 2026-10-05T08:33:47-07:00 | 0 | last commit 2026-10-05T08:33:47-07:00 | docs/changes/CONVOY-FRAMES.md, tools/scenarios/convoy-frames.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 264,760,521 B | +0 B | 250,000,000 B |
| Wasteland models | 104,777,180 B | +208,192 B | 60,000,000 B |
| Largest runtime file | 23,283,392 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 498,188 B | +0 B | 500,000 B |
| Review `looks/` | 15,695,983 B | +517,444 B | 20,000,000 B |
| Added bytes in last merge | 4,554,393 B | +3,031,936 B | 5,000,000 B |
| All `public/` | 263,169,696 B | +208,192 B | unavailable |
| Git objects | 341,794,816 B | +835,584 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8cf7979fa83218d5e15360253e7841ddd18db743
- Local main: missing
- Local integration/wasteland: 872ea0b11a9a44070dcc6edd850da4743abd1598

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
