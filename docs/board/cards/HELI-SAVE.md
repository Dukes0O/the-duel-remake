# HELI-SAVE

The heli save field, fuel purchase with credits, repairs that never take a save below zero.

Owner: Claude (SAVE). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Section 9 of the packet. Files: `src/heli/heli-save.js`, one line in
`src/progression.js` `normalizeProfile`, fixture
`tools/fixtures/saves/10-heli.json`, `tools/test-heli-save.mjs`. Holds
`save-shape`; the save checker runs (saves rule).
