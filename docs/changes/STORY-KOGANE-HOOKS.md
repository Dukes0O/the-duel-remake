# STORY-KOGANE-HOOKS: the Kogane Invitation wired into the game

Card row: `docs/story/kogane-invitation.md` section 12. Lock: `busy-game-files`. Branch `claude/story-hooks`. Not merged.
Switch: `kogane-invitation` (dev). With it off, nothing below changes anything.

## What changed

- `src/app.js` (the only game file touched; `src/game.js` needed no change, because `startCampaign` there ignores options it does not know).
  - `storyProps()`: the plain object of section 12.1 (`available`, `step`, `read`, `steps`, `fireClosed`, `skylineOwned`, `lead`).
    It is `available` only with the switch and its partners on (Kogane Pass, the Skyline, the helicopter, the pilot's map, driving lessons),
    when the player owns Kogane Pass, and when `koganeStep` is not null. A story from a newer game gives no story anywhere.
    The supplies part carries a note while the helicopter's carry lesson is not done. `fireClosed` gives the play days left.
  - `openStory()`: opening the Story card reads the letter (only the red dot goes away).
  - `startStoryDuel()` ("Race Daichi"): fills the setup on `kogane-pass-night`, or on `kogane-pass` only while the Night road is not built,
    in Rival Duel, and holds a story mark. The player still presses START. It works from the duel part on (a replay stays possible).
  - `startCampaign`: a start that carries the mark (from the Story card, or a restart) gets `koganeDuelStart(level)` merged over its options,
    then `levelStart(duel)` right after the start. The mark is dropped by any start on another road or in another mode, by a story that is
    not open, and by a stray `story` option. The player's saved rival setup keeps the player's own rival: Daichi (with `nitroScale`) is never
    written to `raceSettings`.
  - `setRaceSettings`: changing the road, the mode or the rival (a different value, not a menu refresh with the same values) clears the mark.
    `returnToMenu`, `visitHeli` and any start also clear it.
  - `restart`: a restart of the story's race keeps the mark and starts level again (it used to restart with the plain saved rival
    settings, which dropped `story` and made the weaker Hard rival pickable).
  - `_settleResult`: the payload carries `story` for the story's own race, and the result card gets `story`, `storyDuel`, `storyCar` or
    `storyOwned`. A loss carries the mark so the results card can show Daichi's line.
  - Lesson: after `finishDriveLesson`, `_storyLessonPass` writes `markKoganeLesson` in the same profile change, only for lesson `corner` on the
    `kogane-pass` row and only while the switch is on. It is reached through an optional call so the older tests that run `_driveLessonEvent`
    on a bare host are untouched.
  - Helicopter: `koganeStoryEnabled` is passed to the session. **A gap found and closed:** the session's `persist` and `leave` handed back
    only `heli`, `lab` and credits, so the delivery's story mark (written in the same change as the pay) was lost. Both now bring `story` back too.
  - Captions through `createStoryRadio`: Brian's intro note (words only, at the Kogane lesson's start), Brian's pass caption (after his recorded
    line when the reward is new, alone when it was taken), Roger's offer (words only, when the job is taken), Daichi's thanks (3.2 s after
    the crate is down, after Brian's recorded line), Daichi's grid line (when the race is set), and Ana's two lines the next time the main
    menu opens after the win (`storyMenuOpened`, called from `returnToMenu` and at start-up; her mark rises as she starts, so she calls once).
    Leaving for a race, a flight or a lesson stops them; muting keys the radio off.
  - Chimes: `interface.bonus` once when the lesson step is finished, once when the delivery is finished, once at the duel win (the new-car card;
    a win of an already finished step makes none), once for Ana.
- `src/story/story-caption-view.js` (new, small): the caption line on the page, browser only. Plain and unstyled beyond a fixed bar low on the
  screen; the look is for the FINISH card to judge.
- `tools/test-story-hooks.mjs` (new): 141 checks in the real App with memory-only storage.

## Review fixes (coordinator's review, 29 October)

- The lesson mark checks the full story availability (switch and partner switches, Kogane owned), not only the switch. Test: switch on with the Skyline off marks nothing.
-  works only on the main menu, so a letter is never read during a race. Test.
- Daichi's 3.2 s thanks is cancelled when the player leaves for a race, a flight or a lesson, when the flight ends, and when the game closes. Tests for all three.
- Brian's queued pass caption is dropped if the player leaves the lesson before his recorded line ends. Test.
- Selecting another player clears the pending story mark. Test.

## Tests

- `node tools/test-story-hooks.mjs`: 141 checks pass (about 25 s). They cover:
  - the chain from a fresh player: the letter, the real Kogane lesson (marks the story and pays the lesson reward once), the real helicopter
    flight (Roger's offer, the crate set down, 2,650 credits, the Night version found, the story mark saved into the app's profile, one chime,
    Daichi's thanks), "Race Daichi" (setup, Daichi's rival, level start, grid line), a restart that keeps the mark, a loss, quitting and
    abandoning that grant nothing, and Ana once;
  - changing the road, the mode or the rival clears the mark; a menu refresh with the same values does not; a start on another road or
    in another mode drops it; a player who has not finished the supplies cannot start it;
  - the lesson mark writes only for the Kogane row of lesson 1 and only with the switch on; a second pass and a newer story write nothing;
  - a newer game's story: no props, no card, no job, no caption, and the story kept exactly;
  - the switch off: no props, no field made, no job, the mark dropped, no caption, no chime; Kogane Pass not owned and a needed switch
    off give no story;
  - the chime is `interface.bonus` and silent when muted or without sound; the caption line shows and clears.
- **Not covered, and why:** the grant itself through the app. The Night road (`kogane-pass-night`, KOGANE-PASS-C7) is not built, so a
  win in the app today is on the day road, which never grants (the test checks exactly that). The test already asserts the grant, the one-chime
  rule and the once-only rule for when the Night road exists (it switches on by itself). The grant rule is proved in `tools/test-story-kogane-duel.mjs`.
  FINISH should run this test again once C7 lands.
- Lane tier and build: see the foot of this note.

## Changed assertions

None. `tools/test-drive-lesson-run.mjs` runs `_driveLessonEvent` on a bare host without story methods; the hook is an optional call so that test
passes unchanged.

## Removed

Nothing is replaced. The old restart behaviour (dropping `story` and the story rival) is fixed in place.

## Left for other cards

- Showing the caption line properly (look), and a look check of the whole chain in the browser: FINISH.
- Brian's intro note is shown as a caption line; the lesson card itself has no note slot (SCREENS and LESSON files).
- "Start the lesson" and "Go to the helipad" open the existing boards; picking the Kogane row there is not done.

Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going`): see the line below. `npm run build`: see below.

After the review fixes: lane tier 29 suites passed, 0 failed (--jobs 2); test-story-hooks 141 checks; npm run build built.
