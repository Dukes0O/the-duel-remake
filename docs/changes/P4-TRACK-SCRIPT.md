# P4-TRACK-SCRIPT: authored circuits

Claude built this card (Sonnet agent, 10 October 2026) to docs/CIRCUITS.md
section 3.1. No game behaviour changes: `COURSE` gains no new event and every
existing course, replay fingerprint and road sample is exactly as before.

## What it does

A circuit is a list of straights and turns. `src/track-script.js` turns the
list into a road. A course definition that carries a `script` is built from it
by a new branch in `Course._build` (like the Pit); every other definition takes
the old path untouched.

- **Pieces and options.** `['straight', length, opts]` and
  `['turn', 'L'|'R', degrees, radius, opts]`. Options: `climb`, `width`,
  `bank`, `crest`, `walls`, `surface` (a name only, for P4-GRIP), `kerbs`,
  `boards`, `name`. A mistyped option or an impossible piece stops the build
  with a message that names the piece.
- **Width, walls and surface stay in force from the piece that sets them until
  a later piece changes them** (width is the full road width in metres; the
  default is 14, which is the old 7 m half width). The other options belong to
  their own piece. A new width arrives smoothly over 40 m (or 60% of the piece).
- **Corners.** Each turn eases in and out with a clothoid of 25 to 60 m (30% of
  radius times angle, never under 25 m). The turn's degrees include the eases,
  so the turn sum stays exact and the heading is smooth. The radius is held in
  the middle of the corner. A turn too short to hold two 25 m eases (radius
  times angle under 25 m) is refused with a clear message.
- **Closing a loop.** The turns must add up to 360 degrees (or -360 for a
  clockwise lap) within 2 degrees, or the build fails and says by how much. The
  few leftover degrees are shared across the turns so the heading is smooth over
  the start line. The remaining position gap is closed by stretching or
  shrinking the straights only, by least squares (smallest total relative
  change), each by at most 15%. If that is not enough the error lists what each
  straight would need without the limit. `tools/track-script.mjs` prints every
  straight's change. Height that does not return to the start is spread over
  the straights.
- **Point to point.** `closed: false` builds an open road with one lap.
- **Height.** Climbs join with matching slope (no kinks); a `crest` adds a
  smooth bump in the middle of its piece (32 m each side, at most 45% of the
  piece), which becomes a jump through the existing crest flight on a course
  with `airborne: true`. `bank` leans the road into a turn, rising with the
  corner's curvature; it tilts the road surface only, no grip effect yet.
- **Width everywhere.** `Course.roadHalfWidthAt(s)` (alias `halfWidthAt`) reads
  the script. Driving, contacts, lap checks, the computer racers, the demo
  driver, the road mesh and the shoulder shader all already read that call;
  the shoulder shader had a built-in 7 and now takes each vertex's own road
  edge on scripted courses (`src/road-surface.js`, `src/world.js`).
- **Walls.** Solid boxes 3 to 4 m long, 1 m thick, 1 m outside the road edge,
  1.15 m high with a finite top (`minY`/`maxY`), so a car in the air over a
  crest clears one and a grounded car hits it. They are listed in
  `course.features.walls` and in `obstacles`, not in `barriers` (those draw
  rails). Drawing them is left to the circuit cards with the art Kyle picks.
- **Runoff, kerbs, boards.** `script.runoffAt(s, side)` is 0 beside a wall and
  12 m of clear ground otherwise. Kerbs (inside round the apex, outside on the
  exit) and braking boards (150, 100, 50 m before every turn under 40 m radius,
  on the outside, on straight road only) are lists of positions in
  `course.features.kerbs` and `boards`; `boards: false` or `true` overrides.
- **Racing line and speed profile.** `course.racingLine`: a lateral offset and a
  speed for every 2 m. Outside, apex (55% through), outside, never closer than
  1.5 m to the edge; speed from the line's own curvature, then braking and
  acceleration passes. Stored for a reference car; `buildRacingLine(script,
  dynamics)` rebuilds it for another car.
