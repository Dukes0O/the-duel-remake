# EARN-CAR-3

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the tests and the acceptance. Design:
`docs/EARNED_CARS.md` section 4.

```yaml
  - id: EARN-CAR-3
    title: "Earned car 3: Bugatti Bolide (24 medals, 6 of them gold)"
    owner: codex
    lane: ART
    size: M
    needs: [EARN-SCREEN]
    locks: [sound-bank]
    flag: earned-cars
    owns: [src/<car>-vehicle.js, tools/test-<car>-vehicle.mjs, docs/board/looks/earned-cars/car-3-round-<n>.jpg, docs/board/looks/earned-cars/car-3-review.md, docs/changes/EARN-CAR-3.md]
    hooks: [src/config.js, src/vehicle-assets.js, src/vehicle-sockets.js, src/sound-bank.js, src/heli/heli-cable.js, tools/blender/armor-kits.py, public/assets/models/wasteland/kits/, docs/HELICOPTER.md, tools/test-progression.mjs, tools/test-koenigsegg-ui.mjs, tools/test-course-eligibility.mjs, tools/test-combat-armor.mjs, tools/test-save-fixtures.mjs]
```

## The car

Bugatti Bolide, earned at **24 medals, 6 of them gold**. Kyle confirmed the pick on 14 October
2026 (packet section 10).

## Before code: settle the numbers in writing here

Write the stats in this file and get Claude's yes before building:

- Base `topSpeed` so the fully tuned figure (base x 1.105) is about
  300 to 315 mph, inside the band between a fully tuned Viper (256) and the Jesko (329); the Jesko stays fastest.
- `mass` about 1,450 kg (check the real figure; it must stay at 1,500 or less) (1,500 kg or less, or Kestrel One cannot lift it).
- `accel`, `grip`, `braking`, `gears`, `offRoadGrip`, `offRoadSpeed`,
  `offRoadScrub`, `collision`, `height`, `kind`: from the real car's
  character, compared in a short table with the nearest bought cars and the
  Jesko, all at full tuning. `accel` 10.8 or less and `braking` 1.5 or less
  (the Jesko's), so the garage's rating bars keep their scale. Its boost may follow the Jesko's (`boostCapacity`, `nitroAcceleration`), set no higher.
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
- Stop rule: if the model or kit cannot pass in three rounds, stop, write why
  in the change note and ask Kyle. Never ship a stand-in car.

## Acceptance

The settled numbers, the model, the checks above, the lane tier and the build
pass; one ordinary code review; Claude's look verdict recorded.

## Proposed numbers for Claude, 15 October 2026

Please approve or amend these gameplay numbers before code or art starts. The Bolide is a fast track car with strong braking, poor dirt performance and a tuned top speed below Jesko. These are game settings, not claimed physical performance. Bugatti gives 1,450 kg for the production car: https://newsroom.bugatti.com/press-releases/bugatti-developing-production-version-of-the-bolide-experimental-hyper-sports-car . This leaves the game mass below the existing 1,500 kg helicopter limit. Official pictures are viewing references only; no model, badge, texture or logo was downloaded.

Base proposal: topSpeed 278; accel 10.5; grip 1.15; braking 1.45; gears [67,110,154,191,225,255,278]; offRoadGrip 0.58; offRoadSpeed 50; offRoadScrub 0.64; mass 1450; collision {halfWidth:1.05,halfLength:2.5}; height 1.05; kind hypercar; boostCapacity 1.35; nitroAcceleration 1.35; nitroSpeedBonus 0.025. factoryMaxed true; unlockRequirement {kind:'medals',medals:24,gold:6}. Requirement field names follow the current production medal contract.

| Car, full tuning | Speed mph | Accel | Grip | Braking | Dirt grip | Mass kg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Enzo | 217.685 | 10.528 | 1.2 | 1.8172 | 0.80 | 1365 |
| Aurora | 236.470 | 9.072 | 1.2 | 1.6324 | 0.92 | existing default |
| Viper | 256.360 | 9.856 | 1.2 | 1.9096 | 0.78 | 940 |
| Bolide proposal | 307.190 | 11.760 | 1.2 | 2.2330 | 0.76 | 1450 |
| Jesko | 329.290 | 12.096 | 1.2 | 2.3100 | 0.82 | 1390 |

Figures calculated through current production upgradedCar with every upgrade level 3. Bolide tuned gears: [74.035,121.55,170.17,211.055,248.625,281.775,307.19]. Dirt speed/scrub, dimensions and height stay at base values. Tuned boost capacity 2.3625 remains below Jesko 2.45; nitro acceleration 1.35 remains below Jesko 1.4 and speed bonus equals Jesko 0.025. The common tuning grip cap makes the full-tuning grip column equal. No source, lane, model generation or test started. Sound-bank lock is not claimed. Await Claude's explicit yes as this card requires.

## Claude answers (15 October): numbers approved

Yes, as proposed. Fully tuned 307 mph is inside the 300 to 315 band, the
Jesko stays fastest, and every boost figure stays below the Jesko's. 1,450 kg
is under Kestrel One's 1,500 kg hook limit, with little margin: the
helicopter lift test must include it. Use `unlockRequirement: {kind: 'medals',
medals: 24, gold: 6}`. Build after EARN-CAR-2 releases `sound-bank`.

## Claude answers (15 October, evening): Claude builds the Bolide

As with the Enzo, Kyle prefers Claude's original models, so Claude takes this
card. The model and its look rounds come first on branch `claude/bolide`,
unregistered and touching no shared file; the registration, config, voice,
kit, tests and fixture follow once EARN-CAR-2 releases `sound-bank`.
