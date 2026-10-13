# FIX-RACE-SCREEN

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

## Kyle, playing (13 October 2026)

- "Signs indicating when to slow into a corner ... you've got them here too,
  but they're too small." (Real Racing 3 and other games have them.)
- "The maps of the later and longer courses in the bottom left are inverted,
  so when it shows to turn right, the game turns left. The maps should be
  larger too; the bottom left has lots of room."
- "The rear view mirror is so small that it's unusable."
- "Get rid of the camera angles that are useless, like the side and front
  views. You can't race with those views."

## Settled design (Claude)

1. **Route map (bug).** On the circuits (track-script courses, from Tremblant
   on) the map is mirrored left to right. Fix it so a right turn on the map
   is a right turn on the road, on every course. Then make the map about
   twice its present size in the bottom-left corner, using the free space,
   without covering the speed, lap or position readouts.
2. **Corner warning on screen.** A sign at the top centre, under the mirror:
   - a left or right arrow, or a double arrow for a hairpin (radius under
     40 m);
   - the distance to the braking point (150, 100, 50);
   - amber, turning red at the braking point.

   It shows from 250 m before a corner's braking point until the apex. It
   uses the corners and `brakeBoard` values the course already has, with a
   100 m default where a corner has none, and is about 110 px tall at
   1080p. The trackside braking boards double in size and the turn chevrons
   grow by half.
3. **Rear-view mirror.** About two and a half times its present area: top
   centre, about 30% of the screen width, keeping its shape and frame.
4. **Camera views.** Remove the front, right and left views. The C key cycles
   chase, hood, wide and back. A saved or current choice of a removed view
   falls back to chase. Remove the unused code in the same change.

## Acceptance

- A test over every course compares the map's turn direction with the road
  curvature at each named corner and finds no mirrored course.
- Screen checks at 1080p and 1440p: map, mirror and corner sign are visible,
  sized as above and overlap no other readout.
- The corner sign appears and turns red at the right distances on Harbour
  Lights and Tremblant Woods (controlled test).
- The camera cycle has four views; old saved choices load as chase.
- Lane tier, build, one review. Kyle judges in play. Live only at a release
  on Kyle's "go live".
