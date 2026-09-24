---
task: FOOT-02
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: yes
---

# Car exit and parked-car transition

Wasteland2 combat races now allow a 0.4 s F hold to step out below 40 km/h.
At 40 km/h or above, a 1 s hold bails the fighter out, removes 25 health,
briefly tumbles the fighter, and lets the car coast before braking. A fresh
0.6 s F hold within 3.5 m re-enters. The hold must be released between exit
and re-entry. F also maps to gamepad X.

The player car remains in the race simulation while unoccupied. It coasts,
brakes, collides with opponents and scenery, receives armor and weapon damage,
and owns the race clock, checkpoints and laps. A parked wreck recovers at its
current position after 3 s. Player car weapons cannot fire while the fighter
is out. This transition is off in ordinary races, time trials, objective
events, and when the Wasteland2 flag is off.

FOOT-03 can provide walking controls through `Duel.setFighterInput()` and
render the fighter and camera. The simulation already advances FOOT-01's
fighter at a fixed 120 Hz step. Until FOOT-03, the player can exit and re-enter
but cannot steer the fighter from the live UI.

## Verification

- `node tools/test-onfoot-transition.mjs`: 6/6 cases pass. They cover the exit
  and bailout holds, health and car coast, re-entry release and range, armor
  damage and exact 3 s in-place wreck recovery, a parked-car opponent ram,
  and exclusion from ordinary, time trial, objective and flag-off races.
- `node tools/test-onfoot.mjs`: FOOT-01 fighter baseline passes 9/9.
- `npm run build` and `git diff --check` pass in the isolated worktree.
- No existing assertion or race fingerprint changed. No broad suite or live
  browser session was used for this scoped transition.

## Follow-up

FOOT-03 must connect walking input and camera before on-foot play is useful in
the browser. Later on-foot cards own fighter attacks, traffic and CPU fighter
behavior. This card leaves those out of the car transition.
