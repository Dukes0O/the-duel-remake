---
task: LAB-OPEN-DOOR
status: built
flag: lab
player_facing: yes
---

# LAB-OPEN-DOOR: the Lab has a door on the main menu, and every lesson is open

Sonnet helper, 10 November 2026. Card `docs/board/cards/LAB-OPEN-DOOR.md`, from the audit of 9 November (item L3); Kyle said yes on 9 November.
A new player reached the Lab only through the garage or the helipad, and then found most lessons shut. Now the old menu has a LAB
button, and a player can start any lesson. The Lab's own switch (`lab`) is the one it already had and stays `on`; this adds no new switch.

## What changed

- **One LAB button on the old menu.** `src/screen-menu.js` puts a LAB button in the existing row of buttons, between INSTRUCTOR and
  HELIPAD (`id="lab-visit"`, `data-action="lab-open"`). It is hidden until the menu is drawn, then shown whenever `app.labAvailable()`
  is true, so a player without the helicopter finds it too. It presses the existing `lab-open` action in `src/screen-router.js`
  (read, not changed). It sits in the row that already holds WASTELAND, INSTRUCTOR and HELIPAD, so no button that is already there
  changes its place or size. The front door keeps its own Lab door: `src/screen-front-door.css` hides the new button there, as it
  already hides HELIPAD and INSTRUCTOR (one selector added).
- **The NEW tag for the Lab moved.** MENU-NEXT-UP put it on HELIPAD because the menu had no Lab button. It now floats over the corner
  of the LAB button. HELIPAD has no tag now: the menu has no helicopter news of its own to tag, so none was invented.
- **Every lesson is open from the start.** `lessonOpenState` in `src/lab/lab-lessons.js` no longer reads the player's helicopter
  lessons or driving lesson 1. A lesson is shut only when its switch is off (`lab`, `helicopter`, `heli-skiing`), with the same words as before for those.
- **The game challenges keep their conditions.** A new function, `challengeOpenState`, does what the two locks did: a Flying
  challenge needs the four helicopter lessons, and a Wind tunnel challenge or the G-force lap needs driving lesson 1. It is used where the challenge
  is judged: the challenge step of a lesson (`challengeState` in `src/lab/lab-model.js`), the helicopter's own challenge board
  (`labChallengeOpen` in `src/lab/lab-heli.js`) and the pass call (`passLesson` in `src/lab/lab-save.js`), so a shut challenge still cannot pass a lesson.
  What a passed lesson or challenge opens (tuning settings, upgrades, free rewards) is not touched.
- **The challenge step says it in one plain sentence that also says where to go.**
  - Flying: "This challenge needs the four helicopter lessons, so finish them first, at the HELIPAD button on the main menu."
  - Wind tunnel and G-force: "This challenge needs driving lesson 1, so pass it first, at the INSTRUCTOR button on the main menu."
  The sentence shows where a shut challenge was already shown: the lesson's feedback line, Brian's caption in a classroom lesson and the helicopter's challenge note.
- **`docs/LAB.md`** sections 2, 3, 11 and 12.1 say the above.
- **Sound.** No new game event, so no new cue. The old menu's buttons carry no click cue of their own (the menu's router plays none); the LAB button does what the `lab-open` action already did, which unlocks sound and opens the Lab, and the Lab then makes its own sounds as before.

## Checks

Run from PowerShell in the lane's own folder, one heavy job at a time.

