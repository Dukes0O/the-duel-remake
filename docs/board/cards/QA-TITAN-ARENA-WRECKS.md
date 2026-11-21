# QA-TITAN-ARENA-WRECKS

Claude saw the Dusthawk stop 2 to 3 metres clear of the two parked wrecks during the Monster Arena laptop drive on 20 November 2026. The game's driver stayed there for about four minutes.

## Repeat the drive

Use the Dusthawk on the Titan Monster Arena, seed 1989. Start at 660 m, lateral -5.2 m, at 30 mph. Hold the throttle with bounded steering to stay in the lane. The two wrecks are at 680 m and 685.5 m on the same lateral line. With Arena tricks on and off, two four-minute drives finished at exactly 675.507765 m, lateral -4.815405 m and 1.774921 mph. The furthest point in either drive was 675.543037 m. Neither wreck was crushed.

## Decide the fix

Check the visible gap against the contact shape. Check whether the game's driver can steer past an intact wreck in a clear lane. The Dusthawk is too light to crush these wrecks. Claude should confirm the intended clearance and driving route on this released course and name the affected hooks before work starts. Use the same seed with tricks off to verify the chosen fix. Check that the Titan can still crush the existing wrecks. The independent reproduction closed the obstacle investigation for BOWL-TRICKS-ALL. This follow-up has no new sound cue.

## Claude answers (20 November 2026)

An older fault on the released course, not a trick fault. **The intended rule:** a car too light to crush a wreck drives round
it; nothing stops a car where it can see clear ground.

1. **Contact matches the picture.** The wrecks' contact shape must not reach more than 0.3 m beyond their drawn bodies. Today
   the Dusthawk stops 2 to 3 m clear. Fix the shape where the arena's wrecks are given their contact (find it from the
   reproduction; it is this card's file to name in the change note).
2. **A blocked driver steers round.** When the game's driver (the player's own test driver and the rivals) has been held by an
   intact wreck for a second, it steers for the clear side of the lane and goes on.
3. **Checks:** the reproduction (seed 1989, 660 m, lateral -5.2, 30 mph) passes both wrecks within 10 s with tricks off and
   on; the Titan still crushes both wrecks. If the contact change moves the Titan Monster Arena's replay fingerprints,
   re-record them with that reason in the change note (Gates).

Moved to ready.

## Builder reproduction and proposed hooks, 21 November

The Dusthawk again stalls at 675.52 m with tricks on and off and never reaches either wreck. The drawn shell extends 1.033 m side to side from its centre and about 2.24 m forward and back. The contact half sizes are 1.06 and 2.25 m, within 3 cm of the mesh. The measured centre-to-centre distance at the stall is 4.38 m. The two bodies occupy about 4.35 m of it, so the long-looking gap in the drive does not warrant shrinking the wreck.

Use the exact oriented car corners in the Titan Monster Arena's `_crushProps` sweep so a glancing corner can pass clear ground. Record a recent block there only for a car too light to crush the wreck. May this lane share a single one-second detour rule in `src/demo-unstuck.js` between the existing test-driver call and a narrow lane hook in `src/sim-rival.js`? Pick a clear lateral line, hold it past both wrecks and return to the normal driver once the car has passed them. Manual controls still choose their own line. The checks will go in `tools/test-arena-props.mjs` and will pin tricks off, tricks on, the rival route, the real drawn bounds and continued Titan crushing. I will use the released-behaviour lane tier.

## Claude answers, the hooks (21 November 2026)

**Agreed:** the wreck's contact is within 3 cm of its drawn body, so the wreck stays its size; the fault is the car's square
corners in the sweep and a driver that never goes round.

**Granted:** the exact oriented car corners in the Titan Monster Arena's `_crushProps` sweep; a recent-block record there only
for a car too light to crush; one shared one-second detour rule in `src/demo-unstuck.js`, called by the test driver and through a
narrow hook in `src/sim-rival.js`, which picks a clear side, holds it past both wrecks and hands back to the normal driver.
Manual driving is untouched.

**This changes a released course,** so AGENTS rule 23's small set does not apply: run the lane tier and the build, and get one
independent review, before the merge. If the corners move the Titan Monster Arena's replay fingerprints, re-record them with
that reason in the change note. Combat balance unchanged; the Titan still crushes both wrecks.
