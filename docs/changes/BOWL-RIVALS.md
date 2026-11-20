# BOWL-RIVALS: five rivals, Side by Side and Last Truck Rolling (titan-bowl, dev)

**What changed.** `src/bowl/bowl-rivals.js` holds five rivals as data (name, way of driving, start delay, pace in mph from Easy to Hard) and who drives on each night. Side by Side races the night's rival on the duel's rival rules, held to that rival's pace. Last Truck Rolling (nights three to five) loads the Bowl as the arena's own fight with four trucks: its teams, computer drivers and wreck credit, no weapons or crates, the same show armor for every truck, and a wrecked truck knocked out for good. The two-minute clock decides it: the last truck rolling wins, or at the clock the hardest hitter still rolling. Rivals hit at 0.2, 0.6 and 1 of full strength by level. The player's nose does not tip in the air there (`bowl-air.js`). The arena's HUD and pause card stand aside for the show's (`screen-arena.js`). Big Mo names the rivals and each knock-out, and the HUD's goal names the trucks still rolling. Sound cues: a knock-out by the player plays `arena.wreck-credit`, any other plays `bowl.mo` with Big Mo's line. Open points: `docs/board/questions/BOWL-RIVALS.md`.

**Checks on ddb92b1.**
- `tools/test-bowl-rivals.mjs`: 81 checks. Every rival finishes Side by Side on every level.
- Child-pace driver wins in 10 (Easy/Medium/Hard): night 1 10/2/0, night 2 10/1/0, night 3 9/3/0, night 4 9/0/0, night 5 10/1/0.
- `test-bowl-night` 230, `test-bowl-air`, `test-arena-ui`, `test-titan-car-launch`, `test-feature-flags` passed.
- Lane tier: 123 passed and 5 failed; replays held at 297 checks. Two of the failures also fail on `cloud/BOWL-HOOKS` (`test-race-field`, `test-salt-flats`). Two are laptop-only (`test-drive-through`, `test-full-check`). `test-deep-save` needs history this shallow clone lacks.
- After the line fixes, on c9aa24c: the 27 suites picked since ddb92b1 passed, `test-bowl-rivals` at 82 checks.
- Side by Side's lanes now come from the course (the Director, for BOWL-EXPAND); night two's Easy rate is now 9 in 10.
- After merging BOWL-HOOKS b9c90fd (its `bowlLayout` is now the lanes' source), on 3644167: the 32 suites picked since f542141 passed, `test-bowl-night` at 249 and `test-bowl-rivals` at 86 with the same win rates.
- Side by Side reads BOWL-EXPAND's `features.bowl.lanes` when the course has them (half a lap apart, one lap each). On fb68920 the 26 suites picked since 2663af4 passed. In a scratch merge with integration's BOWL-EXPAND, `test-bowl-rivals` passed 86 checks with Easy 10/10 every night; Side by Side Medium rose to 10/10 and 5/10, for BOWL-FINISH to tune.
- `npm run build` passed. Not run here: browser scenario `bowl-rivals`, the night's long suites `test-field-battle` and `test-opponents`, play by hand, the look.

**Changed assertions.** `test-bowl-night`: "nights three to five wait for Last Truck Rolling" now reads that they can be played, because this card registers the event. The check that an unbuilt night does not start now uses night six.

**Removed:** BOWL-HOOKS' single computer truck in Side by Side, its `paceMph` table and its fixed `lane: 3`, replaced by the named rivals and the course's lanes.
