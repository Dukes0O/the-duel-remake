# QA-NIGHTLY-NEWS

Kyle's decision of 16 November 2026 ("a nightly check that tells news", `docs/board/decisions.md`), after the audit.
Designed by Claude; Codex builds it. Owned files: `tools/full-check.mjs`, `tools/run-browser-scenarios.mjs`,
`tools/test-full-check.mjs`, `tools/build-status.mjs` (one line, below), `docs/board/checks/standing-failures.json`
(new), this card's change note.

## What is wrong now (measured, 16 November)

- Every recorded nightly run reads "failed", and `lastGreen` has never been set. The last three
  (`docs/board/checks/night-2026-11-05.json`, `-11-09`, `-11-12`) each failed on the same items: the frame stage, and
  the browser scenarios `arena-shove`, `deep-frames`, `drive-lesson-run`, `frame-pacing`, `p4-audio` and `ski-finish`.
  A result that is always red tells nobody anything, so a new failure among them would not be seen.
- The browser stage runs every scenario every night (`--all`, about line 42): 112 of the run's 171 minutes on
  12 November.
- No full check ran after 13, 14 or 15 November. Nothing on the status page says so.

## What to build

1. **The standing list.** `docs/board/checks/standing-failures.json`: a list of `{stage, name, since, card, cause}`.
   Start it with the seven items above, `since` the first of the last three ledgers in which each failed, `card`
   `QA-STANDING-BROWSER`, `cause` the failure message recorded in the latest ledger (or "not yet known").
2. **Three results.** The run's result is `passed` (no failure), `standing` (every failure is on the list) or `failed`
   (at least one failure is not on the list). The ledger records the result, the new failures first, the standing ones
   after, and any listed item that passed this time under `nowPassing`; such an item is removed from the list file by the
   run itself. `lastGreen` becomes the last run whose result was not `failed`. The report's first line says which of the
   three, and for `failed` names each new failure and the first merge after `lastGreen`. A release never reads the list:
   add `--strict`, under which any failure at all is `failed` and every browser scenario runs, prove it, and name the
   flag in the release step of `docs/OPERATIONS.md` under "For Claude to apply" in your last message (do not edit that
   page yourself).
3. **Browser scenarios for what changed.** On every night but Saturday, and never for a release, the browser stage runs:
   every scenario whose own file, or a helper under `tools/scenarios/` that it imports, changed since the commit of the
   last recorded full check; every scenario whose area changed; and every scenario that belongs to no area. An area is a
   row of one small table in `tools/run-browser-scenarios.mjs`: scenario name prefixes on one side, source folders and
   files on the other (for example `lab-` with the Lab's folders; `deep-` with the Deep's; `heli-` and `ski-`;
   `everburn-`, `scablands-` and `run-` with `src/world/`, `src/story/` and the world-job mode). A change to a shared
   file (`game.js`, `main.js`, `render3d.js`, `app.js`, `config.js`) picks every scenario. Add a flag for it
   (`--changed-since <commit>`), have the full check pass the last ledger's commit, and have Saturday night and
   `--all` run everything as now. The ledger records how many scenarios ran and how many were left for Saturday.
   Propose the table under "Codex decided (Claude to review)"; keep it to about a dozen rows.
4. **The status page says when the last one ran.** In `tools/build-status.mjs`, one line: the date, commit and result of
   the latest ledger, and "none for N nights" when the newest is older than last night.

## What done looks like

- A run whose only failures are on the list ends `standing`, exits the way a pass does, and says so in its first line.
- A run with one failure not on the list ends `failed` and names it first.
- A listed item that passes is reported and leaves the file.
- With `--strict`, a listed failure makes the run `failed`.
- `tools/test-full-check.mjs` proves each of these with made-up stage results, without running a stage. Where an
  existing assertion changes, list it with its old and new value under "Changed assertions, for Claude to review".
- `node tools/run-browser-scenarios.mjs --changed-since <commit> --list` (add `--list` if there is none) prints what
  would run and why, without starting a browser.

## Checks

`node tools/test-full-check.mjs` (known to fail in a new lane where it sends fixtures to the Recycle Bin: say so and
list it for Claude); the `--list` output for two example commits, pasted into the change note; `tools/test-board.mjs`,
`tools/test-repo-hygiene.mjs`. Do not run the full check, a browser scenario or the full tier.

## Not in this card

Curing the seven standing items (card QA-STANDING-BROWSER, which needs a browser). Starting the check each night: the
Windows scheduled task "The Duel full check" last ran on 15 October and has no next run; Kyle installed it and Claude
has asked him about it.

## Claude answers

(none yet)

## Codex decided (Claude to review)

(none yet)
