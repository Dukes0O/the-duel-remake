# OPEN-JOURNAL-SIZE-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (on the Codex command line, `gpt-6.1-sol`). Cut by Claude on 26 November 2026 from the independent
review of OPEN-JOURNAL-SIZE at its merge.

## Why

OPEN-JOURNAL-SIZE folds old audit rows of the open record's journal, and keeps every row a rule reads exactly. It never
folds thread rows or burn rows. Over years of play those alone pass the 512-row target, the journal grows without limit
again, and every save prints the overflow warning. The rules read only the latest of each: the latest arrival per thread
and beat (`thread-rule.js`), the latest thread start (`director.js`) and the latest burn per site (`site-view.js`).

## What to build

1. **Fold older duplicates of rule rows.** For each thread and beat keep the latest arrival row exactly, and fold the
   older ones before the last banked night into a summary (thread, beat, night range, count). The same for thread starts
   (keep the latest per thread) and burns (keep the latest per site). Write in `src/world/open/open-save.js` which rows
   each rule reads, next to the existing list.
2. **The prefix rule keeps numbers that are part of a name.** Strip only a trailing count (`forge-shed/repair/3` becomes
   `forge-shed/repair`), so `mall-road-2` and `mall-road-3` stay apart.
3. **Wording:** the ceiling folds every eligible row at once; make the comments and the test say so.
4. The bank-time fold runs only when `story-choices` is on (it touches only profiles that hold `story.open`, but say so
   in code).

## Files and locks

`src/world/open/open-save.js`, `src/story/night-2-save.js` (the fold's guard only), `tools/test-open-state.mjs`. Lock:
`save-shape`.

## Checks

`tools/test-open-state.mjs`: a record of five years of play (thousands of thread arrivals and burns) banks under 512 rows;
after a reload the thread rule's timing, the director's last start and each site's two-night burn look are unchanged; a
save from before this card loads unchanged; folding twice gives the same record. Not rule 23, because it changes what is
saved: the lane tier, `npm run build`, and one independent review before the merge.

## Rules

Behind `story-choices`. Never wipe or hide a player's progress. Memory-only saves in every check. Questions go to
`docs/board/questions/OPEN-JOURNAL-SIZE-2.md` with your pick. Write `docs/changes/OPEN-JOURNAL-SIZE-2.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
