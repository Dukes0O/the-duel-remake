# Build status

Observed at: 2026-10-01T05:49:28.277Z

Observation commit: 5d588ad675f6189aa052af367b049971214b9b69

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 5d588ad675f6189aa052af367b049971214b9b69

Integration source: clean (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-01T05:06:05.643Z; tested commit: 40b81c1159565ac1713b5d5d4d9a6c0593f64c96.

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
| lane/audio/aud-10 | 5 | unknown | true | false | unknown |
| lane/audio/aud-12 | 6 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 5 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/arena-03-fuel-run | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-03-fuel-run |
| lane/cmb/arena-shove | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-shove |
| lane/cmb/arsenal-core | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arsenal-core |
| lane/vis/salt-flats | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/salt-flats |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| lane/cmb/arena-03-fuel-run | ARENA-03 | 2026-09-30T22:47:06-07:00 | 0 | last commit 2026-09-30T22:47:06-07:00 | docs/changes/ARENA-03.md, docs/changes/AUD-CRASH-PEAK.md, src/app.js, src/arena/arena-brains.js, src/arena/arena-event.js |
| lane/cmb/arena-shove | unknown | 2026-09-30T22:25:26-07:00 | 0 | last commit 2026-09-30T22:25:26-07:00 | docs/changes/ARENA-SHOVE.md, tools/replays/arena-shove-controls.json, tools/test-arena-shove.mjs |
| lane/cmb/arsenal-core | unknown | 2026-09-30T22:48:59-07:00 | 0 | last commit 2026-09-30T22:48:59-07:00 | docs/changes/ARS-CORE.md, src/arsenal/car-effects.js, src/arsenal/hazards.js, src/arsenal/oil.js, src/arsenal/smoke.js |
| lane/vis/salt-flats | unknown | 2026-09-30T22:34:38-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/ARENA-06.md, tools/art/salt-flats-fit.json, tools/replays/salt-flats-controls.json, tools/test-salt-flats.mjs, src/arena/venues/salt-flats.js |

## Director's active-card mapping

All four unmerged branches retain their current work. The audio repair shares
Fuel's branch; it does not add another builder lane. No idle lane is removed.

| Branch | Claimed card | Work held |
| --- | --- | --- |
| lane/cmb/arena-shove | ARENA-SHOVE | Independent native shove RED and unchanged controls |
| lane/cmb/arsenal-core | ARS-CORE | Reviewed geometry modules; save transactions dd8ca6c under independent review |
| lane/vis/salt-flats | ARENA-06 | Frozen source/runtime tests and private native venue build |
| lane/cmb/arena-03-fuel-run | ARENA-03, AUD-CRASH-PEAK | Fuel checks clear; tests-first audio repair 8494081 underway |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 240,490,999 B | +0 B | 250,000,000 B |
| Wasteland models | 78,998,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 14,295,108 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 430,908 B | +0 B | 500,000 B |
| Review `looks/` | 10,712,857 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 208,908 B | +0 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 326,278,144 B | +957,440 B | unavailable |
| Lane folders | 4 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 4cd4a9608238d86a90a1335adacf526eb7f4a2d3
- Local main: missing
- Local integration/wasteland: 5d588ad675f6189aa052af367b049971214b9b69

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 4cd4a9608238d86a90a1335adacf526eb7f4a2d3.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 40b81c1159565ac1713b5d5d4d9a6c0593f64c96.
