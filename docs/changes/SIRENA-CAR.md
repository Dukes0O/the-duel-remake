# SIRENA-CAR: the Falcone Sirena as a car, its states and the Coast Cup (switch `the-deep`, dev)

THE_DEEP sections 6.2, 6.6 and 12. The Sirena exists in the roster as a car nobody can own until the Lab restores it
(LAB-RESTORE adds it to `unlockedCars`). Every list stays exactly what it was; no other car's numbers, price or replay moved.

## What was built

- **The car** (`src/config.js`, `falcone_sirena`): the Viper Prototype's figures with top speed and acceleration 8% lower
  (213.44 mph, 8.096), grip equal (1.13), braking 10% lower (1.116), manual gearbox, gears scaled to the new top speed,
  `unlockRequirement: 'sirena-restored'`, no price, not factory-maxed (upgrades work as for any car). **Mass 810 kg**, not 800: with 800
  the standing arena guard (every car moves parked junk at least 2 m at 40 mph) fails by 1.2%. She is still the lightest car.
- **`src/deep/sirena-car.js`**: `sirenaState(profile)` answers `wreck`, `waiting` (raised, not restored), `restored` or
  `cupDone`; `settleCoastCup(profile, finish)` pays the cup once through DEEP-SIRENA's `recordCoastCup`, for a valid,
  non-qualifying, non-practice finish (any place) on `pacific-canyon` in the owned, raised Sirena, in Duel, Time Trial or Grand Prix.
- **Settlement** (`src/progression.js`): the settle call sits beside the earned-car check; `settleRace` returns
  `coastCup: {paid, events: [{deepCoastCup: {}}]}` and `src/app.js` emits the event and puts `coastCup` on the result.
- **Helicopter**: the Sirena is air-only (`AIR_ONLY_CARS`); `FIRST_PLACE` in `heli-save.js` makes `carAt` default to
  Pacific Canyon for it (every other car still defaults to the home pad); it is a light car for the hook (810 kg).
- **On no list**: `isShownCar` hides it from the menu, garage, armory and leaderboard; DEEP-SIRENA-VIEW lists it once
  owned or waiting. Not a medal car; an ordinary car on the medal sheet.
- **Wiring each new car needs**: `vehicle-assets.js` (SIRENA-ART's `createSirenaVehicle` and size), `vehicle-sockets.js`,
  and an engine voice in `sound-bank.js` (pitch 1.09: 1.06 matched another car's playback rate and `test-audio` needs distinct voices).
- **Armor kit**: not built here (it needs Blender, `tools/blender/armor-kits.py`); `test-armor-kit-assets` waits for it by name
  (`LAPTOP_KITS`, only the Sirena) and checks it fully the moment the file exists. The laptop card SIRENA-KIT builds it and
  empties the list. Claude approved this.

## Changed assertions and re-recorded pins (Claude's written review wanted, rule 18; nothing is loosened)

Each is a roster or pin that named every car; the Sirena joins as the new last car. One line each:

- `test-progression` (car count +1, "the Lab-restored Sirena"), `test-vehicle-assets` (12 to 13 cars), `test-heli-cable`
  (the helicopter mass table gains the Sirena at 810 kg), `test-combat-armor` (armor expectation 80, the lightweight clamp).
- `test-bolide-vehicle`: "last of the medal cars" now reads the medal ladder (`MEDAL_CARS.at(-1)`) because the Sirena comes after it in the roster.
- `test-medals`, `test-earned-cars-ui`: the Jesko's bought-cars list and the shown-cars list exclude the Sirena; the air-only list gains it.
- `test-course-eligibility`: maxing the fleet earns every ownable car, and a check that it does not earn the Sirena; the air-only refusal counts are unchanged.
- `test-deep-look`: import allow-list gains `src/progression.js -> sirena-car.js` and the new test's imports.
- `test-arena-shove`, `test-arena-junk-shove`: the historical solver pins now filter the Sirena out (so each keeps its old
  pin), and a new pin `solverFingerprintWithSirena` (`8718807985d0375e7dcff07efe816a417ceead733d46aa118907733e22e50b0b`) covers every mass pair with her; new car, new mass pair.
- `test-arsenal-wave1-audio`: the engine-voice filter in the sound-bank export pin gains her id, as it did for each medal car (no hash moved).
- `test-titan-handling`: her full-state race fingerprint `1b2b6507aefe1d28f476b39c375f8ac14337ddadfde58db5cd2ec7058edf74c6` (recorded on the merged integration code, whose own pins for the other cars had just been re-recorded) added to `tools/replays/titan-handling.json`; all the others unchanged.
- `test-armor-kit-assets`: the named `LAPTOP_KITS` wait above.

## Checks (Linux cloud)

- `tools/test-sirena-car.mjs` (9 tests): the numbers against the Viper; every other car, price and list unchanged (the roster
  of the integration commit this branch was merged with, `dfb420c1`, is compared field by field); the four states; the cup pays 1,000 once and only for a counted finish on
  Pacific Canyon in the Sirena (other car, course, mode, qualifying, abandoned, switch off, not owned, never raised); through the real
  `settleRace`; helicopter air-only, first place and lift; medals and upgrades; the model builds and the car drives slower than the Viper.
- **Full tier** (`node tools/run-tests.mjs --tier full --jobs 4 --keep-going`, 481 suites) with current `integration/wasteland`
  (69ab7b6a) merged, because a car added to the shared roster is what the full tier is for: 448 passed, 33 failed. Fourteen of
  the failures were roster-pinned tests listed above; each is fixed, and I re-ran those suites plus `test-sirena-car`, `test-deep-sirena`, `test-deep-save`,
  `test-save-fixtures` and `test-career-backup` after the fixes: all pass. The rest fail identically on an untouched checkout of
  `integration/wasteland` (compared one by one) because they need the laptop: `test-audio-crash-peak` (Chrome), `test-compact-binaries`,
  `test-convoy-tanker-art`, `test-course-kit`, `test-drive-through`, `test-first-person-cloth`/`-contact`/`-polish`, `test-full-check`,
  `test-p4-kits`, `test-rook-p2-candidate`, `test-rustwall-atlas-isolation`/`-p2`/`-p2-relief`, `test-salt-flats`, `test-salt-flats-art`,
  `test-tanker-valve-source`, `test-vesper-art` (Windows paths, `blender.exe`, the art library), and the Windows-only subtests of
  `test-earned-cars-ui` and `test-medals` (every other subtest passes).
- Lane tier `--changed --jobs 8 --keep-going` on the branch merged with `integration/wasteland` (dfb420c1): 226 of 236 suites pass,
  including this card's test and the replay and world-signature guards. Ten fail: the laptop-only `test-course-kit`, `test-earned-cars-ui`,
  `test-full-check`, `test-drive-through`, `test-medals`, `test-salt-flats`, `test-vesper-art`; and `test-drift-trial` and `test-lab-radio`,
  which fail identically on an untouched checkout of that integration commit (not from this card). `npm run build` passes.
  `test-sirena-car` failed once there only because its "roster of the commit before" pin pointed at an older commit than the
  Jesko's re-recorded acceleration; it now names the merged integration commit.

## Removed

Nothing.
