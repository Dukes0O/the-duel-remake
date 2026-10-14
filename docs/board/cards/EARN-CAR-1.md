# EARN-CAR-1

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the tests and the acceptance. Design:
`docs/EARNED_CARS.md` section 4.

```yaml
  - id: EARN-CAR-1
    title: "Earned car 1: Ferrari Enzo (6 medals)"
    owner: codex
    lane: ART
    size: M
    needs: [EARN-SCREEN]
    locks: [sound-bank]
    flag: earned-cars
    owns: [src/<car>-vehicle.js, tools/test-<car>-vehicle.mjs, docs/board/looks/earned-cars/car-1-round-<n>.jpg, docs/board/looks/earned-cars/car-1-review.md, docs/changes/EARN-CAR-1.md]
    hooks: [src/config.js, src/vehicle-assets.js, src/vehicle-sockets.js, src/sound-bank.js, src/heli/heli-cable.js, tools/blender/armor-kits.py, public/assets/models/wasteland/kits/, docs/HELICOPTER.md, tools/test-progression.mjs, tools/test-koenigsegg-ui.mjs, tools/test-course-eligibility.mjs, tools/test-combat-armor.mjs, tools/test-save-fixtures.mjs, tools/fixtures/saves/11-medals.json]
```

## The car

Ferrari Enzo, earned at **6 medals**. Kyle confirmed the pick on 14 October
2026 (packet section 10).

## Before code: settle the numbers in writing here

Write the stats in this file and get Claude's yes before building:

- Base `topSpeed` so the fully tuned figure (base x 1.105) is about
  218 mph, inside the band between a stock F42 (201) and a fully tuned Aurora (236).
- `mass` about 1,365 kg (real kerb weight) (1,500 kg or less, or Kestrel One cannot lift it).
- `accel`, `grip`, `braking`, `gears`, `offRoadGrip`, `offRoadSpeed`,
  `offRoadScrub`, `collision`, `height`, `kind`: from the real car's
  character, compared in a short table with the nearest bought cars and the
  Jesko, all at full tuning. `accel` 10.8 or less and `braking` 1.5 or less
  (the Jesko's), so the garage's rating bars keep their scale. 
- `unlockRequirement: {kind: 'medals', ...}` as above, `factoryMaxed: true`.

## What to build

- `src/<car>-vehicle.js`: an original model built in code, like
  `src/koenigsegg-vehicle.js`, from the maker's public pictures as a
  viewing reference only: no downloaded model, texture, badge or logo. The
  standard vehicle contract in `docs/UNLOCK_VEHICLES.md`: driver, steering,
  four wheels, brake lights, boost flames, paint, directional damage, crush
  and exact reset. At most 73,600 triangles and 66 draws (the Jesko's size).
- Registration in `src/vehicle-assets.js` and roof and front sockets in
  `src/vehicle-sockets.js`.
- Config entry in `src/config.js` with the settled numbers, appended after
  the cars already there.
- Engine voice: one `CAR_VOICES` entry in `src/sound-bank.js` tuning the
  existing engine sample (pitch, brightness, gain, accent). No new recording.
- Mad Max Duel: its armour kit from the existing kit recipe
  (`tools/blender/armor-kits.py`) into `public/assets/models/wasteland/kits/`,
  like every other car.
- Helicopter: the config `mass` is what Kestrel One reads (a row in the
  table in `src/heli/heli-cable.js` is optional), plus a row in
  `docs/HELICOPTER.md` section 5's table.

## Checks

- Look test, at most three rounds (SPEC 0.11): one comparison sheet per round
  (JPG, 500 KB at most) and a review note in `docs/board/looks/earned-cars/`,
  with Claude's verdict. Gritty and real, never toy-like.
- Its own model test: contract parts, bounds, damage and reset, size budget.
- Existing suites that cover every car pass with it: course eligibility,
  vehicle grounding, armour kit fit, the helicopter lift and job tests (it is
  never a customer car), and the save fixtures.
- A Grand Prix at Panorama Ridge driven in this car (a field of its copies)
  passes the frame check.
- With `earned-cars` off it appears nowhere (EARN-SCREEN's test).
- Tests that pin today's car list (`test-progression.mjs` nine cars,
  `test-koenigsegg-ui.mjs` seven earnable, `test-course-eligibility.mjs`,
  `test-combat-armor.mjs`) are updated for the new car, each changed
  assertion explained in the change note.
- Add this car, owned, to `tools/fixtures/saves/11-medals.json` with the
  medals that earned it.
- Stop rule: if the model or kit cannot pass in three rounds, stop, write why
  in the change note and ask Kyle. Never ship a stand-in car.

## Acceptance

The settled numbers, the model, the checks above, the lane tier and the build
pass; one ordinary code review; Claude's look verdict recorded.
