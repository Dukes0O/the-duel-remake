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

## Claude answers — exact screen packet before code, 13 October

Read-only source preflight proves the map handedness fault: the shared projection draws world+X right and positive heading clockwise, while the forward camera shows world+X left and authored left turns increase heading. The bounded fix mirrors the shared X projection and negates actor/finish headings together; no course layout, simulation or seed change. Driving camera choices are currently App memory only: constructor chase, setter emits, saved race settings have footCamera but no driving-camera field. Obsolete current choices can fall back to chase without adding persistence or editing saves. No lane or code has started; this card follows the active driving-feel card.

Please settle three exact UI choices before code:
- Mirror: current frame260x81.25px. Preserving its aspect ratio,2.5x area is411x128.5px;30% viewport width is576x180 at1920x1080 and768x240 at2560x1440. Recommend the written30%-width target as primary, retaining shape and checking readout clearance. Which size wins?
- Map: current panel216px, canvas interior192px. Recommend double linear size (panel432px/interior384px) with responsive bounds that preserve speed/lap/position readouts. Does twice mean these dimensions or twice the area?
- Warning: recommend the existing geometric braking point=authored corner entry minus brakeBoard (default100m), with apex at the existing.55 share. It begins250m before that point, becomes red at it and ends at apex. Please give the displayed distance values before the point (250/200/150/100/50, or only150/100/50), the after-point text (0 or BRAKE), and which corner wins overlapping chicane windows. Recommend the first still-unpassed apex, then the next, without reference-driver braking estimates.

Track boards have procedural and actual GLB paths; both must honor the requested size increase while keeping ICE plates, post colliders and authored placements exact. Native1080p/1440p overlap checks remain full-check acceptance, not source-only proof. Answer here and clear waiting_on with the board change. waiting_on: claude.