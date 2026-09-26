---
task: CRASH-02
status: active
kind: presentation
flag: crash-effects
player_facing: yes
---

# Crash look and sound (26 September 2026)

## Settled implementation

Claude's design in `docs/CRASH_PHYSICS.md` remains authoritative. The work is
split into separate visual and audio lanes as recorded in
`docs/board/decisions.md`.

This visual lane listens to the existing `vehicleSmash` event. It uses the
event's exact world point for a bounded spark and crumple flash, and scales the
presentation from its severity and change in velocity. It shows tyre smoke
only while an actor has live knocked motion. Launched traffic keeps the
CRASH-01 physical wreck roll. The renderer owns all effect ages and fixed
pools. It does not write simulation state or use simulation randomness.

All new work is behind the new `crash-effects` dev switch. With that switch
off, the current render and audio paths stay exact. The separate audio lane
will implement the existing `vehicle.crash-impact` cue and scale it by change
in velocity under SPEC 0.9.

## Tests first

`tools/test-crash-presentation.mjs` owns the focused visual contract. It must
fail before runtime work exists and cover exact contact placement, bounded
delta-v scaling, pause and expiry, knocked-only tyre smoke, fixed resource
reuse, state immutability, flag-off isolation and the existing launched-traffic
roll path.

## Evidence

Pending.

## Removed

Nothing yet.
