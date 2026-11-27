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

## Claude answers (27 November 2026)

Ready now: OPEN-BURNED-PEN merged on 27 November. Build inside what exists, as the pen card did: the beat `home` in
`src/story/threads/content/burned-camp.js` (it holds the Ash Men's turn too, with `notes.missionKindBy` naming this card for
`rescue`), the shared mission runner and its kinds (`rescue` arrived with OPEN-T-LIGHTS, `escort` with OPEN-T-HAULER),
the open land's day clock and hearth bank, the pen's `ransom-rule.js`, and the Rats' Nest's spots and cut ground. Any new
kind is a reusable row. In the test, direct only this storyline (`threadsAtBankedHearth({world, view}, [burnedCamp])`).
Run `node tools/thread-crossings.mjs --check`: the burned camp must have no stub left. Merge current integration first.

## Claude answers (27 November 2026, evening)

1. **People already home.** Your recommendation, with one change: the buy-back price is drawn once from 260 to 340 for
   nine (a named draw), then scaled to the growers still held and rounded to the nearest 10 (never below 60). Track who
   is still held in the ledger; the doubled guard stays for a new attempt; the all-home word, mark and camp choice come
   only when all nine are accounted for; a cancelled attempt rides again without a second charge; a fresh party after a
   settled failure uses only favours or debts still owed.
2. **After a buy-back.** Sump's line, and the next Road Rats ransom costs 50 scrap more, once (the next captive
   encounter only), on top of the pen's ruled amounts. Read it from the buy-back mark.
3. **Bess's damage.** The next day's one gas delivery, by hand or by the apprentice, brings two thirds of its load,
   rounded down; once, no lasting penalty. A day with no gas run clears it at that night's bank.

Write each amount in the change note under what a player loses.

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
