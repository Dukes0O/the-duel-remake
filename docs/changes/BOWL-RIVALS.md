# BOWL-RIVALS: five rivals, Side by Side and Last Truck Rolling (titan-bowl, dev)

**What changed.** `src/bowl/bowl-rivals.js` holds five rivals as data (name, way of driving, start delay, pace in mph from Easy to Hard) and who drives on each night. Side by Side races the night's rival on the duel's rival rules, held to that rival's pace, on the course's two lanes (`course.features.bowl.lanes` through `bowlLayout`); each truck finishes one full lap from its own start. Last Truck Rolling (nights three to five) loads the Bowl as the arena's own fight with four trucks: its teams, computer drivers, start slots and wreck credit, no weapons or crates, the same show armor for every truck, and a wrecked truck knocked out for good. The two-minute clock decides it: the last truck rolling wins, or at the clock the hardest hitter still rolling. Rivals hit at 0.2, 0.6 and 1 of full strength by level. The player's nose does not tip in the air there (`bowl-air.js`). The arena's HUD and pause card stand aside for the show's (`screen-arena.js`). Big Mo names the rivals and each knock-out; the HUD's goal names the trucks still rolling. Sound cues: a knock-out by the player plays `arena.wreck-credit`, any other `bowl.mo` with Big Mo's line. Open points: `docs/board/questions/BOWL-RIVALS.md`.

**Checks on 797809f** (integration 73d40fe merged in, on the 286 m Bowl of BOWL-EXPAND).
- `tools/test-bowl-rivals.mjs`: 86 checks. Every rival finishes Side by Side on every level.
- Child-pace driver wins in 10 (Easy/Medium/Hard): night 1 10/2/0, night 2 10/1/0, night 3 10/4/1, night 4 10/6/0, night 5 10/2/2. Medium paces were raised for the new floor (one record each, the floor is longer).
- `test-bowl-night` 252, `test-bowl-course`, `test-bowl-air`, `test-bowl-show`, `test-bowl-save` passed.
- Lane tier: 91 passed and 5 failed; replays held at 297 checks. `test-race-field` and `test-test-runner` fail the same way on unchanged integration 73d40fe. `test-full-check` and `test-salt-flats` are laptop-only, and `test-deep-save` needs history this shallow clone lacks.
- `npm run build` passed. Not run here: browser scenario `bowl-rivals`, the night's long suites `test-field-battle` and `test-opponents`, play by hand, the look.

**Changed assertions.** `test-bowl-night`: "nights three to five wait for Last Truck Rolling" now reads that they can be played, because this card registers the event. The check that an unbuilt night does not start now uses night six.

**Removed:** Show Night's single computer truck in Side by Side and its `paceMph` table, replaced by the named rivals.
