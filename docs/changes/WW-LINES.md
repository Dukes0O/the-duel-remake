# WW-LINES

Added the Everburn story words in `src/story/ember-lines.js`: all 34 captions
from section 5 of `docs/WASTELAND_WORLD.md` and Hollis's opening note. Captions
are registered for the radio click. The note is marked unspoken. No voice file,
sound cue, game behavior or save data changed.

## Checks

- `node tools/test-ember-lines.mjs`: passed, 34 captions and note.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and
  large-chunk warnings.
- Browser and look checks: Claude runs. Please check the Everburn captions on
  screen, the radio click timing, and that Hollis's opening note is read from
  the Story Wall without being spoken.
- Lane tier: not run; Claude runs it.
- Race fingerprints: none; this words-only change does not affect a race.
- Changed assertions: none.

## Removed

Nothing. This card adds the first Everburn line table.
