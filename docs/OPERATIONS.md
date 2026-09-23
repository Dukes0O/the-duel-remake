# Wasteland development and releases

This guide names the current folders and the checks required before a build
reaches the game that players open. `SPEC.md` defines the game. The Codex
playbook defines task cards and review roles.

## Folders and ports

| Purpose | Folder or address | Rule |
| --- | --- | --- |
| Live game | `C:\Users\kyleb\dev\the-duel-remake` | Release work only. Do not edit game source here. |
| Live browser address | `http://localhost:5174/` | Keep this exact origin so local careers remain available. |
| Wasteland setup | `C:\Users\kyleb\.codex\worktrees\wasteland-expansion\the-duel-remake` | Isolated foundation worktree. |
| Integration | `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake` on `integration/wasteland` | Combine one reviewed change at a time. |
| Browser QA | Private port, normally 5175 or above 5190 | Use memory-only saves and a throwaway browser profile. |

The live launcher, `start-game.bat`, serves the built `dist` directory with
Vite preview after this launcher change is released. It builds once if `dist`
is missing. It does not watch source files. It keeps `localhost:5174` and
opens the browser only after the server starts. The running browser offers a
menu-only Reload notice when a newer build is ready. Never force a browser
reload during a race.

## Start and stop the live game

Use the desktop shortcut or `start-game.bat` in the live folder. A second click
checks the page already on `localhost:5174` and opens it if it is The Duel.
If another service owns the port, the launcher stops with a clear message.
Closing the first launcher's console stops its server. Do not stop a server
while a race is in progress. Do not use port 5174 for development or QA.

## Development checks

Work on a task branch in an isolated worktree. Use the lane gate and change
note described in `CODEX_PLAYBOOK.md`. The Integrator merges one task at a
time. A failed merge check blocks further feature merges until it is fixed.
Run the full check on the exact integration commit before a release. Record
test results, browser scenarios, balance, frame pacing, art checks and save
checks. A check marked not measured must be run before claiming that measure
passed.

## Release

The Release Manager is the only role that updates the live folder. It first
collects change notes into `README.md` and `VERIFICATION.md` and commits them
on integration. It runs the full check on that final integration commit,
checks that the live tree is clean, then fast-forwards `master`. It installs locked
dependencies if needed and builds a release in `dist-next`. Before serving it,
it copies the current `dist` to `dist-previous` for rollback and checks the
new build on a private port. It copies the new hashed assets into the live
`dist` first, keeping old hashed assets available to open races. It replaces
`index.html` and `build-version.json` last. It does not refresh an open game
tab. It verifies the new build manifest and landing page on `localhost:5174`,
then records what players can try in `docs/playtest-inbox.md`. Push `master`
to GitHub after a release as the approved backup step. A failed check or a
non-fast-forward update stops the release.

Use the direct Vite CLI for the staged build and private preview on this
Windows setup. npm did not reliably forward arguments after `--`:

```powershell
node node_modules/vite/bin/vite.js build --outDir dist-next
node node_modules/vite/bin/vite.js preview --outDir dist-next --host localhost --port 5188 --strictPort
```

## Rollback and saves

Restore the saved `dist-previous` build by overlaying its files, or disable
the faulty feature and release a new tested build. Keep the same browser
origin and retain hashed assets used by open races. Do not clear, read,
reset or migrate real player careers during QA. Export and automatic backup
rules are in `SPEC.md`, section 3.14. Test save migrations against fixtures
before a release.

The old worktree at `.codex\worktrees\4555` is historical. Record its two
non-identical files and remove it through `git worktree remove` only after
the FND-03 check. Never delete it directly or force removal.
