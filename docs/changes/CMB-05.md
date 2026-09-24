---
task: CMB-05
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: yes
---

# CPU combat decisions

In a flagged three-car Mad Max race, the CPU cars now take separate attack
turns. The total planned attack rate stays at the difficulty's 10/7/5-second
per-car interval, but the field no longer fires one synchronized volley.
Turns rotate in stable opponent order, skip wrecked or finished cars, and
slow to the correct rate as the field shrinks. A scripted infinite attack
timer still suppresses attacks for repeatable scene setup.

On a straight, a Medium or Hard rival just behind the player can steer toward
the player's lane and accelerate for a rear ram instead of yielding away.
This only happens at driving speed, on drivable road, within a short reach
and while the rival is not recovering from another ram. CMB-02 still owns
the actual contact, shove, armor loss and wreck rules. Easy stays with its
old yielding behavior.

The new decisions require `wasteland2`. One-rival live Mad Max and every
flag-off or ordinary race keep the earlier AI schedule and steering.

## Checks

- Focused CMB-05 acceptance: 5/5, covering round-robin turns, a finished
  car, the old synchronized flag-off behavior, disabled scripted attacks,
  and a straight-line rear approach versus the old yield.
- Existing CPU combat, three-opponent combat, and ramming checks pass.
- Production build passes with only the existing large-chunk advisory.
- CMB-06 will record the new turn order at 30/60/144 FPS after integration.
  Broader combat balance and browser pacing remain for a release that enables
  `wasteland2`.
