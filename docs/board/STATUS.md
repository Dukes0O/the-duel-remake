# Build status

Observed at: 2026-10-13T03:59:53.939Z

Observation commit: c245ee06db9285fe1611d84e2c706843622d6a5d

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: c245ee06db9285fe1611d84e2c706843622d6a5d

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-10-13T02:29:11.268Z; tested commit: 36d7613f86620c143dbec13db28fca9e58ec6988.

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
| grand-prix-career | dev |
| snow-world | dev |
| tremblant-woods | on |
| tremblant-snow | on |
| harbour-lights | on |
| panorama-ridge | on |
| the-deep | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/deep-art-src | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-art-src |
| codex/deep-audio | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-audio |
| codex/fix-ambush-opening | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/fix-ambush-opening |
| codex/fix-foot-mouse | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/fix-foot-mouse |
| codex/p4-finish | 1 | unknown | false | false | unknown |
| codex/p4-gp-existing | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-gp-existing |
| codex/p4-panorama | 0 | false | true | true | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-panorama |
| codex/p4-qualifying | 1 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-qualifying |
| codex/p4-summit | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-summit |
| codex/tools/callback-diagnostics | 8 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/callback-diagnostics |
| lane/audio/aud-10 | 17 | unknown | true | false | unknown |
| lane/audio/aud-12 | 17 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 17 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/deep-art-src | DEEP-ART-SRC | 2026-10-12T15:14:54-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/board/looks/deep-art/round-1-review.md, docs/board/looks/deep-art/round-1.jpg, docs/changes/DEEP-ART-SRC.md, public/assets/models/CREDITS.md, tools/art/catalog.json |
| codex/fix-ambush-opening | FIX-AMBUSH-OPENING | 2026-10-12T20:48:26-07:00 | 0 | last commit 2026-10-12T20:48:26-07:00 | docs/changes/FIX-AMBUSH-OPENING.md, src/arena/modes/ambush-alley.js, src/raiders.js, src/screen-arena.js, tools/test-arena-ambush-alley.mjs |
| codex/fix-foot-mouse | FIX-FOOT-MOUSE | 2026-10-12T20:58:48-07:00 | 0 | last commit 2026-10-12T20:58:48-07:00 | docs/changes/FIX-FOOT-MOUSE.md, src/app.js, tools/test-app-lifecycle.mjs |
| codex/p4-finish | unknown | 2026-10-11T16:22:18-07:00 | 1 | last commit 2026-10-11T16:22:18-07:00 | docs/board/looks/p4-panorama/round-2-review.md, docs/board/looks/p4-panorama/round-2.jpg, docs/board/looks/p4-snow/round-1-review.md, docs/board/looks/p4-snow/round-1.jpg, docs/board/looks/p4-snow/round-2-review.md |
| codex/p4-qualifying | unknown | 2026-10-10T23:41:37-07:00 | 1 | uncommitted changes; exact activity time unknown | docs/changes/P4-PIT.md, docs/changes/P4-QUALIFYING.md, src/app.js, src/audio.js, src/game.js |
| codex/p4-summit | P4-SUMMIT | 2026-10-12T20:49:48-07:00 | 0 | last commit 2026-10-12T20:49:48-07:00 | docs/board/looks/p4-summit/round-1-review.md, docs/board/looks/p4-summit/round-1.jpg, docs/changes/P4-SUMMIT.md, src/camera-clearance.js, src/circuit-effects.js |
| codex/tools/callback-diagnostics | GATE-CALLBACK-DIAGNOSTICS | 2026-10-04T20:18:20-07:00 | 8 | last commit 2026-10-04T20:18:20-07:00 | docs/changes/GATE-CALLBACK-DIAGNOSTICS.md, tools/scenarios/audio-crash-peak.mjs, tools/test-audio-callback-diagnostics.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 293,583,685 B | +0 B | 250,000,000 B |
| Wasteland models | 112,189,772 B | +0 B | 60,000,000 B |
| Largest runtime file | 28,308,656 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 495,896 B | +0 B | 500,000 B |
| Review `looks/` | 16,840,032 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 374,347 B | +0 B | 5,000,000 B |
| All `public/` | 288,685,549 B | +0 B | unavailable |
| Git objects | 404,062,208 B | +234,496 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 36d7613f86620c143dbec13db28fca9e58ec6988
- Local main: missing
- Local integration/wasteland: c245ee06db9285fe1611d84e2c706843622d6a5d

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 36d7613f86620c143dbec13db28fca9e58ec6988.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
