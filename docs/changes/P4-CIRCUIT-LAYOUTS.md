# P4-CIRCUIT-LAYOUTS: road layouts of the three new circuits

Claude built this for the P4-PANORAMA, P4-HARBOUR and P4-TREMBLANT cards
(Sonnet agent, 10 October 2026), at Claude's request. It is the road only,
raced against the existing rival until P4-FIELD lands. **Codex still owns each
card**: art from Kyle's picks, landmarks, light paths, escape roads, the full
field and the finishing passes. Those cards stay open.

## What is in the game now

- `src/circuits/panorama-ridge.js`, `harbour-lights.js`, `tremblant-woods.js`:
  each a scripted course definition (`defineScriptedCourse`), registered in
  `src/circuits/index.js`, with ids `panorama-ridge`, `harbour-lights`,
  `tremblant-woods` and stages 16, 17 and 18, appended after every existing event.
- Switches `panorama-ridge`, `harbour-lights`, `tremblant-woods` in
  `src/feature-flags.js` (all `dev`) and in the Preview's flag list
  (`start-preview.bat`). A circuit is on `COURSE` only while its switch is on
  (`circuitsEnabled(featureFlags)`), so the tests, saves and release builds see
  `COURSE` exactly as before. Prices from CIRCUITS.md section 7 (1,600, 1,800,
  1,600) are in `src/course-access.js`; they matter only when a switch is on.
- Existing themes and scenery only: alpine pines, rocks and mountains for
  Panorama Ridge and Tremblant Woods, the night city theme (street blocks) for
  Harbour Lights. Scenery is placed by the course's seeded generator and stays
  off the road, out of the runoff beside it and 30 m clear of the inside of
  every corner so exits can be seen.
- Walls, kerbs and braking boards are drawn (`src/track-script-scene.js`): grey
  concrete walls as one instanced mesh, red and white kerbs, yellow numbered
  boards. These are plain shapes: the art from Kyle's picks replaces them.
- `noTraffic: true` on every circuit: a pure race against the rival.

## The drafts did not close, so the numbers changed

The section 5 scripts, built exactly as written, end far from where they begin
(Panorama Ridge 275 m, Harbour Lights 1,885 m, Tremblant Woods 1,734 m), and
no stretching of the straights by 15% can close them. I fitted each with
`tools/track-script-fit.mjs`, which finds the smallest changes to turn angles and
straight lengths that close the loop, keeping the names, order, radii, widths,
crests and the signature pieces. Every change is listed at the top of each
circuit file. In short:

