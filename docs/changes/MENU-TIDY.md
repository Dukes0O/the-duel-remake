---
task: MENU-TIDY
status: ready-for-review
player_facing: yes
---

# MENU-TIDY: course maps on the Your Courses cards, and a compact race setup panel

Kyle tried the menu with the `menu-front-door` switch on and asked for two changes.

## What changed

1. **Your Courses.** Every course card now shows a small outline map in its top right
   (176 by 110 px). It is the same drawing the race setup panel uses for the selected
   course (`CoursePreview`, with its checkered start and shortcut lines); there is no second
   drawer. The two buttons sit side by side under the text instead of stacked, so a card is
   190 px tall instead of 207 px. A secret course that nobody has found from the helicopter
   shows no map and keeps its hint and locked button; a locked course that can be bought
   shows its map. A card with no map lets its text use the full width.
   - `src/course-access-ui.js`: the card gets a `canvas.course-card-map` with
     `data-course-map="<course id>"` and the class `has-map` (not on a secret course not yet found).
   - `src/course-card-maps.js` (new): draws the maps after the panel is on the page. Building
     a course takes 50 ms to over a second, so a map is made only when its card scrolls into
     view, one at a time, on a spare canvas, then copied onto the card and kept for the
     session. The course is dropped as soon as the picture is drawn, and the menu's own
     course cache (`getMenuCourse`) is not touched.
   - `src/screen-router.js`: creates the helper and calls it after each modal draw.
   - `src/screen-courses.css`: the card becomes a two column grid (text, map; then the buttons).
2. **Race setup panel (switch on).** One label column of 120 px for every row (Player, Circuit,
   Route, The Challenge, CPU Rival, Transmission, Laps, Your Car, Lighting, Driver), with each
   row's choices straight after it, left aligned. The panel is 650 px wide at most (it was 993
   at 1920 wide) and sits next to the Drive card. The Player, Circuit and Driver selects are
   280 px and the car picker 480 px instead of full width. The Courses button now sits on the
   Circuit row instead of wrapping below it. Only `src/screen-front-door.css` changed, every
   rule scoped to `.front-door-on .front-door-options`. No control, id, data attribute, order
   or behaviour changed. With the switch off, the race setup is unchanged (it already is a
   narrow left column with no empty middle).

## Checks

- Pictures at 1920x1080 and 1366x768 with `menu-front-door` on (and the setup panel with it
  off): nothing is cut off; at 1366 the drawer scrolls inside itself as before.
- `node tools/test-course-access-ui.mjs`, `test-fire-close.mjs`, `test-grand-prix-career-menu.mjs`,
  `test-menu-front-door.mjs` pass; lane tier and `npm run build` results are in the run log line.
- No frame timing (a menu change).

## Changed assertions

- `tools/test-grand-prix-career-menu.mjs`, "flag off preserves complete original markup": that
  test compares `courseAccessPanel` against a hand copy of the old card markup. The copy now
  also holds the new map canvas and `has-map` class (none on a secret course not yet found).
  Nothing is loosened: it still demands an exact match of the whole panel with the Grand Prix
  switches off, and every old button, label and attribute is still compared.
- `tools/test-fire-close.mjs` is unchanged: `has-map` goes before `selected` so the card class
  still ends in `course-burnt`.
- `tools/test-course-access-ui.mjs`: new checks only (a map on every card except a secret not
  yet found, the secret keeps its locked hint, a found secret shows its map).

## Open

- Maps appear a moment after the panel opens (a few seconds for the first screenful on a cold
  start), because building each course is slow. Cards show a dark frame until theirs is drawn.

## Removed

Nothing replaced. The old stacked full-width button layout was a CSS rule inside
`.course-access-card` and is rewritten in place.
