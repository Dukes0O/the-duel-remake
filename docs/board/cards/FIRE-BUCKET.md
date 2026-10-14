# FIRE-BUCKET

The bucket on the cable: fitting, scooping, pouring, falling water, the aim ring, damage.

Owner: Claude (SIM). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 5 and 6. Files: `src/heli/heli-bucket.js`, a water query in
`src/heli/heli-ground.js`, the load mass read in `src/heli/heli-cable.js`
if needed, `tools/test-heli-bucket.mjs`. Hands wet patches to
`heli-fire.js` through `applyWater`; neither imports the other. No lock.
