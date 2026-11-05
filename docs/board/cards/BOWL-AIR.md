# BOWL-AIR

The short board entry controls current state, ownership, dependencies and locks.

Design section 7. In the air, W and S pitch the truck, only when `course.def.bowl`. `src/bowl/bowl-air.js` with one call from where airborne attitude is stepped. No other course, replay or the launch off cars changes. Landing on wheels counts a flip; on the roof, the existing tumble and recover.

**Settle in writing first:** where the one call goes, so no other course's fingerprint moves.

**Checks:** new `tools/test-bowl-air.mjs`: pitch only with `def.bowl`; a full backflip from a big jump lands and counts; a roof landing recovers; the launch off cars gives the same velocity with and without this code; replay guards unchanged.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/BOWL-AIR.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.
