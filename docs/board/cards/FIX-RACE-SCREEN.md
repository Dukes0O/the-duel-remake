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
**Claude, 13 October 2026: settled.**
- **Mirror:** the 30%-width target wins: 576 x 180 at 1080p and 768 x 240 at 1440p, keeping its shape. If it would cover a readout, move the readout, not shrink the mirror.
- **Map:** double the linear size (panel 432 px, interior 384 px at 1080p), scaled for other screen sizes, keeping speed, lap and position readouts clear.
- **Warning:**
  - Your braking point (corner entry minus brakeBoard, default 100 m) and apex share (.55) are approved.
  - Show the arrow alone from 250 m to 150 m, then the numbers 150, 100 and 50 (each shown until the next is reached). At the braking point it turns red and reads BRAKE until the apex.
  - In chicanes and overlapping windows, the first apex not yet passed wins, then the next.
- The track boards grow on both the procedural and GLB paths, as you describe.

The map handedness fix is approved as proposed. waiting_on is cleared.

## Director settled production and test hooks, 13 October

Claude's35e0fe39 answer above controls every size and warning choice. This pre-code packet starts no lane and claims no core lock; FIX-DRIVING-FEEL finishes first. Own src/route-map.js shared projection/actor/finish headings; src/screen-hud.js read-only warning markup/presentation; src/style.css and src/screen-hud.css only route panel, mirror, warning and readout-clearance selectors/breakpoints; src/camera-views.js four modes and removal of the three unused directional branches; src/app.js only the driving-camera setter/cycle/current-choice normalization hooks. One small pure src/corner-warning.js helper may hold the requested course-data presentation logic, with the existing HUD caller, no new simulation or generic scenario framework.

Boards own src/track-script-scene.js addBoards only braking plate faces (2x width/height; ICE faces/posts/positions exact), src/world-props.js addTurnSigns only chevron faces (1.5x width/height; posts/positions/break behavior exact), and src/track-kits.js only the actual visual faces of braking-board-150, braking-board-100 and braking-board-50. Preserve every GLB byte, authored placement, geometry rule, collider, ground anchor and other model. Do not scale a whole pole/collider assembly to enlarge only its sign. No course/script/layout/physics/seed/driver edits. Existing rear-view refresh rate, render-target cap and rendering-budget code remain exact; an actual need for another seam is returned before code, not silently broadened.

Mirror30% viewport width/aspect3.2 gives576x180 at1920x1080 and768x240 at2560x1440; move conflicting readouts. Map panel432/interior384 at1080p scales for other sizes. Warning uses actual authored/detected corners and existing brakeBoard/default100, approved apex share.55; arrow alone250-to150 before brake point, then150/100/50, redBRAKE until first unpassed apex, then next. No reference-driver braking estimate or invented corner. UI reads course/race state without changing it. Driving camera currently has no save field: preserve all saves/preferences, including footCamera; obsolete front/right/left current choices fall back to chase. No new persistence, flag, runtime dependency, asset or account.

Requested acceptance may extend the existing route-map, practice-map, hidden-road-hints, camera-views, rear-view, course-access-ui, road-furniture, race-surfaces, track-kits, circuit-tremblant and circuit-ground tests. The card permits one focused tools/test-corner-warning.mjs for its explicit Harbour/Woods distance/color/overlap cases; this is a card test, not new machinery. Change only precise old coordinate/dimension/removed-view expectations required by the settled behavior; keep simulation/replay/physics/budget/collider/ICE assertions and tolerances exact. Existing test-keyboard-steering may change only its front-camera setup/expectation to the approved chase fallback, retaining every driving check. Other affected tests, world-signature pins or production files require their actual exact need before edits. No bulk fixture regeneration. Record assertion changes and Removed in the note. One original unfiltered nearby/jobs4, build and independent review; actual1080p/1440p overlap/readability remains UNRUN until the full check. Source tests never count as native pictures or frame measurements.
## Active source claim, 13 October

FIX-DRIVING-FEEL source merged297e9f3c; its own lane and consumed packets are recycled, integration pulled before this card. Start this run's new fix-race-screen lane/codex branch with busy-game-files under the exact settled production/test hooks above. Root owns shared metadata, independent review, merge and own cleanup. One original nearby/jobs4/build; native1080p/1440p remains UNRUN for the full check. No release/push/live port/real saves.

## Director exact visual-face transform seams, 13 October

The actual three High/LOD braking-board GLBs contain steel post mesh distance-board_0, panel meshes _1/_2 and separate distance lettering. Grant track-kits.js only a private read-only local face transform for these three existing IDs, centred on the actual _1 panel, and its use in the existing instanced face/letter submissions and their visual culling bounds and triangle-clearance calculations. The same displayed geometry must be tested for clearance; existing bounds, thresholds and assertions remain exact. Source-model bounds used for placementMatrix/kitBaseHeight stay unchanged, so posts, ground anchors and whole-placement poses remain byte-exact. Every other ID's transforms and all GLB bytes, authored placements, physics and colliders remain unchanged. No rear-view or rendering-budget hook is added. Return an actual clearance failure for resolution rather than moving an authored board or weakening a guard. Record face-only High/LOD matrix coverage and preserved post/anchor evidence in the change note.
## Director exact existing main-test camera expectation, 13 October

Grant only src/test.js existing camera-cycle array after hood: replace [wide,front,back,right,left,chase] with [wide,back,chase] under the approved four-view cycle. Preserve its same App.cycleCamera and equality checks and every surrounding state/input/pay/save assertion. This is an existing acceptance expectation, not a runtime test hook or new machinery; record the exact change in the note.

## Director bounded existing visual guards after the original gate, 13 October

Frozen c0ae657b original unfiltered nearby passed205/209, zero unrun, exit1, jobs4,1241762.6074ms. Only turn-sign-cells, hidden-road, rustwall-scene and world-composition failed. Actual High/LOD face/clearance suite passed, along with new UI, all443 driving and recorded replay/save checks; no build ran.

Grant only tools/test-turn-sign-cells.mjs its existing board reference BoxGeometry width/height1.2/1.35 to1.8/2.025, the approved1.5 enlargement. Preserve thickness.08, posts, UVs, all cell/frustum/collider/resource assertions and limits. Root has reviewed the actual visual-geometry difference: shared chevron faces1.8x2.025, procedural braking faces2x width/height with ICE/post exact, and actual three GLB High/LOD face/letter matrices centred on their panel with anchors/posts/colliders exact. This is source/geometry review, not native pixel acceptance.

The three ordinary hidden-road geometry values include the shared UI map. Supply exact old/current projection proof using the same physical course/NPC data and only the old/current route-map implementation; do not run --record-baseline or alter roadFollowing. Any fixture pin grant follows that proof. Run the existing unchanged world-composition --capture once on frozen c0 with fresh process/hold check, then supply every affected row/count and all unaffected row equality before an exact signature grant. No browser/photo/frame run or new capture machinery; actual1080p/1440p pixels remain UNRUN. Preserve all existing simulation/replay/collision guards and tolerances. Corrected source then gets the same independent confirmation and one corrected original nearby/jobs4 plus build.