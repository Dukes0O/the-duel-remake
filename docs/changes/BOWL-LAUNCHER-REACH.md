# BOWL-LAUNCHER-REACH: the player's launcher reaches 6 m (Kyle, 22 November 2026)

**Changed.** `SHOW_WEAPONS.launcher` (`src/bowl/bowl-weapons.js`): player `reach` 4 to 6 m on Easy and Medium; new `rivalReach` 4 m
(rivals keep theirs); `hardReach` 3 m unchanged for all. `docs/WASTELAND_WORLD.md` line updated. No save, pay, throw or damage change.
**Why 6 m (design number, Claude to review).** Reach is not what costs the careful driver: fights diverge at the first different shot,
so ten seeds are a coin flip around a true rate near 57%. Over 60 seeds (Night 5 launcher, Easy, careful / chaser wins): 4 m 34 / 35,
5 m 35 / 41, 6 m 40 / 34, 6.5 m 36 / 35. Throw 9 to 15 m, rest 3 to 3.5 s, arc 55 degrees and a heavier landing were tried over 30
seeds: none helped the careful driver, and the heavier landing pushed the chaser to 44 of 60. Fixed ten seeds at 6 m: chaser 5/10,
careful 6/10, 9/10 fights at 75 s or more.
**Checks** (commit 302ab4b): `test-bowl-weapons.mjs` passes, with a new check that the player's launcher takes a truck 5 m ahead and a
rival's does not (it fails at player reach 4). `test-bowl-rivals.mjs` passes unchanged (368 checks; Night 5 child-pace Easy 6/10).
Lane tier (32 suites) passed, the rivals suite run alone because the runner's 30 minutes ran out; `npm run build` passed.
**Changed assertion** (`test-bowl-weapons.mjs`): the empty-shot hop put the target 4.1 m ahead, now in reach; it is 6.1 m, still just
out of reach. Nothing loosened. Claude to review.
**Removed.** Nothing; the one shared reach is split in two.
