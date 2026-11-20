# BOWL-REX-FIGHT: night five, the Scrapasaurus (titan-bowl, dev)

**What changed.** Night five is Car Crush, Freestyle, then the Scrapasaurus (`src/bowl/bowl-rex.js`, a Show Night runner). It walks the rails at the truck, rears with its cone drawn on the floor before any fire, rests with a battery box open just past the big ramp, throws or eats junk cars at its pen, and falls after three landings; after its last rest it leaves by the car park gate. Every place comes from the course's data (for BOWL-EXPAND). `bowl-rex-view.js` draws it (and behind the wall on nights three and four); the beaten Rex lies in the yard (`scrapdome-yard.js`). Fourteen sound cues on stand-ins. Questions and picks: `docs/board/questions/BOWL-REX-FIGHT.md`.

**Shared files touched.** `game.js` (one import), `app.js` (cue playback, `bowlRexInYard`), `render3d.js` (one line), `bowl-night.js` (`sayBowlLine`, as BOWL-RIVALS adds it; the night-five hint), `bowl-show.js`, `bowl-lines.js`, `bowl-screens.js`, `bowl-view.js`, `scrapdome-yard.js`, `test-bowl-night.mjs`.

**Checks.** `tools/test-bowl-rex.mjs`: 52 checks on 106bcde. Child-pace driver, 10 seeds each: Easy 10 of 10, Medium 5 of 10, Hard 3 of 10. Bowl suites (`show`, `night`, `air`, `course`, `save`) pass. Lane tier on 106bcde: 87 passed, 3 failed, replays at 297 checks. `test-full-check` and `test-drive-through` are laptop-only; `test-race-field` fails with the same hash on unchanged integration/wasteland at 5ade094. `npm run build` passed. `test-board` and `test-repo-hygiene` passed.

**Changed assertions.** `test-bowl-night`: "nights three to five wait for Last Truck Rolling" becomes "nights three and four wait", with night five playable, because night five now ends with the fight instead of Last Truck Rolling. Nothing loosened.

**Not run here:** browser scenario `bowl-rex-fight`, laptop-only suites, play by hand, frame check, the look of the Rex, its cone and the yard.

**Removed:** Last Truck Rolling from night five (question 1 has the other choice).
