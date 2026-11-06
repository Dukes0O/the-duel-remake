# SHIPS-LINES

## Changed

Added 88 Ships in the Sand captions and two unspoken story letters to
`src/story/ember-lines.js`. The existing Everburn exports and registration
remain intact. Captions use the existing radio click and add no voice file or
sound cue. `{aground}` remains literal text for later filling.

## Tests and checks

- `node tools/test-ships-lines.mjs` — passed; all 90 design IDs and exact text match.
- `npm.cmd run build` — passed; Vite reported its existing large-chunk warning.
- Lane tier — Claude runs it.
- Browser and look checks — Claude runs them. Please check the story radio
captions, Hollis's unspoken note, and Mrs Vane's unspoken letter in the Ships
story UI.
- Changed assertions: none.
- Race fingerprints and world signatures: unchanged; this is story text only.

## Removed

Nothing removed or replaced. The existing Everburn line table was preserved.
