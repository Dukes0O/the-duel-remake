# Wasteland development and releases

This guide names the current folders and the checks required before a build
reaches the game that players open. `SPEC.md` defines the game. The Codex
playbook defines task cards and review roles.

## Folders and ports

| Purpose | Folder or address | Rule |
| --- | --- | --- |
| Live game | `C:\Users\kyleb\dev\the-duel-remake` | Release work only. Do not edit game source here. |
| Live browser address | `http://localhost:5174/` | Keep this exact origin so local careers remain available. |
| Integration | `C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake` on `integration/wasteland` | Merge each green reviewed lane promptly. |
| Browser QA | Private port, normally 5175 or above 5190 | Use memory-only saves and a throwaway browser profile. |
| Playtest preview | `http://127.0.0.1:5195/tools/preview.html`, served from `.preview-dist` in the integration folder | Built from integration, with memory-only saves and a visible PREVIEW badge. |

## Two places to play (Kyle, 27 September 2026)

There are exactly two ways to play: the **live game** (`localhost:5174`,
served from the live folder's `dist`) and the **Preview** (`127.0.0.1:5195`,
served from the integration folder's `.preview-dist`). Nothing else is kept
for play. Lane folders and test builds (`.qa-dist`, a lane's `dist`) are
working space, overwritten by the next run or deleted with their lane.

The routine after Kyle accepts something in the Preview:

1. **Release it** (see Release): switch the accepted feature on, run the full
   release evidence and copy the build into the live game.
2. **Clean up the live folder in the same release:** `dist` holds the new
   build. Recycle temporary staging after installation. Keep no `dist-previous`
   or other rollback build (Kyle, 15 October 2026). Fix faults forward.
3. **The Preview cleans itself:** the next click sees that integration has
   moved on, closes the old Preview and rebuilds `.preview-dist` in place.

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

## Start the playtest preview

Run `install-preview-shortcut.ps1` once from the integration folder. It creates
the **The Duel Preview** icon on the current player's Desktop. It needs no
administrator access, account or download. The icon follows that integration
checkout, builds its QA bundle into `.preview-dist` (emptied on every build)
and serves it only on this computer at port 5195. Each build records the
integration commit it came from. A click opens the running preview when it is
current; when newer work has been merged it closes the old preview window and
rebuilds. Browser checks build into `.qa-dist`, so a test run never disturbs
an open preview.

The red **PREVIEW badge** at the top of the screen confirms that this is the
development build and shows when it was built. Its saves are memory-only. They remain available when the
same preview tab reloads, but closing the tab discards them. The preview never
reads or writes the live career on port 5174.

Each fresh preview tab starts with the gate found, Sal's territory hold at
100 percent and the Titan unlocked. The launcher also requests every
development switch except career backup (today: the warlord fights), so
playtest areas can be reached at once; a test keeps that list in step with
`src/feature-flags.js`.

## Development and integration

Follow AGENTS rules 11–15 and docs/FACTORY.md. Use an isolated codex lane,
with at most six build lanes across all lines, no more than three course lanes.
Cards name shared locks; cards with the same lock never build at once.
Test runs use at most four jobs. Lanes may link node_modules only to integration.

A frozen clean lane needs one targeted lane run, production build and one clear
review. Merge it immediately; unrelated green lanes do not wait in a queue.
A conflict-free union does not rerun the gate. A real conflict returns to the
lane for its fix and one fresh targeted lane/build plus review.

Use tools/integrate-lane.mjs with the explicit evidence packet described in
CODEX_PLAYBOOK section 7. It merges source, writes one run-log sentence from
actual evidence, refreshes STATUS and commits shared metadata immediately.
Board, inbox and STATUS must never remain dirty on integration. The Director
supplies those decisions; the integrator does not invent card closures.

Full tier, frames, combat balance --check (current rules) and browser scenarios run
as the full check, once a day, on a copy of one commit, so builders keep merging
while it runs; only its frame step needs the laptop to itself. Run
`node tools/full-check.mjs --idle-awake --no-push` from clean integration.
The tool checks a detached sibling copy and records its starting SHA even
when integration advances. Kyle changes the Windows task himself. Tonight's
03:45 to Record night/06:30 pause still applies (next-run.md). A full-check failure puts its fix
first while other clean merges continue. A release always needs full green on its exact final commit.
Do not claim an unmeasured check passed.

## Recycling completed lanes on Windows

Only the caller's explicitly proven newly created lane from this run is eligible.
Retained lanes, Kyle's branches and unknown folders stay. The cleanup receipt
names the exact lane/branch, current run ID and creation time. The checkout
must be clean and its commit fully merged. Cleanup is opt-in in the integrator;
default integration leaves the lane intact.

Before recycling, validate the absolute node_modules junction path inside that
exact lane and its target inside integration. Remove only the junction with
PowerShell Remove-Item -LiteralPath, without -Recurse, and verify integration's
target remains. Move the checkout to Windows Recycle Bin, with no permanent
recursive-delete fallback. Run git worktree prune --dry-run --verbose --expire now;
only that missing registration may appear before running the prune. Then use
git branch -d on the fully merged codex branch. Stop on any unexpected path,
registration, unlink or Git result; never force cleanup or prune other lanes.

Git cleanup followed a junction into shared dependencies on 24 September.
Detaching and checking the link before recycling prevents a repeat. Do not use
git worktree remove as a substitute for this Recycle Bin policy.

## Release

The Release Manager is the only role that updates the live folder. It first
collects change notes into `README.md` and `VERIFICATION.md` and commits them
on integration. It runs the full check on that final integration commit,
checks that the live tree is clean, then fast-forwards `master`. It installs locked
dependencies if needed and builds a release in `dist-next`. It checks the
staged build on a private port. Keep no rollback build; faults receive a
forward fix in the next release (Kyle, 15 October 2026). It copies the new hashed assets into the live
`dist` first and replaces `index.html` and `build-version.json` last, so a
page load never meets a half-copied build. It does not refresh an open game
tab. It verifies the new build manifest and landing page on `localhost:5174`.
Then it cleans up: `robocopy dist-next dist /MIR` leaves `dist` holding
exactly the new build (older builds' files go; Kyle reloads any open tab), and
`dist-next` is deleted. It records what players can try in
`docs/playtest-inbox.md`. Push `master` to GitHub after a release as the
approved backup step. A failed check or a non-fast-forward update stops the
release.

Use the direct Vite CLI for the staged build and private preview on this
Windows setup. npm did not reliably forward arguments after `--`:

```powershell
node node_modules/vite/bin/vite.js build --outDir dist-next
node node_modules/vite/bin/vite.js preview --outDir dist-next --host localhost --port 5188 --strictPort
```

## Forward fixes and saves

Correct faults and release a new tested build. Do not restore a prior release
or retain a rollback copy. Adding a course is not a reason to revert the game.
Keep the same browser
origin and retain hashed assets used by open races. Do not clear, read,
reset or migrate real player careers during QA. Export and automatic backup
rules are in `SPEC.md`, section 3.14. Test save migrations against fixtures
before a release.

Old cutover worktree details are in Git history. The current integration and
live paths are listed above; do not resume work from a historical handoff.
