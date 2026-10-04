# Build status

Observed at: 2026-10-04T21:08:19.479Z

Observation commit: 3f5deb008c182fdc0c73e40b9a78b82e002d47a1

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: 3f5deb008c182fdc0c73e40b9a78b82e002d47a1

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: dirty; exact HEAD passed: no.

Last recorded full run: 2026-10-04T21:06:39.804Z; tested commit: 3f5deb008c182fdc0c73e40b9a78b82e002d47a1.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| hidden-road | on |
| fuel-run | on |
| bounty-hunt | on |
| arsenal | on |
| salt-flats | on |
| crew-gear | on |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| codex/audio/fight-voices | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/fight-voices |
| codex/cmb/arsenal-wave3 | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/arsenal-wave3 |
| codex/cmb/convoy-raid | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/convoy |
| codex/cmb/gunn | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/gunn |
| codex/foot/ambush-alley | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/ambush-alley |
| codex/foot/cpu-crews | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/cpu-crews |
| lane/audio/aud-10 | 9 | unknown | true | false | unknown |
| lane/audio/aud-12 | 9 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 9 | false | true | true | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| codex/audio/fight-voices | unknown | 2026-10-04T13:52:06-07:00 | 0 | last commit 2026-10-04T13:52:06-07:00 | docs/changes/AUD-18.md, public/assets/audio/CREDITS.md, public/assets/audio/credits.html, public/assets/audio/voices/crew-cinder-callout.mp3, public/assets/audio/voices/crew-dune-callout.mp3 |
| codex/cmb/arsenal-wave3 | unknown | 2026-10-04T14:07:55-07:00 | 0 | last commit 2026-10-04T14:07:55-07:00 | docs/changes/ARS-03.md, docs/changes/AUD-18.md, public/assets/audio/CREDITS.md, public/assets/audio/arsenal-wave3/decoy-burst-a.ogg, public/assets/audio/arsenal-wave3/decoy-burst-b.ogg |
| codex/cmb/convoy-raid | unknown | 2026-10-04T14:00:35-07:00 | 0 | last commit 2026-10-04T14:00:35-07:00 | docs/changes/ARENA-07.md, src/arena/arena-brains.js, src/arena/arena-event.js, src/arena/arena-settlement.js, src/arena/convoy.js |
| codex/cmb/gunn | unknown | 2026-10-04T13:22:01-07:00 | 0 | last commit 2026-10-04T13:22:01-07:00 | docs/changes/AUD-18.md, docs/changes/WAR-03a.md, public/assets/audio/CREDITS.md, public/assets/audio/credits.html, public/assets/audio/voices/crew-cinder-callout.mp3 |
| codex/foot/ambush-alley | unknown | 2026-10-04T12:47:31-07:00 | 0 | last commit 2026-10-04T12:47:31-07:00 | docs/changes/ARENA-05.md, tools/test-arena-ambush-alley.mjs |
| codex/foot/cpu-crews | unknown | 2026-10-04T13:58:01-07:00 | 0 | uncommitted changes; exact activity time unknown | docs/changes/CREW-04.md, tools/test-cpu-crews.mjs, src/raiders.js, src/crew-gear/cpu-crews.js, tools/scenarios/cpu-crews.mjs |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 264,375,843 B | +0 B | 250,000,000 B |
| Wasteland models | 102,281,592 B | +0 B | 60,000,000 B |
| Largest runtime file | 23,283,392 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 498,188 B | +0 B | 500,000 B |
| Review `looks/` | 15,178,539 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 3,622,199 B | +0 B | 5,000,000 B |
| All `public/` | 260,014,568 B | +0 B | unavailable |
| Git objects | 327,804,928 B | +235,520 B | unavailable |
| Lane folders | 0 | +0 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 8cf7979fa83218d5e15360253e7841ddd18db743
- Local main: missing
- Local integration/wasteland: 3f5deb008c182fdc0c73e40b9a78b82e002d47a1

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/main: local branch missing; cached commit 8cf7979fa83218d5e15360253e7841ddd18db743.
- Remote origin/integration/wasteland: behind local; cached commit cbb4e8975fe23911b9940499e0ae1ee17660955b.
