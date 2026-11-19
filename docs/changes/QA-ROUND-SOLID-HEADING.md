# QA-ROUND-SOLID-HEADING

**Changed:**
- `src/collision.js` tests an ellipse against the car's own turned rectangle in one frame (`sweepCarEllipse`: the ellipse scaled to a unit circle, the car to a parallelogram grown by that circle). A round solid gives the same answer at every heading, and a long one is met where the car's body meets it.
- A body with equal half-widths (a person, a shot or a sight line; no vehicle or junk body is square) sweeps as a point against the ellipse grown by its radius, so a person slides round a post. Against a very long ellipse that grown ellipse lies up to about 0.1 m inside the exact offset (about 0.05 m for the game's rocks); the centre never enters the solid.
- Boxes keep their envelope. The card's second finding was the same fault: a car aligned with a 45-degree road was "hit" out to 2.75 m, while a car truly turned 45 degrees to its path reaches 2.38 m.
- Dead-tree trunks carry their seeded heading again.
- `src/deep/deep-rocks.js` (outside the card's named files, found by `test-deep-explorer`): with the exact body a head-on touch on a small rock points straight back, and the glance flipped sides every step and pinned the car. It now keeps one side per rock and driving direction, away from the rock; the test's car travels about 24 m, as on the old sweep (21 to 25 m).

**Checks:**
- New tests in `tools/test-scablands-things.mjs` fail on the old sweep and pass on the new: a car past a round post at 1.5, 2 and 3 m, post at 0, 45 and 90 degrees, car aligned and turned 45 degrees by slip; a long oval against sampled body contact; a person meeting a post from its centre. Trees pass at 2 m at three headings.
- On f7cbc96ee: things 47/47, scablands-solid 28/28, test-replays 297 and test-combat-replays 12 pass, test-night-2 passes, lane tier (`--changed --since faed7067c`, after a full lane run on faed7067c gave 106 of 107, the Night 2 walk cured here) 103/103. On ce8e5d1ea: every `test-deep-*` suite passes, lane tier (`--changed --since f7cbc96ee`) 27/27, `npm run build` passes. One independent review; its two low notes were acted on above.
- Left to the night by the lane tier: test-arena-shove, test-convoy-tanker-art, test-first-person-polish. Branch has integration/wasteland bb7aace9c merged in.

**Changed assertion (re-recorded, approved in this card's session on 19 November):** `eifel-crown-duel` `ded9069111c0...` to `8388898f2798...` (all three FPS). A car meets rock-133 once with a 2.4 cm overlap, then slides along it 0 to 5 mm clear; the old wider envelope counted 25 hits, the exact body 2. No other fingerprint moved. `tools/replays/courses/eifel-crown.json` (event `eifel-crown@3`, read by no suite) was left as it was.

**Removed:** the trunks' heading-0 way round and their `drawHeading` field; the old `sweepEllipse`.
