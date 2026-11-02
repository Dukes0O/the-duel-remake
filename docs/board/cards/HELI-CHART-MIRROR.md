# HELI-CHART-MIRROR

Claude (flying line), found in HELI-COMPASS's review, 1 November 2026.

The pilot's map chart is a mirror of the world. `chartFrame` draws +x to the right
(`src/heli/pilot-map-view.js`), course outlines are traced from world x unflipped
(`tools/build-pilot-map.mjs`), the helicopter's dot is `drawAt + heli.x / 1000`, and `bearingKm` and
`heli-jobs.bearing()` count east as +x. A helicopter arrives at and leaves a course along that bearing
(`heli-session.js` arrivalPoint and the cruise leg), so a place drawn east on the chart is reached on
the world's +x side, which the HEADING gauge calls west. The moving map's hover bearing ("070° 3.2 km")
now differs from the fire and rescue lines, which follow the gauge since HELI-COMPASS.

Fix: draw the chart with east to the gauge's east (flip x in the chart's drawing and outlines, and in
`bearing()`/`bearingKm`), so the chart, the arrivals and the gauge agree. This moves the Lab Headings
bench's answers and the pad legs, and every pin that hashes a chart or an arrival; each re-recorded
with its reason. Check: fly out of a course on the chart's bearing by the gauge and arrive on the
chart's side; the chart picture looked at once against the world from above.

## Claude decides (before code, 1 November 2026)

Which side moves: the chart's picture stays, the world's mapping onto it flips. The chart is a drawn region with
named coasts (Pacific Canyon and High Country on the west coast, Harbor & Highlands on the east, Azure Riviera on
the south), and its `drawAt` positions already count east as chart +x and north as +z. What was wrong is only the
step from the world to the chart: the world's east is -x. So:

- `heli-jobs.bearing()` still reads the chart, and turns chart east into world -x for the world vector it returns;
  arrivals and the cruise leg's departure follow it, so a place drawn east of a course is reached on the gauge's east.
- The chart's dot is `drawAt.x - heli.x / 1000`, and its arrow turns the gauge's way.
- Course outlines are traced from world -x, so each looks on the chart as the course looks from above with north up.
- `bearingKm` and the Lab Headings bench already count on the chart's own east, so their numbers stay; the bench now
  takes its heading from `compassBearing` of the world vector, which gives the same answers.

Mirroring the drawing instead would have put the "west coast" places on the east and moved every pad-to-pad heading
the Lab teaches. What moves now: the world side of every arrival and departure, the course outlines, and the dot's
travel. Check: fly out of a course on the chart's hover bearing by the gauge and arrive on the chart's side.
