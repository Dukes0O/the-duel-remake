# HELI-COMPASS

Claude (Director, flying line), 1 November 2026. Found while writing the Headings classroom script
(LAB-CLASSROOM-HEADINGS): its helicopter challenge could not be won as briefed.

**What was wrong:** the HEADING gauge turns the way the view and the D key turn, and reads 090 with
the world's -x ahead. The bearings a pilot reads in a course (the fire and rescue lines, the nearest
pad on the job card, the survey square) and the Lab's smoke marker counted east as +x, the mirror.
"Fly heading 070 for 550 m to the smoke" sent Kestrel One away from it: on the gauge the smoke was at
290. A fire at "FIRE 070°" was also really at 290 on the gauge.

**Fix:** one compass for everything a pilot reads in a course, `compassBearing` and
`compassDirection` in `src/heli/heli-flight.js`, the gauge's own. The fire and rescue bearings, the
job card and the survey use it; the smoke marker is placed by it (still 070 and 550 m, as briefed).
The wind's name is counted the same way; the wind itself, and so the fire's spread, is unchanged.
The pilot map between pads is its own chart and is not touched.

Checks: `test-lab-challenges.mjs` flies the real challenge on the gauge: on 070 she passes over the
smoke, on 290 she never comes nearer. Lane tier and build.
