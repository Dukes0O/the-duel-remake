# Build status

Observed at: 2026-09-30T15:32:11.289Z

Observation commit: c19226c617b3d6803b79d7b715d3812419990955

This snapshot applies only to the observation commit and source state shown below. A later commit, including a metadata commit, does not inherit its full-run result.

Integration HEAD: c19226c617b3d6803b79d7b715d3812419990955

Integration source: dirty (only the full-tier evidence ledger is excluded).

Live commit: not checked

Live build version: not checked

Full tier: stale; exact HEAD passed: no.

Last recorded full run: 2026-09-27T23:57:32.511Z; tested commit: 7d471f45984ce3a29ae3e96b710333c849448af1.

## Feature switches

| Switch | State |
| --- | --- |
| career-backup | dev |
| wasteland2 | on |
| hidden-road | on |
| scrapdome | dev |
| crash-physics | on |
| crash-effects | on |
| titan-climb | dev |
| muddy-hollow | dev |

## Lane branches

Age is whole days since the last branch commit. Removal candidates are suggestions only; this tool never removes a worktree.

| Branch | Age (days) | Dirty | Merged | Removable | Folder |
| --- | --- | --- | --- | --- | --- |
| lane/art/art-src-crew | 0 | true | true | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/crew-source |
| lane/audio/aud-10 | 5 | unknown | true | false | unknown |
| lane/audio/aud-12 | 5 | unknown | true | false | unknown |
| lane/audio/aud-17-picks | 5 | unknown | true | false | C:/Users/kyleb/.codex/worktrees/audio-lane/the-duel-remake |
| lane/cmb/crash-switch-remove | 0 | false | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/crash-remove |
| lane/cmb/war-02a-format | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/war-format |
| lane/ui/ux-entry-hints | 0 | true | false | false | C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.lanes/entry-hints |

## Unmerged branches for idle review

These branches stay in place. Uncommitted changes may be newer than the last commit, so their exact activity time is unknown. This tool never deletes a branch.

| Branch | Card | Last commit | Age (days) | Activity | Holds |
| --- | --- | --- | ---: | --- | --- |
| lane/cmb/crash-switch-remove | unknown | 2026-09-30T08:10:27-07:00 | 0 | last commit 2026-09-30T08:10:27-07:00 | docs/changes/CRASH-SWITCH-REMOVE.md, src/arena/arena-event.js, src/audio.js, src/combat-armor.js, src/destructibles.js |
| lane/cmb/war-02a-format | unknown | 2026-09-30T08:01:32-07:00 | 0 | uncommitted changes; exact activity time unknown | tools/replays/warlord-format-ordinary.json, tools/test-warlord-format.mjs, src/app.js, src/screen-arena.js, src/screen-armory.js |
| lane/ui/ux-entry-hints | unknown | 2026-09-30T07:50:38-07:00 | 0 | uncommitted changes; exact activity time unknown | tools/replays/onfoot-hints.json, tools/test-onfoot-hints.mjs, src/screen-hud.js, src/style.css, docs/changes/UX-ENTRY-HINTS.md |

## Size targets

Targets are advisory. Change compares with the previous status observation when available. Git object storage uses Git's KiB estimate.

| Item | Current | Change | Target |
| --- | ---: | ---: | ---: |
| Build `dist/` | 240,383,788 B | +0 B | 250,000,000 B |
| Wasteland models | 78,998,200 B | +0 B | 60,000,000 B |
| Largest runtime file | 14,295,108 B | +0 B | 8,000,000 B |
| Largest ordinary tracked file | 2,288,190 B | +0 B | 2,000,000 B |
| Largest review sheet | 256,032 B | +0 B | 500,000 B |
| Review `looks/` | 9,043,315 B | +0 B | 20,000,000 B |
| Added bytes in last merge | 28,597 B | -529,547 B | 5,000,000 B |
| All `public/` | 236,249,990 B | +0 B | unavailable |
| Git objects | 302,886,912 B | +62,464 B | unavailable |
| Lane folders | 4 | -1 | unavailable |

## Backups

Local branch refs preserve committed history in this repository; they are not a separate off-machine backup.

- Local master: 006cd48a8b263d234dfa3edbc910f2debd7f1861
- Local main: missing
- Local integration/wasteland: c19226c617b3d6803b79d7b715d3812419990955

Local rollback build (dist-previous): not checked. Manifest presence does not verify the full rollback build.

Remote-tracking refs are cached locally; no fetch or remote verification was performed.

- Remote origin/master: matches local; cached commit 006cd48a8b263d234dfa3edbc910f2debd7f1861.
- Remote origin/main: local branch missing; cached commit 34d66fe6605c5b436523727d73c2f06e7ccfe1d7.
- Remote origin/integration/wasteland: behind local; cached commit 4713b1c5edb8fdd2636b268204ff13eb7a475cde.
