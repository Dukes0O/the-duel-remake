# HELI-FINISH

Claude's finishing pass on the helicopter's first slice (docs/HELICOPTER.md
section 11). The release is prepared but not made: it waits for Codex's
Kestrel One model (HELI-ART-SRC) and for Kyle's word.

## Flown

`tools/scenarios/heli-first-flight.mjs` and the new
`tools/scenarios/heli-finish.mjs` fly the whole slice in a real browser
with memory-only saves:

- A new pilot: HELIPAD on the main menu, the opening on the radio, the
  instructor's board with Skip, the free first tank, lesson 1 from its
  button. (All four lessons are also flown headless in
  `tools/test-heli-lessons.mjs`.)
- A trained pilot: hook the Falcone F42 beside the pad, climb, choose
  Panorama Ridge, the autopilot flies out of the area, Enter to cruise,
  arrive 1.5 km out at 150 m, the autopilot stops over the zone, let the
  car down, H to let go, "Delivered", Race here, and the race starts at
  Panorama Ridge with the F42. 0 browser errors.
- Each destination from 150 m, the four camera views and the pause
  screen (earlier cards), all still working together.

## Frame check (rule 8)

150 m over Panorama Ridge with the car delivered, hovering on the
autopilot, 120 frames each, with no other gate, build or browser check
running: High p50 16.7 ms, p95 16.8 ms; Performance p50 16.7 ms, p95
16.8 ms; no frame over 33 ms (limit 18.5 ms). Measured with the plain
stand-in helicopter; one more check is needed once the real model (at most
20,000 triangles) goes in. The laptop's own screen was not switched off
for this run, so it is reported, not a release figure.

## Fixed in this pass

- Stop pressed during the 3 seconds after a crash in a lesson now cancels
  the lesson's restart (the HELI-LESSONS review's last note).

## What Kyle should try (Preview, with the helicopter switch)

1. Main menu: HELIPAD. Listen to the opening; try lesson 1 or Skip.
2. Lessons 2 to 4: hover in the circle, land on the H, carry the crate.
3. Fill up at the pump (the first tank is free), take a job on the
   dispatch board, or "Fly my car".
4. Hook your car with H (hover with the hook at its roof), press P with
   Panorama Ridge chosen, Enter when the cruise prompt shows, let the car
   down in the yellow ring, H, then Race here.
5. Try Real mode later (the collective stays where you leave it).
6. Listen to the rotor, wind, engine start and stop, and the radio voice.

## Before the release (not done; waits for Kyle)

- HELI-ART-SRC's model, cargo hook, helipad and fuel pump replace the
  stand-in in `src/heli/heli-scene.js` (contract on the HELI-ART-SRC
  card); then the frame check again.
- Kyle hears the radio voice and the library sounds (Claude's round-one
  verdict was by measurement only).
- The switch `helicopter` goes from `dev` to `on` only at Kyle's "go
  live", by the Release Manager, with the full tier on the exact release
  commit (AGENTS.md, Gates).

## Checks

- `node tools/test-heli-lessons.mjs`: 63 checks (the Stop fix added three).
- Review (rule 17): CONFIRMED (the Stop fix, and the playthrough
  scenario cannot reach real saves or the live port: memory storage, a
  fresh browser profile, a private port). Its one note, check that the
  second crash really happened, is added.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  (PowerShell): 131 passed, 0 failed, 0 not run in 868.90 s before that
  last test line; rerun after it: 131 passed, 0 failed, 0 not run in
  1557.48 s.
- `npm run build`: passed in 998 ms.

## Changed assertions

None.

## Removed

Nothing was replaced. Picture evidence deleted after review; the verdict
is above.
