# ARENA-JUNK-SHOVE

Status: building; source review fixes await the frozen native rerun.

## Changed

Round-owned junk cover uses the existing crash-body solver and knock motion.
Its native body weighs 2,175 kg, 1.5 times the released ordinary 1,450 kg car.
The current world position and heading feed the existing CPU avoidance and
renderer. The renderer only copies poses; it does not move simulation bodies.

Junk settles on the floor and keeps its position. Native wall containment runs
quietly for junk, without participant armor damage or wall-hit cues. The native
Titan crush path still owns flattening, score, height checks and its cue.
Moved cover refreshes the existing spawn candidates before native respawns;
slot indices and the copied Fuel depot positions are preserved. Idle fixed ticks
retain the last valid candidates. Crushed hulks keep their initial physical
slide, then preserve the native transparent cover behavior; they do not become
new solid obstacles for other cars or junk.

A new actual ram reuses vehicleSmash and the existing vehicle.crash-impact
sound. Titan flattening keeps propCrushed and vehicle.crush. No new sound asset.

## Tests

Independent tests came first in 18aa344: 53 checks, with 37 real acceptance
failures and 16 released solver/road controls passing. Their assertions and
all existing fingerprints are frozen. Review found the venue's six search
advances can leave a refreshed slot within clustered current cover. New
regression daf0d3f ran first: six checks, four genuine RED failures across LCR
and Fuel Run; slot IDs and copied depot controls passed. The leaf now continues
the existing six-metre search for at most one course length, using the venue's
authored 14-metre clearance. The one-tick native respawn probe passes all six. The first source run passes all 53
checks with no changed assertion, pin or displacement tuning. Raw native
impact velocities meet the settled movement floors. Independent source review,
affected native regressions, browser checks and merge gates still follow.

## Replays

Arena contact outcomes may change when movable cover is hit. Ordinary roads,
global solver and steering stay unchanged. Any changed arena pin needs paired
native evidence and independent review; none has been changed.

## Removed

The fixed stop response is replaced by crash motion only for round-owned
arena junk. Ordinary Titan Arena props retain their released crush behavior.
