# QA-SUMMIT-GLACIER-EDGE

Status: built, tested. Test tools only; no game code, road, edge, physics or save changes.

## What the card said

The Summit drive check ended a run 2 mm past the 6 m road edge at Glacier
Hairpin (s=8565.15, lateral 6.0023 to 6.0024). Which is at fault: the driver's
line, the edge rule or the road?

## Cause

The 2 mm was only the first moment the car crossed the edge. The check records
one "off-road" row per run, so it hid the real size. Driven on the same
settings, the car ran up to 5.5 m past the edge through Glacier Hairpin, and
the same happened at Devil's Elbow and Last Breath (the other two snow
hairpins). The edge rule and the road were measured and are correct. Two things
were wrong:

1. **The driver's line and speed (a real fault).** The racing line and speed
   plan are worked out for dry road. On snow the car turns more slowly. Its
   turning rate falls in step with the traction, but the driver only slowed by
   the square root of the traction, and kept the dry line's inside apex. At the
   dry line the car cannot get round a 16 m hairpin on snow and runs wide.
2. **The check's tyres (a setup fault).** The check drove summer tyres, the
   unmarked default. On packed snow the F42 on summer tyres has a tightest
   circle of about 23 m (30 mph over its turning rate of 1.35 x 0.82 x 0.525).
   The hairpin's outer edge is 22 m from its centre. No line or speed can keep
   that car on the road: it must leave by about 1 m. With the driver fixed it
   still leaves by 0.9 to 1.3 m, which matches. On winter tyres (traction
   0.70) the tightest circle is about 17 m and the hairpin fits. A player on
   snow picks winter tyres on the setup, and `test-circuit-layouts` and the
   Summit tests already do the same.

The edge was not widened and no limit was loosened.

## Fix

- `tools/track-script-drive.mjs` (the test driver): on ground with less than
  full traction the driver builds its racing line with the same builder, using
  the car's limits scaled to that traction (a bigger circle, a lower speed) and
  a tenth of the turning rate held back. Lines are kept per 5% traction step.
  The speed target no longer scales by the traction a second time when this
  line is used. Dry road (traction 1) takes the old path exactly.
- `tools/drive-through.mjs`: a course that has snow or ice is driven on winter
  tyres, as a player would set up for it. The report's `profile` shows
  `tyre: "winter"` for such courses. The barrier probes are unchanged.

## Results

Summit drive check (`node tools/drive-through.mjs --course summit-run`), seed
1989, three CPU levels: before, FAIL (off-road at Glacier Hairpin, three
times). After, PASS with zero issues. Laps 267.97, 268.24 and 267.97 s.
Furthest the driver goes past the edge at the snow hairpins, winter tyres,
one lap: Glacier 2.58 m before, 1.9 m inside the edge after; Devil's Elbow
3.08 m before, 1.1 m inside after; Last Breath 3.09 m before, 1.1 m inside
after. Same hairpins on summer tyres: about 0.9 to 1.3 m past the edge with the
fixed driver, from the turning limit above.

Gates are listed at the bottom.

## Changed assertions

None. No test file was edited.

## Open for the Director

On summer tyres the F42 cannot stay inside the edge on the three snow
hairpins (Glacier, Devil's Elbow, Last Breath), by physics, not by driving.
That may be fair (summer tyres on snow are meant to cost), but it is a design
call: a hairpin of 16 m or 15 m radius on a 12 m road leaves no room for a
summer-tyre circle of 23 m. I did not touch the road or the edge.

## Removed

Nothing replaced. The driver's old single square-root traction scaling stays
for the case where the line is the dry line. Scratch probe scripts were in the
ignored `.qa-dist/` folder and are deleted.

## Checks

- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 37 of 37 suites
  passed, none failed, none unrun. This includes `test-drive-through`,
  `test-circuit-summit`, `test-circuit-ardennes`, `test-reference-laps`,
  `test-replays` (225 fingerprint checks, every pin unchanged),
  `test-world-composition` (world signatures unchanged), `test-race-surfaces`,
  `test-tyre-slip`, `test-grand-prix-cups`, `test-lab-tune` and `test-track-script`.
- By hand: `test-opponents` (300 checks), `test-campaigns` (66) and `test-summit-ground-gaps` passed.
- `node tools/test-circuit-layouts.mjs` (runs the driver on every circuit,
  including the snow ones): 17 of 17 passed.
- `npm run build`: passed (existing chunk-size and dynamic-import warnings
  only). Output deleted.
- `node tools/test-circuits.mjs` was not run: no road geometry changed.
