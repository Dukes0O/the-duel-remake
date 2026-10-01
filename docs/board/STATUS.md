# Build status

Observed at: 2026-10-01T15:28:39.475Z

Observation commit: 1f4d4f8aad181adc05b8801ee6e0c8deaec54ba7

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 1f4d4f8aad181adc05b8801ee6e0c8deaec54ba7

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-01T12:48:41.575Z; tested commit: cde91deab5d08e6bec7dd623fc7861e23b9f8fef.

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
| codex/art/vesper | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/vesper |
| lane/art/convoy-tanker | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/convoy-tanker |
| lane/audio/aud-10 | 6 | unknown | true | false | unknown |
| lane/audio/aud-12 | 6 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 6 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/arena-shove | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arena-shove |
| lane/cmb/arsenal-core | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/arsenal-core |
| lane/vis/salt-flats | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/salt-flats |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/art/vesper | unknown | 2026-10-01T08:10:01-07:00 | 0 | last commit 2026-10-01T08:10:01-07:00 | docs/changes/ART-FIT-CREW-W.md, tools/art/vesper-fit.json, tools/blender/vesper-blackiron.py, tools/test-vesper-art.mjs |
| lane/art/convoy-tanker | unknown | 2026-10-01T07:53:15-07:00 | 0 | last commit 2026-10-01T07:53:15-07:00 | docs/board/looks/convoy-tanker/round-1-review.md, docs/board/looks/convoy-tanker/round-1-sheet.py, docs/board/looks/convoy-tanker/round-1.jpg, docs/board/looks/convoy-tanker/round-2-review.md, docs/board/looks/convoy-tanker/round-2-sheet.py |
| lane/cmb/arena-shove | unknown | 2026-10-01T07:45:52-07:00 | 0 | last commit 2026-10-01T07:45:52-07:00 | docs/changes/ARENA-SHOVE.md, src/arena/arena-event.js, src/arena/arena-floor.js, src/sim-contacts.js, src/vehicle-collision.js |
| lane/cmb/arsenal-core | unknown | 2026-10-01T07:08:34-07:00 | 0 | last commit 2026-10-01T07:08:34-07:00 | docs/changes/ARS-CORE.md, src/app.js, src/arena/arena-pilot.js, src/arsenal/car-effects.js, src/arsenal/hazards.js |
| lane/vis/salt-flats | unknown | 2026-10-01T07:56:27-07:00 | 0 | last commit 2026-10-01T07:56:27-07:00 | docs/changes/ARENA-06.md, src/arena/venues.js, src/arena/venues/salt-flats.js, src/course.js, src/render3d.js |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 240,510,230 B | +0 B | 250,000,000 B |
| Wasteland models | 78,998,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 14,295,108 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 430,908 B | +0 B | 500,000 B |
| Review `looks/` | 10,712,857 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 303,558 B | +0 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 337,247,232 B | +2,330,624 B | unavailable |
| Lane folders | 5 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 4cd4a9608238d86a90a1335adacf526eb7f4a2d3
- Local main: missing
- Local integration/wasteland: 1f4d4f8aad181adc05b8801ee6e0c8deaec54ba7

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 4cd4a9608238d86a90a1335adacf526eb7f4a2d3.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit cde91deab5d08e6bec7dd623fc7861e23b9f8fef.

## Director handoff: held lanes

All five unmerged lanes are clean and preserved. No helper is writing them. These identities supplement the tool's branch-name matching.

| Card | Branch | Exact tip | Last activity (PDT) | Held work / next step |
| --- | --- | --- | --- | --- |
| ARENA-SHOVE | lane/cmb/arena-shove | 16a2b94 | 2026-10-01T07:45:52-07:00 | Claude classification of inherited public crossings; browser/mandatory lane clear |
| ARS-CORE | lane/cmb/arsenal-core | 276e036 | 2026-10-01T07:08:34-07:00 | Claude candidate-dependent launch resolver answer;10launchRED, flight/save scopedclear |
| ART-FIT-TANKER | lane/art/convoy-tanker | 86d0d6d | 2026-10-01T07:53:15-07:00 | Claude round2 art verdict;2of3rounds;mandatorylane clear, no motion/frame/install |
| ARENA-06 | lane/vis/salt-flats | 439d006 | 2026-10-01T07:56:27-07:00 | Saltactualpixel failures and later exclusive publichooks/frame/artreview |
| ART-FIT-CREW-W | codex/art/vesper | edf527e | 2026-10-01T08:10:01-07:00 | Kyle link-testing choice;5nativeguardRED/6unavailable, no gamecomparison/reveal |

Ready board cards BALANCE-W2-OFF-RETIRE, ARENA-04 and WAR-03b stay unclaimed: their source hooks overlap Arsenal, Shove or the protected audio owner. No card owned by Claude or Kyle was started. Protected audio refs aud-10/aud-12/aud-17-picks retain their owners and are not inspected.

End sweep: ten consumed gate files removed (993386B); public/runtime236249990B unchanged. Metadata grew5088B before this final handoff. CurrentWasteland78998200B versus60MB target, largest runtime14295108B versus8MB and ordinary2288190B versus2MB reflect retained required assets. Dynamic48asset/26export candidates remain underDISC/CLEAN-11; zero unusedmodules or removed-feature tests proved. No asset deletion, forced worktree removal or history rewrite.

The final full/build run follows the handoff commit. This status observation keeps its own source identity; consult the runner-owned full-tier ledger for the exact final tested commit. No later commit inherits clearance.
