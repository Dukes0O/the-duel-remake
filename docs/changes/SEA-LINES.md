# SEA-LINES: every line of Act 5

**Changed.** New `src/story/sea-lines.js`: all 160 lines of `docs/story/the-sea-works.md` section 4, word for word and in order, in
the shape of `ember-lines.js`. They keep their `sea.*` ids and register as town captions (decision on the card). It also exports
`SEA_PLACEHOLDERS` (the six blanks the caller fills) and `SEA_LINE_CUES` (`town.bell` for `sea.day.14`). Nothing imports it yet,
so no player can reach it, and no save, pay or released behaviour changes (rule 23).

**Checks**, on base `158b4ee` plus this change. New `tools/test-sea-lines.mjs` passes: 160 lines, 130 job data references resolve, none
over 260 characters even with blanks filled, no em dashes. It fails when one word is changed. Rule 23's small set (`core`,
`test-replays`, `test-combat-replays`, `test-world-composition`, `test-sea-lines`): 5 passed, 0 failed. `npm run build`,
`test-board` and `test-repo-hygiene` passed. Not run in the cloud: the lane tier and browser checks, which the card leaves to Claude.

**Changed assertions.** None. Replay fingerprints unchanged.
**For Claude to look at.** The card's decision on `sea.*` ids as town captions, and the letters sharing the caption table.
**Removed.** Nothing. This card adds words only; SEA-JOBS-1 and SEA-LIFT will be the first to read them.
