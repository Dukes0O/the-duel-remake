# LAB-SNOW

The Lab's two Snow lessons, Launch angles and Ski wax (docs/LAB.md 4.3), on the ski rules (`src/ski/`, docs/HELI_SKIING.md). Switches `lab` and `heli-skiing` (dev). Nothing here is reachable by a player yet: the ski session (SKI-HELI) and its screens (SKI-VIEW) and the Lab screen (LAB-VIEW) call these pure rules. No save field and no lock: the rewards use the Lab's existing `owned` flags.

## What was added

The two benches already existed from LAB-BENCHES (`src/lab/benches/launch.js`, `wax.js`); this card checks them against the real skier and adds the challenges and rewards.

- `wax.js`: `snowOfDay(day)` draws the day's snow from the play day with the seeded generator (one of the three samples and a temperature in its band: dry powder -18 to -10 C, cold -9 to -2, wet -1 to 0; the same day is always the same snow). `waxSetting(pick, day)` is what the skier is told (`createSkier({wax})`): `'right'` (friction 0.045) when the pick is the day's wax (hard for dry powder, medium for cold, soft for wet), `'wrong'` (0.06) otherwise, `null` (the plain snow's 0.05) for no pick. `waxRunResult({day, pick, time})` is the wax run: pass with the right wax and a slalom time inside the slalom's silver time (the game's own medal time, 26.3 s), with a reason when not. `waxRunFacts()` measures the slalom with each setting.
- `launch.js`: `aerialsTips()`, six lines for the Aerials run built from the ski rules' own numbers (the 20/50/30 shares, the 6 m and 14 m targets that add up, the proportional form rule, the 30 degree finish of the spin and the flip, the 40 degree landing window and the landing score softened by steepness, and that past the best angle a steeper take-off gives more height and less distance). The bench lists `lab.splash` as its cue.
- `lab-shop.js`: `aerialsOpen(profile, flags)` (with the Lab off the run is offered as it is; with it on, once the free Aerials reward is owned), `waxKitOwned`, `skiWaxFor(profile, flags, day, pick)` (the pick judged against the day's snow with the Wax kit, otherwise `null`). With the Lab off, or the kit not bought, the skier is exactly today's.
- `docs/LAB.md` 4.3: the Wax kit line now says the right wax glides about 3% faster than the wrong one on a slalom run, and about 1% faster than no wax (approved by Claude, 25 October; see "Claude answers" on the card). The guide's best line on the slalom takes 22.17 s with the right wax, 22.37 s with none and 22.78 s with the wrong one: 2.7% and 0.9% faster, and the wrong wax 1.8% slower than none. On the bench's straight 100 m glide the right wax is 5.9% faster than the wrong one; the line quotes the slalom because that is the lesson's challenge.

SKI-HELI and SKI-VIEW carry the lines for calling these (the pick before a run, the wax run, the aerials gate and tips, the day's snow).

## Tests

`tools/test-lab-snow.mjs` (12 tests), against the real skier and slalom rather than the benches' own functions:

- The launcher's range with air equals the ski rules' own flight (`stepSkier` flown from an airborne start over flat snow, and 10 m lower) to within two steps of travel, over twelve angle and speed pairs. The skier lands on the first fixed step below the snow and flies by the mean of old and new speed; the bench places the landing between steps, so the real flight is 0.01 to 0.46 m longer (0.3 to 2%, the largest on a 7 m launch). That is the whole difference.
- 45 degrees goes furthest with no air on flat ground (to a tenth of a degree) at four speeds; air, and a landing 10 m lower, each bring the best angle below 45, and both lower still; the real skier's own longest 30 m/s flight is below 45 (and above 35). The target is one launch within 2 m of 30 m.
- The real skier's pull-away from rest on a slope matches the friction numbers (right 0.045, wrong 0.06, none 0.05) to 1%; the right wax is faster on the bench for each snow; on the slalom the right wax beats no wax, which beats the wrong wax, and the silver time is the game's medal time.
- The day's snow: repeatable, all three snows over three months, temperature inside its band, bands apart, junk input is one lawful day, a day number and its text are the same day.
- The Wax kit: 400 credits after the lesson, never before; the pick judged against the day's snow; no kit, no pick, junk pick and Lab off all give `null`; with no pick the slalom guide's time is exactly today's.
- The wax run: right wax and silver or better passes (a hundredth over does not); the wrong wax, no pick, NaN or zero time do not; a guide-pace run beats silver for every snow, so it can be won.
- The Aerials reward is free with Launch angles; with the Lab on the run waits for it, with the Lab off it is offered. The tips quote the ski rules' numbers, and what they say is checked against the rules: a shallow landing is safe and a steep one (over 40 degrees) tumbles, a half turn left over tumbles, air adds height and distance, form is proportional, the landing score is 60 of 100 from 20 degrees up and 100 for a gentle one, a tumble scores nothing for landing, and past the best angle a steeper launch goes higher and shorter.
- `docs/LAB.md`'s Ski wax and Launch angles rows say what the numbers show.

Mutation checks: a drag constant too strong, the wax judged backwards, the kit ignored, the Aerials gate always open, a loosened silver time, overlapping snow bands and a wrong tip share each make a test fail. No existing assertion changed; `tools/test-lab-benches.mjs`, `test-lab-rules.mjs` and `test-heli-mode.mjs` pass.

## Independent review

A fresh reviewer read the ski rules against the new text and ran probes. It found real faults, all fixed and tested: (1) a tip said a "flat or crooked" landing tumbles, which is backwards (the rule is the angle between the path and the snow: a shallow landing is safe, a steep one tumbles; the tip now says so and gives the landing score's softening); (2) a tip said a steeper take-off gives more height and less distance, true only past the best angle (reworded, with the best angle computed); (3) the air share is a sum of height and distance, not two gates (reworded); (4) form credit is proportional, not "finishing" (reworded with the 90 degree steady margin); (5) the -5 C sample was named "Cold snow" while Brian's recorded line says cold snow needs a hard wax (the sample is now "Cool snow"; Brian's line is true of the powder, and a line on the LAB-FINISH card suggests a re-recording); (6) the winnability loop in the test was vacuous (it now checks a guide-pace run passes on days of each of the three snows and fails with any other wax); (7) the launch bench is at sea level while the aerials hill is high (a comment says the thinner air carries a launch about 6% further at 2,500 m, and that the bench is always a little short of the skier's flight). Also fixed: `waxRunResult()` with no argument threw. Nits left as they are: the guide's percentages are the pursuit driver's, not a human's; only the first landing is scored; `snowOfDay` gives one lawful day to junk input; `aerialsOpen` is false with the Lab on for a missing profile. No call site in `src/` uses these rules yet (SKI-HELI and SKI-VIEW carry the lines), so "the Lab off gives today's skiing" is true by construction.

## Lane tier and build

Run once on the branch after merging current `origin/integration/wasteland` (25 October): `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 24 passed, 4 failed. The four fail identically on an untouched integration checkout and are laptop-only suites: `test-earned-cars-ui`, `test-medals`, `test-course-kit`, and `test-lab-radio` (it rebuilds the Lab's sounds from their recipes byte for byte; the cloud's audio tools give other bytes). `npm run build` passes. Card check, passing: `tools/test-lab-snow.mjs` (12 tests). Not run in the cloud: browser scenarios and the full tier.

## Removed

Nothing.
