---
task: FOOT-07
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: yes
---

# Race traffic while the player is on foot

Traffic brakes for a fighter in its lane, reaching a 12 mph target near the
fighter. Easy opponents steer away, Medium opponents make a seeded attack
choice, and Hard opponents aim at a reachable fighter. A vehicle moving above
30 km/h knocks a fighter down when its swept path reaches them, even if it
crosses the fighter between fixed ticks. The normal three-second fighter
recovery remains in FOOT-01. The fighter can jump clear of a vehicle's top.

The race clock, laps and checkpoints still belong to the parked car through
FOOT-02. Ordinary, flag-off and objective events do not create a fighter and
retain their prior traffic behavior.

`node tools/test-onfoot-race.mjs` passes three focused behavior cases.
`node tools/test-onfoot-transition.mjs` passes 6/6, and the existing opponent
checks pass 213 cases across 16 courses. `npm run build` and `git diff --check`
pass. No broad suite or browser check was run for this simulation-only card;
FOOT-03's private walk flow is the adjacent player-facing check.
