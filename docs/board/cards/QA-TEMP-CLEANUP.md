# QA-TEMP-CLEANUP

From 13 November 2026 (Kyle: "codex can handle the disk cleanup"). The disk fell to 18.6 GB free.
Measured that morning: the Windows page file 21.7 GB (0.6 GB in use; it shrinks at a restart, which
is Kyle's step), `AppData\Local\Temp\claude` 6.5 GB, and about 1 GB of folders named
`the-duel-browser-*` in `AppData\Local\Temp`, left by the browser checks since 6 November.

## The fault to fix

A browser check makes a Chrome profile folder `the-duel-browser-<random>` in the Temp folder and
does not always remove it. Make the browser harness remove its own folder when a check ends, pass
or fail, and at the start of a run remove folders of that name older than one day. Remove only
folders whose name begins `the-duel-browser-`.

## One-time cleanup

- Delete the existing `the-duel-browser-*` folders in `AppData\Local\Temp` (no Chrome from a
  browser check may be running; stop nothing to make that true, wait instead).
- In each lane folder under `C:\Users\kyleb\.codex\worktrees\wasteland-integration` that Codex
  owns and whose card is merged or dropped: unlink `node_modules` (check LinkType first), then
  `git worktree remove` without force, and keep the branch.
- List on the status page any loose log or scratch file directly under
  `C:\Users\kyleb\.codex\worktrees\wasteland-integration` (the `*-gate*.log`, `teamroom-*`,
  `tremblant-*` files from October) and delete those Codex made.

## Leave alone

- `AppData\Local\Temp\claude`: Claude's sessions keep working files there. Never read, write or
  clean it.
- Lanes `lab-formula-closed` (17 uncommitted files) and `cockpit-sync-board` (uncommitted files,
  nine unmerged commits): Claude's, and Claude decides.
- The folders under `C:\Users\kyleb\dev\the-duel-remake\.claude\worktrees`: the Claude app owns
  them.
- Real player saves, the live folder and port 5174, as always.

## Checks

`tools/test-browser-harness*.mjs` if one covers the profile folder, else one small test that a
finished check leaves no `the-duel-browser-*` folder behind; the lane tier; `npm run build`.
Report free space before and after in the change note.
