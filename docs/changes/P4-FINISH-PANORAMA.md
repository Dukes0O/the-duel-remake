# P4-FINISH-PANORAMA

Claude's finishing pass on Panorama Ridge (docs/CIRCUITS.md section 11). The
road, rules, field and saved records are untouched. This pass is evidence,
the Skyline and dusk framing, and two small scenery fixes.

## Review numbers (tools/track-review.mjs and tools/drive-through.mjs)

- Test driver, Falcone F42, seed 1989, High: flying lap 1:32.88, top speed
  189 mph, steepest grade 21%, tightest radius 22 m (The Cutting).
- Drive-through (native lap, three CPU levels): 94.98, 94.98, 94.91 s, 0 lap
  issues, 0 road gaps, 0 solid-barrier passages, 0 ground over the road.
- Minimum speed by corner (mph): Hell Gate 0.5, Griffin Bend 69, The Cutting 5,
  Reid Rise 119, Summit Park 101, Skyline 80, Esses 79 / 53 / 50, Forrest
  Elbow 6, The Chase 137, Murray Corner 58. The test driver nearly stops at the
  three tight corners (one 4-frame stop at the Hell Gate apex); no resets.
- Airborne: Summit Park 45 m at 123 mph, Skyline 33 m at 95 mph, The Cutting
  one frame at 24 mph, plus Murray Corner when the driver runs wide at 171 mph
  into open grass (up to 34 m off the road, no wall there). None on Conrod.
- Native race (new run): laps 115.1 / 89.4 / 87.5 s, all eight cars finish, race
  365 s, final-lap light 0.55. High and Performance identical.

Checklist scores and the verdict are in
docs/board/looks/p4-panorama/round-3-review.md.

## What changed

- tools/scenarios/p4-panorama.mjs (evidence only):
  - Skyline inspection camera: the old camera was 54 m from the radio mast but
    looked past a rock spire and a green bank at nothing useful. New camera is
    on the valley side, 96 m before the crest, 45 m out and 50 m up, about 100
    m from the mast, aimed down the ridge so the road, the drop and the town
    share the frame. The scenario now fails if the camera is closer than 15 m
    to the mast.
  - Conrod dusk camera moved to 129 m down the straight, 30 m over the road,
    looking at the town on its hillside (the old one looked up at a wall).
  - The final lap now repeats the named views at dusk with the field in them
    (Ridge Top, Skyline, Esses 1, Conrod, Murray Corner), not only Skyline and
    Conrod. Lap-three positions use the lap phase, so each view is taken where
    it names. Race rules and state are not touched.
- src/circuits/panorama-ridge.js: two marshal posts moved. The Cutting's post
  now stands on the hill side 40 m before the corner (4.5 m behind the road
  edge); Forrest Elbow's stands 38 m past the corner on the outside, beyond the
  walls. Before, both floated 1.4 to 1.6 m over the ridge slope (limit 0.3 m);
  now both pass. Road, walls, fence, boards and every other piece are the same.
- docs/board/looks/p4-panorama/round-3.jpg (227 KB) and round-3-review.md.

## Checks and results

- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 40 of 40 passed
  (includes the replay fingerprints, world composition, track kits placement
  check for Panorama's 503 pieces).
- `npm run build`: passed.
- Native scenario p4-panorama (private port, memory-only storage): passed for
  High and Performance, all eight cars finish.
- Drive-through for panorama-ridge: still reports FAIL. Remaining items, none
  new and none visible:
  - 342 catch-fence pieces "float" 1.4 to 1.5 m. The fence stands on the 1.15 m
    ridge wall by design (the placement lifts it 1.05 m); the checker measures
    from the bare ground.
  - 12 catch-fence contact probes miss by 0.6 to 1.5 m. The car meets the
    ridge wall first; the fence is scenery behind it and is not solid.
  - Pit garage at s=400 floats 0.317 m, grandstands at s=290 and 345 float
    0.301 and 0.302 m (limit 0.3). Sliding them sideways did not help and
    sliding along the road only moved the problem, so they are left alone.
  Proposed: a small tool card so the drive-through uses the ridge wall (not the
  non-solid fence) for those two checks.

## Changed assertions

None. No test was edited.

## World signature and records

- World signature fixture (tools/fixtures/world-signatures/panorama-ridge.json)
  is unchanged and the guard passes; nothing was regenerated.
- Records and ghosts: the road script, layout version, rules, field and racing
  line are unchanged. Replay fingerprints pass. Placement of two marshal posts
  cannot change a lap time or a ghost.

## Not done, proposed as small cards

- Brighter or larger valley town lights at dusk (needs new light code or art).
- Two small crests on Conrod Straight for air at top speed (section 5.1 asked
  for them). Changes the road, so it needs Kyle's say and a records decision.
- Drive-through tool: judge Panorama's fence by the ridge wall (see above).

## Removed

- docs/board/looks/p4-panorama/round-2.jpg and round-2-review.md (replaced by
  round three).
- The old Skyline and Conrod dusk camera positions in the scenario.
