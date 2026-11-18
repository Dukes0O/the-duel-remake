# QA-NIGHT-SIZED

Kyle's decision of 18 November 2026 (`docs/board/decisions.md`, "The night check is sized by the day's merges"). The
wording is in AGENTS.md rule 13. Codex's card: tools only, no game file, no browser needed to build it.

## What to build

`tools/full-check.mjs` chooses the night's size from the files changed between the commit of the last recorded night
check (`docs/board/checks/night-*.json`) and the commit it is about to check.

1. **None.** No commit since the last night, or every changed file is a doc, the board, a note, an art sheet under
   `docs/board/looks/`, or a file no suite reads. It writes one line to the run log ("no night check: nothing to
   check since <commit>") and stops. It records nothing that could pass a later commit.
2. **Full.** A shared file changed (`src/game.js`, `src/main.js`, `src/render3d.js`, `src/app.js`,
   `src/config.js`), or a file that holds the save's shape or the physics (take the list rule 19 already uses in
   `tools/run-tests.mjs`; if there is none, name the files in one constant and list them under "Codex decided"), or it
   is Saturday night, or the last full night is more than seven days old, or `--full` is given (a release). Everything
   the tool runs today.
3. **Partial.** Anything else. It runs:
   - every suite that reaches a changed file at any depth, through hubs too (the lane tier's picker with its two-step
     and hub limits taken off), and every long suite (`NIGHT_ONLY_SUITES`) among them;
   - the browser scenarios picked for the changed files, plus the scenarios that guard saved progress or pay;
   - combat balance when a file under `src/arsenal/`, `src/combat-*.js` or `src/arena/` changed;
   - the frame stage only when the timed scene or its code changed (the rule the tool already uses to reuse a frame
     pass, rule 19).

The report (`night-<date>.md` and `.json`) gains its first line: the size and the reason in plain words, for example
"Partial night: 14 files changed, all under src/lab/ and tools/; 212 of 677 suites, 9 of 226 browser scenarios, frames
reused from <commit>." A partial pass is recorded as partial: it never counts as a full-tier pass for a release
(rule 19 and the release gate read the size).

## Checks

- `tools/test-full-check.mjs` (a laptop-only suite; Claude reruns it at the merge): one case for each size from a
  made-up list of changed files, the Saturday case, the seven-day case, `--full`, the report's first line, and that a
  partial pass does not satisfy the release's question "is there a full-tier pass that covers this commit".
- `tools/test-test-runner.mjs`: the wide picker returns a superset of the lane tier's pick for the same files.
- `tools/test-board.mjs`, `tools/test-repo-hygiene.mjs`, the lane tier for the changed tools.

## Not in this card

The scheduled task that starts the night check is Kyle's and is not changed. The standing-failures list and the three
results (passed, passed with standing failures, failed) stay as they are.

**Removed** when merged: the sentence in AGENTS.md rule 13 that begins "Until QA-NIGHT-SIZED is merged".
