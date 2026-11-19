# QA-TEMP-CLEANUP

**The fault.** `browser-harness.mjs` already removed its own profile folder in `finally`; what it lacked was a sweep for
folders a crash or kill left behind. `removeStaleProfiles()` now runs at the start of each run and removes real folders
(never links or files) in the Temp folder whose name begins `the-duel-browser-` and whose last change is over a day old; a
folder that will not delete (file in use) is skipped. `cleanupProfile` is exported and refuses any path that is not a direct
child of Temp with that prefix. New test in `tools/test-browser-harness.mjs`: stale folders go, a fresh one, another
name, a plain file and a locked one stay, and a finished check leaves nothing behind.

**One-time cleanup, 19 November (free space on C: 21.75 GB before, 22.9 GB after).** Removed 12 `the-duel-browser-*`
folders over a day old in `AppData\Local\Temp` (about 1.1 GB; six newer ones stayed because checks of other sessions are
running). Nothing stopped, nothing waited for. In `C:\Users\kyleb\.codex\worktrees\wasteland-integration` I recycled
(Recycle Bin) the empty folders `art-batch-1` and `menu-front-door`, and 17 loose Codex logs (the `bosses-gate*`, `teamroom-*`,
`tremblant-*`, `rescue-people-lane` logs and `tremblant-cap.txt`, `tremblant-fp-before.json`, 4.2 MB). Left: `the-duel-remake`,
`lab-formula-closed`, `cockpit-sync-board`, `lab-review-workshop` (22 entries, changed today), `p4-circuits` and
`review-riders` (each holds only a `.vite` cache, 0 files of Codex's), `.evidence` (October evidence, 6 folders),
`.claude-heavy.lock` (empty lock folder for heavy-job turns), `fp.mjs` (1 KB script, not a log). Not touched:
`AppData\Local\Temp\claude`, the Claude app's worktrees, saves.

**Checks** (branch commit `4858fc5e6`): `node --test tools/test-browser-harness.mjs` 19 of 19. Lane tier, build, review: see
`QA-EVIDENCE-DATE-BOUNDARY.md` (one lane tier covered both cards). The reviewer asked for a link test (added: a junction named
like a profile is never followed or removed) and found the "leaves no folder" assertion could never fail on Windows (fixed).
One real smoke run (`browser-harness.mjs smoke`) under load failed on `Page.navigate timed out`, and its own profile cleanup
then hit `EBUSY` on Chrome's lock file, which freed a moment later; so cleanup now retries up to about 20 s. I removed that
one folder by name. A second smoke run did not get a heavy-job turn (two other jobs held the laptop for over 30 minutes), so
the retry itself is covered by the unit test only, not by a browser run. The Temp folder also held other sessions' profiles from
11:37 to 11:45 today; they are under a day old and were left for their owners and the next run's sweep.
**Changed assertions:** none. **Removed:** nothing replaced.
