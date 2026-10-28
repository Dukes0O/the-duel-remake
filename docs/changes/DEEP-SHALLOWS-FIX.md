# DEEP-SHALLOWS-FIX

Kyle, 28 October 2026, playing The Deep at Kelp Coast: "the shallow water is incredibly hard to navigate in. also, there remain a whole ton of instances where you get reset into a different part of the map. The map also seems to be left-right opposite of how we're driving."

Three faults, one cause for the first two. All three are fixed in the Deep only. No race code was touched.

## Causes

### 1. Shallows: one flat teal screen

Kyle's picture (flat teal everywhere, the car a faint ghost) is the camera climbing out of the water. I reproduced it exactly by driving up the bank beside the Ramp Shallows.

- `src/deep/zone-floor.js:16` (before the fix, `FLOOR_CEILING = -0.8`): the banks beside the trail were allowed to rise to 0.8 m under the surface. The Ramp Shallows trail is only 6 to 9 m deep and 16 m wide, so a car that drifts off the trail climbs a bank within a few seconds.
- `src/deep/deep-ui.js:13` (the dive chase camera, before the fix): the camera sits 3.65 m above the car. On a bank 0.8 to 2.7 m deep that is above the sea level, so the picture became the water surface seen from above: one flat colour, no sand, no grass, no light shafts, and the car seen through the surface.
- `src/deep/water-shader.js:75` (the haze sum) and `src/deep/depth-colour.js:12` (the haze rates): even in good view the haze took most of the colour out of anything past about 20 m (a landmark 70 m away kept 2% of its green). In the shallows that is far murkier than real shallow water and than the design note ("Bright, sandy, 5 to 10 m deep").

### 2. Resets into a different part of the map

- `src/sim-crash.js:77-117` (`_boundary`, called from the end of every drive step; the reset is line 111) only stands down while `deepProtected()` is true. `deepProtected()` (`src/deep/deep-journey.js:106-116`) is false once the car is more than 90 m from the trail, because the sea floor ends there. The race's own boundary rule then ran: `_safeReset` put the car back on the trail line at lateral 0, and the Deep trail loops, so that could be hundreds of metres from where the car was. In 90 m of driving I measured jumps of 300 m and 666 m, with "BACK ON COURSE / NO DAMAGE" as the only message.
- If the car got far enough that there was no ground at all, `course.nearest` answered with an unusable place (not a number) and the drive step crashed with an error (`zone-floor.js:115`, `trailHeight`, found while testing).
- The Deep's other moves were checked and are local: rock bounce and push (`deep-rocks.js`, under half a metre), the smooth trail frame (DEEP-TRAIL-JOINTS), Surface (U), and driving up the ramp. Monster trucks were driven too: no climb-limit or rescue reset fires in the Deep.
- Why Kyle met it "a ton" in the shallows: the trail is 16 m wide there, and with no visible landmarks the car runs off it and out to the edge quickly (cause 1).

### 3. Map left-right

The chart's maths is a true top-down picture (checked against the real chase camera, see tests): a point on the driver's right is on the right of the arrow, always. What reads as "opposite" is that the chart was north-up. The dive's first leg heads south, and when a north-up map points the car down the page, left and right swap. Measured on the old chart: facing south, one second of right turn moved the car one pixel to the left on the panel. There is no sign error in `project` or in the arrow's angle (`deep-map.js`); the picture simply could not agree with the driver's view in half of all headings.

## Fixes

1. **Reset (the car is only ever held where it was).** `zoneCourse.nearest` in `src/deep/deep-journey.js` now draws any point outside the ground back to the nearest point inside it (`ZONE_EDGE`, 86 m from the trail, 4 m inside the 90 m ground), along the line to the trail. The car keeps its heading in the world, loses speed while it presses on the edge, and slides along it. It is never put anywhere else. While it presses on the edge, the dive's screen shows "This is the edge of the sea floor. Turn back toward the trail." (`journey.edgeSec`, three seconds after the last touch; `src/deep/sirena-view.js`, `sirena-ui.css`). Only the car's own drive step records that it pressed on the edge (untime.driving); the renderer and camera ask the same question and write nothing. With no ground near at all, the point is drawn back toward the car's last place, so the drive step never gets an unusable number.
2. **Map.** The chart turns with the car by default (`src/deep/deep-map.js`): the car sits near the bottom of the panel pointing up, the sea swings round it at 2.4 times the old scale, and words and stamps stay upright. A small compass in the corner shows north. The button "Whole coast, north up" gives the old picture; "Turn with the car" returns. `mapScreen(data, point)` is the one function that says where a chart point lands on the panel, so the drawing and the tests share the numbers.
3. **Clear shallows.**
   - `depth-colour.js`: new `clarityAt(depth)`: haze is 30% of its old strength with the eye 6 m deep or less and returns smoothly to the old strength by 24 m, so the drop-off is as murky as designed. `underwater-look.js` sets the shader's haze rate from the eye's depth each frame. `colourKeptAt` is the same sum for tests.
   - `water-shader.js`: past 70 m everything melts into the water, fully by 140 m, whatever the clarity, so the far edge of the ground never shows as a line.
   - `zone-floor.js`: `FLOOR_CEILING` is -2.6 (was -0.8). A bank is never within 2.6 m of the surface.
   - `deep-ui.js`: the dive camera is never higher than 0.8 m under the surface (`CAMERA_UNDER_SURFACE`).

