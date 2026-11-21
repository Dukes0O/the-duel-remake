# OPEN-BURNED-RESCUE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Section 21, Scenes 5, 6 and 7, and the closing sections.

1. **Home:** the talk at the hearth for each way the player came home, Finch's line when he is there, and the table
   of who would come, each row read from the ledger: Rell, Dace, Moss, a tower's keeper, the trader, or nobody.
2. **The decision,** with its two thoughts: raise a party of up to three (each one's favour or debt spent and the
   page saying so), buy them back (the price drawn between 260 and 340 scrap, paid as a ransom is), or leave them.
3. **The rescue mission.** It holds `checkpoints` and `signs`. The three jobs and who takes each; what the scouting
   was worth; the chase with the player as the one chased; Rell's whistle (`night.whistle`) and line; the road home
   beside Bess or a line of people on foot; the four endings with their words, feuds and marks.
4. **What becomes of the camp:** Marigold at the gate and the three answers. Staying burns an extra ember every
   second night as `shareHearth` does. Rebuilding is a promise and a hauling job from the Boneyard. The Sweet Seep
   answer is shown only when the fact it needs is true, which no card yet writes.
5. **Leaving them, and never going:** the trader's line, Finch seen in a Road Rats' buggy at a checkpoint, and Dot's
   line, each placed where section 21 says.

## Files and locks

New: `src/story/threads/content/burned-camp-rescue.js`, `src/story/scenes/burned-camp-home.js`,
`tools/test-burned-camp-rescue.mjs`, `tools/scenarios/open-burned-rescue.mjs`. Rows in the talk tables. No lock.

## Checks

1. `tools/test-burned-camp-rescue.mjs`: the table of helpers shows exactly those the ledger holds; a helper chosen
   has the favour or debt spent; each of the four endings of the rescue and each of the three answers at the gate
   writes what section 21 says; the mission holds the checkpoints throughout.
2. `tools/test-story-ledger.mjs` and `tools/test-story-replay-pick.mjs`, unchanged.
3. Laptop only: the browser scenario `open-burned-rescue`. This card's one scripted drive: with Rell and Moss, all
   nine home.

Not rule 23, because this card spends the player's scrap and embers and changes favours owed. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of
the price's path and the favours spent before the merge (AGENTS rule 17).

## Sound cues

`open.party.ride`: three engines starting together at dusk. `open.rescue.home`: the gate bell rung by somebody glad.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-BURNED-RESCUE.md` with a **Removed** line.
