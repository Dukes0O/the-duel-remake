# BOWL-REX-FIGHT: night five, the Scrapasaurus (titan-bowl, dev)

**What changed.** Night five gets a fourth event after Last Truck Rolling: the Scrapasaurus (`src/bowl/bowl-rex.js`, a Show Night runner). It walks its rails at the truck and rears with its cone drawn on the floor before any fire. It rests on the Jump Straight, drops a junk car on its rails to launch off, and stands with a battery box open. At its pen it throws or eats junk cars. It falls after three landings; after its last rest it leaves by the car park gate. Every place comes from `features.bowl` (`rexPlaces`). `bowl-rex-view.js` draws it, and it also stands behind the wall on nights three and four. The beaten Rex lies in the yard (`scrapdome-yard.js`). There are fifteen sound cues on stand-ins. Questions and picks are in `docs/board/questions/BOWL-REX-FIGHT.md`.

**Shared files touched.** `game.js` (one import), `app.js` (cue playback, `bowlRexInYard`), `render3d.js` (one line), `bowl-night.js` (the night-five hint), `bowl-show.js`, `bowl-lines.js` (the fight's words; "three events" made "every event" in two Turn Show lines and the picker's intro), `bowl-screens.js`, `bowl-view.js`, `scrapdome-yard.js`.

**Checks**, after merging BOWL-RIVALS (d23e32e):
- `test-bowl-rex`: 59 checks. Child-pace driver, 10 seeds each: Easy 10 of 10, Medium 7 of 10, Hard 5 of 10. Its size comes from the floor: 7.5 m to the top of its head on this Bowl.
- `test-bowl-night` (276), `test-bowl-turns` (307), `test-bowl-rivals` (99) and `test-bowl-show` pass.
- `test-replays` (297) and `test-combat-replays` (12) pass. `npm run build` passed.
- Earlier, the lane suites on 97b0924: every failure also failed on unchanged integration/wasteland at 73d40fe, or was laptop-only.
- One independent review: three faults fixed.

**Changed assertions.** None. Only the label of one `test-bowl-night` check now names the Scrapasaurus as night five's other event.

**Not run here:** browser scenario `bowl-rex-fight`, laptop-only suites, play by hand, frame check, the look of the Rex, its cone, the dropped car and the yard.

**Removed:** nothing. The fight is added after Last Truck Rolling on night five.
