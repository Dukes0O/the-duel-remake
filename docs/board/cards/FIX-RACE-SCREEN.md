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

## Kyle changed item 2 (13 October 2026, evening)

Kyle, seeing the on-screen corner warning: "this is not what we want. I was thinking of little sign posts like what you've already got at Tremblant, just to make them a bit bigger, that's all. They're too small to really notice."

The on-screen corner warning is removed completely (RELEASE-CONTROLS). Item 2 below now means only the trackside braking boards at double size and the turn chevrons at 1.5 times. Everything else on this card stands.

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
## Director exact reviewed visual pins, 13 October

Root independently verified actual frozen c0's unchanged world-composition capture20 rows against its raw log and current fixtures:17 changed hashes only, all102 resource-count values unchanged, three Titan rows byte-equivalent. Summit remains dev and uncaptured; preserve its fixture. The actual reviewed difference is the approved chevron face enlargement and procedural braking face scale; posts, ICE, placements, materials, texture commands, colliders and counts stay exact. Native photography is UNRUN. Grant only the hash field in these17 existing per-course fixtures to these exact captured values:
pacific-canyon=99499b950bc12861e237e701ddaf5949ef4a8338b23bd205a97b36819d0a0599; high-country=4e15192fdd90796792eea24097263696a922f7d3eeafba0214837f10717219ad; harbor-highlands=e4ebcfdf5653e3dcee3ac5d1c7749b639a05051628e7155accb26cc2864c2fd1; midnight-chase=7c2331252be785040e7e6809abdc0f42365a51aba81fe5e9a8a61316168db16c; ridge-rally=159df159056a2a68156661b5883370a3a3f877c1fa8deb9fa2366a750d37fa3a; neon-drift-trial=d7a5d37a20c92ed5c04beaca56c1388332b8c0fa8eef52cf44b4800b9e43f9de; timberline-rush=c11af52abfde35ffeaa5a0dd2bae1a67fc952980aa98e37590c2b990b99ec71d; eifel-crown=4a44e9a6e122e67aecdf539c3bb46659e1749aa41377378d94101a684235fabc; alpine-serpent=6e81af9252787cd631de50a2fda7147ae352636e25a5a7602f52bfbe88befff1; azure-riviera=f07845cc2b1e4028bb440ecebf16bb861d5db8735918746849fdee10ec075374; red-mesa=4c36d88b5182f49af078264257f1c7c005d35051d9ec16f00efc2e19611ea6a3; neon-docks=48f54f1e503e1a8dd58123624813bbd8b9e122a3a059058e0e3d6c741c8a700a; cloudbreak-skyway=93fc0a430a23da46d37a3edd9357b8e4ae63b966cde771ddbfe057c9f5572996; tremblant-woods=f9f8bc9cbb3fde7a790415806b1fc510ccf45267a886e86e6b9f2199ab9798db; tremblant-snow=9a1a0e644021283c1cd4f98c5e256bbf7b8f990a68d5de7004e0652333581469; harbour-lights=0c6a6b5e2c250c996265b12d9e4f76a8b2dc5b9bcd8a3b71cc50b0fd1c4e526a; panorama-ridge=17be19106f78453fd0a15c98b13dfb079ac92e15fca458bec723b225bda4b922

The ordinary-road proof swaps only old/current buildRouteMapGeometry in identical current course/NPC projections and reproduces every original full hash; all non-map values are exact. Grant only tools/replays/hidden-road-ordinary.json routes.route_a.geometry=534b3c1a85f80c3e1b0c48e0eb3282c8cb17d7308f64c816b03fe9263488bd63, route_b.geometry=aa651ba73817258d102a5afc6b81baa18649567d83163ecc16c0f612fbdc4cba, route_c.geometry=ff8abf5a9a6757aa918e89d9dd820c2d2ed3e36a556bf0588e52d2b67430ebfa. Every roadFollowing hash, seed, version, historical capture metadata and other fixture key stays exact; do not record-baseline or change either test's filter/assertions. These three composite keys change only their UI-map component, not a physical replay. Record this provenance and the original205/209 result in the note. No other signature, count, tool, assertion or tolerance changes. Freeze the test-only correction, same independent confirmation, one corrected original unfiltered nearby/jobs4 and build.
## Verified source integration, 13 October

