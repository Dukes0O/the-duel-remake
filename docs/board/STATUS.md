# Build status

Observed at: 2026-11-19T01:14:43.042Z

Observation commit: d553950baa5ef5d05859e2bd63589ed4e1557b20

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: d553950baa5ef5d05859e2bd63589ed4e1557b20

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-11-17T07:48:41.395Z; tested commit: c3795328cabc5eca94a9b63d816099e997f55f55.

Latest nightly check: 2026-11-18; commit 42f002f594345ed64dff25b57d1e3422e1f81d67; failed.

## Feature switches

| Switch | State |
| --- | --- |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/road-riders | 0 | false | false | false | /workspace/card-sessions/road-riders |
| codex/story-ledger | 0 | false | true | true | /workspace/card-sessions/story-ledger |
| codex/story-people | 0 | false | true | true | /workspace/card-sessions/story-people |
| codex/story-plate-night-2 | 0 | false | false | false | /workspace/card-sessions/story-plate-night-2 |
| codex/story-talk | 0 | false | false | false | /workspace/card-sessions/story-talk |
| codex/town-home-surfaces | 0 | false | true | true | /workspace/card-sessions/town-home-surfaces |
| codex/wasteland-art-direction | 0 | false | true | true | /workspace/card-sessions/wasteland-art-direction |
| codex/wasteland-gate-road-look | 0 | false | false | false | /workspace/card-sessions/wasteland-gate-road-look |
| codex/world-faults-18-nov | 0 | true | true | false | /workspace/card-sessions/world-faults-18-nov |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/road-riders | unknown | 2026-11-19T00:23:14Z | 0 | last commit 2026-11-19T00:23:14Z | docs/board/board.yaml, docs/board/questions/ROAD-RIDERS.md, src/app.js, src/arena/arena-brains.js, src/arena/arena-event.js |
| codex/story-plate-night-2 | unknown | 2026-11-19T00:33:38Z | 0 | last commit 2026-11-19T00:33:38Z | docs/board/board.yaml, docs/board/looks/story-plates/night-2-review.md, docs/board/looks/story-plates/night-2.jpg, docs/changes/STORY-PLATE-NIGHT-2.md, tools/art/story-plates/CREDITS.md |
| codex/story-talk | unknown | 2026-11-19T00:58:42Z | 0 | last commit 2026-11-19T00:58:42Z | docs/board/STATUS.md, docs/board/board.yaml, docs/changes/STORY-TALK.md, src/app.js, src/arena/arena-event.js |
| codex/wasteland-gate-road-look | unknown | 2026-11-18T23:16:26Z | 0 | last commit 2026-11-18T23:16:26Z | docs/ART_LINE.md, docs/board/board.yaml, docs/board/cards/WASTELAND-GATE-ROAD-LOOK.md, docs/board/looks/wasteland-gate-road/round-2-review.md, docs/board/looks/wasteland-gate-road/round-2.jpg |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 719,004,682 B | unavailable | 250,000,000 B |
| Wasteland models | 431,213,000 B | +1,505,112 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 498,906 B | +0 B | 500,000 B |
| Review `looks/` | 90,067,949 B | +2,525,816 B | 20,000,000 B |
| Added bytes in last merge | 4,729,487 B | +2,055,901 B | 5,000,000 B |
| All `public/` | 710,281,900 B | +1,505,112 B | unavailable |
| Git objects | 1,029,501,952 B | -453,663,744 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: missing
- Local main: missing
- Local integration/wasteland: e0ca217d6d492525c6ac4275e5f9f25212e21251

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: missing; cached commit missing.
- Remote origin/main: missing; cached commit missing.
- Remote origin/integration/wasteland: ahead of local; cached commit ea41c7aed347a851eac6a0247b6d5a0695cffcff.

Issue: Circuit manifest eifel-crown.js has unknown or malformed literal metadata.
