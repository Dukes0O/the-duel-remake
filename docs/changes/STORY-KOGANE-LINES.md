---
task: STORY-KOGANE-LINES
status: ready-for-review
player_facing: no
---

# STORY-KOGANE-LINES: the story's words and its radio

The ten captions and the letter of the Kogane Invitation
(`docs/story/kogane-invitation.md` section 6), word for word, and the small
radio that plays them. Nothing is wired into the game yet: the hooks card does
that. No new sound and no new dependency.

## What changed

- `src/story/story-lines.js`: the ten captions and the letter (ids
  `story.kogane.*`), each with who speaks and where it plays; Ana's two lines as
  one ordered pair; the reuse table of section 6.2 (recorded lines the story
  uses, with the "only if the reward is new" rule for the lesson pass); the
  reading-time rule (2.5 s plus 0.045 s a character, at most 10 s).
- `src/story/story-radio.js`: `createStoryRadio` keys the radio on (the click and
  hiss from `createRadioChain`), shows the words, keys the radio off after a
  short transmission (1.2 s at most) and hides the words at the end of the
  reading time. Leave, pause, stop and mute all key the radio off at once and
  clear what is waiting. Muted, the words still show and the radio stays off.
  The letter is never spoken. The game gives it the chain, the show and hide
  functions and the mute check.
- `src/story/story-lines.js` also holds one constant for the dusk wording
  (`DELIVERY_TIME_WORDS`, "at dusk"; the other choice, "in the evening", sits
  beside it). None of the ten captions or the letter uses the word, so only the
  delivery card needs it; it flips this one value if the helicopter scene has no
  dusk light.
- `tools/test-story-lines.mjs`: 100 checks (see below). The test runner finds it
  by name, so nothing is registered.

## Tests

- `node tools/test-story-lines.mjs`: 100 checks pass. Ids unique, no em or en
  dash, no digits, no caption over 260 characters, every caption and the letter
  matches the packet's table word for word, every reused id exists in the
  recorded driving and helicopter lines, the radio keys on then shows then keys
  off then hides in order, and always keys off on leave, pause, stop, mute and
  dispose.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 2`): 25 suites passed, 0 failed, including the new one. `npm run build`: built. No assertion was changed.

## Left for later cards

- HOOKS calls the captions at the right moments and feeds the radio its chain.
- SCREENS shows the letter on the Story card.
- The delivery card chooses the dusk wording.
- If Kyle gives voice credits (section 6.3), a caption gets a recorded file and
  loses its `captionOnly` marker; no other code changes.

## Removed

Nothing removed; nothing was replaced.

## Claude's review (28 October 2026, night)

Claude reviewed: captions word for word, radio always keys off, no race state touched.
