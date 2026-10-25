# LAB-FAN

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/LAB.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). LAB section 6. Switch `lab`
(dev). Needs LAB-TUNE and LAB-FAN-ART.

- `src/config.js`: `mcmurtry_speirling`, no price,
  `unlockRequirement: 'lab-built'`, about 1,000 kg, electric (`gearbox:
  'single'`, no fuel setting, no wing setting). Numbers: the quickest launch
  of any car (still inside FIX-LAUNCH's limits for the class it shows, if
  that card sets any), top speed below the Jesko, Enzo and F1, braking the
  best in the game.
- **Fan grip:** a grip added at every speed (not growing with speed), sized
  so its total grip at a crawl is about twice a normal car's, through the
  same driving hook LAB-TUNE adds for downforce (a constant term instead of
  the speed-squared one).
- `src/lab/lab-fan.js`: `secretOpen(lab)` (all five wind-tunnel lessons
  done), `markReverse`, `buildFan(profile)` (15,000 credits once; adds the
  car to `unlockedCars`). With the helicopter on it is a special car at the
  home pad (`AIR_ONLY_CARS`).
- `tools/test-lab-fan.mjs`: the secret stays shut until all five are done;
  building costs once; the fan grip is the same at 10 and 100 km/h; every
  other car's numbers and replays unchanged; switch off changes nothing.

Owns: the files above, `docs/changes/LAB-FAN.md`. Hooks: `src/config.js`
(one car), `src/heli/heli-jobs.js` (`AIR_ONLY_CARS`), the downforce hook.
Locks: `busy-game-files` (the driving hook).
Sound: `car.speirling` (LAB-RADIO). Art: LAB-FAN-ART.

Acceptance: the test, the car-roster and switch-inventory tests gain the car
with Claude's written review on this card, replay guards unchanged, lane
tier, build, one review; the frame check with eight Spéirlings on a busy
view before it goes live (rule 8). Removed: nothing.

## Claude's review (25 October 2026)

Changed assertions approved: each adds the Lab-built Speirling to a roster,
inventory or per-car check (roster 13 to 14, cable lift, armour, paint,
grounding with its accepted low skirt) while every earlier car stays exactly
as before; the Lab ownership check moves from a shop marker to the real
`unlockedCars` entry. Nothing loosened. Independent review clear.
