# MULE-LINES

## Changed

- Added `src/story/iron-lines.js` with all 78 captions and both unspoken note/letter records from `docs/story/iron-mule.md` section 3.
- Added `tools/test-iron-lines.mjs`, which reads that design table and checks every id, speaker, location, exact text and 260-character limit.
- No design wording changed.

## Checks

- `node tools/test-iron-lines.mjs` — passed, 80 entries.
- `npm.cmd run build` — passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Lane tier — Claude runs it.
- Browser and look checks — Claude should check that captions appear with the radio click, the Hollis note and Vane letter remain unspoken, and no caption changes race or save state.
- Race fingerprints — not applicable; this card only adds story text and registration.
- Changed assertions — none.

## Removed

- Nothing; this card adds the Iron Mule line table and its focused test.
