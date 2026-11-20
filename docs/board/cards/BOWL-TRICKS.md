# BOWL-TRICKS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: the truck on two wheels and in the air). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The monster-truck trick set as rules and scores. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), section 2 (the table there is the
specification: keys, when each trick counts, points). Kyle, 20 November 2026: wheelies, stoppies, donuts, 360s, side
flips, barrel rolls, front and back flips; "a double flip scores far more than a single one".

**Measured before (Claude's hand drive):** S held in the air took the truck from 50 mph to 2 mph in mid flight; each roof
landing added 0.35 to 0.55 to a damage zone; a flip paid 30 beside a jump's 125.

**Kyle, 20 November 2026:** the tricks are for every vehicle that can play in the Monster Arena, not for the Titan alone.
Write the rules for whichever vehicle is driving: nothing in `src/bowl/bowl-tricks.js` may name the show truck or assume
its size, and whether tricks are on comes from the venue's own data (`tricks: true` on the Bowl's course), not from a
check that the course is the Bowl. BOWL-TRICKS-ALL then switches them on at the Titan Monster Arena.

## What to build

1. **`src/bowl/bowl-tricks.js`** replaces `src/bowl/bowl-air.js` (delete it; say so on the Removed line). Rules from seed
   and inputs alone. It keeps the truck's show pose in state (`bowlPose {pitch, roll, yaw}`, read by the view) and emits
   `bowlTrick {kind, turns, points, combo, fresh, landing: 'clean' | 'slide' | 'slam'}`.
   - Ground: wheelie, stoppie, donut and Cyclone, with Space as the show key, as the table says.
   - Air: front flip, backflip, spin, barrel roll, side flip (a roll made while the nose is more than 45 degrees off the
     line of flight). First turn 1.0 s, later turns 0.8 s; a spin 0.9 s a turn; a roll 1.0 s.
   - In the air W and S only turn the truck: its speed in flight is untouched. A key held from before take-off tips
     nothing until let go and pressed again (the existing rule and its test stay).
   - Landings: clean, slide (tricks pay half, speed halves over a second) and Slam (tricks of that jump pay nothing, the
     crowd meter loses a third, the truck is back on its wheels in 1.5 seconds, no damage). On Easy a truck within 30
     degrees of level with the keys let go eases level.
2. **Scores in `src/bowl/bowl-show.js`:** a double pays four times a single, a triple nine times; combos one and a half,
   two and two and a half times for two, three and four kinds; the first of a kind in an event pays one and a half times;
   a kind repeated pays four fifths of the last time down to two fifths, reset by another kind. The crowd multiplier stays.
3. **`src/bowl/bowl-night.js`** reads tricks from `bowlTrick` in place of its own flip and donut counting.
4. **`tools/bowl-freestyle-balance.mjs`** gets three scripted drivers (child pace: kickers, wheelies and donuts, no flips;
   middle: single flips and one big jump; expert: doubles and combos) and prints the three targets the design's rule
   gives. Put the measured targets in `BOWL_NIGHT_RULES.freestyle.target` and in the change note.

## Files and locks

`src/bowl/bowl-tricks.js` (new), `src/bowl/bowl-air.js` (removed), `src/bowl/bowl-show.js`, `src/bowl/bowl-night.js`,
`src/bowl/bowl-lines.js`, the Bowl's lines in `src/sim-driving.js` (the call to the air rules, and the brake and throttle
in flight on the Bowl only), `src/bowl/bowl-view.js` (draw the pose), `tools/bowl-freestyle-balance.mjs`,
`tools/test-bowl-tricks.mjs` (new, replacing `tools/test-bowl-air.mjs`), `tools/test-bowl-show.mjs`,
`tools/test-bowl-night.mjs`. Lock: `bowl-night`.

The existing Bowl pose hook in `src/vehicle-grounding.js` may read pitch, roll and yaw. The Bowl course may declare `tricks: true` in its venue data.

The Show Night listener in `src/app.js` may play this card's cue from the existing sound bank.

## Checks

1. `tools/test-bowl-tricks.mjs`: each trick in the table done by scripted keys on the real floor and named with its points;
   a double backflip off the Big Jump pays 200 and a single 50; a backflip with a spin pays 120; speed in flight is the
   same with and without S held; a Slam leaves every damage zone at zero and the truck driving again inside 2 seconds.
2. `tools/bowl-freestyle-balance.mjs`: the child-pace driver wins Easy at least 9 times in 10 and never wins Hard.
3. `tools/test-bowl-show.mjs`: the multiplier rules above, with every changed assertion listed in the change note for
   Claude's review (rule 18).

## Sound cues

`bowl.trick.land` (a clean landing with tricks; stand-in `interface.bonus`), `bowl.trick.new` (the first of a kind;
stand-in `interface.win`), `bowl.trick.slam` (stand-in `vehicle.crash`), `bowl.trick.wheelie` (the engine note rising
while the nose is up; stand-in: none, name only), `bowl.trick.cyclone` (stand-in `crowd.cheer`).

Behind `titan-bowl`; nothing changes on any other course. Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-TRICKS.md` with a Removed line. Before CARD DONE, search `tools/` for `bowl-air`,
`bowlAirFlips`, `flip` and `donut` and bring each older suite and scenario that names them up to date. No Chrome under
`codex exec`: any browser scenario is "Claude runs". Memory-only saves. No new dependency, network request or key. Clean
up nothing outside this lane.

Builder drive observation: at 32 mph the centre kicker carries the driver past the first parked car on a separate line (about 11 m inside it). The clearance check keeps that approach. The full-night pilot approaches at 30 mph and releases its controls in flight; every original launch, score and completion assertion remains.
