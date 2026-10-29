# STORY-KOGANE-SAVE: the story's save

Card row: `docs/story/kogane-invitation.md` section 12. Lock: `save-shape`. Branch `claude/story-save`. Not merged.

## What changed

- `src/story/story-save.js` (new). Holds `normalizeStory`, `storyOf`, `koganeStep`, `storyIsNewer`, the five writers
  (`readKoganeLetter`, `markKoganeLesson`, `markKoganeSupplies`, `markKoganeDuel`, `markKoganeAna`) and
  `grantKoganeSkyline`. Every writer returns `{ok, changed, profile, reason}` and never changes the profile it is given.
  - The field is optional. Reading never makes it. The first write (opening the letter) makes `profile.story = {version: 1, kogane: {...}}`.
  - Order: supplies need the lesson, the duel needs supplies, Ana needs a duel win. A refused write returns `ok: false` and the same profile.
  - Marks only rise. The duel level moves easy to medium to hard. Replaying a finished step returns `ok: true, changed: false`.
  - A `story.version` above 1 is kept exactly as saved. `koganeStep` returns `null` for it (no step is shown) and every writer refuses.
  - Unknown names inside `story` and `kogane` are kept. A known flag that is not `true` reads as false; a duel level that is not
    easy, medium or hard is dropped. A damaged story (wrong shape or version) reads as an empty one.
  - `grantKoganeSkyline` adds `nissan_skyline_gtr_r34` to `unlockedCars` and is a no-op when already owned (it also returns `owned`
    so the result screen can say which). It refuses when the car is not in the build (switch `nissan-skyline` off). It keeps no copy in `story`.
  - The writers set flags only. Credits, the helicopter record and the lesson reward stay with their own writers.
- `src/progression.js`: one import and one line in `normalizeProfile`, read only when `story` is already saved.
- `tools/test-story-save.mjs` (new): 66 checks, memory storage only.
- `tools/fixtures/saves/23-story-kogane.json` (new): a player part way through (lesson and supplies done, an unknown name inside
  `kogane` and beside it, the Night version found, no Skyline) and an older player with no story.
- `tools/test-save-fixtures.mjs`: the roster count.

## Choices to know about

- The card's file list does not include `src/feature-flags.js` or `tools/test-feature-flags.mjs`, so the `kogane-invitation` switch is
  **not added here**. Adding it moves the flag count assertion in `test-feature-flags.mjs` (section 10 says it goes up by one); the
  first card that needs to read the switch (HOOKS or SCREENS) should add it, off (`dev`), with that count change.
- `markKoganeLesson` has no earlier step it waits for, as section 9 lists only three ordered pairs. The Story card is what keeps the
  lesson closed until the letter is read.
- A hand-edited skip is not repaired. For example `{supplies: true}` alone leaves `koganeStep` at `'invite'`; Ana's writer refuses it.
  The duel writer follows the literal rule (it needs `supplies`), so it would accept a level on that save.

## Tests

- `node tools/test-story-save.mjs`: 66 checks pass. They cover: old saves load unchanged and gain no `story` (load, save, round trip,
  reading); the first write makes the field; the input profile is never changed; order refused; marks only rise; replays change
  nothing; the finished and half-way players; the player who owned the Skyline first; the grant is a no-op when owned and refuses
  with the switch off; a newer version kept and never written; unknown names kept; damaged shapes read empty; the fixture.
- `node tools/test-save-fixtures.mjs`: 24 historical shapes and 1,067 checks pass.
- Lane tier and build: see the result lines at the foot of this note.

## Changed assertions

- `tools/test-save-fixtures.mjs`: `files.length` 23 to 24. Reason: the new fixture `23-story-kogane.json` joins the roster. Nothing
  is loosened; the fixture is checked by every existing round-trip check.

## Removed

Nothing. No old code, test or doc is replaced by this card.

## Still to do (not in this card)

- The independent save review that rule 17 asks for.
- The `kogane-invitation` switch (see above).

Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 2`): 200 passed, 0 failed. `npm run build`: passed.

## Claude's review (28 October 2026, night)

Independent save review: approve, no faults (old saves load unchanged, newer story kept, marks only rise, grant cannot duplicate). Rule 18: the fixture count 23 to 24 follows the added fixture; nothing loosened. For HOOKS: write the lesson mark only while kogane-invitation is on; add that switch as dev with its count change; handle koganeStep null.
