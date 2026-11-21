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

Written 21 November 2026. The positions were checked against the land the same day: each is at least 1,500 m from
Tin Town, 1,000 m from the yard, 900 m from the next checkpoint and 500 m from every neighbour's outpost.

**How a checkpoint's position is written.** A checkpoint on a road is a road's id and a share of its length from its
first point (`ROAD_NET.road(id)`, `src/world/scablands-road.js`), so it stays on the road if the road is ever moved.
One off the road is a named point. Add a small helper for "the point at a share of a road" if none fits. Every
checkpoint has a radius of 180 m.

| Id | Where | Kind |
| --- | --- | --- |
| `east-road-1` | The East Road, .18 | open road |
| `east-road-2` | The East Road, .42, short of the Girder Bridge | Ash ground |
| `east-road-3` | The East Road, .68 | open road |
| `boneyard-road-1` | The Boneyard Road, .35, by the Wash | Rat ground |
| `tin-road-1` | The Tin Road, .45 | Rat ground |
| `salt-road-1` | The Salt Road, .20 | open road |
| `salt-road-2` | The Salt Road, .55 | open road |
| `salt-road-3` | The Salt Road, .85 | open road |
| `ridge-spur-1` | The Salt Road to the Ridge, .50 | open road |
| `ridge-road-1` | The Ridge Road, .35 | open road |
| `west-road-1` | The West Road, .25 | open road |
| `west-road-2` | The West Road, .60 | far west |
| `west-road-3` | The West Road, .88 | far west |
| `dam-road-1` | The Dam Road, .35 | open road |
| `dam-road-2` | The Dam Road, .75 | far west |
| `burn-road-1` | The Burn Road, .30, in the pass through the hills | Ash ground |
| `burn-road-2` | The Burn Road, .70 | Ash ground |
| `mall-road-1` | The Mall Road, .30 | open road |
| `mall-road-2` | The Mall Road, .70 | Rat ground |
| `mall-burn-road-1` | The Mall to the Everburn, .35 | open road |
| `mall-burn-road-2` | The Mall to the Everburn, .75 | Ash ground |
| `mall-boneyard-road-1` | The Mall to the Boneyard, .30 | Rat ground |
| `mall-boneyard-road-2` | The Mall to the Boneyard, .75, past the South Ford | Rat ground |
| `the-steps` | `land.at('the-steps')`, in the river bed | Ash ground |
| `breaks-cut` | `land.between('dead-mall', 'everburn', .5, 0, -700)`, across the hills | Ash ground |
| `pan-cut` | `land.between('ships-in-sand', 'ridge', .5, 0, 400)`, across the salt pan | open road |

The three that are not on a road are where a driver goes to keep off the roads. The South Ford and the Wash's own
crossing have none, so that a careful way round always exists.

**Does anybody come?** The chance for each kind, then what moves it. The result is kept between .05 and .75.

| Kind | Chance to start from |
| --- | --- |
| Ash ground | .45 |
| Rat ground | .45 |
| Open road | .30 |
| Far west | .25 |

- Add .10 for each step of the ground's own group's feud above Watching (the Ash Men on Ash ground, the Road Rats on
  Rat ground).
- Add .03 for each point of the Word on the road.
- Take off .15 when a tower that is kept can see the checkpoint.
- Take off .10 when a found camp whose people are Friendly is within 2,000 m.
- **The first checkpoint a player ever crosses always brings one car that only drives by.** It teaches what a
  passing car looks like before one comes to fight.

**Who comes?** Weights for each kind. A group with a condition is left out when the condition is false.

| Kind | The Road Rats | The Ash Men | Traders | Travellers |
| --- | --- | --- | --- | --- |
| Ash ground | 1 | 5 | 2 | 1 |
| Rat ground | 5 | 1, only at Raiding or worse | 2 | 2 |
| Open road | 2 | 1, only at Raiding or worse | 4 | 3 |
| Far west | 1 | 0 | 4 | 4 |

