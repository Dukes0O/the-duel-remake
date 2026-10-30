---
task: STORY-KOGANE-FIX-UI
status: done
player_facing: yes
---

# STORY-KOGANE-FIX-UI: the Kogane story faults that sit in the menu, the board and the lesson card

Claude helper, 29 October 2026. Lane `claude/story-fix-ui`. Fault list: `docs/changes/STORY-KOGANE-FINISH.md` (F1 to F12 and the caption notes).
Switch: `kogane-invitation` (dev). The F2 change touches one course (Kogane Pass Night, also dev); the other changes are small wording and layout
fixes that apply with the switch off too (F7, F8, F10, F12).

## Fault by fault

- F1 (blocker). "Race Daichi" now shows on the menu. `src/story/story-ui.js` tells the menu (`onRaceSetup`) once the app has filled the setup;
  `src/screen-menu.js` marks that road as already seen (so the menu does not treat it as the player changing road) and calls the router's
  `refreshRaceSetup` (`src/screen-router.js`, passed in as `onRaceSetup`). The menu then shows Kogane Pass Night, Rival Duel and the chosen level,
  and the story mark survives because the refresh sends the same values. Test: the scenario asserts the circuit box, the pressed mode and level
  buttons after "Race Daichi", then starts the race with the real START button and asserts it is the story's race (Night road, Daichi's Skyline, one rival).
- F2 (blocker). The cause: Kogane Pass opens on Grand Prix (`defaultMode: 'grandprix'`) and the Night version copied it, so choosing the Night
  road in the circuit box switched the challenge to Grand Prix and cleared the story mark. `src/circuits/kogane-pass-night.js` now opens on Rival Duel
  (Grand Prix is still offered on it, as on the parent). The five other released variants are unchanged: none of them has a Grand Prix default.
  The parent Kogane Pass still opens on Grand Prix. Test: the scenario picks Kogane Pass Night by hand from another circuit and asserts Rival Duel stays on.
- Scenario (`tools/scenarios/story-kogane.mjs`): the Night Duel is started with the real START button after Race Daichi; the deliberate F2 failure
  and the app-call workaround are gone.
- F3 and F11. `src/heli/heli-board.js`, `src/heli/heli-ui.css`: the story row's words ("Race tyres and tea-house supplies: hook the crate by the pad") were
  a second item stacked on the Take job button in the same grid cell, which also squeezed the title. They are now a line of their own under the title,
  full width. The story row is first in the list and the dispatch board leads the whole panel while the job is open, with a yellow edge, and once taken the line reads "Fly the crate to Daichi's tea house at Kogane Pass".
- F7. `src/lessons/drive-lesson-ui.js`: the long dashes between a place and its corners on the lesson board are now " : ", and the empty braking cell
  in the result table says "n/a" instead of a long dash. No long dash is left in `src/lessons`.
- F9. `src/menu-front-door.js`: a story message with the red dot (Daichi's unread letter, Ana's call) is ranked first on the front door; the rest of the
  story still comes after an open Lab lesson, and before a new course. (The brief named the unread letter; Ana's call has the same red dot, so it follows the same rule.)
- F10. "1 lap" instead of "1 laps" on the results, the menu (lap line and start note and intro line), the Grand Prix lap lines, the course list and the lap choice line.
- F8. `src/style.css`: on a screen 740 pixels high or less the menu's title, rows and START button are tighter, so Instructor, Helipad and Story show without scrolling
  at 1280 by 720 (measured: the Story button bottom was at 738, now 663; the start note and the top of the footer are in view too).
- F12. `src/lessons/drive-lesson-ui.css`: on a 740 pixel screen the lesson result card has closer rows, and Leave lesson stays at the bottom of the card as you scroll.
- Captions. `src/story/story-caption-view.js`: the caption sits at the top of the screen, a little left of centre, 15 px, at most 560 px wide. The top strip between
  the logo and the sound buttons is empty on the menu, garage, lessons, flights and races, so it covers no Story button, plaque, corner list or flight instrument.

- Found by the scenario (not in the fault list): the Skyline had no vehicle socket entry, so its first appearance threw "Unknown vehicle socket layout" in the browser (the harness fails a scenario on any browser error). `src/vehicle-sockets.js` now has its entry, present only with the `nissan-skyline` switch on, as in `src/config.js`. `tools/test-vehicle-sockets.mjs` (keys equal the car list) still passes unchanged.

## Not done

- F4, F5, F6 (the dark Kogane scenes and the slow Night load) are the course's light, not this card's.

## Tests

- `node tools/browser-harness.mjs scenario story-kogane`: passes (28 facts, 22 pictures, 0 browser errors). It now uses the real START button for the Night Duel, checks that picking Kogane Pass Night keeps Rival Duel, that the menu shows the Night road, Rival Duel and the level after Race Daichi, that the story job leads the board and still says where to go once taken.
- `node tools/test-story-ui.mjs`: 2 assertions added (an unread letter and Ana's call come before an open Lab lesson).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 141 of 143 suites passed. The two others, both explained and passing on their own: `test-drive-lesson-run.mjs` read a comment I had put before a rule in the lesson stylesheet as a selector (fixed by moving the comment out; 21 of 21 now pass), and `test-drive-through.mjs` fails only when started from Git Bash (its tar call), and passes 7 of 7 from PowerShell. A first lane run also stopped on `test-board.mjs` because the scenario run beside it cleared the shared scratch folder; it passes alone (217 checks).
- `npm run build`: built.

## Changed assertions

None changed. Two assertions added to `tools/test-story-ui.mjs`. In the scenario, the facts that said "FAULT" were replaced by facts that now pass (the menu shows the Night road,
Rival Duel and Easy after Race Daichi; picking the Night road keeps Rival Duel; START starts the story's race).

## Removed

- The scenario's deliberate F2 failure and its app-call workaround (`startStoryDuel` plus `startCampaign`).
- The old bottom-of-screen placement of the story caption.

## Claude's review (28 October 2026, night)

Claude reviewed: F1 Race Daichi refreshes the menu; F2 Night opens on Rival Duel (Grand Prix still offered; other variants unchanged); F3/F11 story row full width, first, says where to go; F7 no long dashes in lessons; F10 '1 lap'; F9 unread letter ranks first; F8/F12 fixed for short screens; captions moved to the top strip; Skyline socket entry behind its switch fixes a browser error. Scenario story-kogane passes 28 facts with the real START. No assertion changed.