## Pictures

In the session's scratchpad (not in the repository), same spot and same window size for each pair:

- `deep-shallows-before.png` / `deep-shallows-after.png`: just past the ramp bottom. The far water went from a dark haze to a seabed with rocks, grass and ripples out to the horizon, and the chart now turns with the car.
- `deep-mid-before.png` / `deep-mid-after.png`: the kelp forest, 15 m. A little clearer, still green and murky as designed.
- `deep-edge-before-flat.png`: Kyle's flat teal picture reproduced (camera out of the water on the bank, old floor and camera).
- `deep-edge-before-reset.png`: the same drive on the old code: the car was put back 1,200 m away in the Kelp Forest.
- `deep-edge-after.png`: the same drive now: the car held at the edge with the notice, the chart turned with it.

The recipe that took them (a throwaway browser scenario) was not kept, to avoid new test machinery.

## Checks

- Every `tools/test-deep-*.mjs` by hand: 17 files, all pass.
- Lane tier, `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 164 passed, 0 failed, 0 not run.
- `npm run build`: passed.
- Deep browser scenarios, `--jobs 1`: deep-achievements, deep-art, deep-explorer, deep-life, deep-log-pictures, deep-look, deep-ramp-2, deep-sirena, finish-deep all pass, no browser errors or warnings.
- Not run: `deep-frames` (a frame check needs a quiet laptop; a full test run was going). The only drawing change is one extra smoothstep per lit pixel in the haze sum and one uniform update per frame, so it should be at the noise floor; the release frame check will confirm.
## Tests

New tests in existing files (no new test machinery):

- `tools/test-deep-explorer.mjs` (failed before the fix, with 300 m jumps and a crash):
  - Driving off the trail, straight on, hard right, hard left, weaving, and reversing after 30 s out, on all three routes: no reset, rescue, recovery or boundary event, no step beyond the car's own travel plus 0.75 m, always on the ground.
  - The edge: parked 80 m out heading outward at 40 mph, the car is held 76 to 90 m out, slows, the notice shows, no jump; steering back works at once.
- `tools/test-deep-map.mjs`:
  - On the chart a point on the car's right is right of the arrow and one on the left is left, at five headings (including south and north), in both views; ahead is straight up the panel when turning with the car.
  - The same against the real chase camera (`deepPresentation` into a three.js camera): the side on screen equals the side on the chart, after driving to four different headings, in both views.
  - Turning right turns the arrow clockwise; the point the car was heading for slides to the left of the arrow.
  - The dive camera stays under the water at every place the car can reach (1,500+ places), and the sea floor is never closer than 2.6 m to the surface.
- `tools/test-deep-look.mjs`: clarity only falls with depth; the deep keeps the original haze; the car 9 m ahead in the shallows keeps over 75% of its colour; a landmark 70 m away still shows in all three colours; everything is gone by 140 m.

## Changed assertions

- `tools/test-deep-look.mjs`, the list of approved imports into `src/deep`: three entries added (`test-deep-map.mjs` may import `deep-journey.js`, `deep-ui.js` and `zone-floor.js`; `test-deep-explorer.mjs` may import `zone-floor.js`). The test still fails any other unapproved import. Nothing loosened: the new tests read the real code the card changes.
- `src/deep/zone-floor.js` `FLOOR_CEILING` (-0.8 to -2.6): `test-deep-look-zone.mjs` asserts the highest bank stays at or under `FLOOR_CEILING`, and it still does; no assertion text changed.
- No existing assertion was weakened or removed. `tools/test-deep-map.mjs` test 1 passes unchanged (the chart data keeps `car.heading` and `project`).

## Replay and signatures

No race code, no race world and no replay input changed, so replay fingerprints and world signatures are unchanged. The Deep is not part of either.

## Removed

Nothing was replaced. The old behaviour (the race boundary rule running underwater) is not removed from the race code: it is simply never reached in the Deep any more.

## Open

- Surfacing by reversing within 6 m of the ramp end (`deep-journey.js`, underwater branch) is by design (driving back up the ramp) and was left alone. A player who reverses at the very start of a dive leaves the dive.
- Kyle's own pictures could not tell which bank he was on. The reproduction shows the same flat teal on the bank beside the shallows. If a flat picture appears anywhere else, send the map panel with it.
