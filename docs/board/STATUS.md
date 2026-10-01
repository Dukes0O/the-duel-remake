# Build status

Observed at: 2026-10-01T00:47:45.330Z

Observation commit: cc6a7f93861b36d7611988795cbd1da2e701840e

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: cc6a7f93861b36d7611988795cbd1da2e701840e

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-01T00:24:18.011Z; tested commit: 2d1216fd545343d48ef714fde4d91da40ae5638e.

Director handoff: Rustwall atlas repair merged cc6a7f9 after exact clean lane 308/308 and build. This snapshot precedes the final handoff commit and its full tier. Read the final exact commit/result in `docs/board/checks/full-tier.json`; this snapshot does not grant that later commit a pass. D8 push remains blocked pending the specific GitHub destination/payload approval.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| wasteland2 | on |
| hidden-road | on |
| scrapdome | on |
| titan-climb | on |
| muddy-hollow | on |
| warlords | on |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| lane/art/crew-fit-m | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/crew-fit-m |
| lane/art/hands-fit | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/hands-fit |
| lane/art/tanker-parts | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/tanker-parts |
| lane/audio/aud-10 | 5 | unknown | true | false | unknown |
| lane/audio/aud-12 | 5 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 5 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/arena-03-fuel-run | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-03-fuel-run |
| lane/docs/fighter-rules | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/fighter-rules |
| lane/phys/arena-steer | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-steer |

## Unmerged branches for idle review

All six refs below are held, including Claude's protected design ref. Five Director lane folders remain; no feature lane is active. These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| lane/art/crew-fit-m | ART-FIT-CREW-M | 2026-09-30T15:31:33-07:00 | 0 | last commit 2026-09-30T15:31:33-07:00 | 59a5b99: failed first-round fitting, source recipe and sheet; waiting Kyle; no runtime install |
| lane/art/hands-fit | ART-FIT-HANDS | 2026-09-30T17:05:17-07:00 | 0 | last commit 2026-09-30T17:05:17-07:00 | 34e914b: two reviewed sheets and mechanical tests; two rounds without resemblance gain; waiting Kyle; keep current hands |
| lane/art/tanker-parts | ART-SRC-TANKER-PARTS | 2026-09-30T17:11:46-07:00 | 0 | last commit 2026-09-30T17:11:46-07:00 | 0ace07d: reviewed source sheet, rights and inspection recipe; four genuine gaps; waiting Kyle; fitting paused |
| lane/cmb/arena-03-fuel-run | ARENA-03 | 2026-09-30T17:05:25-07:00 | 0 | last commit 2026-09-30T17:05:25-07:00 | 96aaa2a/source53e6796: narrow launch/cache/save clearance; fighter contacts and final feature gates wait Claude design merge |
| lane/docs/fighter-rules | DESIGN-FUEL-FIGHTER-HITS | 2026-09-30T16:30:10-07:00 | 0 | last commit 2026-09-30T16:30:10-07:00 | 7e3bd200: Claude's unhanded fighter/steering design; preserve branch; never implement or merge it before handoff |
| lane/phys/arena-steer | ARENA-STEER | 2026-09-30T17:08:08-07:00 | 0 | last commit 2026-09-30T17:08:08-07:00 | ae4c168/source1c06417: steering work; all crate assertions retained; design/fixture authorization and Fuel App hook pending |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 240,490,673 B | +0 B | 250,000,000 B |
| Wasteland models | 78,998,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 14,295,108 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 430,908 B | +0 B | 500,000 B |
| Review `looks/` | 10,712,857 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 112,070 B | -346,906 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 321,438,720 B | +227,328 B | unavailable |
| Lane folders | 5 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 4c3248e59bfaaa3eb02ef4f680d43fa051fd7f4c
- Local main: missing
- Local integration/wasteland: cc6a7f93861b36d7611988795cbd1da2e701840e

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 4c3248e59bfaaa3eb02ef4f680d43fa051fd7f4c.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 8492332c4d314d8e94c7637d39573342ef032efa.
