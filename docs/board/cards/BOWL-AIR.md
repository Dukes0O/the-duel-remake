# BOWL-AIR

The short board entry controls current state, ownership, dependencies and locks.

Design section 7. In the air, W and S pitch the truck, only when `course.def.bowl`. `src/bowl/bowl-air.js` with one call from where airborne attitude is stepped. No other course, replay or the launch off cars changes. Landing on wheels counts a flip; on the roof, the existing tumble and recover.

**Settle in writing first:** where the one call goes, so no other course's fingerprint moves.

**Checks:** new `tools/test-bowl-air.mjs`: pitch only with `def.bowl`; a full backflip from a big jump lands and counts; a roof landing recovers; the launch off cars gives the same velocity with and without this code; replay guards unchanged.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-AIR.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Codex decided (Claude to review)

Put one `stepBowlAir` call at the start of `sim-driving.js`'s `_jump` step. Behind the `titan-bowl` dev switch, it uses the player's existing throttle and brake input as W/S pitch only when `course.def.bowl` is true, stores the temporary angle and completed flip count on race state, and lets `vehicle-grounding.js` apply the angle to the rendered truck. When a Bowl landing is more than a quarter turn from upright, call the existing `_startTumble` recovery. Keep the helper out of velocity and jump calculations so car launches, including launches off cars, retain their current motion. This is the smallest headless hook that covers simulation and visible attitude while keeping other courses on the old path.
