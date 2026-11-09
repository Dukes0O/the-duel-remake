# MENU-NEXT-UP

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item O1). Kyle said yes
to this card on 9 November.

Kyle's and Gratian's notes since 26 October are mostly "could not find it" and "did not know
what to do next". The old menu, which Gratian asked to keep on 30 October, has no line that
says what to do next. The front door had one, and it went away with the front door.

## Settled design (Claude)

- **Nothing on the old menu moves.** No control is added to, removed from or reordered in the
  race setup. The front door stays off (`menu-front-door` stays `dev`).
- **One line under the masthead:** "NEXT UP" and one sentence, as one button that takes the
  player there. Use `chooseNextUp(facts)` and `nextUpMarkup(next)` from
  `src/menu-front-door.js` with the facts `src/screen-router.js` already builds for the front
  door. When `chooseNextUp` has nothing to say, the line is hidden.
- **NEW marks:** a small NEW tag on an existing menu button when something behind it is open
  and the player has not done it yet: an open Lab lesson not yet passed, a story step waiting,
  an earned car waiting, a course owned with no finish. Each mark is worked out from the
  profile when the menu is drawn. No new saved field.
- **Switch:** `menu-next-up` in `src/feature-flags.js`, on at release (no Preview step).
- **Sound:** no new game event, so no new cue.

## Files

`src/screen-menu.js`, `src/screen-menu.css`, `src/screen-router.js` (facts only),
`src/feature-flags.js`, and a new test. `src/menu-front-door.js` is read, not changed.

## Checks

- New test: with `menu-front-door` off and `menu-next-up` on, the old menu's markup holds the
  Next up line, and the list of the menu's `data-action` values is the same as before, in the
  same order, apart from the new line.
- New test: each NEW mark appears for a profile that has the open thing and goes when it is
  done; a profile from before this change loads unchanged.
- Laptop only: Claude looks at the menu in a visible browser at the laptop's size. In the
  audit's test window at 1440 by 900 the big title lay over the player and circuit boxes;
  look for that and say in the change note whether it happens on the laptop.

## Removed

Nothing. The front door's own files stay until Kyle decides about the front door.
