# OPEN-BURNED-PEN

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Section 21, Scene 4.

1. **Driving in alone:** a rider fight against six buggies that box the car in. Won: Sump's line, the gate opened
   with the wrench, the marks and the feud as written, and the road home (built in OPEN-BURNED-RESCUE; until then the
   mission completes at the gate). Wrecked or boxed in for six seconds: the surround and Sump's two lines.
2. **Going in by the drain:** one guard whose round is a routine, a lamp whose light takes the player after two
   seconds, the chain held with the wrench for eight seconds, Finch and two growers out, Marigold's line.
3. **The pen:** the talk with Marigold and Finch, Sump's call to Tin Town on the player's radio, Auntie Solder's
   answer, the three questions, the two thoughts and the three choices.
4. **Waiting:** the night passes, the hearth is banked without the player, Moss comes with Bess, and the ransom is
   paid as section 21 says under "What a ransom takes" (Kyle, 21 November 2026): scrap through `spendScrap`, the
   player's first and then the town's till (a `town` posting), an ember for each hundred scrap both are short, and
   embers asked for as well by the Word on the road (one at 1 or 2, two at 3 or more). The car comes back with its
   wheels on and no armour mended. If the store is left with one ember or none, the evening at the hearth goes to
   section 23: Cinder's line when the routine is running, or the offer when it is not (OPEN-APPRENTICE-RUN owns both).
5. **Breaking out:** the creep with Finch, up to three growers waved along, the two endings.
6. **Sump's offer:** the talk, the promise on the page, or the refusal.
7. Every ledger line and both lines that tie it back later, placed in the Road Rats' checkpoint talk.

## Files and locks

New: `src/story/threads/content/burned-camp-pen.js`, `src/story/scenes/burned-camp-pen.js`,
`tools/test-burned-camp-pen.mjs`, `tools/scenarios/open-burned-pen.mjs`. Named hooks: the rider fight's `onSurrounded`
in the mission's definition; the guard's routine in the people table. No lock.

## Checks

1. `tools/test-burned-camp-pen.mjs`: each way into the pen and each way out writes the ledger lines of section 21;
   the ransom takes the player's scrap first, then the till, then an ember for each hundred still short, and never
   takes scrap below nothing; an ember is asked for at Word 1 and two at Word 3; a caught break-out raises the price to
   220 scrap and a second ember; a store left at one ember or none leads to the offer of section 23; the promise to Sump is on the page with its words.
2. `tools/test-road-riders.mjs`, unchanged.
3. Laptop only: the browser scenario `open-burned-pen` (taken at the gate, wait for morning, driven home).

Not rule 23, because this card spends the player's scrap and the town's embers. The checks above, the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of
the ransom's path through `spendScrap` and the embers before the merge (AGENTS rule 17).

## Sound cues

`open.taken`: the pen's gate shutting. `open.ransom.paid`: scrap poured out on a bonnet. `open.pen.chain`: a chain
falling. `open.guard.shout`: one shout, far off.

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
`docs/changes/OPEN-BURNED-PEN.md` with a **Removed** line.
