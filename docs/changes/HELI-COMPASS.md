# HELI-COMPASS

Claude (Director), 1 November 2026. Card `docs/board/cards/HELI-COMPASS.md`.

## What changed

- `src/heli/heli-flight.js`: `compassBearing(dx, dz)` and `compassDirection(degrees)`, the HEADING
  gauge's compass (0 north, +z; 90 east, -x), beside `heliReadout`, which already read this way.
- `src/heli/heli-session.js` (`bearingTo`: rescue, avalanche, hoist, supply, fuel truck, home pad,
  nearest ski pad, survey square) and `src/heli/heli-fire-run.js` (the fire's bearing) use it, so a
  pilot who flies the number on the line reaches the place.
- `src/heli/heli-fire.js`: the day's wind keeps its `from` and `toward` (the fire spreads as it
  did); only its name is counted the gauge's way, so "wind from the east" blows from the gauge's east.
- `src/lab/lab-challenges.js`: the Headings smoke is placed by `compassDirection`: still 070 and
  550 m from the pad, now where the gauge's 070 points. Its old private `compass` helper is gone.

## Removed

- `compass` in `src/lab/lab-challenges.js` (replaced by `compassDirection`).

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-challenges.mjs`, "where things are": the marker's heading from the pad was checked
  with the mirror reading (`atan2(dx, dz)`), which pinned the fault. It is now checked with
  `compassBearing`, the gauge's reading: same 70 degrees and 1e-9 tolerance, same 550 m. Nothing is
  loosened, and a new test flies the real challenge on the gauge (070 reaches the smoke, 290 does not).
- `tools/test-heli-fire.mjs`, the wind: a wind from +x (`from` 2) was pinned as "E"; on the gauge +x is west, so
  it is "W" (still blowing toward -x), and a new case pins `from` 6 as "E" blowing toward +x. Same exact checks.
- Re-recorded pins, one reason each (the hashed views carry the bearings and the wind's name, now the gauge's).
  For each, the views before and after were compared field by field: only `bearing` and the wind `name` (and
  the board's wind words) moved.
  - `test-heli-autopilot-rescue.mjs` OFF_PIN, was 2449056266 (the fire bearing, 212 became 148).
  - `test-heli-rescue-session.mjs` FIRE_SESSION_FINGERPRINT, was 2478802993 (fire bearing, wind name).
  - `test-heli-skin-session.mjs` hiker, avalanche, hoist, supply and fire (rescue and fire bearings, wind name).
  - `test-heli-summit-rescues.mjs` OFF_PIN, was 2318537187 (rescue bearings, wind name).

## Not changed (its own card)

- The pilot's map chart between pads is drawn as a mirror of the world: +x to the right, and its bearings
  (`heli-jobs.bearing`, `pilot-map-view.bearingKm`, the Lab's Headings bench) count east as +x, which is how a
  helicopter arrives at and leaves a course. It agrees with itself, but not with the gauge; with the moving map
  open, its hover bearing now differs from the fire and rescue lines. HELI-CHART-MIRROR (Claude) flips the chart.

## Checks
- `tools/test-lab-challenges.mjs` 25/25, including the new flight on the gauge (070 reaches the smoke,
  290 never comes nearer).
- The four pinned suites, `test-heli-fire.mjs` and the suites that read bearings or wind names
  (fire view, heli audio, bucket, job clarity, jobs, mode, rescue view, search, survey, Lab view, map
  destinations, map view, audio) pass.
- Lane tier (`--changed --jobs 4`): 73/73. `npm run build` (direct Vite): passes.
- One independent review: the code right; three faults, all fixed (one pin not yet re-recorded, the
  change note incomplete, a comment above the wrong function). It also found the chart mirror,
  carded as HELI-CHART-MIRROR.
- Rule 19: helicopter and Lab code since the full tier on c31e8e5a; no save shape or physics change
  (the new helpers only read angles), so the lane tier covers it.
