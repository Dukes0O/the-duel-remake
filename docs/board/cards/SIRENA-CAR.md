# SIRENA-CAR

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/THE_DEEP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). THE_DEEP sections 6.2, 6.6
and 12. Switch `the-deep` (dev). Needs DEEP-SIRENA and SIRENA-ART.

- `src/config.js`: the `falcone_sirena` car. A 1960s racer: start from the
  Viper Prototype's numbers with top speed and acceleration 8% lower, grip
  equal, braking 10% lower, mass 800 kg, manual gearbox. No price;
  `unlockRequirement: 'sirena-restored'`, so it is owned only when the Lab
  adds it to `unlockedCars` (LAB-RESTORE in `docs/LAB.md`). Upgrades work
  as for any car.
- `src/deep/sirena-car.js`: `sirenaState(profile)` answers `wreck` (not
  raised), `waiting` (raised, not restored: the garage shows it under a
  sheet with "Needs the Lab"), `restored` or `cupDone`; and
  `settleCoastCup(profile, result)`: a valid finish (any place) on
  `pacific-canyon` in `falcone_sirena` sets `deep.coastCup`, pays 1,000
  credits once and emits `deepCoastCup`.
- With the helicopter on, a restored Sirena starts at Pacific Canyon (its
  place in the helicopter save); after that it travels like any special
  car. Add it to `AIR_ONLY_CARS` with Pacific Canyon as its first place.
- Medals: it is an ordinary car on the medal sheet.
- `tools/test-sirena-car.mjs`: the four states; the cup pays once and only
  for a valid Pacific Canyon finish in the Sirena; switch off changes
  nothing; every other car's numbers, prices and replays unchanged.

Owns: the files above, `docs/changes/SIRENA-CAR.md`. Hooks: `src/config.js`
(one car), `src/heli/heli-jobs.js` (`AIR_ONLY_CARS` and the first place),
`src/progression.js` (the cup settle call beside the earned-car check).
Locks: none (`deep.coastCup` comes from DEEP-SIRENA's save change).

Sound: `deepCoastCup` plays the existing results fanfare and Ana's
`deep.ana.cup`. Art: SIRENA-ART's car.

Acceptance: the test; the car-roster and switch-inventory tests gain the new
car with Claude's written review on this card (a car added, nothing
loosened); lane tier, build, one review. Removed: nothing.

## Claude answers

Cloud session questions (25 October 2026, Claude design lead): all six approved.
(1) 810 kg, and she stays the lightest car. (2) The named `LAPTOP_KITS` wait in
`test-armor-kit-assets` is acceptable: it names one car and checks it fully the
moment the file exists; the laptop card SIRENA-KIT builds the kit and empties the
list. (3) The Sirena stays on no list until DEEP-SIRENA-VIEW lists it. (4) The
wiring beyond the card's hooks stays. (5) The cup counts in Duel, Time Trial and
Grand Prix. (6) The changed assertions and re-recorded pins are reviewed as fine.
