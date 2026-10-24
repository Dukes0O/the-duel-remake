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

## Explanations that changed (needs Claude's review; also in `docs/board/questions/LAB-BENCHES.md`)

Three sentences in `docs/LAB.md` 4.4 said things the model does not support, so they were corrected to what the bench shows (the old and new text are in the question file): Suspension (the tyre stays down about as well on stiff and soft springs; stiff shakes the body 17% harder and leans 2.2 degrees against 6.5), Grip (the game's tyre keeps all its grip up to 4.3 degrees, it has no rising part) and G-force (the game allows 2.5 to 3.5 g, not "about 2.5 g"). `tools/test-lab-benches.mjs` checks that docs/LAB.md still quotes the numbers the benches produce.

## Tests

`tools/test-lab-benches.mjs` (18 tests). Every number a bench shows equals the game's rule for the same inputs: thrust and weight, the parcel's landing point (`aimPoint` called directly), the fire spread (`spreadStep` called directly), the cable's swing time within 1% of the formula on 15 and 25 m cables with 800 to 1500 kg, stopping distance as v squared over 2a and a ratio of 4 between 100 and 50 mph, grip at the tyre-slip rule's best slide. The explanation numbers are checked against both the bench and the text: falls of 4.9, 19.6 and 44.1 m in 1, 2 and 3 s; swings of 4.5, 7.8 and 10.0 s; 75% true and 71% game air at 2,860 m; aluminium at 34% of steel's weight; 52 kg of petrol in 70 litres. Two quick mutations (petrol density, a parcel speed) made it fail, as they should.

Lane tier, build and the independent review are recorded below.

## Removed

Nothing.
