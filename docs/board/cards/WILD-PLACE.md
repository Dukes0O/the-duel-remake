# WILD-PLACE

Where animals stand beside each road: species tables, sighting spots, herds, the rare one, the seed.

Owner: Claude. Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet section 3. Files: `src/wildlife.js` (new), `tools/test-wildlife.mjs`.
Pure; reads reference laps and course samplers; never calls the race's own
generator. A new file of its own, so it can start now.
