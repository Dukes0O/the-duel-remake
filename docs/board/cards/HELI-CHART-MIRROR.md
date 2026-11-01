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
