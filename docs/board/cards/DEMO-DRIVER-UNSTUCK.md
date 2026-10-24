# DEMO-DRIVER-UNSTUCK

The short board entry controls current state, ownership, dependencies and locks.

Raised by FIX-LAUNCH (24 October). `node tools/combat-balance.mjs --check` exits 1
because the scripted demo driver (`_driveAutopilot` in `src/app.js`) cannot get
out of a pocket off the road. Hard seed 1993: at about 189 mph it rear-ends a
rival that raiders had just slowed, is knocked sideways to 38 m off the road and
is boxed in by scenery. It steers straight at the road, into the wall, and sits
there for the 600 s cap. A person would reverse and drive round. At the gentler
launch the same happens on other Hard seeds at other CPU launch values (1999,
2001, 2004, 2015), so it is the slower launch plus a driver with no way round.

**To settle:** when the demo driver is nearly stopped and off the road for a few
seconds, back out and follow the wall until it can turn toward the road. Fire
only when stuck, so runs that never stick keep their recorded fingerprints.
Measure on seeds 1993, 1999, 2001, 2004 and 2015 (Hard, no weapons) and then the
whole `combat-balance.mjs --check`. Do not drop seeds, do not change the measure,
do not widen a target. A first try (back out with the wheel swung toward the road,
then drive on) did not help: it found another wall.

**Release:** the next release waits for this card (the balance check must pass).
