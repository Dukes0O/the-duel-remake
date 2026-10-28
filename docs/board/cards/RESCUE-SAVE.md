# RESCUE-SAVE

The H4 mission fields: rescue in hand, counts, rescue badge, car recovery.

Owner: Claude (SAVE). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet section 10. Files: `src/heli/heli-save.js`, the `rescue` switch line in
`src/feature-flags.js` (count in `tools/test-feature-flags.mjs` rises by one),
fixture `tools/fixtures/saves/12-heli-rescue.json`, `tools/test-heli-save.mjs`.
Holds `save-shape`; the save checker runs. The rescue in hand saves
`condition` (0, 1 or 2), not `bumps` (Kyle, 15 October). Waits for FIRE-SAVE, which last
edits `heli-save.js`.
Also waits for FIRE-MISSIONS, the engine H4 joins.
