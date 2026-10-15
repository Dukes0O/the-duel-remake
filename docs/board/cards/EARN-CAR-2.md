# EARN-CAR-2

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the tests and the acceptance. Design:
`docs/EARNED_CARS.md` section 4.

```yaml
  - id: EARN-CAR-2
    title: "Earned car 2: McLaren F1 (15 medals)"
    owner: codex
    lane: ART
    size: M
    needs: [EARN-SCREEN]
    locks: [sound-bank]
    flag: earned-cars
    owns: [src/<car>-vehicle.js, tools/test-<car>-vehicle.mjs, docs/board/looks/earned-cars/car-2-round-<n>.jpg, docs/board/looks/earned-cars/car-2-review.md, docs/changes/EARN-CAR-2.md]
    hooks: [src/config.js, src/vehicle-assets.js, src/vehicle-sockets.js, src/sound-bank.js, src/heli/heli-cable.js, tools/blender/armor-kits.py, public/assets/models/wasteland/kits/, docs/HELICOPTER.md, tools/test-progression.mjs, tools/test-koenigsegg-ui.mjs, tools/test-course-eligibility.mjs, tools/test-combat-armor.mjs, tools/test-save-fixtures.mjs]
```

## The car

McLaren F1, earned at **15 medals**. Kyle confirmed the pick on 14 October
2026 (packet section 10).

## Before code: settle the numbers in writing here

Write the stats in this file and get Claude's yes before building:

- Base `topSpeed` so the fully tuned figure (base x 1.105) is about
  240 mph, inside the band between a fully tuned Aurora (236) and a fully tuned Viper (256).
- `mass` about 1,140 kg (real weight) (1,500 kg or less, or Kestrel One cannot lift it).
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
- Stop rule: if the model or kit cannot pass in three rounds, stop, write why
  in the change note and ask Kyle. Never ship a stand-in car.

## Acceptance

The settled numbers, the model, the checks above, the lane tier and the build
pass; one ordinary code review; Claude's look verdict recorded.

## Proposed numbers for Claude, 15 October 2026

Please approve or amend these gameplay numbers before code or art starts. The F1's light road-car character gives it more top speed than the Enzo, less acceleration and braking, and a tuned speed between Aurora and Viper. These are game settings, not claimed physical measurements. The 1,140 kg mass follows the settled card. Maker pictures are viewing references only: https://www.mclaren.com/cars/us_en/ultimate-models/mclaren-f1 . No model, badge, texture or logo was downloaded.

Base proposal: topSpeed 217.2; accel 9.1; grip 1.02; braking 1.16; gears [58,98,134,169,197,217.2]; offRoadGrip 0.63; offRoadSpeed 60; offRoadScrub 0.54; mass 1140; collision {halfWidth:1.0,halfLength:2.14}; height 1.14; kind hypercar. factoryMaxed true; unlockRequirement {kind:'medals',medals:15}. Leave optional boost fields at existing defaults.

| Car, full tuning | Speed mph | Accel | Grip | Braking | Dirt grip | Mass kg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Enzo | 217.685 | 10.528 | 1.2 | 1.8172 | 0.80 | 1365 |
| Aurora | 236.470 | 9.072 | 1.2 | 1.6324 | 0.92 | existing default |
| F1 proposal | 240.006 | 10.192 | 1.2 | 1.7864 | 0.81 | 1140 |
| Viper | 256.360 | 9.856 | 1.2 | 1.9096 | 0.78 | 940 |
| Jesko | 329.290 | 12.096 | 1.2 | 2.3100 | 0.82 | 1390 |

Figures calculated through current production upgradedCar with every upgrade level 3. F1 tuned gears: [64.09,108.29,148.07,186.745,217.685,240.006]. Dirt speed/scrub, dimensions and height stay at their base values; boost capacity uses the default 1.0 base / 1.75 tuned. The common tuning grip cap makes the full-tuning grip column equal. No source, lane, model generation or test started. Sound-bank lock is not claimed. Await Claude's explicit yes as this card requires.

## Claude answers (15 October): numbers approved

Yes, as proposed. Fully tuned 240 mph sits in the band (Aurora 236, Viper
256), lighter and quicker to stop than the Enzo but slower off the line, which
is the F1's character. 1,140 kg is well inside Kestrel One's hook limit. Use
`unlockRequirement: {kind: 'medals', medals: 15}`. Build may start; it needs
the `sound-bank` lock, now free.


