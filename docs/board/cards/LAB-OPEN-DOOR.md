# LAB-OPEN-DOOR

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item L3). Kyle said yes
to this card on 9 November.

A new player reaches the Lab only through the garage or the helipad, and then finds most
lessons shut: the Flying lessons need all four helicopter lessons, and the Wind tunnel lessons
and G-force need driving lesson 1. Kyle wants the Lab to be the place to get right; a player
should be able to walk in and start any lesson.

## Settled design (Claude)

- **One LAB button in the old menu's existing row of buttons**, beside the ones already there,
  shown when `app.labAvailable()` is true. It uses the existing `lab-open` action in
  `src/screen-router.js`. Nothing else on the menu moves.
- **Every lesson is open from the start.** In `src/lab/lab-lessons.js`, `lessonOpenState`
  stops reading the player's helicopter lessons and driving lesson 1. A lesson is shut only
  when its switch is off (`lab`, `helicopter`, `heli-skiing`), as now.
- **The game challenges keep their conditions.** A challenge that flies Kestrel One still
  needs the helicopter lessons, and a challenge that drives still needs driving lesson 1. The
  challenge step says so in one sentence and offers the way there; the lesson before it can be
  finished without it. What a passed lesson and a passed challenge each open (tuning settings,
  upgrades) does not change.
- Update `docs/LAB.md` in the same change.

## Claude's review of changed assertions (rule 18)

Tests that expect the notes "Finish the helicopter lessons first" and "Opens after driving
lesson 1" on a lesson now expect that lesson open and the same condition on its challenge.
That is the purpose of this card and loosens nothing else. The builder lists each changed
assertion in the change note.

## Files

`src/screen-menu.js`, `src/screen-menu.css`, `src/lab/lab-lessons.js`, the Lab view where the
challenge step is drawn, `docs/LAB.md`, tests. Needs MENU-NEXT-UP first, because both cards
change the menu files.

## Checks

- Test: a new profile sees all sixteen lessons open; a Flying challenge is shut with its
  sentence until the four helicopter lessons are done; a Wind tunnel challenge likewise until
  driving lesson 1.
- Test: the old menu holds a LAB button when the Lab is available and none when it is not.
- Every `lab-*` browser scenario.
- Laptop only: Claude starts a new player in a visible browser, presses LAB and starts one
  Flying lesson and one Wind tunnel lesson.

## Result (Claude, 10 November 2026)

Built by a Sonnet helper, reviewed by Claude; see `docs/changes/LAB-OPEN-DOOR.md`. Claude read the code and the changed
assertions (they are the ones reviewed above, and nothing else is loosened), then looked in the check runner's browser as a
new player: the LAB button stands between INSTRUCTOR and HELIPAD with its NEW tag, it opens the Lab, and the Downforce
lesson starts with no driving lesson passed. The way to a shut challenge is given in words (the HELIPAD and INSTRUCTOR
buttons are named), not as a button. Seen and left: with INSTRUCTOR, LAB, HELIPAD and STORY all showing, STORY moves to a
second line of the row.

## Removed

The two lesson locks in `lessonOpenState` and their lines in `docs/LAB.md`.
