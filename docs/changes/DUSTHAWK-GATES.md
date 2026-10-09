---
task: DUSTHAWK-GATES
status: ready
kind: fix
flag: none
player_facing: yes
---

# Rally car dropped from the air on shortcuts (9 October 2026)

Kyle: the rally car "does it every time, particularly when taking a shortcut.
We can be on track and it just drops us from the air."

## Cause

Only the rally car and the Titan run the all-terrain jump rules (`_jump` in
`src/sim-driving.js`), and only while off the prepared road. They remember the
height they last tracked (`_jumpY`). On the road or a shortcut those rules
sleep, so the remembered height is never updated. Entering a shortcut means
leaving the main road for a moment, which stores a height. The shortcut then
descends (Pacific Canyon Route C drops about 10 m), and the next time the car
touches the dirt beside the shortcut the rules wake up and measure from the old
height, 10 m above the ground. The car appears in the air and falls.
Reproduced headless on Pacific Canyon Route C (seed 17): the Dusthawk rose to
9.95 m on the shortcut; the Falcone F42 never left the ground.

An earlier search for missed checkpoints found nothing: checkpoints count
correctly for this car, so the drop was the real symptom.

## Change

- `src/sim-driving.js`: when the all-terrain rules are asleep (car on the road
  or a shortcut, not airborne, not tumbling) the stored height is cleared.
  Ordinary cars never store one, so nothing changes for them.

## Tests

- New `tools/test-rally-shortcut-air.mjs` (3 tests, red before the fix):
  the Dusthawk drive along the Route C shortcut stays under 0.5 m of air; the
  Falcone drive on the same line does too; a stale height is cleared on the road.
- Drove the Dusthawk and the Titan along every shortcut on Pacific Canyon,
  High Country, Harbor & Highlands, Ridge Rally and Timberline (three routes
  each): after the fix none leave the ground by more than a hair. Before, the
  Dusthawk reached 9.95 m and the Titan 11 m and 18 m on Pacific Canyon.
  The hidden road drive is unchanged (0.23 m).

## Changed assertions

None. Replay fingerprints of ordinary cars are unchanged.

## Removed

Nothing.
