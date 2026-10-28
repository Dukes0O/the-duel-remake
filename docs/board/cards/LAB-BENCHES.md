# LAB-BENCHES

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB sections 2 ("the rule for
truth") and 4. Switch `lab` (dev). Needs LAB-RULES.

Each bench as a pure model the screen can run, built on the game's own
rules, never a copy of them:

- `src/lab/benches/lift.js` (thrust and weight from `heli-flight.js`),
  `projectile.js` (the bucket's own parcel model from `heli-bucket.js`),
  `fire.js` (heat, fuel, air switches; the fire cell rules of `heli-fire.js`
  for the practice fire), `pendulum.js` (2 pi root of L over g, and the
  cable's own swing from `heli-cable.js` for the 15 and 25 m cases),
  `altitude.js` (the game's thrust falloff and the true air-density figure,
  both shown), `strength.js` (bar bending and snapping from material
  tables: aluminium, steel, carbon fibre; the hook-arm puzzle), `rust.js`
  (a week of four jars as a scripted time-lapse with rust amounts), `gforce.js`
  (v squared over r), `headings.js` (bearings and distances from the pilot's
  map coordinates), `launch.js` (range with and without drag, landing lower),
  `wax.js` (glide times per snow and wax), `tunnel.js` (grip against slide
  from the tyre-slip rules, downforce against speed, stopping distance from
  the car's own braking, spring contact on a bump, fuel weight).
- Each exports `{controls, run(settings) -> result, goalMet(history)}`; the
  bench is complete when its goal is met (for example, lift: the player has
  found a load that will not leave the ground).
- `tools/test-lab-benches.mjs`: every number a bench shows equals the
  game's rule for the same inputs (thrust, parcel landing point, cable
  swing time within 5% of the formula, stopping distances in the ratio 4
  between 100 and 50 mph, grip peak at the tyre-slip rule's best slide);
  each explanation's numbers in LAB section 4 match the bench (5, 20 and
  45 m falls; 4.5, 7.8 and 10 s swings; 52 kg of petrol in 70 litres).

Owns: `src/lab/benches/`, `tools/test-lab-benches.mjs`,
`docs/changes/LAB-BENCHES.md`. Locks: none.
Sound: names the cue each bench plays (`lab.clunk`, `lab.splash`,
`lab.burner`, `lab.tick`, `lab.creak`, `lab.snap`, `lab.fizz`, `lab.fan`).
Art: none.

Acceptance: the test, lane tier, build, one review. Removed: nothing.

## Claude answers

Settled 24 October: the three corrected explanations (Suspension, Grip, G-force) are approved:
truth over the first draft's words, never tune a model to fit a sentence. The Braking
bench says plainly that its weight shift is shown at a gentle 1 g stop while the stopping
distances use the car's full braking. The cold-snow wax pick (medium) is fine.
