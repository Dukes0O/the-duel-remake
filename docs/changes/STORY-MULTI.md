---
task: STORY-MULTI
status: ready-for-review
player_facing: no
---

# STORY-MULTI: the story code can now hold more than one story

Card row: `docs/story/wasteland-water-road.md` sections 8 and 11. Lock: `save-shape`. Branch `claude/story-multi`. Not merged.
Kogane plays and saves exactly as before. A second story can now be added with data only; no Water Road story is added here.

## What changed

- `src/story/story-save.js`: a story registry. `registerStory({key, steps, normalize, stepOf, writers})` adds a story to
  `profile.story.<key>`. `writeStory(profile, key, writerName, ...args)` is the one write every story uses, with the rules Kogane
  already had: the field is made by the first write, marks only rise (each writer's own rule), a refused write returns the same profile
  and a reason, unknown names and unknown stories are kept, a newer version is kept exactly and never written. `storyStepOf`,
  `registeredStories`, `unregisterStory` (for tests) come with it. Kogane registers itself at the foot of the file; its old exports
  (`koganeStep`, `readKoganeLetter`, `markKoganeLesson`, `markKoganeSupplies`, `markKoganeDuel`, `markKoganeAna`, `normalizeStory`,
  `storyOf`, `storyIsNewer`, `grantKoganeSkyline`) keep their names and results. `normalizeStory` keeps unknown keys, so a future
  `story.water` survives older builds.
- `src/story/story-lines.js`: `registerStoryLines(key, {captions, letter, sequences})` adds a story's lines (ids must start
  `story.<key>.`). `captionText` now looks across every registered story. `storyLetter(key)`, `storySequence(key, name)` and
  `unregisterStoryLines` are new. Kogane's table, ids and words stay in the file and are registered at the foot.
- `src/story/story-radio.js`: no longer imports Kogane's sequence. New `saySequence(key, name)`; `sayAna()` is kept for the game.
- `src/story/story-ui.js`: `registerStoryCard({key, switch, eyebrow, heading, letter, letterLabel, stepsLabel, steps, footer})`.
  Kogane's card words moved into a Kogane card entry; the card, the step list and the views are drawn from the entry. `storyView(props,
  key)` and the card markup carry the story's key. `createStoryUi` shows one Story card per story the player can see, and a short
  chooser (`storyChooserMarkup`) when there is more than one; `open(key)` goes straight to one card. With only Kogane the card, the
  button and the clicks are the same as before. A step that starts a race names the app method in its card entry (Kogane's duel names
  `startStoryDuel`).
- `src/story/story-ui.css`: two rules for the chooser.
- `tools/test-story-registry.mjs` (new, 73 checks, memory only): registers a throwaway story with data only, then checks its save
  writes, caption lookup, radio, card and the chooser, and that Kogane reads exactly the same before, during and after.
  It is found by the test runner automatically.

## For the next cards

- A story needs three data entries: `registerStory` (save), `registerStoryLines` (words) and `registerStoryCard` (card). A module
  holding them must be imported once by the game. `app.storyProps(key)` must return that story's props; today's Kogane version
  ignores the key, so the card that adds a second story gives `storyProps` the key check.
- An action for a story's button is found as `actions['<story>.<step>']`, else `actions['<step>']`.

## Tests run

- Each story suite, by hand and in the lane tier: `test-story-save` 68, `test-story-lines` 100, `test-story-ui` 242, `test-story-hooks` 144,
  `test-story-kogane-duel` 103, `test-heli-story` 157, `test-deep-story` pass; `test-story-registry` 73.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 57 passed, 0 failed.
- `npm run build`: passed.
- Browser scenario `node tools/browser-harness.mjs scenario story-kogane` on a private port (not 5174): passed, 22 screenshots,
  0 warnings, 0 errors. The pictures were deleted after the run.

## Changed assertions

None. No existing test was edited.

## Removed

The Kogane-only wiring the registry replaces, in the same change: the fixed Kogane step table in `story-save.js` (the one-story
`empty`, `normalizeStory`, `write` and `raise`), the direct import of Kogane's Ana sequence in `story-radio.js`, and the single
fixed step names, notes and button tables (`STEP_ORDER`, `STEP_NAMES`, `OPEN_NOTES`, `LOCKED_NOTES`, `OPEN_BUTTONS`, `ROAD_STEPS`)
and the fixed card heading in `story-ui.js`. Nothing is left over for a later card.

## Still to do

- The independent save review that rule 17 asks for (the save field's shape is unchanged, but the write path moved).

## Director's fix before review

Claude, 1 November: `writeStory` now adds only the story it writes. Before, a
write to one story also stored an empty entry for every other registered story,
which would break the Water Road's "created on first write" rule. The new
registry test checks both ways; its own first-write check now expects Kogane to
stay absent (a check of this card, not an existing one). Story suites rerun:
save, lines, ui, hooks, kogane-duel, heli-story, deep-story and registry (75) pass.
