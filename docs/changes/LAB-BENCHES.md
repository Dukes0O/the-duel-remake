# LAB-BENCHES

The Lab's bench experiments as pure models the screen can run (docs/LAB.md sections 2 and 4). Each runs the game's own functions and constants, never a copy, so what the player learns is what the game does. Switch `lab` (dev); nothing here is reachable by a player yet (LAB-VIEW draws the screen). No save field, no lock.

## What was added

`src/lab/benches/`: `bench-core.js` (the shared shape) and one file per bench, 16 benches in 12 files. Each exports `{id, controls, cues, run(settings) -> result, goalMet(history), facts()}`. Settings are clamped and snapped to the controls (junk gives a lawful run), a run repeats exactly, `goalMet` reads the history of runs, and `facts()` returns the numbers Brian's explanation quotes, computed by the same model.

| Bench | Built on | What it shows |
| --- | --- | --- |
| `lift` | `heliMass`, `availableThrust`, `createHeliState` | weight against the most lift, with the hook limit; goal: a load that will not leave the ground at full collective |
| `projectile` | `aimPoint` (the bucket's parcel model) | water against a stone dropped from a height at a forward speed; the buoy target and the largest ring |
| `fire` | `spreadStep` on 20 m cells | heat, fuel and air; water, sand and a cleared strip each take one away; the strip stops the game's spread |
| `pendulum` | `stepCable` (15 and 25 m cases), 2 pi root(L/g) | string and cable swing times, independent of weight |
| `altitude` | `airFactor`, `availableThrust`, `HELI_DESTINATIONS` | the game's air share beside the standard-atmosphere density at sea level, Panorama Ridge, Summit Run |
| `strength` | textbook cantilever, three material tables | same-weight bars bend or snap; the hook-arm puzzle with a lightest answer |
| `rust` | scripted time-lapse | four jars over a week |
| `gforce` | `DRIVE.mphToWorld`, `DRIVE.maxLateralAccel`, `CARS` grip | v squared over r beside the game's limit |
| `headings` | `bearing`, `HELI_DESTINATIONS` | heading (0 north) and distance on the pilot map |
| `launch` | ski rules' drag (`SKI`, `airDensity`) | range with and without air, landing level or 10 m lower |
| `wax` | `SKI.wax` | glide time per snow and wax |
| `tunnel` (grip, downforce, braking, suspension, fuel) | `tyreSlipAngle`/`tyreSlipGrip`, `DRIVE.brakeAccel`, `carMassKg` | see below |

Sound cues named per bench (not made here; LAB-RADIO): `lab.clunk` (lift, fuel), `lab.splash` (projectile), `lab.burner` (fire), `lab.tick` (pendulum), `lab.creak` and `lab.snap` (strength, chosen by the result), `lab.fizz` (rust), `lab.fan` (the tunnel benches).

## Where the game has no rule, the bench says so

The wind tunnel uses the game's rule where there is one: Grip is the tyre-slip rule (full grip up to slip 1, which is 4.3 degrees of slide, then less, squeal from `tyreSlipRawSound`), Braking is the car's real braking (`DRIVE.brakeAccel x car.braking`, stops from 100 mph in four times the road of 50), Fuel uses the helicopter table's car masses and the car's launch acceleration. Downforce, spring rates and brake balance have no game rule yet (LAB-TUNE makes them), so those are plain physics with the constants written at the top of `tunnel.js`. Strength uses standard material values because the game has no material rules. The wax glide uses only the ski rules' two frictions; which wax suits which snow is the lesson's.

## Explanations that changed (approved by Claude, 24 October; see "Claude answers" on the card)

Three sentences in `docs/LAB.md` 4.4 said things the model does not support, so they were corrected to what the bench shows: Suspension (the tyre stays down about as well on stiff and soft springs; stiff shakes the body 17% harder and leans 2.2 degrees against 6.5), Grip (the game's tyre keeps all its grip up to 4.3 degrees, it has no rising part) and G-force (the game allows 2.5 to 3.5 g, not "about 2.5 g"). The Braking explanation also now says plainly that the weight shift is shown at a gentle 1 g stop while the stopping distances use the car's full braking (Claude's request). `tools/test-lab-benches.mjs` checks that docs/LAB.md still quotes the numbers the benches produce.

## Tests

`tools/test-lab-benches.mjs` (18 tests). Every number a bench shows equals the game's rule for the same inputs: thrust and weight, the parcel's landing point (`aimPoint` called directly), the fire spread (`spreadStep` called directly), the cable's swing time within 1% of the formula on 15 and 25 m cables with 800 to 1500 kg, stopping distance as v squared over 2a and a ratio of 4 between 100 and 50 mph, grip at the tyre-slip rule's best slide. The explanation numbers are checked against both the bench and the text: falls of 4.9, 19.6 and 44.1 m in 1, 2 and 3 s; swings of 4.5, 7.8 and 10.0 s; 75% true and 71% game air at 2,860 m; aluminium at 34% of steel's weight; 52 kg of petrol in 70 litres. Two quick mutations (petrol density, a parcel speed) made it fail, as they should.

## Independent review

A fresh reviewer ran the benches against the game's sources. It found six real faults, all fixed and now tested: (1) the pendulum goal counted a string and a cable of the same length as two lengths; (2) the cable swing was wrong, or missing, for loads under 9 kg because the game's stiff cable is not a case it models for such a load, so the weight control now starts at 10 kg and a test sweeps 10 to 1,500 kg against the formula; (3) the launch bench's default run already met its goal (target moved to 30 m, 17 m/s at 45 degrees); (4) the launch landing was not interpolated between steps, which put the best angle with air above 45 at slow speeds (now interpolated, and the test requires the best angle with air below 45 from 10 m/s; at 5 m/s the air pulls it by under a tenth of a degree); (5) the grip slide control ran past where the game's tyre model stops (12 degrees, slip 1.25), so it now stops there; (6) goal checks threw on odd histories, so `makeBench` now ignores rows that are not a run of the bench and never throws. It also pointed at two weak assertions, replaced, and that the hook-arm result handed the screen the puzzle's answer (now only a yes or no). Nits left as they are, for Claude's eye:
- The Wax kit reward in LAB.md says the right wax "glides 3% faster"; the ski rules' two frictions (0.045 and 0.06) give a glide about 6% shorter in time on the bench slope. The bench follows the ski rules.
- Brian says paint keeps rust out, but the rust bench has four jars and no paint jar. Fuel: "brakes and turns a little better" and Suspension: "quick to turn" are not shown by those benches (they show 0 to 60 time, body shake and lean). Fuel's mass effect on acceleration is a bench-only rule until LAB-TUNE adds it to the game.
- The projectile bench shows the stone and the water side by side; Brian's 5, 20 and 45 m falls are the stone's, the water's are 4.2, 12.4 and 21.3 m.

## Removed

Nothing.