- **Reverse.** `reverse: true` builds the pieces in reverse order with turns
  flipped, climbs negated and wall sides swapped; boards and kerbs are rebuilt.
- **Start line.** `scriptStart: metres` moves the start line along a closed
  script (Panorama's "start line 80 m in").
- **`noTraffic: true`** on a definition removes oncoming and same-way traffic
  (one line in `_spawnTraffic`). Grand Prix circuits are a pure race.
- **Registry.** `src/circuits/index.js` exports `CIRCUITS` (empty for now);
  `config.js` appends it to `COURSE` after the freestyle course, so earlier
  events keep their ids.
- **Tools.** `node tools/track-script.mjs <course id | file>` prints length,
  turn sum, closure changes, climb left over, highest grade, tightest radius,
  and writes a top-down PNG with corner names to `.qa-dist/` (road, walls,
  kerbs, boards, racing line coloured by speed, start line). `--reverse` and
  `--out` are supported.
- **Fit tool.** `node tools/track-script-fit.mjs <id | file> [--keep "Name"]`
  finds the smallest changes to straights and turn angles that make a draft
  close and prints a corrected script (`measureScript` in `track-script.js`
  draws a script without closing it, for this).
- **Test driver.** `tools/track-script-drive.mjs` drives a circuit headless
  through the real Duel: the stock demo driver, or (default) the same steering
  with the circuit's racing line and speed profile. The stock driver judges a
  corner from three points ahead of the car and cannot brake for a hairpin at the
  end of a long straight; the circuit driver can. P4-FIELD will want the same
  idea in the racers.

## Decisions to review

- Turns include their eases in their degrees (the alternative, adding eases on
  top, would break the 360 sum). A turn's piece length is radius times angle
  plus one ease length.
- `walls`, `width` and `surface` are sticky. This makes "walls both sides
  everywhere" one option.
- Small additions outside the listed files: `noTraffic` in
  `src/sim-rival.js`; `src/world.js` and `src/road-surface.js` for the road
  mesh and shoulder; a second new file `src/track-script-course.js` (installs a
  script into a Course) and `tools/track-script-drive.mjs`.

## Checks

- Tests: `tools/test-track-script.mjs` (18 checks): closure, heading and
  height, tangent joins and clothoid ease, 15% limit and error messages,
  width (smooth, read by surfaces, shoulder, 7 m kept), walls and finite height,
  crests, bank, boards, kerbs, runoff, racing line and speed limits, reverse,
  start line, point to point, repeatability, a hash of every existing course's
  road samples, a full driven race of the pilot circuit forward and reverse,
  the Panorama draft, the picture tool.
- Existing roads: the hash of every existing course's samples and obstacle count
  was taken on the plan branch before any change and matches after.
- Pilot circuit (test only, 2.19 km, 30 m tightest radius): the circuit driver
  completes two laps forward and reverse on Medium with the rival, no crash,
  nothing stuck; laps about 61 s.

- Lane tier (308 suites): all pass. The first run failed two: the shortcut
  preset freshness check (it fingerprints the `at` and `_height` code in
  `course.js`, which this card edits; regenerated with
  `tools/generate-shortcut-presets.mjs`, only the fingerprint line changed, every
  saved shortcut path is identical) and the repository placement check (my own
  scratch files, since removed). Build passes.

## Open for the circuit cards

- The three circuit drafts in docs/CIRCUITS.md do not close as written (see the
  report to Claude): Panorama Ridge ends 275 m off, Tremblant Woods 1,734 m off,
  and two Harbour Lights turns are shorter than a 25 m eased join allows.
- Walls, kerbs and boards have data and collision but no drawing yet.
- The map draws the centreline only (no width).

## Removed

Nothing replaced: the old formula path is untouched and still builds every
existing course.
