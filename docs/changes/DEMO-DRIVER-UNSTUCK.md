# DEMO-DRIVER-UNSTUCK

Status: ready for review. Branch `cloud/demo-driver-unstuck`, built in a cloud session
(Claude). Nothing run on Windows or in a browser.

FIX-LAUNCH left `node tools/combat-balance.mjs --check` exiting 1: one Hard race (seed 1993)
never finished. The scripted demo driver (`_driveAutopilot`, `src/app.js`) is knocked off the
road, ends up in a pocket of scenery (the Hidden Road's lines of "hidden wash" buildings) and
steers straight at the road, into the wall, for the whole 600 s cap. A person would reverse and
drive round.

## What changed

- New `src/demo-unstuck.js`, called from `_driveAutopilot` right after the gearbox lines
  (`unstuckInput(this, d)`, 3 lines in `app.js`). It returns `null` except when the car has been
  off the road and slower than 4 mph for 2.5 s, so every run that never sticks is untouched
  (no fingerprint moved; see Checks).
- While stuck it casts the game's own swept collision (`sweepObstacle`, the car's real size)
  along candidate headings: toward the road first, then round the wall along the road either way
  (the side tried first alternates), then wider angles. It keeps a heading while 7 m stays
  open and drives a multi-point turn toward it: each leg (forward, or reverse with the opposite
  lock) runs until the car is pinned (under 1.5 mph for 0.6 s) or 2.5 s, then swaps. It hands
  the car back to the ordinary driver when there is an open 22 m line to the road and the car
  faces it, or when the car is back on the road.
- Last resort, 40 s of rescue without getting out (enclosed on every side, nothing to drive
  round): the same reset the game gives a car that strays too far (`_safeReset`, counted as a
  boundary reset, "BACK ON COURSE / NO DAMAGE"). It was not needed on the card's seeds.
- New test `tools/test-demo-unstuck.mjs`, written first (seed 1993 failed): Hard, no weapons,
  seeds 1993, 1999, 2001, 2004 and 2015 all complete. No seed dropped, no measure changed, no
  target widened.

## Checks

On this branch, merged with `origin/integration/wasteland` (d2e034eb), Linux cloud container:

- `node tools/test-demo-unstuck.mjs`: 5/5.
- `node tools/combat-balance.mjs --check` **exits 0** (it exited 1 before this): player win rate
  Easy 90, Medium 57, Hard 37 percent (bands 80-95, 45-65, 20-40); CPU hits Easy 3.3, Medium 6.0,
  Hard 4.1 (bands 1-4, 4-9, 4-10); ufo-max time gains -2.2, -0.5, -1.5 s (limit 4).
- Lane tier: 459 suites, 447 passed, 12 failed. Eleven also fail on the untouched front branch
  (the Windows-only suites course-kit, earned-cars-ui, full-check, drive-through, medals,
  salt-flats, salt-flats-art; p4-kits, compact-binaries and tanker-valve-source need the
  `C:/Users/kyleb/dev/art-library` files; vesper-art needs Blender). The twelfth is
  `test-drift-trial.mjs` (dev tyre-slip Pro fixture), the known TYRE-SLIP-DRIFT-RETUNE card.
- `npm run build`: passes.
- No replay fingerprint, lap time or pinned number changed, so nothing was re-recorded.

The rescue also frees the same seeds at other CPU launch values that used to strand them (checked
at Hard launch 1.3 and 1.45 for seeds 1999, 2001, 2004, 2015; a few of those use the 40 s reset),
so it is not fitted to one seed.

## Removed

Nothing removed.
