---
task: FOOT-01
status: integrated
kind: combat-feature
flag: wasteland2
player_facing: no
---

# Fighter simulation

`src/onfoot.js` provides a headless fighter state and fixed 120 Hz step for
FOOT-02 to attach to a Wasteland race. It does not yet exit the car, change
the race clock, render a figure or read a save.

The fighter walks at 4.5 m/s, sprints at 7.5 m/s with normalized diagonal
movement, jumps about 1.1 m, and cannot climb ground steeper than 40 degrees.
Movement uses `Course.nearest`, `groundAt` and `obstaclesNear` with swept
scenery contact and a tangent slide. Known low obstacle tops can be cleared
while jumping. Underwater ground at the existing -15 m sea plane is blocked.
Road races use a 150 m world-space range from the car's current position;
arenas use their wall corridor instead. Input, ground and collision state are
repeatable at a fixed simulation tick.

Fighters start with 100 health. Reaching zero health or being struck by a car
above 30 km/h causes a three-second knockdown. The fighter cannot move during
that timer and then respawns at the first dry, open course-relative position
beside the car with 100 health. Separate exports apply damage, vehicle strikes,
knockdown and respawn. FOOT-02 can call these without changing the car loop
until its own integration card.

## Verification

- `node tools/test-onfoot.mjs`: 9/9 focused cases pass, including actual Pacific
  Canyon ground and roadside barrier, jump and held-jump behavior, grade and
  water limits, moving-car range, arena boundary, health and exactly three
  seconds of knockdown, known and unknown obstacle tops, and a scripted
  30/60/144 FPS replay.
- `npm run build` passes in the isolated worktree. Vite reports its existing
  large-chunk advisory.
- `git diff --check` passes. No older assertion or replay fingerprint changed.
- No broad test tier or browser check was run for this headless module. FOOT-02
  owns the first player-facing integration check.

## Limits for FOOT-02 and later cards

- Most course props lack finite height metadata. The fighter treats them as
  solid even when jumping, while a prop with a known low top can be cleared.
  Scenery needs authored heights before every low object can be vaulted.
- Horizontal contact uses a conservative 0.34 m square footprint through the
  existing swept obstacle routine. A round capsule would give smoother glances
  at corners and should be considered during movement polish.
- The -15 m sea cutoff matches the current coastal renderer. If that plane
  moves, the simulation value should move with it.
- If every nearby respawn candidate is blocked, the fallback is the car's
  ground position. FOOT-02 needs to connect this to its safe parked-car reset.
- Car exit, bailout damage, the parked car, traffic and CPU fighter behavior,
  camera, controls, weapons and saves belong to later on-foot cards.
