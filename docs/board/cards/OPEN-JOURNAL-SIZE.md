# OPEN-JOURNAL-SIZE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut on 25 November 2026 from the independent review of OPEN-STATE's save.

## Why

The open record's journal (`world.open.journal`) keeps every change an open effect makes, with the choice and night
that caused it, so that somebody can always say where a thing began. It has no limit. A choice that may happen again
carries a count in its id (`forge-shed/repair/3`), so each repair, ransom and routine run adds an entry of about 100
bytes, for good. Over years of play this grows inside the same browser storage that holds every save, and a full
storage stops every save, not only the open land's.

## What to build

1. **A compaction rule,** run when a hearth is banked: journal entries older than the last banked night, that no rule
   reads, are folded into one summary entry per choice id prefix and night range, keeping what the "What people
   remember" page and the replay need. Write down in `src/world/open/open-save.js` which entries a rule reads.
2. **A ceiling** on the saved journal (a number of entries, stated in the file) as a backstop, with the oldest folded
   first.
3. Nothing that a player sees, and nothing that a storyline reads (`isTrue` reads marks, words and stages, not the
   journal), may change.

## Files and locks

`src/world/open/open-save.js`, `src/world/open/open-effects.js` (the journal only), `tools/test-open-state.mjs`. Lock:
`save-shape`.

## Checks

`tools/test-open-state.mjs`: a record with 10,000 journal entries saves under the ceiling after a bank and loads with
every mark, word, stage and favour unchanged; a save from before this card loads unchanged. Not rule 23, because it
changes what is saved: the lane tier, `npm run build`, and one independent review before the merge.

## Claude answers (26 November 2026, morning)

1. **Where to fold:** your pick. The hook is the bank-success path of `settleNight2` in `src/story/night-2-save.js`
   (named for this card; nothing else in that file changes), calling a pure helper from `open-save.js` on a readable
   open record before the App commits the profile. The ceiling is also enforced in `settleOpenWorld`. The replay
   replacement and the legacy ledger-only writer are left alone.
2. **What may be folded:** your pick. Every rule input stays exact (the thread rule's arrivals, the director's starts,
   the site view's burns, and the current night's choice ids). Only audit rows older than the last bank are folded,
   into summaries by choice prefix and night range, oldest first. The summary-aware choice lookup is approved for
   `parts/sites.js`, `parts/buildings.js` and `parts/checkpoints.js`, which this card may now edit for it.
3. **When it cannot fit:** never drop a rule input or anything that changes play after reload. If the rule inputs
   alone exceed the ceiling, the save is written whole anyway and the overflow is reported in the console. The ceiling
   is a target, not a reason to lose progress. Cover both cases in the fixture, as you propose.

## Rules

Behind `story-choices`. Never wipe or hide a player's progress. Questions go to
`docs/board/questions/OPEN-JOURNAL-SIZE.md` with your pick. Write `docs/changes/OPEN-JOURNAL-SIZE.md` with a
**Removed** line. After the pull request is open the card is finished: do not wait for review comments.
