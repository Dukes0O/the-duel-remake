# QA-CHECKS-BY-CARD

Kyle's decision of 16 November 2026 ("Checks sized to the card", `docs/board/decisions.md`), after the audit. Designed by
Claude; Codex builds it. Owned files: `tools/run-tests.mjs`, `tools/test-test-runner.mjs`, this card's change note.

## What is wrong now (measured, 16 November)

- Two suites, `tools/test-run-gas-medium.mjs` (69 minutes) and `tools/test-everburn-easy.mjs` (26 minutes), were 63% of
  the check minutes in a lane run of 198 suites. Each is picked by a plain import of a land or job file
  (`src/world/jobs/everburn.js`, `scablands-names.js`, `scablands-ways.js`, `story/ember-lines.js`,
  `furnace-sightings.js` and others), so they ran on cards that do not touch the Everburn at all.
- The lane tier always compares the whole branch with its merge base (`changedFiles`, about line 226). A two-line fix
  made after a card's lane run therefore picks the card's whole tier again. There is no way to say "since this commit".
- A long suite that is left out is left out without a word. The builder cannot see what was skipped.

## What to build (three small things)

1. **Long suites go to the night.** Add to `NIGHT_ONLY_SUITES`, with a dated comment naming this card:
   `tools/test-run-gas-medium.mjs`, `tools/test-everburn-easy.mjs`, `tools/test-arena-shove.mjs`,
   `tools/test-old-smoke.mjs`, `tools/test-field-battle.mjs`. The rule from now on (AGENTS rule 11): a suite that takes
   three minutes or more alone belongs on that list; a card whose own subject it is names it and runs it by hand in its
   narrowest form (`--filter`, or the suite's own flag such as `--job`). Do not add `test-machine-borer*.mjs` (card
   QA-BORER-SUITE-TIME shortens them) or `test-test-runner.mjs`.
2. **Say what was left to the night.** When a lane plan would have picked a night-only suite, print one line at the end
   of the plan and of the run: `Left to the night: <suite> (picked by <the changed file that picked it>)`, one line per
   suite. With `--json`, the same as a list. Nothing else changes in what is picked.
3. **`--since <commit>`.** With `--tier lane --changed --since <commit>`, the changed files are those that differ between
   that commit and the working tree (committed, uncommitted and untracked), in place of the merge base. A commit that
   does not exist is an error with a plain message. Without `--since` nothing changes. Add the flag to `--help`.

Also report, in the change note only (no code): a table of every game file whose change alone picks more than forty
suites, with the count. Claude will rule on owner suites for those in a later card if the table shows a need.

## What done looks like

- `node tools/run-tests.mjs --list --tier lane --changed` on a branch that changes only `src/world/jobs/everburn.js`
  lists neither of the two long suites and prints both under "Left to the night".
- `--since HEAD` with a clean tree picks nothing; with one changed file it picks what that file alone picks.
- The full tier still lists all five suites.
- `tools/test-test-runner.mjs` proves each of the three. Where it pins the night-only list or a count, list the
  assertion with its old and new value under "Changed assertions, for Claude to review". Nothing is loosened.

## Checks

`node tools/test-test-runner.mjs`; the three `--list` runs above, pasted into the change note; `tools/test-board.mjs` and
`tools/test-repo-hygiene.mjs`. No lane tier is needed for this card beyond what `--changed` itself picks, and no build.

## Claude answers

(none yet)

## Codex decided (Claude to review)

A clean `--since HEAD` has no changed files or file-driven suites. The standard lane smoke and replay guards still run, as the card says nothing else changes in what is picked.
