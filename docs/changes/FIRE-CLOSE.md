# FIRE-CLOSE: a burnt course on the course menu

Card: FIRE-CLOSE (Claude, UI lane, no lock). Design: `docs/HELI_FIRE.md`
sections 8.1 and 8.2.

Needs: FIRE-SAVE (merged first; this lane was cut from its branch). The
H1 dependency is met by HELI-FINISH's code at 64198f94 (the main design
session ruled the pending H1 release is not a build dependency).

## What changed

- `src/course-access-ui.js`: `courseAccessPanel` takes `forestFire` (the
  forest-fire switch with the helicopter on; default false). When on, an
  owned course closed after a fire keeps its card where it is, darkened
  with soot, labelled CLOSED, with "Closed: burnt in a forest fire." and
  "Reopens in 7 play days." (singular for 1), and "BUY BACK · 7,000 CR";
  short of the price the button is disabled and the card says "You need
  450 more credits." A closed course cannot be selected. On the reopening
  day the card says "Reopened after the fire." once. Everything comes from
  `closureCard` in `src/course-closures.js`.
- `src/screen-courses.js`: the buyback button calls `app.buyBackCourse(id)`
  on the menu only, and shows its result; an app without that hook refuses
  with "Forest fires are not available yet." FIRE-HOOKS adds the app side
  and passes `forestFire` from `src/screen-router.js` (one option on the
  existing course screen call).
- `src/screen-courses.css` (the course screen's own styles, beside
  `screen-courses.js`): the soot tint on a closed card, drawn in the page,
  no new art.
- `src/course-access.js` is not edited.

## Tests

- `node tools/test-fire-close.mjs` (new): 22 checks passed (switch off: a
  burnt save draws exactly the same menu; switch on with nothing burnt:
  the same menu; closed card, soot, lines, price and no select; short and
  singular wording; Tremblant Snow unchanged; reopening day and the day
  after; bought back; the buyback button through the app, only on the
  menu, and refused without the hook).
- `node tools/test-course-access-ui.mjs`: 38 checks passed.
- Lane tier and build: below.

## Review (rule 17)

One independent reviewer read the three lanes cut from FIRE-SAVE; for this
card nothing serious: the menu is byte-identical with the switch off,
names and ids are escaped, a closed card has no select button, buyback
works only on the menu. Taken: the disabled button's label says "credit"
for 1; the success message names the course instead of "the burnt woods";
burnt prices always use one number format. Noted for FIRE-HOOKS: the
selected stage can still point to a closed course and `nextStage()`
passes the card, so the race-start `courseClosed` check is the guard.

## Changed assertions

None.

## Removed

Nothing.
