# QA-EVIDENCE-DATE-BOUNDARY

`tools/test-review-evidence.mjs` case 4 ("browser, Blender and fidelity rounds plan the same raw evidence directory")
failed on the laptop at 00:11 on 19 November 2026 (local time, UTC-7) in a review folder, and passed on clean
integration at the same minute. The browser runner had named its evidence folder `.evidence/2026-11-19` (UTC date, from
a scenario run at 23:56 local on the 18th), while the round planner gave `.evidence/2026-11-18`. So two tools choose the
evidence date by different clocks, and a folder left by an earlier run decides which one wins.

## What to build

One function names the evidence date, and every tool that writes or plans under `.evidence/<date>/` uses it: the
browser runner, the review-round planner, the Blender and fidelity rounds, the full check and the hand-drive tool. Use
the laptop's local date (Kyle reads the folders by his own calendar), and say so in a comment beside the function.

## Checks

- `tools/test-review-evidence.mjs` gains a case that fixes the clock at 23:56 local on one day (06:56 UTC the next) and
  shows the browser and Blender rounds plan the same folder.
- A search of `tools/` for `toISOString().slice(0, 10)` and other date-naming code, each replaced or explained in the
  change note.
- The lane tier for the changed tools.

Unreliable-suite card under AGENTS rule 3: it does not hold merges.
