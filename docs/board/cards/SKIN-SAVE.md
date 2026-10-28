# SKIN-SAVE

The skins, dirt and survey save fields.

Owner: Claude (SAVE). Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet section 10. Files: `src/heli/heli-save.js`, the `wildlife` and
`heli-skins` switch lines in `src/feature-flags.js` (count rises by two),
fixture `tools/fixtures/saves/13-heli-skins.json`,
`tools/test-heli-save.mjs`. Holds `save-shape`; the save checker runs.