## Next build reserved by card-answer chat, 15 October resumed session

Kyle resumed this chat for 2.5 hours. Claude's approved numbers above control. This chat reserves EARN-CAR-2 and sound-bank, after completing the existing Summit handoff. The overnight chat is handling Ardennes and the old HELI cleanup. Do not duplicate that cleanup here. No new F1 folder, code or art starts until the actual HELI cleanup has cleared the recorded new-lane hold. Only the F1 card's files/hooks are reserved; EARN-CAR-3 waits for sound-bank. Record model, contract, real private images, kit and helicopter checks honestly; no stand-in acceptance.


## Director re-slice before source, 15 October

HELI cleanup is now complete after restart (d2fdd649); the new earn-car-2 lane is permitted and created from that integration commit. Existing sound-bank reservation stands. In addition to the original hooks, this card owns only the F1 registration/coverage additions in tools/test-enzo-vehicle.mjs, tools/test-vehicle-assets.mjs, tools/test-vehicle-paint.mjs, tools/test-vehicle-grounding.mjs, tools/test-armor-kit-assets.mjs, tools/test-heli-cable.mjs, tools/test-earned-cars-ui.mjs, tools/test-medals.mjs, tools/test-arena-shove.mjs, tools/test-arena-junk-shove.mjs, tools/replays/arena-shove-controls.json, tools/replays/titan-handling.json, tools/test-arsenal-core-audio.mjs, tools/test-arsenal-wave1-audio.mjs, tools/audit-armor-kit-fit.mjs, tools/blender/kit-review.py and tools/test-blender-output.mjs. These are the existing all-car pins/recipe consumers proved by read-only inspection, not a new harness. Add the F1's roster rows and independent new-car pins; preserve every existing historical replay and old-car hash/threshold. The Enzo append-order check must retain its original relative order while allowing the approved next appended car. Do not change save schema, existing fixture bytes, wallet rules or runtime shared helpers.

Model key mclaren_f1, constructor createMclarenF1Vehicle, nominal width2.00m/length4.28m/height1.14m, +Z forward, central driver, two staggered passenger seats, rounded road-car nose/roof intake, dark twin-headlamp recesses and short tail without a race wing. Silver paint0xb8bdc2/charcoal trim0x202329 are routine appearance choices for round1. Official McLaren page was inspected visually in the background browser; only public photographs are viewing references. No maker asset/model/badge/texture is downloaded or bundled. Every gameplay number remains the explicitly approved proposal above.


Director names tools/scenarios/mclaren-f1-look.mjs as the card-required native look recipe: use the existing memory-isolated browser harness and existing vehicle-art-check page/buttons, capture front/rear/side/detail plus real damage/driver controls. No new harness, runtime host hook, lighting change or timing claim. Photography starts only after the actual model/registration source is frozen; raw output is ignored evidence and the single compact round sheet remains the card's requested output.

Director also names tools/art/mclaren-f1-sheet.py as the card-required compact sheet recipe, following the existing Pillow sheet pattern. It resizes the six actual showroom pictures only, checks their original viewport and the native report, caps the one JPG at500KB and never edits models, lighting or image content. No new test machinery or dependency.


Director names tools/scenarios/frame-pacing.mjs for the required F1 field check: add one explicit EARN_CAR_2_FRAMES_ONLY branch to its existing simple native sampler, using Panorama Ridge, native memory-only ownership/air delivery and eight actual F1 copies. Preserve default Harbour night and Ardennes branches, original thresholds/readiness and their checks. Extend tools/test-mclaren-f1-vehicle.mjs only with meaningful selector/context/roster packet cases using the existing test style; no new harness, runtime hook or timing framework. Source preparation is permitted while slots are full. Actual frame timing waits for a quiet laptop and suitable display; it is not waived or passed.


## Frame view confirmation for Claude

The narrow sampler source selects Panorama's native eight-car Pit Straight grid (actual centres -49 through -77m), the future grid/paddock/kits/landmarks/main/rear/HUD view you approved at15:00 in the P4-PANORAMA note. It checks every actual actor is F1 and does not relocate cars or use an inspection camera. That note explicitly leaves a globally busiest ranking unproved. Please confirm this prior approved view for the F1 card's eventual frame acceptance, or name the required reachable view and existing native staging route. No timing is admitted on the busy laptop and no busiest-view result is claimed. This is a view/acceptance question only; native art and source checks continue.
