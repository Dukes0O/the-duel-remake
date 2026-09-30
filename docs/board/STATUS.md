# Build status

Observed at: 2026-09-30T16:14:08.842Z

Observation commit: db785194244e02b8d8f206a79a3e0407dd09cff3

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: db785194244e02b8d8f206a79a3e0407dd09cff3

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: dirty; exact HEAD passed: no.

Last recorded full run: 2026-09-30T16:10:17.860Z; tested commit: db785194244e02b8d8f206a79a3e0407dd09cff3.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| wasteland2 | on |
| hidden-road | on |
| scrapdome | dev |
| titan-climb | dev |
| muddy-hollow | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| lane/art/art-src-hands | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/hands-source |
| lane/art/art-src-rustwall | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/rustwall-source |
| lane/audio/aud-10 | 5 | unknown | true | false | unknown |
| lane/audio/aud-12 | 5 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 5 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/war-02a-format | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/war-format |
| lane/phys/titan-handling | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/titan-handling |
| lane/release/scrapdome-0930 | 0 | unknown | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/scrapdome-rel |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| lane/art/art-src-hands | unknown | 2026-09-30T09:02:49-07:00 | 0 | last commit 2026-09-30T09:02:49-07:00 | docs/board/looks/first-person-src/round-1-review.md, docs/board/looks/first-person-src/round-1.jpg, docs/changes/ART-SRC-HANDS.md, tools/art/catalog.json, tools/art/hands-source-sheet.py |
| lane/art/art-src-rustwall | unknown | 2026-09-30T08:56:20-07:00 | 0 | last commit 2026-09-30T08:56:20-07:00 | docs/board/looks/rustwall-src/round-1-review.md, docs/board/looks/rustwall-src/round-1.jpg, docs/changes/ART-SRC-RUSTWALL.md, tools/art/rustwall-source-sheet.py, tools/scenarios/art-source-rustwall.mjs |
| lane/cmb/war-02a-format | unknown | 2026-09-30T09:05:58-07:00 | 0 | last commit 2026-09-30T09:05:58-07:00 | docs/changes/WAR-02a-FORMAT.md, src/app.js, src/arena/arena-event.js, src/arena/warlord-event.js, src/game.js |
| lane/phys/titan-handling | unknown | 2026-09-30T09:04:32-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/TITAN-HANDLING.md, tools/replays/titan-handling.json, tools/test-titan-handling.mjs, src/arena/arena-pilot.js, src/config.js |
| lane/release/scrapdome-0930 | SCRAPDOME-0930 | 2026-09-30T09:11:07-07:00 | 0 | inspection skipped by request; uncommitted state unknown | docs/SCRAPDOME.md, docs/board/board.yaml, docs/changes/SCRAPDOME-RELEASE.md, docs/playtest-inbox.md, src/feature-flags.js |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 240,383,788 B | +0 B | 250,000,000 B |
| Wasteland models | 78,998,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 14,295,108 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 256,032 B | +0 B | 500,000 B |
| Review `looks/` | 9,193,353 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 185,304 B | +0 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 304,939,008 B | +285,696 B | unavailable |
| Lane folders | 4 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 006cd48a8b263d234dfa3edbc910f2debd7f1861
- Local main: missing
- Local integration/wasteland: db785194244e02b8d8f206a79a3e0407dd09cff3

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 006cd48a8b263d234dfa3edbc910f2debd7f1861.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 4713b1c5edb8fdd2636b268204ff13eb7a475cde.