Frozen514ca4b9136411c457a06d0a244cdacab0449284 passed the corrected original unfiltered nearby211/211, no failures/unrun, jobs4, exit0; aggregate761966.4356ms/wall768165.2926ms. Build exit0, Vite699ms/wall1378.2321ms. Independent production review and exact test-only correction confirmation are CLEAR. Production bytes remain identical to reviewed c0ae657b. The actual High/LOD face/post matrix and unchanged clearance checks pass, along with all443 driving controls and unchanged physical replay/save guards. Only the approved map-component pins and visual sign hashes/widths changed; no tolerance or filtering changed.

The source merged without conflict, so no post-merge gate repeats. busy-game-files is released. Native1080p/1440p overlap/readability remains UNRUN for the full check; Kyle judges in play. The uncaptured dev Summit scene fixture stays untouched/unproved and belongs to its eventual final-art union. No Codex release, push, live-port use or real-save access. Root recycles only this run's own merged screen lane/branch and consumed source receipts after committing these verdicts; older retained lanes and pending art/failed native packets stay.
## Kyle approved live release, 13 October

Kyle: "Finish the remaining checks, then get Claude to release and push the throttle and race-screen changes. You have my approval to go live once they pass."

This supersedes the earlier no-release/no-push restriction for these two accepted fixes only. Codex finishes actual Harbour keyboard-shaped lap/stock-autopilot comparison and native1080p/1440p screen acceptance using private-port memory-only QA. Claude is the Release Manager: collect the two notes, retain all other dev switches, freeze the final release candidate, run the full exact-commit release evidence alone/jobs4 and complete the normal safe install/push once green. No further Kyle approval is needed. Source gates/builds/reviews are already green and merged eb53917f; native checks are currently pending, not passed. Do not release on those source-only receipts. Real saves are never read or changed; no forced live refresh.
## Director remaining native release acceptance contract, 13 October

Kyle's new go-live approval authorizes the remaining native acceptance now. Grant one specific tools/scenarios/release-controls.mjs using the existing browser-harness context, private port, memory-only storage and actual App/HUD/renderer; no harness/framework edits. Own only this recipe and the two change notes. Production is unchanged. Check actual1920x1080/2560x1440 rectangles/screenshots for authored map/mirror/warning dimensions and clear speed/lap/position/readouts, actual Harbour/Woods distance/color/overlap and C cycle. Use existing controlled QA positions/render callbacks, with actual current HUD and pixels. No frame timing in this recipe.

For one actual Harbour keyboard-shaped lap, keep the existing line driver's .95 skill, speed/heading targets, car falcone_f42/no upgrades, casual/medium, seed1989, one opponent and60FPS, max1200simulated seconds. Its analog decisions may be read only as targets; convert them to actual key states before App._applyInput and every real physics step: W when target throttle>=.5, S whenever target brake>0, ArrowLeft/ArrowRight by the target steer sign only when absolute target steer>=.05, otherwise release both. Use the real keyboard events/adapter with autopilot=false and neutral pad; do not inject analog steer/throttle into a physics step. The .05 relay is fixed before the run, not tuned after failure. Record actual applied input, completion, crashes/resets, monotonic travel and existing driveCircuit's below3mph post8s stuck observation. Require at least one complete lap and no continuous stuck period of1s or longer after startup; report every collision/reset and any failure honestly. No physics, car/grip, position, speed, course or input fitting, no weakened acceptance. The stock track-review --no-browser comparison is separate: compare its complete historical03fe1c98 trace; its known gameover cannot count as successful keyboard-lap acceptance. A failed case gets at most30minutes of actual diagnosis, then exact fault/handoff, no release. Native results are specific to checked SHA; final release full/evidence belongs to Claude's exact final candidate.
QA contract correction: the game uses ArrowLeft/ArrowRight to steer; KeyA/KeyD do not steer, as the existing443-check suite proves. The earlier Director A/D wording was incorrect and is replaced, with every threshold and actual production input path unchanged. Stock comparison now passed the exact original03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe trace; its known146.314s/gameover remains, and is not keyboard-lap acceptance.

## Director exact native follow-up after actual images, 13 October

