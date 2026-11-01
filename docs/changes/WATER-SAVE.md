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
- `tools/test-water-save.mjs` (new, 65 checks).

## Checks

- `node tools/test-water-save.mjs`: 65 checks pass.

## Save review (rule 17)

One independent save review. Two real faults, both fixed and confirmed: a newer
game's story with no Water Road entry made the chapter reads throw instead of
refusing (`waterOf` now reads it as empty, and the writers give the newer-version
refusal first); loading capped a saved note count at 7, which would lower a count a
later build saved (a higher count is now kept). Also checked: no writer lowers a
mark, loading with the module imported adds no Water Road to any player, unknown
names and job ids are kept, the defeat check matches `warlords.js`, and no odd
career shape throws. To do in WATER-HOOKS: `app.js` imports `water-save.js` so
every load in the game cleans `story.water` the same way.

## Changed assertions

- `tools/test-save-fixtures.mjs`: the fixture roster count goes from 24 to 25 for`n  the new `24-story-water.json` (the count is there so every new save shape is
  reviewed; this one is, above). Nothing loosened: the new fixture adds its own
  first-load checks. Claude's review: approved, a pinned count moved by a deliberate
  new fixture.

## Removed

Nothing.