Mrs Vane's water men join the far west when the thread "Somebody else's flag" is built. The Road Rats' feud begins at
Watching.

**How many cars?** Traders and travellers come as one car, or two at one chance in four. For the Road Rats and the
Ash Men, by their feud:

| Feud | One | Two | Three | Four |
| --- | --- | --- | --- | --- |
| Watching | 45 | 35 | 15 | 5 |
| Raiding | 30 | 40 | 20 | 10 |
| Hunting | 20 | 35 | 30 | 15 |
| War party | 10 | 30 | 35 | 25 |

On Easy, three or four becomes two.

**What do they mean to do?** Out of a hundred.

| Group | Feud | Fight | Drive by | In trouble |
| --- | --- | --- | --- | --- |
| The Road Rats | Watching | 30 | 55 | 15, and it is bait |
| | Raiding | 55 | 30 | 15, and it is bait |
| | Hunting | 70 | 20 | 10, and it is bait |
| | War party | 80 | 15 | 5, and it is bait |
| The Ash Men | Watching | 10 | 90 | 0 |
| | Raiding | 50 | 50 | 0 |
| | Hunting | 70 | 30 | 0 |
| | War party | 85 | 15 | 0 |
| Traders | any | 0 | 75 | 25, and it is real |
| Travellers | any | 0 | 60 | 40, and it is real |

- **A car grey with ash:** the Ash Men's share for a fight is halved, and the rest goes to driving by.
- **Bait** is a Road Rats' car painted as a trader's, stopped with its bonnet up, and two more behind the next rise.
  Its tell is two sets of tyre tracks that leave the road beside it and go nowhere. A real car in trouble has none.
- **Passing Ash Men at Watching** slow down beside the player, look, and drive on. That is the feud's own "a scout
  follows a run".

**The lines.** Each is said in a talk bubble over the car or the person, or on the radio where marked.

| When | The line |
| --- | --- |
| A trader is hailed | **The trader:** Good day to you. I've tyres, salt and a little seed on the back, and I'll trade them for scrap at any gate that will open for me. Where are you from? |
| A trader, told "Tin Town" | **The trader:** Tin Town? I heard that somebody has lit the hearth there again. I'll come by your gate one evening, if the road stays clear. |
| Travellers are hailed | **A traveller:** We're only passing through, and we don't want any trouble. Is it far to the next place with a fire? |
| A real car in trouble | **The driver:** Thank goodness, somebody stopped. The fan belt has gone and I've been here since morning. I've no scrap to give you, but I never forget a kindness. |
| It is mended | **The driver:** She's running again! I told my daughter that somebody decent would come along. I'll tell everyone I meet which town you're from. |
| Bait, when the trap closes | **A Road Rat:** There's nothing wrong with this car at all. There's something wrong with yours, though, because it's about to be ours. |
| Road Rats come to fight | **A Road Rat:** *(on the radio)* That's a nice car, and it's a long way from home. Let's see how much of it we can carry. |
| Ash Men come to fight | **An Ash Man:** *(on the radio)* Old Smoke says nothing glows on this road without his leave, and that goes for your headlamps too. |
| Fighters break off when a hold is taken | **A Road Rat:** *(on the radio)* Leave it! There's something bigger going on down the road, and I want to watch. |
| The player rams a trader | **The trader:** *(on the radio)* What did you do that for? I've done nothing to you! Every gate on this road is going to hear about this. |
| Towed home for a favour | **{people.leader}:** We saw your smoke from our fence and came out with a rope. We'll call that the favour we owed you. Mind your head as we go over the bumps. |
| A lift from a trader, with no friend near | **The trader:** You're a long way from anywhere on foot. Climb up, and I'll take you home. It will cost you {price} scrap for the ride, and your car will have to wait where it is until morning. |

**What losing costs, to start from.** A quarter of the scrap carried, and never more than 40. A trader's lift costs
10 scrap.

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
