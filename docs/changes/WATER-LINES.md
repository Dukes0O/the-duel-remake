# WATER-LINES: the Water Road's words

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-LINES.md`, part of
The Water Road (`docs/story/wasteland-water-road.md` section 5).

## What changed

- `src/story/water-lines.js` (new): every line of section 5, registered with the
  story lines (`registerStoryLines('water', ...)`). Hollis's first note is the
  Story card's letter; V.'s seven notes are `WATER_NOTES`, read on the card and
  never spoken; the ten spoken lines are captions with the radio click (no voice
  file, no new sound cue). `waterJobCaption(warlordId)` names the line that plays
  as a chapter's story job starts, and `end` is Hollis's two lines in order.
- Polished from the draft, facts kept: Odessa's line no longer says "quiet" ("Hold
  them off for five waves"); V.'s Tollkeeper note names the three red valves; V.'s
  Mirage note says the thief carries the glowing mark. The job lines take the ids
  `story.water.job.<warlord>` instead of `story.water.hollis.<n>`, so the hooks
  find them by warlord. Not imported by the game yet: WATER-SCREENS and
  WATER-HOOKS use them, behind the `water-road` switch.
- `tools/test-water-lines.mjs` (new, 33 checks): all eighteen lines, ids, no dash
  of either kind, none over 260 characters, none of Kyle's banned words, a job line
  for chapters 1 to 7, the shared lookup finds captions but never a note, Kogane
  still reads, and the radio plays the end lines in order and refuses a note.

## Checks

- `node tools/test-water-lines.mjs`: 33 checks pass.
- Lane tier: 25 passed, 0 failed, 0 not run. `npm run build` passes.
- No review: these are the story's words, written and decided by Claude (rule 17).

## Changed assertions

None.

## Removed

Nothing.