- `node tools/test-lab-rules.mjs`: 20 of 20 (one test changed, one added, one assertion changed in another).
- `node tools/test-menu-next-up.mjs`: 15 of 15 (one added: the LAB button, shown and hidden, in its place in the row; the Lab tag now on LAB; two assertions changed).
- `node tools/test-lab-view.mjs`: 32 of 32. `node tools/test-lab-walk.mjs`: 10 of 10. `node tools/test-lab-classroom.mjs`: 65 of 65 (two assertions changed).
- Also run and passing: every other `tools/test-lab-*.mjs`, `node --test tools/test-menu-front-door.mjs` (15 of 15), `test-heli-hooks`, `test-story-ui`, `test-feature-flags`.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`, from PowerShell): 65 passed, 0 failed, 0 not run (354 s), on the final code. An earlier run selected all 612 suites because a new line in `tools/test-menu-next-up.mjs` read `src/screen-router.js` by path, which pulled the whole router into that test's import map; the line was dropped (the router is unchanged and the button's `lab-open` action is checked in the markup) and the tier narrowed to 65 again. That run was stopped, not counted.
- `npm run build`: passes.
- Browser scenarios, `node tools/run-browser-scenarios.mjs --scenarios <all 23 lab-* scenarios plus menu-front-door> --jobs 2`: 24 of 24 passed, 0 warnings, 0 errors. Also, because they look at the old menu's buttons: drive-lessons-view-2, earned-cars, heli-first-flight, lessons-v2-view, story-kogane, hidden-road: 6 of 6 passed.
- Seen in the story-kogane menu screenshot (1280 by 720): the LAB button sits between INSTRUCTOR and HELIPAD with its NEW tag, HELIPAD has no tag.

## Changed assertions (card: "Claude's review of changed assertions", rule 18)

Each one is the card's point: a lesson that used to wait for the helicopter lessons or driving lesson 1 is now open, and the same
condition is expected on its challenge. Nothing else is loosened.

1. `tools/test-lab-rules.mjs`, "opening order": was "Flying lessons are shut at the start, G-force and the Wind tunnel are shut until driving lesson 1,
   a finished helicopter course or driving lesson 1 changes which lessons are open". Now "a new profile sees all sixteen lessons open (with heli-skiing on)",
   "Flying, Workshop and Wind tunnel are open with the helicopter on", "the player's helicopter and driving lessons change nothing about which lessons are open"
   and the switch rules (no helicopter, no heli-skiing) unchanged. The test is renamed to say so.
2. `tools/test-lab-rules.mjs`, new test "the challenges keep their conditions": Flying challenge shut with its sentence until the four helicopter
   lessons are done (also with three of four); Wind tunnel challenge and the G-force lap shut with theirs until driving lesson 1; `passLesson` refuses with the same sentences.
   (Added, not a loosened check.)
3. `tools/test-lab-rules.mjs`, "a newer game's save fields": was "a driving field this game cannot read does not open the tunnel" (`open(profile).grip === false`).
   Now the same unreadable field does not open the tunnel *challenge* (`challengeOpenState(...).open === false`), and the lesson itself is open.
4. `tools/test-lab-classroom.mjs`, "Suspension opens only after driving lesson 1, matching the Lab lesson gate": was `lessonOpenState({}, 'suspension')` = shut with
   "Opens after driving lesson 1". Now the lesson is `{open: true, note: ''}` and `challengeOpenState` gives shut with the new driving sentence, then open after driving lesson 1. Renamed.
5. `tools/test-lab-classroom.mjs`, Grip registration test: was `lessonOpenState({}, 'grip').open === false` ("the Wind tunnel remains locked before driving lesson 1").
   Now the lesson is open and `challengeOpenState({}, 'grip')` is shut with the driving sentence.
6. `tools/test-lab-view.mjs`, "the board lists the four groups with the reason a shut lesson is shut": was "the board says 'Finish the helicopter lessons first' or 'Opens with the helicopter'".
   Now the board shows the reason that remains with the helicopter on and heli-skiing off ('Opens with heli-skiing'), shows neither old lock, and lists a Flying and a Wind tunnel lesson as startable.
7. `tools/test-lab-walk.mjs`, "the shared wind tunnel reports its lock reason": was a new profile's tunnel reads "Opens after driving lesson 1". Now a new profile's tunnel lessons are open, and
   the lock reason line is checked on rows shut by hand (a shut lesson still reports its reason at the machine).
8. `tools/test-menu-next-up.mjs`: "`!before.includes('lab-open')`" (the old menu had no Lab button) and "the old controls keep their order; the line is the only addition" now count the LAB button:
   one `lab-open` before the line is added, two after. The markup-minus-the-line equality and the order check are unchanged. The NEW-tag test now expects the Lab tag on `#lab-visit` and none on `#heli-visit`.
9. `tools/scenarios/lab-walk.mjs`: the door board check was "the board includes 'Opens after driving lesson 1'". Now it must not include that or 'Finish the helicopter lessons first'.

No pinned number (replay, lap time, count, feature switch) changed.

## Not checked

- With all four of INSTRUCTOR, LAB, HELIPAD and STORY showing, the row is full and STORY drops to a second line, one row lower than before. At 1280 by 720 that pushes the small "2 LAPS" note at the foot of the left column to the screen edge. The row is the menu's own and the card asked for one button in it; the layout was not changed to avoid this. Claude may want to look at it.

- The Lab's own challenge hand-offs (Lift flight, G-force lap) are as before; they are covered by the existing `lab-*` browser scenarios listed above.
- The sentences give the way there in words (the button names); there is no button inside the lesson that leaves the Lab for you. A button would need a change in both lesson screens and was not in the card's file list.
- The card's last check, a new player in a visible browser pressing LAB and starting one Flying and one Wind tunnel lesson, is Claude's and was not done here.

## Removed

The two lesson locks in `lessonOpenState` (the four helicopter lessons for Flying, driving lesson 1 for the Wind tunnel and G-force) and their lines in
`docs/LAB.md` sections 3 and 11. The conditions themselves moved to `challengeOpenState`, where the game challenges still use them; they are not gone, only no longer a lock on the lesson.
