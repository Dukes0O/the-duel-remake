# EARN-CAR-1

- Task: earned car 1, the Ferrari Enzo (6 medals), registered in the game
  (Cockpit T-013). Built by Claude in place of Codex (Kyle, 14 October 2026).
- Status: code, tests and kit complete, behind the `earned-cars` switch (dev).
  Kind: car. Lane `claude/enzo-model`.
- Look: round 4 picked (`docs/board/looks/earned-cars/round-4-review.md`; its
  sheet was later replaced by round 5's). No new art round; see "Model fixes" for four small size fixes.

## What was built

- `src/config.js`: `ferrari_enzo`, appended after the Jesko, with exactly the
  numbers settled on the card ("Claude answers (15 October)"): top speed 197
  (218 mph tuned), accel 9.4, grip 1.08, braking 1.18, six gears, off-road
  grip 0.62 / speed 58 / scrub 0.56, mass 1,365 kg, collision 1.02 x 2.35,
  height 1.15, kind hypercar, Rosso 0xb3121a with black trim, `factoryMaxed`,
  no price. The medal rule is `unlockRequirement: {kind: 'medals', medals: 6}`,
  the form `src/medals.js` reads (the card text said `count`; EARN-MEDALS
  settled on `medals`).
- `src/vehicle-assets.js`: the Enzo routes to `createEnzoVehicle` with source
  `earned`. `src/vehicle-sockets.js`: front and roof sockets.
- `src/sound-bank.js`: one `CAR_VOICES.ferrari_enzo` entry (pitch 1.05,
  brightness 1.10, gain 1, accent 1.04, exhaust 0.16, intake 0.15) tuning the
  existing engine sample: a natural V12, a little higher and brighter than the
  muscle car. No new recording.
- Armour kit: `ferrari_enzo` added to `SIZES` in `tools/blender/armor-kits.py`
  (2.04 x 4.70 x 1.15) and the Enzo's paint name to the three fit
  matchers in `tools/audit-armor-kit-fit.mjs`; `ferrari_enzo` added to
  `tools/blender/kit-review.py` and to the generated list in
  `tools/test-blender-output.mjs`. Generated with only that recipe
  (`--cars ferrari_enzo`): `public/assets/models/wasteland/kits/ferrari_enzo.glb`
  (474 KB; the other nine kits are untouched). Kit fit against the Enzo's own paint
  passes the kit fit, authored kit and kit asset tests.
- `docs/HELICOPTER.md` section 5: an Enzo row (1,365 kg, lifts) and the
  special-car sentence. Kestrel One reads the config mass, so no row was added
  to the table in `src/heli/heli-cable.js` (optional on the card).
- `tools/fixtures/saves/12-medals.json`: the Enzo, owned and fully tuned, with
  the six medals that earn it (Falcone F42 duel 3/1/0 and Grand Prix 1/0/0,
  Aurora duel hard 2, Stuttgart duel easy 1 and medium 1 = 6 medals; the
  unknown `future_car` row still counts for nothing). The Stuttgart row sits
  before `future_car`, the order a normalized save writes, because
  `test-deep-save` and `test-grand-prix-podiums` compare exact bytes.
- `tools/test-enzo-vehicle.mjs` (new): the settled numbers and rules, the
  vehicle contract (driver, steering, four wheels, only the front axle
  steers, brake lights, boost flames, paint, four glazing zones), bounds
  against the declared size and the physics footprint, a helmet that stays
  inside the glass, tire grounding, directional damage on all four sides,
  crush, exact reset, no leaks between two cars, tumbling, and the size
  budget.

## Size

60,442 triangles and 56 draws, against a budget of 73,600 and 66 (the
Jesko's). Armour kit GLB: 474 KB.

## Model fixes (contract gaps the new test found)

The look is unchanged. The test for "size matches the declared size within
2.5 cm" failed, and so did a new check that the helmet stays inside the glass:

- The driver's helmet stood 13 cm above the canopy glass (top at 1.22 m, glass
  1.07 to 1.09 m at that spot), so the whole car measured 1.22 m high against
  1.15 declared. The driver is now at scale 0.80 (was 0.84) and sits 0.115 m
  lower, helmet top at 1.05 m. The steering wheel and dashboard move with the
  driver.
- The model was 4.77 m long against 4.70 declared (and the physics footprint of
  2.35 half length). Moved by 1 to 4 cm: the exhaust tips forward 4 cm, the
  spoiler lip 1.5 cm, the black rear panel and number plate 1 cm, the four
  lamp rings 1.2 cm, and the front splitter tip back 2 cm. It is now 4.72 m.

## Tests

New: `tools/test-enzo-vehicle.mjs` (435 checks). Ran by hand and passing:
progression, koenigsegg-ui, koenigsegg-progression, koenigsegg-driver,
koenigsegg-driving, course-eligibility, combat-armor, heli-cable, heli-jobs,
heli-hooks, heli-mode, heli-save, medals, earned-cars-ui, save-fixtures,
vehicle-assets, vehicle-paint, vehicle-grounding, vehicle-sockets,
vehicle-crush-graphics, armor-kit-fit, armor-kit-authored, armor-kit-assets,
blender-output, light-path, audio, audio-vehicles, drivers, driver-ui,
arena-shove, arena-junk-shove, arena-pit, arena-event, arena-steering,
arena-steering-ceiling, titan-handling, career-budget, course-access,
course-car-choice, paint-presets, yeti, storage-budget, summit-attack.
Lane tier (`--changed --jobs 4 --keep-going`, PowerShell): 381 suites. The
first run stopped at `src/test.js` (the real-name check), so it was rerun with
`--keep-going`; that run had 377 pass and 4 fail (`test-arsenal-core-audio`,
`test-arsenal-wave1-audio`, `test-deep-save`, `test-grand-prix-podiums`), all
from the new car, all fixed as written under Changed assertions and rerun alone
to a pass. `npm run build` passed.

With the switch off the Enzo appears nowhere: `tools/test-earned-cars-ui.mjs`
now checks the real Enzo (not only scratch test cars): no menu picker entry,
"7 EARNABLE CARS" (8 when on), no garage list entry even for a save that owns
it, never a customer car, and air-only.

No browser scenario and no frame check were run. The Panorama Ridge Grand
Prix frame check (a field of Enzo copies) is for Claude to schedule.

## Changed assertions

Every change is the car list growing from nine to ten, or the Enzo being kept
out of a list it does not belong to. No tolerance was loosened.

- `tools/test-progression.mjs`: car count 9 to 10; "one completion reward" now
  counts the Jesko's rule only (`'max-all-other-cars'`) and a new check counts
  one medal car; the Enzo is not owned on a fresh save.
- `tools/test-koenigsegg-ui.mjs`: the list of cars the Jesko needs and the
  garage's owned cars leave out medal cars (an earned car never joins the
  Jesko's list, `docs/EARNED_CARS.md` 4.2); the "7 earnable cars" count now
  uses the cars shown with the switch off, which is still 7.
- `tools/test-koenigsegg-progression.mjs` and `tools/test-koenigsegg-driver.mjs`:
  the prerequisite list leaves out medal cars; it is still the same eight cars.
- `tools/test-course-eligibility.mjs`: after the ordinary fleet is maxed, six
  medals are granted through the real `normalizeProfile`, so every car is
  owned; the air-only refusal now names the Jesko and the Enzo (the refusal
  count is twice as many).
- `tools/test-combat-armor.mjs`: ten car masses; the Enzo's expected armour
  97.02 (formula result for 1,365 kg, same function as every other row).
- `tools/test-heli-cable.mjs`: an Enzo row (1,365 kg, lifts).
- `tools/test-vehicle-assets.mjs`, `tools/test-vehicle-paint.mjs`,
  `tools/test-vehicle-grounding.mjs`, `tools/test-armor-kit-assets.mjs`: nine
  cars to ten.
- `tools/test-medals.mjs`: the Jesko's list is "every car but the Jesko and
  the Enzo"; in the scratch medal-car test the first medal car is now the real
  Enzo, so the list and the cars earned at six medals include it.
- `tools/test-earned-cars-ui.mjs`: the old "no medal car in the game" test is
  replaced by the test of the real Enzo above; the scratch test counts the
  Enzo among medal cars (11 earnable on, 7 off).
- `tools/test-arena-shove.mjs`, `tools/test-arena-junk-shove.mjs` and
  `tools/replays/arena-shove-controls.json`: the rigid-body solver fingerprint
  is computed over every pair of cars, so adding a car must change it. The
  old pin is kept and checked over the nine released cars, and it still
  matches exactly (the solver did not change). A second pin covers all ten
  cars (`solverFingerprintWithEnzo`).
- `tools/replays/titan-handling.json`: a seeded race fingerprint for the Enzo
  is added (a new car needs its own row); the other eight rows are unchanged
  and still match.
- `src/test.js`: "no real trademarks in car data" searched every car for
  "ferrari" or "porsche". The Enzo carries its real name by design
  (`docs/EARNED_CARS.md` 4.2, Kyle 14 October 2026), so the search now skips
  the Enzo's own entry, and a new check says the Enzo is the one car with its
  real name. Every other car is searched exactly as before.
- `tools/test-arsenal-core-audio.mjs` and `tools/test-arsenal-wave1-audio.mjs`:
  each pins a hash of every sound-bank export except the cue list, and that
  includes the engine voices, so the new Enzo voice changed it. The hash is now
  taken with the Enzo's voice left out, and the old hash still matches exactly
  (every released voice is unchanged). The Enzo's own voice is checked in
  `tools/test-enzo-vehicle.mjs`.
- `tools/test-vehicle-sockets.mjs`: message wording only.

## Not done

- No optional row in `src/heli/heli-cable.js`.
- The Panorama Ridge Grand Prix frame check is left for the nightly full
  check.

## Round 5: the look in the game (Claude, 15 October 2026)

- New browser scenario `tools/scenarios/enzo-look.mjs` and sheet recipe
  `tools/art/enzo-look-sheet.py`; sheet `docs/board/looks/earned-cars/round-5.jpg`
  (114 KB) and `round-5-review.md`. The looks folder has a 20 MB budget
  (`tools/test-review-evidence.mjs`) and was already at 19.94 MB, so the sheet
  is built with a 125,000-byte limit and the round 4 sheet it replaces was
  removed (its review note stays). 0 warnings, 0 errors. Evidence in the
  integration folder's `.evidence/2026-10-15/EARN-CAR-1/`.
- Verdict: pass, gritty and not toy-like.
- One review: two faults fixed. The wording said brushed silver wheels, but
  the twin spokes are the shared dark grey metal with a silver rim; a
  material change that only dulled the rim lip, hub, mirror faces and
  exhaust tips was removed. The splitter's front corners still stood about
  8 cm outside the narrowing nose; it now sits 6 cm further back. The sheet
  recipe now fails if the picture is over 500 KB.
- Fixed in `src/enzo-vehicle.js`: the wheels are dark grey twin five-spoke
  with a silver rim (were flat white broad spokes), and the front splitter and the
  diffuser fins are shortened to sit inside the nose and tail.
  `tools/test-enzo-vehicle.mjs`: 66,442 triangles (limit 73,600), 56 draws
  (limit 66). Every test that names the Enzo passes.
- `tools/vehicle-art-check.html` was not changed.

## Removed

Nothing. The Enzo's old unregistered state ("nothing loads it until
EARN-SCREEN merges") ends with this card.
