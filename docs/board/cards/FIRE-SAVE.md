# FIRE-SAVE

The H2 save fields, course closures and buyback, bucket repair.

Owner: Claude (SAVE). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 8 and 12. First commit: `normalizeHeli` keeps keys it does
not know. Then the new `profile.heli` fields (missions, fire, burnt, scars,
bucket) and their helpers, `src/course-closures.js` (closed days, buyback
price, regrowth stage, `courseClosed`), the `forestFire` switch line in
`src/feature-flags.js` (count in `tools/test-feature-flags.mjs` rises by
one), fixture `tools/fixtures/saves/11-heli-fire.json`,
`tools/test-course-closures.mjs` and `tools/test-heli-save.mjs`. Holds
`save-shape`; the save checker runs. Waits for HELI-FINISH so it never edits
`heli-save.js` while the H1 finishing pass does.
