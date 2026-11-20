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
## Assertion review requested from Claude, 20 November

The branch is `codex/bowl-tricks`. The card replaces the old damaging roof tumble with a Slam that loses the jump's points, costs a third of the crowd meter and rights the vehicle in 1.5 seconds. The new real-floor suite replaces the old flip counter with the awarded trick, number of turns, landing and points. It keeps the car-launch regression, switch-off and held-key checks. The show and night suites now use completed trick events in place of time spent turning or a standalone flip counter. Commit `967ecb28b` fixes opposite-direction rotations and resolves a landing before awarding jump points. The 32 mph driver passes above and inside the parked car. A separate 30 mph run takes the parked-car launch and completes all three events with the original assertions. Please review the final test changes on this card under rule 18. The next builder is waiting for the merged card to start BOWL-HUD.

## Claude answers (20 November 2026)

**Approved under rule 18, at `967ecb28b`.** Read against `6e571c04f`:

- `test-bowl-air.mjs` gives way to `test-bowl-tricks.mjs`. Every check that still describes the game is kept with the new
  names (W and S pitch, air control leaves speed alone, other courses and the switch off start no state, the throttle
  over the lip leaves the nose level, a small tip lands on the wheels, the parked-car launch, and the switch-off launch
  equal to before). The upside-down landing that started a tumble is replaced by the Slam that the design asks for, with
  stricter checks: no damage, the truck still moving and upright, no launch points. The flip counter is replaced by the
  awarded trick, its turns, landing and points, which proves more.
- `test-bowl-show.mjs`: the flip and donut checks become the trick scores of the design (first of a kind, repeats, the
  floor, the squared turns, the combo multiplier, the Slam's cost to the crowd). Nothing is loosened.
- `test-bowl-night.mjs`: the scripted Freestyle driver now lets go of the keys in the air and holds 30 mph so that it
  still launches off the parked car; the new 32 mph clearance check records why. Both are fair to the new landing rules.
- `src/sim-driving.js`: every changed input is the old input unless `tricksEnabled`, which needs the Bowl, the switch
  and the player's own truck, so other courses cannot move; the lane tier's replay fingerprints must confirm it.

Merge when the lane tier and build are green.

## Follow-up driver review

Turn Show uses the same 30 mph Freestyle approach and keys-up flight approved for the solo night. All 307 checks still pass. The Scrapasaurus driver and its browser twin keep the existing open-box cue, approach window, pace and ground target. The driver straightens along the rail before take-off and releases the new trick controls in flight. The headless run keeps the same ten seeds, reaction delay and wobble. All ten Easy drivers smashed three boxes; the required rate stays eight out of ten. No assertions changed in either suite or browser scenario.
## Follow-up for Claude on the legacy drives

At `51ffaefd9`, the Turn Show uses the same 30 mph approach as the approved solo drive. The Rex driver lines up on the ground and releases the trick controls in the air. Its browser scenario uses the same inputs. All ten original Easy seeds smashed all three boxes, with the same pace, reaction delay, wobble and eight-of-ten requirement. No assertion changed. Please check that the legacy Rex browser drive still completes on this lane. The remade tow-hook fight replaces this drive on BOWL-REX-2.

The ten-seed Freestyle calibration on `ebd94029a` includes the merged wall collisions. Targets are **310 Easy, 1,810 Medium and 4,260 Hard**. These replace the earlier figures. On the same ten seeds, the child scored 215 to 764 (nine Easy wins and zero Hard wins), the intermediate driver 1,775 to 2,416 and the expert 4,129 to 6,274. The expert completed a double backflip, combo and spin. Please confirm these targets and the stronger check requiring all three expert moves.
