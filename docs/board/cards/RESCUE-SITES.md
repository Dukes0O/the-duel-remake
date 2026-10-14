# RESCUE-SITES

Where rescues happen: hiker and clearing, the avalanche slide and beacon, the hoist spot, the lodge yard.

Owner: Claude (SIM). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet section 5. Files: `src/heli/heli-search.js` (new),
`tools/test-heli-search.mjs`. Pure; reads courses through `heli-ground.js`
and H1's clear circle test. A new file of its own, so it can start now.
