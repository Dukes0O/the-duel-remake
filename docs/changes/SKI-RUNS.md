---
task: SKI-RUNS
status: review
kind: feature
flag: heli-skiing
player_facing: no
---

# Heli-skiing: the five Summit Run ski zones (24 October 2026)

Card `docs/board/cards/SKI-RUNS.md`, design `docs/HELI_SKIING.md` section 5.
Zones as recipes and data in `src/ski/runs/`, on the SKI-RULES physics, behind
`heli-skiing`. Nothing reaches the game yet (no drawing, sound, save or way
into the helicopter): SKI-HELI, SKI-VIEW and the rest build on it.

## What it adds

- `src/ski/runs/recipe.js`: the shape helpers. `fallLine` integrates eased
  slope keyframes into a height table, `fitDrop` scales them to an exact drop,
  `bump`, `distanceToLine`, `gateAt`. Pure, so the snow is the same
  everywhere.
- `src/ski/runs/summit-zones.js`: `skiZone(id)` for `slalom`, `gs`, `moguls`,
  `aerials`, `powder`. A zone is `{id, kind, name, pad, drop, pickup, ground(x,
  z), gates, start, finish, line, stashes, bounds, world, ...}` in its own frame
  (the drop pad is the origin, the run falls toward +z); no height file is
  stored. Also `zoneGuide`, `medalLimits`, `judgedConfig`, `stashAt`,
  `atPickup`, the three `SUMMIT_PADS`, and `altitudeOf`.
  - **Slalom:** 450 m, 180 m drop, 50 gates of red and blue poles 8.2 m apart,
    openings 2 m wide and 2.2 m to each side in turn (a straight run misses
    every gate), the finish at 450 m. The guide skis it in 24 s.
  - **Giant slalom:** 1,100 m, 350 m drop, 40 gates with 8 m openings 12 m to
    each side in turn. The guide skis it in 51 s.
  - **Moguls:** 250 m at 28 degrees, 100+ bumps 3.5 and 4 m apart in two lines
    (2.8 m either side of the centre), two 0.8 m kickers on the centre line,
    a 24 m weave as the planned line, 17 turns planned.
  - **Aerials:** a 40 m inrun at 22 degrees, a 14 m ramp whose face reaches
    64 degrees, a 37 degree landing hill; takeoff at about 50 degrees. Judged
    against a 40 degree landing window (below).
  - **Powder:** the north bowl from the summit pad down to the pickup pad's
    height, with side walls, deep-snow friction 0.12 off the packed line
    (`extraFriction`, 0.07 over the usual 0.05), three 9 m stashes.
- `src/ski/ski-physics.js`: `world.safePathAngle` (optional, degrees). Absent it
  is 20, so every SKI-RULES result is unchanged. A landing hill states its own
  window.
- `src/ski/ski-guide.js`: `guideRun` also returns `landings` and `tumbles`,
  takes `sampleEvery` and `lookAhead` options, and no longer steers while
  airborne (a turn key spins the skier in the air). The defaults give the same
  slalom-shaped results as before.
- `docs/HELI_SKIING.md`: altitudes and section 3 corrected (below).
- `tools/test-ski-runs.mjs`, 174 checks, and two checks added to
  `tools/test-ski-physics.mjs` for the landing window.

## Settled by Claude (the card's "Claude answers")

1. Aerials: the 40 degree window is the aerials hill's own; the ski rules keep
   20. The reason, with the sums: a jump launched at `a` onto a hill falling at
   `b` meets it descending at tan(a) + 2 tan(b), which for a 37 degree hill is
   at least 56 degrees even with no launch angle, so no kicker could land
   inside 20 degrees. Measured with the real physics, the packet's 65 degree
   kicker landed 36 degrees off.
2. One world, so the pads are at the Summit world's real altitudes (the 2,860 m
   base plus the height above the start): summit 3,586 m, Devils 3,237 m,
   pickup 2,886 m. The packet's 3,960 m and 4,302 m were the real mountain's;
   the course climbs only 726 m. **The packet's thin-air lesson is dropped:**
   a full group on a full tank hovers at the summit pad with 112 kg (5%) to
   spare; it would stop hovering at 4,027 m. Nothing was tuned to rescue it.
   `docs/LAB.md` still says the altitude tune lets "a full heli-ski group reach
   the summit on a full tank" (its Air and altitude row); that sentence is no
   longer a reason to buy it and needs a pass from whoever owns the Lab card.

## Pads

`SUMMIT_PADS` are the highest clear level 12 m circles of the Summit Run world
(seed 1989), found with H1's own clear-circle test and then fixed as data:
summit (3104.9, 6904) at 739.7 m, Devils (2325.3, 3256.8) at 391.5 m, pickup
(152, 758.9) at 40 m. The gaps are 348 m and 351 m (the packet's 342 and 350 are
as near as the world has). The test checks each pad is clear, level within
1.5 m and at its ground height, that the summit pad is the highest circle in
the world, and that the altitude is read as every Summit flight reads it.

## Tests

`node tools/test-ski-runs.mjs`: every zone loads (frozen, finite over its
bounds, drop and pickup on the snow, everything inside the bounds); the guide
skis slalom and giant slalom start to finish through all 50 and all 40 gates
with no miss and no tumble, and a straight run misses every gate; the moguls
hold 28 degrees, two lines of bumps 3.5 to 4 m apart and two kickers, and the
guide jumps them and lands clean; the aerials face is 64 degrees, the hill 37,
the takeoff about 50, the guide's jump is safe (30 degrees off the snow) and
would tumble under the usual 20, a drop onto the flat still tumbles, a whole
spin is a gold and none a bronze; the powder run reaches the pickup from the
summit pad, the packed line and a tour through all three stashes both arrive
with no tumble, deep snow slows you; the pads match the Summit world; the
thin-air numbers match the helicopter's own thrust rule.

## Sound events

None new: the zones use the ski rules' events (`skiCarve`, `skiSkid`,
`skiGate`, `skiPop`, `skiLand`, `skiTumble`). Art: none.

## Changed assertions

None is loosened; the one guard change only adds a permission.

- `tools/test-heli-mode.mjs`, the "no unapproved src/heli imports" guard: four
  entries added to its allow-list for `tools/test-ski-runs.mjs` (`heli-ground`,
  `heli-search`, `heli-flight`, `heli-jobs`). The zone test reads the Summit
  Run world's ground and clear-circle test for the pads, and the thrust rule and
  base altitude for the thin-air numbers. Without them the guard (correctly)
  fails on the new test. **Needs Claude's written review on the card (rule 18).**
- `tools/test-ski-physics.mjs`: two checks added (the landing window); no
  existing assertion changed.

## Checks

Run once in the cloud (Linux, no graphics), on the branch merged with the
current `integration/wasteland`:

- `npm run build`: passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 411
  passed, 9 failed. Eight need the laptop (Windows only or Blender) and none
  touches the ski code: `test-course-kit`, `test-earned-cars-ui`,
  `test-full-check`, `test-drive-through`, `test-medals` (each asserts `win32`
  or runs `pwsh`), `test-salt-flats`, `test-salt-flats-art` (read
  `C:\\Users\\kyleb\\dev\\art-library`) and `test-vesper-art` (needs a local
  Blender). The ninth, `test-heli-mode`, was the import guard above; fixed, and
  rerun on its own: 176 checks pass.
- Not run: browser scenarios and frame checks (nothing is drawn yet).

## Removed

Nothing.
