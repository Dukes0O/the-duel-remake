---
task: P4-REVIEW-TOOL
status: merged
kind: tooling
flag: none
player_facing: no
---

# Claude's track review tool (10 October 2026)

`node tools/track-review.mjs <course-id> [--quality high|performance]` gives
Claude, without playing by hand, what docs/CIRCUITS.md section 11 step 2 asks
for. One run, one private port, memory-only saves, raw output under
`.evidence/<date>/review/<course-id>/` (Performance gets `<course-id>-performance`).

- `map.png`: top-down centreline coloured by the test driver's speed, numbered
  and named corners (slow ones red), crests (yellow when the car leaves the
  ground), start line and direction arrow, plus a corner and crest table.
- `frames.jpg` (and each frame at full size in `frames/`): 16 ordinary
  chase-camera frames. Order of choice: grid, end of the longest straight, the
  five tightest corners at braking point and apex, the sharpest crests that
  still fit (the rest are listed in review.json as not framed), then evenly
  spaced fill so the sheet is always 16. Each frame says its name, distance and
  speed. The car is run up to each point with the test driver so speed, lean and
  any lift-off are real; other cars are moved out of shot.
- `speed.png`: speed against distance for the test driver's flying lap, corner
  minimums, slow corner bands, crest lines, road height and the lap time.
- `pack.png`: the field before the first corner (chase view and a view from
  above), taken at most 10 s after the start; it says when the corner was not
  yet reached. Courses with no computer racers skip it and say so.
- `review.json`: lap time (first and flying lap), top speed, steepest grade,
  tightest radius, longest straight, every corner and crest with numbers, the
  frame list, and `browserErrors` per frame. Browser errors are kept in the
  file instead of stopping the run, and the tool prints a WARNING.
- `lap-trace.json`: the raw trace, if a number needs checking.

Corners are found from the centreline itself (bends tighter than 600 m radius
turning at least 20 degrees), so the same code works on every circuit. Scripted
circuits (P4-TRACK-SCRIPT): when the course carries named pieces (`pieces`,
`script.pieces`, `track.pieces` or `features.pieces`, each with a name and a
start and end, or start and length, in metres), corners and the longest straight
take those names. Otherwise corners are numbered. If the finished track script
stores names somewhere else, change `namedPieces()` only.

Optional: `--car`, `--seed`, `--flags a,b` (switches for a circuit that is off by
default), `--output-dir` (under `.evidence/`), `--no-browser` (numbers only).

## Tests and checks

`node tools/test-track-review.mjs` (no browser): argument and output naming,
corner, crest and straight finding on a synthetic circuit, name pickup from
scripted pieces, exactly 16 frames with the chosen corners, crests and ordering,
the drawing functions. Ran the tool on pacific-canyon and eifel-crown and looked
at every picture. No race fingerprints change; no game code is touched.

## Notes

- The test driver is the game's own demo driver (`_driveAutopilot`) with its
  scripted shoulder excursion off. It is a steady driver, not a fast one, so lap
  times are a guide to compare tracks and edits, not a target for a human.
- Pacific Canyon laps in 50 s and Eifel Crown in 1:23 with this driver, under the
  1:30 to 2:15 target; the tool prints the numbers, the finishing pass judges.

Removed: nothing.