- **Panorama Ridge** (4.84 km): small changes. Turn angles moved by 4 degrees at
  most (Hell Gate 90 to 86, Forrest Elbow 100 to 105, Murray Corner 90 to 86.5),
  straights by up to 4% (Pit Straight 520 to 553, Mountain Straight 880 to 912,
  Conrod 1,150 to 1,127). I also softened climbs so no corner is steeper than
  25% (the draft's Skyline reached 41%): The Cutting +14 to +9, the straight after
  it +16 to +21, Skyline crest 3 to 2.4 on a -5 drop, Esses -7, -7, -8, Conrod -68.
- **Tremblant Woods** (3.23 km): the draft's long straight ran away from the start
  and every later turn bent the same way, so it needed a redraw. Kept: Lodge
  Straight 420, Beaver Hairpin 170 at 14 m, Timber Straight 1,100, all crests.
  Changed: Ridge Corner is now a small right bend (24.5 at 60 m radius), Lodge
  Bend 65 to 133.5, Final Turn 40 to 54.5, Lakeshore 240 to 134, Ridge Run 320 to
  153, the straight before the Final Turn 200 to 75. The lap is a long narrow loop.
- **Harbour Lights** (3.19 km): the draft's first leg ran 1,050 m one way with
  nothing running back, and three Old Town turns were too short for a 25 m eased
  join (radii 30, 35 and 40 became 32, 36 and 41). Kept: the Seafront Straight
  599, Lantern Hairpin 9 m radius, the named corners in order. Changed: Casino
  Corner 95 to 152 degrees (a second slow corner), Casino Approach 450 to 60 (the
  overtaking run into Casino Corner is now the Seafront plus the kink, about
  660 m), Fishmarket Bend 60 to 96, and several straights lengthened (Hillside
  160 to 320, Hairpin Approach 120 to 254). The hairpin road is 12 m wide (it
  sits in the 10 to 12 m old town) so the car has room to run wide round it.

**Claude's finishing pass should redraw Harbour Lights and Tremblant Woods**; the
layouts close and drive, but they are fits, not designs.

Closure by the builder after these numbers: every straight changes by less than
0.5% on every circuit (largest: Tremblant 0.07%, Harbour 0.49%, Panorama 0.19%).

## Racing line and speed profile changes (shared code)

Driving the 9 m Lantern Hairpin showed the profile asked for more than a car can
do: a car turns no tighter than about 12 m radius. `buildRacingLine` now takes the
car's tightest circle and its yaw rate: where a corner is tighter than the car,
the line runs wide (outside) to give a bigger circle, and corner speed is capped by
yaw rate as well as grip. `Course` builds the profile for the grip 0.82 reference
car (the F42), and the test driver scales it by `sqrt(grip / 0.82)`.

## Checks (test driver: the circuit's racing line, steering and speed through the real Duel)

- `tools/test-circuit-layouts.mjs` (10 checks): registration, switches, prices and
  COURSE unchanged without a switch; closure within 2% and 20 m; width, walls,
  crests, boards per circuit; scenery placement rules; a full race on every
  circuit on Medium with the rival (forward) and alone (reverse build): no crash,
  nothing stuck, at least 90% of laps without touching a wall; the Lantern
  Hairpin driven clean.
- Medium, F42, Casual, one rival, flying laps: Panorama Ridge 1:45.2 (3 laps),
  Harbour Lights 1:21.1 (4 laps), Tremblant Woods 1:17.8 (4 laps). Lantern Hairpin
  slowest speed 23 to 24 mph (about 38 km/h), edge clearance 0.2 m (no wall
  contact on any lap). The stock demo driver cannot brake for these hairpins; the
  circuit driver in `tools/track-script-drive.mjs` does.
- Harbour and Tremblant laps are faster than the 1:30 to 2:15 target in
  CIRCUITS.md section 4; the finishing pass sets that.

## Not done (Codex's cards and later)

Landmarks, grandstands, pit buildings, light paths, art, escape roads, catch
fences, the full field and its grid, and every finishing pass. Computer racers
still use the old rival (it collides with the player at the Harbour hairpin in the
reverse build, which is why the reverse test runs alone).

## Removed

Nothing replaced.

## Tremblant Woods redrawn (Claude, 10 October 2026)

The fitted first draft was a long thin loop with Timber Straight running
close beside the outward road. Claude redrew it as a clockwise loop with the
hairpin at the end of a short spur: 4.44 km, 3 laps, closes with straight
changes under 5% (tools/track-script-fit.mjs), closest separate stretches
66 m apart at the spur, highest grade 19.7%, tightest radius 22 m. Test
driver laps 1:39, 1:37, 1:37 with no crashes. Changed assertions in
tools/test-circuit-layouts.mjs follow the new design: laps 3, Timber
Straight about 1,305 m, Beaver Hairpin radius 22 m.

Removed: the fitted first-draft Tremblant script.

## Harbour Lights redrawn (Claude, 10 October 2026)

The fitted first draft turned Casino Corner into a 152 degree second hairpin
with a 60 m approach. Claude redrew it: about 900 m from the start line into
a 104 degree Casino Corner, the old town climbing away from home, Precinct
Bend turning further away and the Lantern Hairpin (radius 9 m, 175 degrees)
turning the road for home, then the Reservoir Run and Harbour Road back.
4.05 km, 4 laps, closes with small changes (tools/track-script-fit.mjs),
highest grade 15.1%. Test driver laps 1:37 then 1:34, no crashes. No test
assertion changed.

Removed: the fitted first-draft Harbour Lights script.
