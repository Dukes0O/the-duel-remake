# OPEN-CHECKPOINTS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Section 15.

1. **The checkpoints table:** about 24 circles of 180 m on the roads and crossings, written by name. None within
   1.2 km of Tin Town. Claude places them in "Claude answers" from the road net.
2. **The checkpoint rule.** When the car enters an armed checkpoint during a roam job, four named draws, the name
   carrying the checkpoint's id and its crossing count: whether anybody comes, who, how many (one to four), and what
   they mean to do (fight, pass by, in trouble). Weights follow the group's feud, the Word on the road, towers that
   stand, and friends near.
3. **Encounters.** *Fight:* a rider fight started inside the roam job at the cars' own start points
   (`startRoadFight`), using the riders as they are. *Pass by:* cars drive the road at their pace, show their paint and
   flag within 60 m, and fight only if rammed or shot. Attacking traders or travellers writes a mark and raises the
   Word on the road. *In trouble:* one stopped car; mended with the wrench for scrap and a favour, or bait with two
   cars behind the next rise, by a draw, with tracks leaving the road as the tell when it is bait.
4. **Limits.** One encounter alive at a time. A checkpoint that brought somebody rests until the hearth is next
   banked. No checkpoint within 1.2 km of a found camp whose people are Friendly. On Easy, cars come in ones and twos.
5. **The holds.** `takeHold(open, holder, systems)`, `dropHold(open, holder)`, `isHeld(open, system)`. Every world
   job takes `checkpoints` and `signs` when it starts and drops them when it ends, fails or is left, unless its
   definition says `holds: []`. Only `roam` holds nothing. When a hold is taken with cars out, fighters break off and
   drive away and passers-by drive on; no car is removed while the player can see it.
6. **Losing in the open** (section 14): the car is towed home for a favour, or the player walks to a road and a
   trader gives a lift for scrap. A share of the scrap carried is lost, through `spendScrap`.

## Files and locks

New: `src/world/open/content/checkpoints.js`, `src/world/open/checkpoint-rule.js`, `src/world/open/holds.js`,
`src/world/open/encounter-rule.js`, `tools/test-open-checkpoints.mjs`, `tools/scenarios/open-checkpoint.mjs`.
Named hooks: taking and dropping holds where a world job starts and ends in `src/arena/modes/world-job.js`; starting a
rider fight inside a roam job in `src/arena/modes/road-riders.js`; the roam step. No lock.

## Checks

1. `tools/test-open-checkpoints.mjs`: the same seed and crossing count give the same draw, and another seed differs;
   nothing comes while any holder holds `checkpoints`, including when one of two holders has let go; every job
   definition in the game except roam takes the hold (the test lists them: Night 2, the gas run, the Everburn's jobs,
   the town's jobs); a checkpoint rests until the hearth is banked; passers-by never attack first; a car that leaves
   is not removed within the player's view.
2. `tools/test-road-riders.mjs` and `tools/test-night-2.mjs` pass unchanged: no checkpoint fires in Night 2.
3. Laptop only: the browser scenario `open-checkpoint` (a seed that brings two cars to fight at the first checkpoint
   on the Mall Road; win on Easy).

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

`open.encounter.near`: engines heard before the cars are seen. `open.encounter.leave`: engines going away.
`open.flag.hail`: a horn tapped twice by a car that means no harm.

## Claude answers

Owed before the build starts: where the checkpoints stand, and each group's weights.

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
`docs/changes/OPEN-CHECKPOINTS.md` with a **Removed** line.
