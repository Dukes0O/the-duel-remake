# FIRE-BUCKET

Claude, 14 October 2026. The bucket on the cable: scooping, pouring, falling
water, the aim ring and damage (`docs/HELI_FIRE.md` sections 5 and 6). Nothing
in the game imports it yet; FIRE-HOOKS wires it in behind the `forestFire`
switch (fitting buttons, the H key, the session and the instruments).

Needs: HELI-FINISH code merged at 64198f94 (the main design session ruled the
pending H1 release is not a build dependency).

## What changed

- `src/heli/heli-bucket.js` (new): the bucket as an H1 cable load. Its mass
  is 50 kg plus the water, so the cable's pendulum, drag and hit rules apply
  unchanged. Its load point is the top ring; the body hangs 3.8 m below it
  (2.5 m rigging, 1.3 m body). Exports `createBucket`, `stepBucket`,
  `setBucketWater`, `bucketWords`, `damageBucket`, `bucketHit`, `aimPoint`,
  `aimLocked`, `aimRingRadius`, `keptShare`, `wetRadius`, `BUCKET`,
  `DROP_AIM_RINGS`, `HIT_DAMAGE`, `DAMAGE_NAMES`.
  `stepBucket(bucket, {ground, wind, pour}, dt)` runs before `stepCable` and
  returns `{events, patches}`; the patches `[{x, z, litres, radius}]` go to
  `applyWater`. It never imports the fire.
- `src/heli/heli-ground.js`: `createHeliGround` takes an optional
  `water(x, z)` and exposes `water` (null everywhere when none is given, so
  `flatGround` and every H1 caller behave as before). `groundFromCourse` builds
  it from the course's `basins` lakes with `courseWater(course)`: the lake
  outline against `course.nearest` and `course.phase`, wrapping the lap, with
  the surface at `course._height(basin.s) + basin.surface` (the formula
  `installBasins` uses). Nothing is cached.
- `src/heli/heli-cable.js`: a load may carry its own `restHeight`
  (`load.restHeight ?? CABLE.restHeight`) in `createLoad`, `release` and the
  ground contact in `stepCable`. A load made without one has no such property
  and rests at 0.7 m as before.
- `tools/test-heli-bucket.mjs` (new, found by the runner by its name).

## Numbers

- Fill: `100 x min(1, depth / 1 m)` L/s while the bottom is 0.3 m or more
  under. Speed up to 5 m/s full rate, 5 to 10 half rate, over 10 none.
  Over 5 m/s the water drags the bucket back at 2,000 N per m/s (capped at
  the cable limit, 58,860 N). Over 10 m/s one light hit (dented) per dip.
- Tremblant Woods' real lake: helicopter 17.8 m above the water puts the
  bucket's bottom 1.02 m under and fills 600 L in 6.00 s; 18.3 m (0.52 m
  under) in 11.7 s; 19 m does not reach.
- Damage: dented 450 L and 3 L/s, torn 300 L and 8 L/s, ruined holds nothing.
  `bucketHit` maps `cargoHit` kinds (light, heavy, wreck) to dented, torn,
  ruined; it never lowers damage and charges nothing.
- Pour: 400 L/s, 24 parcels of 25 L for 600 L. Parcels start at the bucket's
  bottom with its speed, fall with gravity and drag to a 9 m/s top speed
  against the moving air, and land on the ground or the tree tops. Patch
  radius `2 + 0.12 x fall`; all water up to 30 m, 40% by 90 m and above.
  From 30 m moving at 15 m/s the water lands 12.8 m ahead of the release; at
  7 m/s of wind with no speed it lands 20.5 m downwind; from 80 m half
  arrives, in discs of 11.6 m radius. The air slows sideways speed fast, so
  the advice "release a little short" holds even at 15 m/s.
- Aim ring: `aimPoint` runs the same parcel model forward. It agrees with a
  hovering pour's mean landing point to within 0.2 m (the test allows 2 m),
  and with the first parcel when moving. `DROP_AIM_RINGS = [12, 8, 5, 0]`.
- Cable stability: a 50 kg empty bucket, a half bucket and a full bucket on
  the 15 m cable under a helicopter flown for 60 s (30 s for the half) with
  pitch, roll and yaw changing: no crash, no runaway speed, the cable never
  stretched more than 10 cm, no strike on the helicopter.

## Tests

- `node tools/test-heli-bucket.mjs`: 229 checks pass (fill by depth and by
  speed band, water drag and its cap, mass follows the water, a full dip at
  the real lake, the water query on the lake, road, start line and shores, the
  lap wrap, pour rate and parcels, landing forward and downwind, wider and
  thinner from higher, tree tops, the aim ring against the pour, lock and ring
  sizes, the words, damage and holds and leaks, only worse, hits from the
  cable, dipping too fast, the full call once, a light bucket under a moving
  helicopter, fitted at the pad and lifted away, and the same fingerprint
  every run).
- `test-heli-cable` 87, `test-heli-flight` 119, `test-heli-hooks` 124,
  `test-heli-mode` 144, `test-heli-jobs` 554, `test-heli-lessons` 63,
  `test-heli-view` 98, the heli save and audio suites: all pass unchanged.
- `npm run build` passes. Lane tier (`--tier lane --changed --jobs 4`, 132
  suites): 131 pass; `tools/test-repo-hygiene.mjs` fails on "run-log.md:
  unexpected repository-root file", which comes from the integration
  baseline (`run-log.md` is tracked in the root there) and not from this card.
  Fifteen suites after it were not run by the stopped lane; they were run by
  hand with the runner and all pass.

## Changed assertions

One, at the coordinator's direction: `tools/test-heli-mode.mjs` lets the
helicopter rules files import only `./heli-*`, `../config.js`,
`../rendered-ground.js`, `../rng.js` and `../course-access.js`. The water query
reads the course's lake outline with `basinReach` from `src/circuit-hills.js`
(pure geometry, no page, clock or randomness), so `../circuit-hills.js` joins
that list with the comment "FIRE-BUCKET: the water query reads the course's
lake outline". Nothing else in the test changed, and the guard still refuses
every other outside import.

## Left for later cards

- Bucket body against trees: the cable tests tree strikes at the ring, 3.8 m
  above the bucket's bottom, so branches under the ring do not strike it.
  FIRE-HOOKS or a cable follow-up can add a load-body depth if testing shows it.
- Fitting, the H key, repairs, saved damage, sound cues and instruments are
  FIRE-HOOKS, FIRE-SAVE and FIRE-RADIO.

## Review (rule 17)

One independent reviewer read the diff and measured the bucket. Fixed:

- An empty bucket made the cable shake at the step rate (the cable's
  damping is too strong for a 50 kg load at 1/120 s; tension jumped between
  0 and about 1,100 N every step). `stepCable` now caps the damping at the
  load's mass over the step, which only changes loads under 100 kg; the
  lightest H1 load is the 500 kg crate, so every H1 number and test is the
  same. New test: an empty bucket hangs at its weight with a step change
  under 5 N.
- Tremblant Snow lists the same lake but draws it frozen; the water query
  now skips a frozen lake, so nothing fills there. New test.
- The aim ring marked where the first parcel lands, but the bucket keeps
  moving for the 1.5 s pour, so most of the water landed 6 to 12 m past the
  ring. The packet says the ring shows the centre of the water, so the ring
  now starts its parcel half a pour on. The moving checks now really move
  the bucket while it pours (they did not before) and agree within 2 m.

Still open, for FIRE-HOOKS: the cable checks tree strikes at the ring, 3.8 m
above the bucket's bottom, so low branches do not hit the bucket.

## Removed

Nothing.
