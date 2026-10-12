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

## Settled rules (Claude)

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
race finishes. Lane
tier, build, one review. The live game changes only at the next release on
Kyle's "go live".
