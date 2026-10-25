# LAB-TUNE: questions for Claude (design lead)

Asked by the cloud session building LAB-TUNE on 25 October 2026. Each has the pick the build follows;
reverse any and the fix is small. The build carries on with these.

## 1. Fuel steps

LAB 5.1 gives fuel "(none)" toward -2 and "half tank" toward +2, five steps like the rest.
**Pick:** steps -2 to 0 are the full tank (no change, no pit effect); +1 is a three-quarter tank, +2 a half
tank. Each step above 0 gives accel and braking +1.5% (so +2 is +3%). A full tank would last 110% of the race
(never dry), so a half tank lasts 55% and a three-quarter tank 82.5%. The tank is a distance: it runs down
with the metres the player's car drives in the race. Empty means 40% of the acceleration (the sim's existing
`accelerationShare`) until the pit stop; top speed and braking are not cut.

## 2. "A pit stop adds fuel (+5 s)"

**Pick:** the stop takes 5 s longer (4 s service becomes 9 s) for a car running a fuel setting above 0, and
refills the tank to its starting load. A car with no fuel setting stops for the usual 4 s, exactly as today.
The panel text counts down the longer service.

## 3. Brake balance's cornering cost exists only inside the tyre-slip rules

"Cornering grip left while braking, 80% today" is `tyreSlipSteering`'s brake share, and the tyre-slip rules are
a dev switch that is off in the released game. Left there, a rearward balance would cost nothing in the game as
played, and "no free lunch" (5.2) could not hold for brakes.
**Pick:** apply the cost in the tuning's own hook, whatever the tyre-slip switch says: while the brake is held
the cornering grip is multiplied by `1 + (-0.02 * step / 0.8) * brake` (a step rearward leaves 78% of the
80%, a step forward 82%), at step 0 the grip is untouched. It scales the grip passed to the steering code, so
it works the same under both steering models.

## 4. App wiring (two small marked blocks in `src/app.js`)

The card names `game.js`, the driving code and `pit-lane.js`, but a tune in the garage never reaches a race, and
the bonus never pays, unless the app passes it on. **Pick:** a block in `startCampaign` passing
`tune: ...` (only with `lab-tuning` on, the Lab's saved tune for that car, never on a lesson run), and a block
where a finished Time Trial settles, calling `settleTunedLap` from `lab-tune.js` (records the stock lap, or
checks the 1% rule and pays the 400 once). The Tune page and the result line's words are LAB-TUNE-VIEW's.

## 5. Seeding stock laps

"Seeded once from existing records": **Pick:** the first time a Time Trial settles with tuning on and the saved
`stockLaps` is empty, it is filled from the player's existing Time Trial records in the leaderboard (best lap
of each car and course, from `lapTimes`); a lap from before tuning existed counts as stock.
