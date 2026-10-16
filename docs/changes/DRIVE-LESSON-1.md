# DRIVE-LESSON-1: independent lesson rules

## Built

The first source slice implements the two settled corner rows and the late,
right and three-in-a-row attempt rules. It reads plain car views, clips the
gate timer at crossings, measures screech and continuous off-road time, and
tracks swept cone counts and once-per-attempt cone tips (`lesson.cone`).
The right try checks the original four rules in order. Coaching uses the
shared six-second interval. A failed physical attempt never blames a rule
that passed. Starts beyond the gate and zero-time movement are rejected.
Only the lesson object changes; car views, authored plans and player state
stay untouched. The output names existing radio lines; it plays no audio.

Kyle directly asked Root to continue independent source during Summit's
exclusive release full tier. The instructor run and native acceptance still
depend on TYRE-SLIP. This source increment is not a playable or merged lesson.

## Checks and review

Tests were written before the module: initial missing-module RED, then
11 passing plain-data cases. Additional boundary and review regressions now
pass 20/20 in 111.1817 ms. These checks import no simulation or browser and
consume no heavy slot. Independent code/numbers review found a zero-time
challenge bypass and incorrect braking advice after a physical failure;
both are fixed with regression coverage. Follow-on fixes keep elapsed time
after reversing behind the start gate and align challenge summaries with
its time-only rule. Required reviewer confirmation is CLEAR for all fixes.
No existing assertion, race fingerprint or design number changed.
No gate, build, native simulation, browser or frame job was started here.

## Still unfinished

The actual same-car instructor simulation, native racing-line/steerForYaw
speed plan, `placeCones` from its poses, ghost poses, real cone/board
positions and both-corner Casual/Pro acceptance at 30/60/144 FPS remain.
Late-try screech/time-loss and right-try native results are unmeasured.
TYRE-SLIP remains an unmet acceptance/merge dependency. Do not move its board
or infer native success from these synthetic car views. Lane tier/build
must run once the finished source is eligible and heavy holds have cleared.
DRIVE-LESSON-HOOKS remains a later dependent card.

## Removed

Nothing replaced. No scratch output or copies were created; preserve this
unfinished owned lane and its creation receipt for the next source increment.
