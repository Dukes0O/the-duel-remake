# FIRE-MISSIONS

The mission engine: the secret refuel count, the radio call mid-flight, the quiet spell between emergencies.

Owner: Claude (SIM). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet section 3. Files: `src/heli/heli-missions.js`,
`tools/test-heli-missions.mjs`. Pure and repeatable; draws from
`src/rng.js`. No lock.