Original b4a00a85 native keyboard lap passed: one Harbour lap90.258333s,11192 actual input calls/physics steps, zero crashes/boundary/checkpoint resets and zero stuck time. Stock trace is separately unchanged. All four actual map/mirror/warning dimensions and camera cycles passed, but the native packet failed56 warning-oracle comparisons: raw authored brake/apex values differ by4.5e-13 from the closed-course normalized coordinates. Correct only the independent recipe's authored brake/apex normalization before samples/oracle, preserving every threshold/assertion and production warning code. Allow DUEL_CONTROLS_UI_ONLY=1 only in this specific recipe: packet keyboard:null/notRepeated, no lap pass claim; retain original b4 keyboard receipt and unchanged production proof instead of repeating that accepted lap.

Root inspected actual1080Harbour and1440Woods images and agrees the race clock overlaps sound/camera/pause buttons: existing .in-race .race-clock top30px, utility bottom62px. Grant only src/screen-hud.css that selector top30px→70px; clock's actual80.7969px height ends150.7969, position begins160, so both remain clear. Other CSS/HUD/physics/placement/budget/flag values stay exact. The existing release-controls-native lane owns this real correction plus its specific recipe/note. Strengthen the recipe with actual utility-controls rectangle and clock-vs-utility/position overlap assertions. Hide only the two existing QA debug details identified by their MENU QA/PERFORMANCE summaries with display:none; do not hide game controls/details to pass readability. Re-run the four native screen cases only, retain original failures, then one original corrected-source nearby/jobs4/build and same independent review. No generic machinery, new native lap, frame measurement or altered game acceptance.
Native b7ef9882 UI-only packet passed all4 viewport/course cases and480 exact warning observations,0issues/warnings; clock is visibly clear. Its pictures still contain QA-only panels because menu-check appends them after early preparation. Grant only reapply the same exact MENU QA/Performance summary-selected display:none immediately before layout capture/screenshots, after the panels exist; do not change production or hide any game controls. Use the existing UI-only four-case run once for unobscured final pictures, with the original keyboard receipt retained. No new photo-only/resume machinery or lap repetition. Record this bounded QA timing correction and honest first/second packets; final source then one original nearby/build.

## Native acceptance complete; Claude release handoff, 13 October

Kyle approved go live and push once green; no further approval is needed. Frozen eab3b13681d646f3eeb267be2af879e5db280d1e passed one original unfiltered nearby30/30, zero failures/unrun, jobs4,492443.6831ms/wall510895.4095ms; build exit0,Vite1.34s/wall2725.8205ms. Same independent source review and actual clock-correction confirmation CLEAR. The only game correction is race-clock top30→70; no input/physics/save/flag change. Conflict-free source merge needs no repeated gate.

Native Harbour keyboard lap b4a00a85 completed90.258333s with11192 real keyboard-input/physics calls, zero crashes/boundary/checkpoint resets and zero stuck period; four-lap target unchanged, one lap observed. Original stock autopilot complete03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe trace is unchanged, including its known146.314s/gameover; that is comparison, not lap success. No accepted lap was repeated. Final eab3 native screens passed all4 Harbour/Woods1920x1080/2560x1440 cases,480 exact warnings,426 matching corner names and16 C transitions,0issues/warnings,private16310/memory-only. Actual dimensions1080 map432/384.031,mirror576x180,warning110;1440 map576/512.031,mirror768x240,warning146.656. Clocky70..150.796875 clears utilitybottom63.5/positiontop160; all overlaps empty. Root inspected unobscured native images and actual receipts. High quality only: no Performance/frame pass claimed.

Canonical receipts remain in integration .evidence/2026-10-13/RELEASE-CONTROLS/{final-eab3b136,native-b4a00a85,stock-harbour}. Original failed native/oracle/panel packets remain honest. The source lane's .evidence junction alias will be removed; use these physical integration paths. Claude now prepares the final candidate and runs exact-commit full/jobs4 alone plus applicable release evidence, then safely installs and pushes master and integration/wasteland under Kyle's approval. Preserve every other dev switch, real saves and open races. Root recycles only this run's merged native lane after unlinking both verified junctions; release receipts remain until Claude consumes them. Current native/source green is not yet an exact-commit full release pass.
## Kyle, 13 October evening: no on-screen corner sign

Seeing the top-centre warning panel, Kyle said: "this is not what we want. I was thinking of little sign posts like what you've already got at Tremblant, just to make them a bit bigger, that's all."

The on-screen corner warning is removed before release, together with its code and tests, in the release lane (RELEASE-CONTROLS). The larger trackside braking boards and chevrons, the map fix and size, the larger mirror and the four camera views all stay. Do not bring back an on-screen corner sign.
