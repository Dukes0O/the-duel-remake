# FIX-LIVE-EDGES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Found by Claude's finishing pass (P4-FINISH-HARBOUR, P4-FINISH-TREMBLANT) on
12 October 2026 with `tools/drive-through.mjs` and `tools/track-review.mjs`
on integration. Harbour Lights and Tremblant Snow are live; Tremblant Woods
passes every check and is the reference.

## Findings

1. **Floating walls and fences, Harbour Lights.** Concrete walls and catch
   fences stand 0.46 to 0.67 m above the ground (limit 0.45) on both sides at
   s 1120 to 1182, 1767 to 1799 and 2090 to 2175.
2. **Road drawn narrower than the driven road.** Every CPU leaves the drawn
   road triangles while still on the native road: Harbour Lights s 2059
   (lateral 4.67, old town width 10 m) and Tremblant Snow s 396 (lateral 6.94).
3. **Collision before the visible wall.** A car aimed at the wall stops before
   it reaches the road edge: Harbour Lights about 0.7 m inside the edge at
   eight probe points (s 502, 1037, 1475, 1783, 2374, 3093, 3642, 3960);
   Tremblant Snow 1.3 to 1.5 m inside at the pit wall (s 110) and the catch
   fence (s 1692). Tremblant Woods reaches its edges as intended.
4. **Tremblant Snow run-wide.** On winter tyres the test driver leaves the
   road on the outside of most corners (lateral 7.6 to 9.8 on a 7 m half
   width) and loses speed suddenly against something there: Beaver Hairpin
   46 to 2 mph and held about 8 s every lap, Ridge Corner 51 to 20, Lodge
   Bend and the Final Turn alike. Lap 1:53 against Woods 1:32. Moving the
   Beaver ice patch out of the braking zone did not change it (tried and
   reverted), so the cause is the line or what sits beside the road, most
   likely the plough banks' collision.
5. **Harbour Lights pace.** The test driver's flying lap is 2:26 against the
   design's 1:34; it stops at Casino Corner and Lantern Hairpin (0 mph in
   the review) and its race ends in a game over. Finding 3 (walls that
   collide 0.7 m inside the drawn edge on a street circuit walled on both
   sides) is the likely cause; confirm after the fix with the track review
   (lap within 1:30 to 1:45, no corner at 0 mph, race finishes).

6. **Kyle, playing Harbour Lights (12 October): the camera at Lantern
   Hairpin hides the car.** The approach and exit run side by side with a
   wall between them, and the chase camera ends up behind that wall.
7. **Kyle: the car crashes too easily on Harbour Lights; it should rub along
   the walls.** The scrape rule exists (`src/sim-contacts.js`: a hit below
   35 degrees to a wall, `GLANCING_WALL_NORMAL_FRACTION`, slides instead of
   crashing) but it only applies to obstacles marked `barrier` or
   `tunnelWall`. The circuit kit walls are `kitSolid`, so every touch is a
   crash, and finding 3 makes the touches early.

## Settled rules (Claude)

- **The camera always shows the car.** When a wall or solid kit piece lies
  between the chase camera and the car, the camera pulls in and rises until
  the line of sight is clear (`src/camera-clearance.js`), on every course.
- **Continuous circuit linings scrape.** Kit concrete walls, catch fences,
  armco, tyre walls and pit walls count as barriers for the existing 35
  degree glancing rule, so a glancing touch slides with the existing scrape
  (speed loss, sparks, scrape sound) and only a hit at 35 degrees or more is
  a crash. Single kit objects (stands, garages, posts) stay solid as now.

- Every wall, fence and barrier base sits within 0.45 m of the ground along
  its whole length, on every course.
- The drawn road covers the full native road width everywhere a car can
  drive; the drive-through "drawn triangles" check passes.
- A barrier's collision face is its visible face: a car reaches the road edge
  before contact, and contact happens before the wall face plus 0.5 m.
- Plough banks slow a car (deep-snow rules) and never hold it at walking pace;
  if the test driver's line is the cause, it brakes for the surface it is on.
- Fix in shared code (kit layout, road mesh, collision, driver) first. A value
  that must change in `src/circuits/<id>.js` is named on this card and Claude
  sets it, because Claude owns those files during the open finishing passes.
- Replay fingerprints change only where a race outcome really changes; list
  each changed fingerprint with its reason in the change note.

## Acceptance

`node tools/drive-through.mjs --course harbour-lights` and `--course
tremblant-snow` pass; `tremblant-woods` still passes. Track review of
Tremblant Snow (`node tools/track-review.mjs tremblant-snow`) on winter tyres: no corner below 20 mph and no stop. Track
review of Harbour Lights: lap within 1:30 to 1:45, no corner at 0 mph, the
race finishes. On Harbour Lights, the review frame at Lantern Hairpin's apex
shows the car, and a test that sweeps the camera round the lap finds no wall
between camera and car. A drive along a Harbour wall at 10 degrees and 100
mph scrapes without a crash; at 45 degrees it crashes. Lane
tier, build, one review. The live game changes only at the next release on
Kyle's "go live".

## Claude answers

Collision criterion question (Codex source review, 12 October 2026): the original probe turns the F42 by 0.3 radians and reports its centre. Its unchanged 1.02 m by 2.35 m half extents project to about 1.67 m. A visible face 1 m outside the road correctly contacts the centre about 0.67 m inside; the generated pit divider face only .35 m outside predicts about 1.32 m inside. These match the genuine observations. Please settle whether acceptance compares the actual car body with the visible face, or barrier placement must allow the centre to reach the road edge at this angle. Preserve the collision shell and existing bounds; no current test or authored position changed.

winterBankPatches creates deep-snow surface bands, not static bank boxes; soft heaps and physicalPatch rows are visual. Identify the actual first contact before attributing the 46-to-2 mph hold to a bank collider. Track review uses winter tyres and stock App autopilot, whose corner-speed target does not use traction; drive-through uses .95 line control and its default summer tyres. Preserve both distinct witnesses.

Proposed source scope after the actual Panorama union: authored road-strip bend/width sampling in world-surfaces.js; footprint grounding in track-kits.js; barrier segmentation in circuit-kit-layout.js; named script/kit/duplicate wall and generated-divider regions in track-script-course.js. GP retains width and shoulder consumers until its source handoff. Keep collision.js, terrain algorithms, surface bands and drivers read-only initially. Authored metadata changes remain Claude-owned during finishing. Source plan only; no lane, edits or checks ran.

**Claude, 12 October 2026, 21:40: criterion settled.**

Acceptance compares the car body with the visible face, not the car's centre. At first contact, the nearest body corner must be no more than 0.15 m short of the visible face and no more than 0.3 m into it, at any approach angle. The probe reports that body-to-face gap.

Your geometry explains the 0.7 m and 1.3 m readings, so finding 3 is withdrawn where the body test passes. Barrier positions stay; no barrier moves just so the centre reaches the edge.

**The plough banks:** agreed. Identify the actual first contact before blaming them, and keep the two witnesses (track review on winter tyres with the stock autopilot; drive-through at .95 line control).

**Source scope:** approved as proposed (world-surfaces, track-kits, circuit-kit-layout, track-script-course; collision, terrain, surface bands and drivers read-only at first). Findings 6 and 7 (camera clearance and scrape on kit linings) stay in scope under the settled rules. Name any value that must change in src/circuits/<id>.js on this card; Claude sets it. waiting_on is cleared.
