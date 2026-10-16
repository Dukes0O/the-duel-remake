# EARN-CAR-3

- Task: earned car 3, the Bugatti Bolide (24 medals, 6 of them gold),
  registered in the game (Cockpit T-013). Built by Claude (Kyle prefers
  Claude's original models). Lane `claude/bolide`.
- Status: code, tests and kit complete, behind the `earned-cars` switch
  (dev). Kind: car. Holds `sound-bank` (the engine voice). Merges after
  EARN-CAR-2 (the McLaren F1), so the cars stay in medal order: Enzo, F1,
  Bolide.
- Look: round 2 picked (`docs/board/looks/bolide/round-2.jpg` and
  `round-2-review.md`, which also holds round 1's notes).
  An in-game look round follows registration, as round 5 did for the Enzo.

## What was built

- `src/bolide-vehicle.js` (new): the original model, built in code from
  public pictures of the Bolide as a viewing reference only (no downloaded
  model, texture, badge or logo). A track car about a metre tall and very
  wide: a blue upper body over bare carbon on its lower third, a small
  cockpit bubble with a roof scoop, a fin to a tall rear wing on swan-neck
  pylons, a horseshoe intake, X-shaped lamps front and rear, open intakes,
  four exhausts and a deep diffuser. Declared size 2.06 x 4.82 x 1.18 m (the
  wing included); 65,660 triangles and 55 draws against a budget of 73,600
  and 66 (the Jesko's).
- `src/config.js`: `bugatti_bolide`, appended after the Enzo, with exactly
  the numbers approved on the card: top speed 278 (307 mph tuned, below the
  Jesko's 329), accel 10.5, grip 1.15, braking 1.45, seven gears, off-road
  grip 0.58 / speed 50 / scrub 0.64, mass 1,450 kg, collision 1.05 x 2.5,
  height 1.05 (the body; the wing stands above it), kind hypercar, boost
  capacity 1.35, nitro acceleration 1.35, nitro speed bonus 0.025, blue
  0x1f4fa8 with black trim, `factoryMaxed`, no price, and
  `unlockRequirement: {kind: 'medals', medals: 24, gold: 6}`.
- `src/vehicle-assets.js`: the Bolide routes to `createBolideVehicle` with
  source `earned`. `src/vehicle-sockets.js`: front and roof sockets.
- `src/sound-bank.js`: one `CAR_VOICES.bugatti_bolide` entry (pitch 0.94,
  brightness 1.02, gain 1.04, accent 1.02, exhaust 0.17, intake 0.2) tuning
  the existing engine sample: a big quad-turbo engine, lower and smoother
  than the Enzo's V12. No new recording.
- Armour kit: `bugatti_bolide` in `SIZES` in `tools/blender/armor-kits.py`
  (2.06 x 4.82 x 1.05, the body's height so the kit sits under the wing),
  the paint name in the fit matchers of `tools/audit-armor-kit-fit.mjs`, and
  `tools/blender/kit-review.py`. Generated with only that recipe
  (`--cars bugatti_bolide`): `public/assets/models/wasteland/kits/bugatti_bolide.glb`
  (475 KB; the other ten kits are untouched).
- `docs/HELICOPTER.md` section 5: a Bolide row (1,450 kg, lifts with 50 kg
  to spare) and the special-car sentence. Kestrel One reads the config
  mass; no row was added to the table in `src/heli/heli-cable.js`.
- Review recipe for earned-car models (new, reused by later cars):
  `tools/art/car-review-export.mjs` (the game's builder to a review GLB
  under `.evidence/`), `tools/blender/car-review.py` (four studio renders;
  `--paths-only` plans its outputs without Blender) and
  `tools/art/car-review-sheet.py` (one JPG, 125 KB limit by default).
- `tools/test-bolide-vehicle.mjs` (new): the settled numbers and rules, the
  vehicle contract (driver, steering, four wheels, only the front axle
  steers, brake lights, four boost flames, paint, four glazing zones), bounds
  against the declared size and the physics footprint, a helmet that stays
  inside the glass, tire grounding, the Bolide's shape (fenders well above
  the central channel, high deck, wing above the deck, carbon panels),
  directional damage on all four sides, crush, exact reset, no leaks between
  two cars, tumbling, and the size budget.

## Model fixes the new test found

- The driver's helmet stood 3 cm above the glass. The cockpit bubble is 2 to
  4 cm taller and the driver sits a little further inboard at scale 0.76;
  lowering the driver instead put the seat under the floor clearance.
- The rear glass crack zone sat on the bubble's back edge, where too little
  glass lies under it; the crack zones now sit inside the bubble.

## Not added to the save fixture

The Enzo was added to `tools/fixtures/saves/12-medals.json`. Owning the
Bolide needs 24 medals with 6 gold, a new medal sheet in that fixture, and
the fixture is under the `save-shape` lock, which this card does not hold.
Ownership is tested through the real grant instead: `test-medals` (the real
Bolide follows the 24-with-6-gold rule) and `test-course-eligibility` (24
medals with 8 gold earn both medal cars through `normalizeProfile`).

## Tests

New: `tools/test-bolide-vehicle.mjs` (430 checks). Ran by hand and passing:
progression, koenigsegg-ui, koenigsegg-progression, koenigsegg-driver,
course-eligibility, combat-armor, heli-cable, heli-jobs, heli-hooks,
medals, earned-cars-ui, save-fixtures, vehicle-assets, vehicle-paint,
vehicle-grounding, vehicle-sockets, armor-kit-fit, armor-kit-authored,
armor-kit-assets, blender-output, audio-vehicles, arsenal-core-audio,
arsenal-wave1-audio, enzo-vehicle, `src/test.js`.

Lane tier: see below.

## Changed assertions

Every change is the car list growing from ten to eleven, or the Bolide being
kept out of a list it does not belong to. No tolerance was loosened.

- `tools/test-progression.mjs`: car count 10 to 11; medal cars 1 to 2.
- `tools/test-vehicle-assets.mjs`, `tools/test-vehicle-paint.mjs`,
  `tools/test-vehicle-grounding.mjs`, `tools/test-armor-kit-assets.mjs`: ten
  cars to eleven.
- `tools/test-course-eligibility.mjs`: 24 medals with 8 gold (four full
  sheets) earn the Enzo and the Bolide through the real grant; the air-only
  refusal names the Jesko, the Enzo and the Bolide (three times the courses).
- `tools/test-combat-armor.mjs`: eleven car masses; the Bolide's 1,450 kg
  gives the standard 100 armour (same function as every row).
- `tools/test-heli-cable.mjs`: a Bolide row (1,450 kg, lifts).
- `tools/test-medals.mjs`: the Jesko's list leaves out every medal car; the
  scratch medal-car list includes the real Bolide; a new check that the real
  Bolide follows the 24-with-6-gold rule.
- `tools/test-earned-cars-ui.mjs`: the medal-car test covers the Enzo and the
  Bolide (hidden while off, shown while on, air-only, never a customer car,
  9 earnable cars with the switch on); in the scratch copy the next car after
  the Enzo is the real Bolide (24 with 6 gold), which sits before the scratch
  cars in config order. In the real game the order is Enzo, F1, Bolide.
- `tools/test-enzo-vehicle.mjs`: "the Enzo is the last car" became "the Enzo
  is the first medal car, right after the Jesko".
- `tools/test-arsenal-core-audio.mjs`, `tools/test-arsenal-wave1-audio.mjs`:
  the voice hash leaves out both medal cars' voices; the released voices'
  hash still matches exactly.
- `tools/test-blender-output.mjs`: the new review script is covered as a
  review helper that writes a folder of four renders (a new `render:
  'folder'` kind in the check); the kit recipe's list gains the Bolide.
- `tools/test-koenigsegg-driving.mjs`: the Jesko's nitro must last 30% longer
  and hit 20% harder than every bought car, as before; against a medal car,
  whose approved boost sits just under the Jesko's (capacity 1.35 against
  1.4), it must only last longer and hit harder.
- `tools/test-arena-shove.mjs`, `tools/test-arena-junk-shove.mjs` and
  `tools/replays/arena-shove-controls.json`: the solver fingerprint covers
  every pair of cars, so the Bolide changes it. The released pin and the
  with-the-Enzo pin are kept and still match exactly over their own cars;
  a third pin covers all eleven (`solverFingerprintWithBolide`).
- `tools/replays/titan-handling.json`: a seeded race fingerprint for the
  Bolide is added; every other row is unchanged and still matches. The value
  came from the test's own replay, run alone, which reproduces the Enzo's
  and F42's existing rows exactly.

## Looks folder budget

`docs/board/looks` has a 20 MB budget (`tools/test-review-evidence.mjs`), and
integration was already at 19.98 MB, so any new sheet broke it. Sheets are
named `round-N.jpg` (`tools/test-repo-hygiene.mjs`), so the Bolide's sheets
moved to their own folder, `docs/board/looks/bolide/`. Only the picked round
2 sheet is kept (77 KB); round 1's was removed (Kyle has it). The Enzo's
round 5 sheet, my own and already judged, was removed too (114 KB); its
review note stays and says how to rebuild it. Every sheet named here was
sent to Kyle.

## Removed

- `docs/board/looks/earned-cars/round-5.jpg` (the Enzo's in-game sheet, verdict recorded).
- The Bolide's round 1 sheet (replaced by round 2).
