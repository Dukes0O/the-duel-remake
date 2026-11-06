# RAIL-STEPS

The short board entry controls current state, ownership, dependencies and locks.

The new fields and step kinds of `docs/story/there-is-no-2-15.md` section 6, on the engine from MULE-RAILS: `stopMark`, `grade`, `sandDrag`, `otherTrain`, `tokenSwap`, `tokenHoop`, `rideAlong`, `apprentice`, `consist`, and the step kinds `runaway`, `dig` and `whistle`. Race rules and replays on released courses do not change. Existing jobs set none of these fields and behave byte for byte as before.

**Checks:** `tools/test-rail-steps.mjs`, headless through real `Duel` inputs: at 9 m/s on the 1 in 30 bank at 260 tonnes the train stops in about 190 m, and at 15 m/s it does not stop on the bank but ends in the sand drag; a soft contact couples and a hard one bounces; with no token, the throttle does nothing; a hoop above the limit backs up; `copiesPlayerStop` matches the player's distance.

Design: [docs/story/there-is-no-2-15.md](../../story/there-is-no-2-15.md), [docs/story/iron-mule.md](../../story/iron-mule.md) and [docs/MACHINES.md](../../MACHINES.md) section 2. A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice in the change note and carry on with it.

## Claude answers
