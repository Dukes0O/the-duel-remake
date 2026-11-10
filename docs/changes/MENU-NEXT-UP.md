---
task: MENU-NEXT-UP
status: done
flag: menu-next-up
player_facing: yes
---

# MENU-NEXT-UP: the old menu says what to do next

Claude, 9 November 2026. Card `docs/board/cards/MENU-NEXT-UP.md`, from the audit of 9 November (item O1). The old menu that
Gratian asked to keep has no line that says what to do next. This adds one, and a small NEW tag on buttons the menu already has.
The front door stays off (`menu-front-door` stays `dev`) and nothing on the old menu moves.

## What changed

- **One line under the masthead.** "NEXT UP" and one sentence, as one button that takes the player there. It uses
  `chooseNextUp` and `nextUpMarkup` from `src/menu-front-door.js` (read, not changed) with the facts that `src/screen-router.js`
  already builds for the front door. When Next up has only its plain "pick a course" sentence to offer, the line is hidden.
  Each answer presses a button that already exists: Courses, the Lab, the Wasteland, the Helipad, the driving lessons and the
  Story card.
- **The line has its own place.** It is laid over the page at the top left, under the masthead, and takes no row of the menu's
  grid. In the markup it comes after the INSTRUCTOR button on purpose: the driving lessons screen finds its button with
  "the first element marked `data-drive-open`", and a line placed earlier would have taken the INSTRUCTOR button's place
  (the new test pins the order).
- **NEW tags.** A small tag floats over the corner of an existing button, so no button changes size or place. They are worked out
  from the profile each time the menu is drawn (`menuNewMarks` in `src/screen-menu.js`); no saved field is added.
  - Lab: an open Lab lesson not yet passed. The old menu has no Lab button (the Lab is reached through the Helipad), so the tag
    sits on HELIPAD, and shows only while HELIPAD shows.
  - Story: a story step is waiting (on the STORY button).
  - Garage: a car earned with medals, or by fully upgrading every other car, that is not in the garage yet (on the GARAGE button
    at the top). Medal cars count only with the earned-cars switch on, as in the garage.
  - Courses: a course the player bought that has no finished race and no saved best. The free starter course never counts, and
    leaving a race early is not a finish.
- **The line and tags are redrawn** when the menu is drawn, when a screen closes, when the Story card changes and when the Lab
  closes, and only when their words changed, so a focused button keeps its focus.
- **Switch.** `menu-next-up` in `src/feature-flags.js`, `on` since 10 November 2026 (rule 18, no Preview
  step). With the front door on, the front door's own line is used and this adds nothing.
- **Sound.** No new game event, so no new cue. The line presses the same button as the one it points at, so the sound that
  button already makes is the only sound.

## Checks

- New test `tools/test-menu-next-up.mjs`, 14 of 14. It covers: the switch is on in the game; with it off the markup is unchanged; with it on
  the markup minus the new line is byte for byte the old menu, and the list of `data-action` values is the same, in the same
  order, apart from the line; the line sits after the INSTRUCTOR and HELIPAD buttons; the line is hidden when Next up has nothing to
  say; each kind of Next up points at the existing button; the front door gets nothing added; each NEW tag appears for a profile that
  has the open thing and goes when it is done (Lab, Story, earned car, course); a frozen profile from before this change is read
  without being written to, and a bare profile is read without error; the tags are put on and taken off once; the styles touch no
  rule of the menu's own grid or panels.
- `node --test tools/test-menu-front-door.mjs`: 15 of 15, unchanged.
- One pinned number changed, with its reason: `tools/test-feature-flags.mjs` pins the number of switches (52 plus the course
  switches); the new switch makes it 53. This is a re-recorded count, not a loosened check. The file is outside the card's list
  and was edited for this one number only. Its other checks passed unchanged ("129 state, QA, persistence and override checks
  passed"). `tools/test-course-kit.mjs` failed before this edit because it runs that same file on a copy; it passes after.
- Preview launcher: `start-preview.bat` is unchanged in the end. The builder added the switch to its list while the switch was `dev`; Claude took it out again when the switch went on. `tools/test-preview-launcher.mjs` passes (23 checks, 0 failures).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, from PowerShell): 62 passed, 0 failed, 0 not run (365 s), on the final code. The first run of the tier failed two suites (the switch count in the feature-flags test, and the Preview launcher test); both are fixed by the one-line edits listed above, outside the card's file list.
- `npm run build`: passes.

## Claude's review and look (10 November 2026)

A Sonnet helper built this from the card. Claude read the whole change and looked at the menu in a visible browser.

- **Review:** no fault found. The tag's rule makes its button `position: relative`; the four tagged buttons were checked in the
  browser and none is placed in a way that this would move.
- **Seen at 1920 by 1000:** the line reads "NEXT UP  A Lab lesson is open: Lift and weight. Go and try it." between the masthead
  and the small line above the title, and touches neither. The NEW tag sits on the corner of HELIPAD. Pressing the line opens
  the Lab.
- **Seen at 1440 by 900:** the line sits in the same place. The big title lies over the PLAYER and CIRCUIT boxes at this size,
  and its lower edge reaches the PLAYER row at 1920 by 1000. The menu did this before this card, with or without the line; it
  is not changed here.
- **Switched on:** `menu-next-up` is `on` (card: on at release, no Preview step), so it left the Preview list in
  `start-preview.bat`. The first check in `tools/test-menu-next-up.mjs` now expects `on` where the builder wrote `dev`: the
  state changed on purpose and nothing is loosened (rule 18).
- **Checks with the switch on:** lane tier 60 passed, 0 failed, 0 not run; `npm run build` passes; browser checks
  drive-lessons-view-2, earned-cars, heli-first-flight, lessons-v2-view, menu-front-door, story-kogane, hidden-road and
  lab-classroom-braking pass, 8 of 8.

## Not checked

- No browser scenario presses the line; Claude pressed it by hand once (the Lab answer).
- The line sits at the end of the page's markup, so a keyboard player reaches it after the garage controls, not before.
- The Helipad tag for the Lab only shows where the helicopter is available. A player without the helicopter sees the Lab only
  through the Next up line, until LAB-OPEN-DOOR adds a LAB button.

## Removed

Nothing. The front door's own files stay until Kyle decides about the front door.
