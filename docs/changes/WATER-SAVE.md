# WATER-SAVE: the Water Road's save

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-SAVE.md`, part of
The Water Road (`docs/story/wasteland-water-road.md` section 9).

## What changed

- `src/story/water-save.js` (new): registers the `water` story with the story
  registry. `profile.story.water = {read, jobs, notes, end}`, optional, made by the
  first write, marks only rise, unknown names kept, a newer version kept and
  never written (the shared rules of `story-save.js`).
  - `WATER_CHAPTERS`: chapter 0 the dry well, then chapter n is the n-th warlord
    on the ladder, each with its job (Mad Max Duel on Sal's roads, Fuel Run,
    Bounty Hunt, Ambush Alley, Last Car Rolling, Mad Max Duel on Alpine Serpent,
    Convoy Raid on the Salt Flats) and the rank or switch it needs; the Baron's
    chapter is his fight alone.
  - A chapter is done when its warlord is beaten in `profile.wasteland` (read,
    never copied); chapter 0 when Hollis's note is read. A job is done when won
    as the story's job or when its warlord is already beaten, so earlier progress
    counts. A chapter opens when the one before is done.
  - Writers: `readWaterNote`, `markWaterJob` (only for the open chapter, never
    twice, in order won), `markWaterNotes` (V.'s notes shown, rises to 7),
    `markWaterEnd` (after the Baron).
  - Not imported by the game yet: WATER-HOOKS and WATER-SCREENS use it behind the
    `water-road` switch.
- `tools/fixtures/saves/24-story-water.json`: a player part way along (Sal and the
  Dustmonger beaten, Sal's job won, one note), a Kogane-only player and an older
  player.
- `tools/test-water-save.mjs` (new, 60 checks).

## Checks

- `node tools/test-water-save.mjs`: 60 checks pass.

## Changed assertions

None.

## Removed

Nothing.
