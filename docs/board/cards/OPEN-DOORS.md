# OPEN-DOORS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Section 13.

1. **The buildings table** and its rule. A building has a shell, a door, a room with named spots and things, an
   optional car bay, services and finds. Its solid box becomes four walls with a gap at the door. While the player is
   inside, the roof and the wall nearest the camera are not drawn and the camera comes in close. People walk in and
   out by the door. A car cannot enter.
2. **Two buildings in Tin Town:** the forge shed (Odessa: a bench, a bay, a cot, an anvil, gas bottles, a parts rack)
   and Big Bess's shed (Moss: the tanker's bay, a bucket, a long brush). Use the shacks in hand; new things are drawn
   in code.
3. **The service rule.** `servicePrice(service, word, car)` and `doService(service, world)`. Repair mends all the
   car's armour for 2 scrap for every ten armour, 4 at least, with the car in the bay. Wash takes the dirt off for 6
   scrap. Friendly takes a quarter off, Sworn half, Wary adds a quarter, and Cold is refused with a line. The price is
   said by the person in a talk bubble and the player answers yes or no. Scrap is counted for the outing in memory;
   OPEN-STATE saves it.
4. **The wrench in the field** mends a car up to six tenths of its armour while a roam job runs, and no further.
5. **The dirt rule.** `dirtAfter(dirt, metres, ground, onRoad)`: dust in the colour of the ground driven on, three
   times as fast off the road, and ash where an ash bank or sack hits. Drawn with the finishes in
   `src/paint-finish-look.js`, mixed by the amount. Wim's line on Night 2 reads it.
6. Odessa's and Moss's routines and talk tables, with the lines Claude writes into "Claude answers".

## Files and locks

New: `src/world/open/content/buildings.js`, `src/world/open/building-rule.js`, `src/world/open/service-rule.js`,
`src/world/open/dirt-rule.js`, `src/world/open/building-view.js`, `tools/test-open-doors.mjs`,
`tools/scenarios/open-forge-shed.mjs`. Rows in `src/world/open/content/people.js` and `talk-tables.js`.
Named hooks: the two shacks' solids in `src/world/tin-town-shacks.js`; the wrench's limit in `src/onfoot-weapons.js`
(roam jobs only); the car's finish in `src/arena/modes/world-job.js`. No lock.

## Checks

1. `tools/test-open-doors.mjs`: a walker gets in by the door and is stopped by each wall; the player counts as inside
   only within the room; a price follows the word and Cold is refused; repair mends all the armour and takes its scrap,
   and with too little scrap it mends nothing and takes nothing; dirt grows faster off the road and a wash takes it to
   nothing; the wrench stops at six tenths in a roam job and is unchanged in Night 2.
2. Laptop only: the browser scenario `open-forge-shed` (walk in, see the room, pay for a repair, walk out).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.door`: a tin door on a wire hinge. `open.wash`: a brush and a bucket of water. `open.scrap.paid`: scrap counted
into a tin. Repair uses `repair.start` and `repair.complete`, in hand.

## Claude answers

Owed before the build starts: Odessa's and Moss's lines for each service and each word.

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
`docs/changes/OPEN-DOORS.md` with a **Removed** line.
