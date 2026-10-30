---
task: STORY-KOGANE-FINISH
status: done
player_facing: yes
---

# STORY-KOGANE-FINISH: the whole Kogane story played in the real game

Claude helper, 29 October 2026. Lane `claude/story-finish`. Packet: `docs/story/kogane-invitation.md` sections 2, 3, 6, 7, 14.
Switch: `kogane-invitation` (dev). Nothing here changes the game with the switch off.

## What was done

- New scenario `tools/scenarios/story-kogane.mjs` (run: `node tools/browser-harness.mjs scenario story-kogane`). Memory-only saves, private port,
  1280 by 720, no frame timing. It starts a fresh player who owns Kogane Pass and has the helicopter carry lesson done, then plays:
  the menu and its Story button with the red dot, the front door's Next up card, the Story card with Daichi's letter, Brian's Hairpin Lesson
  (Beat me, driven by the instructor's own faster recorded run), the helipad board and the story job, the delivery (hook, fly, set down at Kogane),
  the Night version found (pilot's map), Race Daichi on Easy won by the test driver, the results with the NEW CAR card, the menu with Ana's call and
  the garage with the Skyline and its plaque. 23 pictures.
- Facts it asserts: the story step after each part (invite, lesson, supplies, duel, ana, done), the lesson reward paid, 2,650 credits for the delivery,
  the Night version found, the tea house filled the tank, the race is the story's (Night road, Daichi's Skyline, one rival), the win, the Skyline owned
  exactly once, the NEW CAR card, Ana once, the plaque. All pass except one, which is a real fault (F2 below): the scenario fails on purpose until it is fixed.
- Two parts are not done through the real buttons, and the scenario says so in its report: START cannot be used (F1, F2), so the race starts with the
  app's own calls `startStoryDuel()` and `startCampaign(getRaceChoices())`, as `tools/test-story-hooks.mjs` does. The flight and the lesson run use test
  pilots and the instructor's recorded run, stepped on the game's own clock.

## Faults found (by frame; frame numbers are the picture file names)

Blocking:

- F1 (15). "Race Daichi" fills the app's setup but the menu screen is not refreshed. The circuit box still reads Pacific Canyon Circuit, and START uses
  the menu's own copy of the setup, so a player who presses START races Pacific Canyon, with no story mark. (First run of the scenario: START started
  `pacific-canyon`.) Cause: `startStoryDuel()` emits `raceSettingsChanged` and nothing listens; the router's `refreshRaceSetup` is not called.
  Fix is in `src/screen-menu.js` or `src/screen-router.js`, outside this card's allowed files.
- F2 (15b). Choosing Kogane Pass Night in the circuit box by hand turns the challenge into Grand Prix ("RACE", "THE FIELD"). That mode change clears
  the story mark, so even a player who does the setup by hand cannot start the Night Duel. Together with F1, the Night Duel cannot be started with the buttons today.
- F3 (08). The story job on the helipad board is laid out badly: its title is squeezed into a narrow column ("Supplies / for the / Summit") and the hint
  text "Race tyres and tea-house supplies: hook the crate by the pad" is drawn on top of the Take job button. It is also the last row of a long scrolling
  panel, below three car jobs, with nothing to say it is there. `src/heli/heli-board.js` and its stylesheet, outside this card's files.
- F4 (11, 12). At Kogane Pass the helicopter world is almost black: black ground, a pink strip of sky, the helicopter lit. The tea house and the landing
  circle cannot be seen. The delivery note said the dusk light was "not checked in a browser"; now it is checked and it is too dark. (Software rendering
  here; other helicopter places in the same run were bright, so this is the course's light, not the renderer.)

Other:

- F5 (18). The Night road near the Tea House hairpin is almost black. Road lines and the headlight cone show, the roadsides do not. Frame 17 (early hairpins) is readable.
- F6 (16). The countdown shows a plain beige sky with no road while the Night scene loads (it took over 90 s with software rendering). May be only this machine; worth a look on the real one.
- F7 (03). The lesson board lists places with long dashes ("Kogane Pass, Cedar Bend..." and every other row use a long dash between the place and its corners).
  It is the lesson board's own text (`src/lessons`), not the story's. Not changed.
- F8 (01). At 1280 by 720 the menu's bottom row (Instructor, Helipad, Story) is cut by the bottom edge, so the Story button is half visible and the page needs scrolling.
- F9 (01b). The front door's Next up card shows "A Lab lesson is open" ahead of the story, so a player with an unread letter sees no letter, no red dot and no
  Story door there. The Story button is only inside Race options. (The story entry is ranked after an open Lab lesson by design; whether that is right is Claude's call.)
- F10 (19, 20). "1 laps are in the books" on the results and "4.7 KM · 1 LAPS" on the menu (old wording, not the story's).
- F11 (09). Once the job is taken, the board row no longer says where to go. Roger's caption and the map flag do.
- F12 (06). The lesson result card scrolls inside itself and the Leave lesson button is below the fold.
- Captions (04, 05, 10, 12, 13, 20, 21). The caption bar sat on top of things: the corner list on the lesson card, the next-corner panel in the lesson run,
  the flight instruments, the Story button and the plaque. Smaller and lower now (see Fixed); in 20 it still crosses the bottom of the menu and in 21 the bottom of the plaque.

Good: the letter and the four parts read clearly, the dot goes when the letter is read, Brian's intro and pass lines show, the lesson reward is paid once,
the delivery pays 2,650 and says "The tea house fills the tank: 289.8 kg" and "Found from the air: Kogane Pass Night", Daichi's thanks shows, the new car card and
Daichi's win line show, Ana's two lines show once, the Skyline is in the garage with its plaque.

## Fixed (small, inside `src/story/`)

- `src/story/story-ui.css`: the Night Duel step on the Story card (14). Its "Race Daichi" button used the menu's big orange start button, which filled the whole
  row and squeezed the words into a thin column; it is now a normal sized button beside the words. Bigger text on the card: the letter 15 px (was 12 and 11),
  step names 15, step lines 12.5, the prize line, the lead line, the garage panel and the plaque 12 to 12.5, Daichi's line on the results 14 px (was about 10).
- `src/story/story-caption-view.js`: the caption bar is smaller (16 px, narrower) and sits lower (2 percent from the bottom, was 9 percent), so it covers less.

## Tests

- `node tools/browser-harness.mjs scenario story-kogane`: every fact passes except F2's (kept failing on purpose, so the fix cannot be forgotten).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 30 suites passed, 0 failed. `npm run build`: built.

## Changed assertions

None.

## Removed

Nothing. The raw pictures of the runs were deleted at the end (`.evidence/`); one contact sheet of the pictures went to Claude's scratchpad.
