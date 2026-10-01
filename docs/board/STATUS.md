# Build status

Observed at: 2026-10-01T07:24:46.530Z

Observation commit: 66ce5d50cbebab96b93d937259e894ef0107a665

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 66ce5d50cbebab96b93d937259e894ef0107a665

Integration source: clean (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-01T07:05:04.125Z; tested commit: 664a20726e981aac09ccf809fc26d54a6aeb29f9.

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
| fuel-run | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| lane/audio/aud-10 | 5 | unknown | true | false | unknown |
| lane/audio/aud-12 | 6 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 5 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/arena-03-fuel-run | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-03-fuel-run |
| lane/cmb/arena-shove | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-shove |
| lane/cmb/arsenal-core | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arsenal-core |
| lane/vis/salt-flats | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/salt-flats |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| lane/cmb/arena-shove | unknown | 2026-09-30T23:34:41-07:00 | 0 | last commit 2026-09-30T23:34:41-07:00 | docs/changes/ARENA-SHOVE.md, src/arena/arena-floor.js, src/sim-contacts.js, src/vehicle-knock.js, tools/replays/arena-shove-controls.json |
| lane/cmb/arsenal-core | unknown | 2026-10-01T00:23:17-07:00 | 0 | last commit 2026-10-01T00:23:17-07:00 | docs/changes/ARS-CORE.md, src/arsenal/car-effects.js, src/arsenal/hazards.js, src/arsenal/oil.js, src/arsenal/smoke.js |
| lane/vis/salt-flats | unknown | 2026-09-30T23:43:01-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/ARENA-06.md, src/arena/venues/salt-flats.js, tools/art/salt-flats-fit.json, tools/blender/salt-flats.py, tools/replays/salt-flats-controls.json |

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
| Added bytes in last merge | 3,188,934 B | +2,980,026 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 327,896,064 B | +564,224 B | unavailable |
| Lane folders | 4 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 4cd4a9608238d86a90a1335adacf526eb7f4a2d3
- Local main: missing
- Local integration/wasteland: 66ce5d50cbebab96b93d937259e894ef0107a665

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 4cd4a9608238d86a90a1335adacf526eb7f4a2d3.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 664a20726e981aac09ccf809fc26d54a6aeb29f9.
