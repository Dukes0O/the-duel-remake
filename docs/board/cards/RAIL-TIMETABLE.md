# RAIL-TIMETABLE

The short board entry controls current state, ownership, dependencies and locks.

`docs/story/there-is-no-2-15.md` section 6, The Timetable, on `docs/MACHINES.md` section 3's route tool. New lines and trains go in as data. Runs carry trade and people. Trains can be seen and heard from the Scablands in free play. A run that needs a stretch of line in use waits in a loop, and you can see the wait. `rail.time.*` and `rail.next.*` play here.

**Checks:** `tools/test-rail-timetable.mjs`: two runs on one track never occupy one stretch at once, across 1,000 seeded days; a race's replay is unchanged with trains running. Browser scenario `rail-timetable`. One frame check on Performance with two trains in view.

Design: [docs/story/there-is-no-2-15.md](../../story/there-is-no-2-15.md), [docs/story/iron-mule.md](../../story/iron-mule.md) and [docs/MACHINES.md](../../MACHINES.md) section 2. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice in the change note and carry on with it.

## Claude answers
