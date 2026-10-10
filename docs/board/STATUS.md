# Build status

Observed at: 2026-10-10T04:32:45.894Z

Observation commit: 3af7f15c2a1774c7b34b14deb1d6c5cb7b0abfcb

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 3af7f15c2a1774c7b34b14deb1d6c5cb7b0abfcb

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: dirty; exact HEAD passed: no.

Last recorded full run: 2026-10-10T04:31:09.234Z; tested commit: 3af7f15c2a1774c7b34b14deb1d6c5cb7b0abfcb.

## Feature switches

| Switch | State |
| --- | --- |
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

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/polish-arena | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/polish-arena |
| codex/polish-flame | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/polish-flame |
| codex/polish-height | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/polish-height |
| codex/polish-seekers | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/polish-seekers |
| codex/polish-smoke | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/polish-smoke |
| codex/tools/callback-diagnostics | 5 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 14 | unknown | true | false | unknown |
| lane/audio/aud-12 | 14 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 14 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/polish-arena | POLISH-ARENA | 2026-10-09T20:54:17-07:00 | 0 | last commit 2026-10-09T20:54:17-07:00 | docs/board/looks/polish-arena/round-1-review.md, docs/board/looks/polish-arena/round-1.jpg, docs/changes/POLISH-ARENA.md, public/assets/models/wasteland/salt-flats/venue.glb, src/arena/tanker-model.js |
| codex/polish-flame | POLISH-FLAME | 2026-10-09T21:19:48-07:00 | 0 | last commit 2026-10-09T21:19:48-07:00 | docs/board/looks/polish-flame/round-1-review.md, docs/board/looks/polish-flame/round-1.jpg, docs/changes/POLISH-FLAME.md, docs/changes/POLISH-SMOKE.md, public/assets/audio/CREDITS.md |
| codex/polish-height | POLISH-HEIGHT | 2026-10-09T21:05:46-07:00 | 0 | last commit 2026-10-09T21:05:46-07:00 | docs/changes/POLISH-HEIGHT.md, src/collision.js, src/course.js, src/scenery-bounds.js, src/sim-contacts.js |
| codex/polish-seekers | POLISH-SEEKERS | 2026-10-09T21:11:59-07:00 | 0 | last commit 2026-10-09T21:11:59-07:00 | docs/changes/POLISH-SEEKERS.md, src/arsenal/rockets.js, src/arsenal/targeting.js, src/audio.js, src/combat-scene.js |
| codex/polish-smoke | POLISH-SMOKE | 2026-10-09T21:15:16-07:00 | 0 | last commit 2026-10-09T21:15:16-07:00 | docs/board/looks/smoke/round-1-review.md, docs/board/looks/smoke/round-1.jpg, docs/changes/POLISH-SMOKE.md, src/combat-effects.js, src/combat-scene.js |
| codex/tools/callback-diagnostics | unknown | 2026-10-04T20:18:20-07:00 | 5 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 270,047,923 B | +5,287,402 B | 250,000,000 B |
| Wasteland models | 107,164,508 B | +0 B | 60,000,000 B |
| Largest runtime file | 23,283,392 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 498,188 B | +0 B | 500,000 B |
| Review `looks/` | 16,215,058 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 388,534 B | +358,374 B | 5,000,000 B |
| All `public/` | 265,576,698 B | +0 B | unavailable |
| Git objects | 360,231,936 B | +11,062,272 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: e4b82b0bfaa5bdc6a587b42f842c33ac3458792d
- Local main: missing
- Local integration/wasteland: 3af7f15c2a1774c7b34b14deb1d6c5cb7b0abfcb

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit e4b82b0bfaa5bdc6a587b42f842c33ac3458792d.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
