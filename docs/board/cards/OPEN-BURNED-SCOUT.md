# OPEN-BURNED-SCOUT

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

**Before this card:** OPEN-NEST-GROUND cuts the Rats' Nest's ground into the land for play, and OPEN-LOOK-RATS-NEST's
look is in `src/world/open/looks/rats-nest-look.js` with its named spots. Place the Nest from those; do not edit
`src/world/ground-edit.js` for its ground.

## What to build

Section 21, Scene 3.

1. **The Rats' Nest as a site of the kind den,** in the wreck fields: a cutting, a ring of wrecks with a chained gate
   for a pen, tyre fires, tin roofs, six buggies in a row, and a drain a person can walk through under the east wall.
   Wrecks and shacks are in hand; the cutting and the drain are new ground and solids.
2. **The scouting mission.** It holds `checkpoints` and `signs`. Bean pods lead to the Girder Bridge road and tracks
   go on. Two lookout buggies watch the two roads; the car is seen after eight seconds in a lookout's view
   (`sees`, as the furnace's rule has it). Seen: a flare, two buggies to fight or outrun, and the mark "The Road Rats
   know somebody was looking."
3. **The rim, on foot:** three places to look from, each with its thought and its mark, exactly as the table has them.
4. **The decision at the rim:** drive in alone and go in by the drain end the card with the mission complete and the
   choice recorded (OPEN-BURNED-PEN plays them); slipping away home completes the mission with what was seen.
5. The Rats' Nest joins the map for good when first looked into.

## Files and locks

New: `src/story/threads/content/burned-camp-scout.js`, `src/world/open/content/rats-nest.js`,
`tools/test-burned-camp-scout.mjs`, `tools/scenarios/open-burned-scout.mjs`. Rows in the sites table. Named hooks:
the Nest's ground in `src/world/ground-edit.js` and its solids in `src/world/scablands-solids.js`. No lock.

## Checks

1. `tools/test-burned-camp-scout.mjs`: the mission holds the checkpoints from start to end; a car kept out of both
   lookouts' view is not seen and one left in view for eight seconds is; each place on the rim writes its mark, and
   the drain can be chosen only after the south end was looked from; the Nest is on the map afterwards.
2. `tools/test-scablands-ground.mjs`, `tools/test-scablands-solid.mjs` and, because ground changes,
   `tools/test-circuits.mjs` by hand.
3. Laptop only: the browser scenario `open-burned-scout`. This card's one scripted drive: the gully way, not seen.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.scout.seen`: a held breath, for each thing seen from the rim. `open.lookout.flare`: a flare going up.

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
`docs/changes/OPEN-BURNED-SCOUT.md` with a **Removed** line.
