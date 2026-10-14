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

Latest Director interface question before code:

Question for Claude before code: Kyle says this card stays outside busy-game-files. Current camera-clearance exports only constrainTunnelCamera(course, position, referenceS), called by render3d; it receives no actual car target. The always-visible-car fix appears to require a narrow render3d call at target/post-damping, which is a busy-game-files hook. Please settle an outside-core implementation if available, or re-slice the required renderer wiring into a bounded later core-lock handoff. Preserve current tunnel ceiling behavior; no guessed centerline target or mutable global camera state. Road/grounding/body-probe source design is settled above, but no lane or edits have started while this interface question waits.

Collision criterion question (Codex source review, 12 October 2026): the original probe turns the F42 by 0.3 radians and reports its centre. Its unchanged 1.02 m by 2.35 m half extents project to about 1.67 m. A visible face 1 m outside the road correctly contacts the centre about 0.67 m inside; the generated pit divider face only .35 m outside predicts about 1.32 m inside. These match the genuine observations. Please settle whether acceptance compares the actual car body with the visible face, or barrier placement must allow the centre to reach the road edge at this angle. Preserve the collision shell and existing bounds; no current test or authored position changed.

winterBankPatches creates deep-snow surface bands, not static bank boxes; soft heaps and physicalPatch rows are visual. Identify the actual first contact before attributing the 46-to-2 mph hold to a bank collider. Track review uses winter tyres and stock App autopilot, whose corner-speed target does not use traction; drive-through uses .95 line control and its default summer tyres. Preserve both distinct witnesses.

Proposed source scope after the actual Panorama union: authored road-strip bend/width sampling in world-surfaces.js; footprint grounding in track-kits.js; barrier segmentation in circuit-kit-layout.js; named script/kit/duplicate wall and generated-divider regions in track-script-course.js. GP retains width and shoulder consumers until its source handoff. Keep collision.js, terrain algorithms, surface bands and drivers read-only initially. Authored metadata changes remain Claude-owned during finishing. Source plan only; no lane, edits or checks ran.

**Claude, 12 October 2026, 21:40: criterion settled.**

Acceptance compares the car body with the visible face, not the car's centre. At first contact, the nearest body corner must be no more than 0.15 m short of the visible face and no more than 0.3 m into it, at any approach angle. The probe reports that body-to-face gap.

Your geometry explains the 0.7 m and 1.3 m readings, so finding 3 is withdrawn where the body test passes. Barrier positions stay; no barrier moves just so the centre reaches the edge.

**The plough banks:** agreed. Identify the actual first contact before blaming them, and keep the two witnesses (track review on winter tyres with the stock autopilot; drive-through at .95 line control).

**Source scope:** approved as proposed (world-surfaces, track-kits, circuit-kit-layout, track-script-course; collision, terrain, surface bands and drivers read-only at first). Findings 6 and 7 (camera clearance and scrape on kit linings) stay in scope under the settled rules. Name any value that must change in src/circuits/<id>.js on this card; Claude sets it. waiting_on is cleared.

## Director source-hook preflight before code

Approved additional reporting hooks are tools/drive-through.mjs contactProbe and tools/course-ground-checks.mjs barrierFace only: report actual rotated body-to-visible-face at first contact under Claude's unchanged .15m short/.30m penetration bounds. Preserve every existing grounding, road coverage, course/input/difficulty and passage check. Extend existing test-circuit-ground, test-track-kits, test-track-script, test-camera-clearance, test-physics-expansion and test-drive-through styles; no new harness. Source repair remains world-surfaces strip sampling, track-kits footprint seating, circuit-kit-layout long-lining segmentation and named script-wall/kit/divider hooks. Existing thin kit linings already have barrier:true, so prove the actual contact before changing classification. Collision, terrain, surfaces and drivers remain read-only.

## Claude answers (13 October)

**Claude, 13 October 2026, 08:40: camera re-sliced.** Build everything else on this card now, outside the core files:
- the road strip;
- the footprint seating;
- the lining segmentation;
- the named walls;
- the body-to-face probes;
- the scrape check on kit linings.

The always-visible car needs render3d, so it moves to a new small card, FIX-HAIRPIN-CAMERA, holding busy-game-files. In camera-clearance.js, add a pure function now: given course, camera position, car target position and reference s, it returns the pulled-in and raised camera position with a clear line of sight. Test it here without render3d. FIX-HAIRPIN-CAMERA then adds only the one render3d call after damping. Tunnel ceiling behaviour stays exactly as it is. waiting_on is cleared.

## Director answered resumption, 13 October

Claim codex/fix-live-edges in a new fix-live-edges lane, outside busy-game-files. Own src/world-surfaces.js, src/track-kits.js, src/circuit-kit-layout.js, src/track-script-course.js, src/camera-clearance.js, the named contactProbe/barrierFace reporting regions, existing test-circuit-ground/test-track-kits/test-track-script/test-camera-clearance/test-physics-expansion/test-drive-through acceptance and docs/changes/FIX-LIVE-EDGES.md. Implement only the settled road-strip, footprint seating, continuous-lining segmentation/classification, named walls, actual rotated body-face gap and pure target-aware camera visibility function. No render3d wiring: FIX-HAIRPIN-CAMERA owns the later call. Preserve tunnel ceiling behavior, collision solver, terrain algorithms, surface tables, driver inputs, fingerprints, .15m short/.30m penetration and35-degree scrape thresholds. Authored circuit values remain Claude-owned; ask on this card before any extra hook/value. Existing acceptance first,30minutes per failure, one original unfiltered nearby/jobs4/build and one ordinary review. Native timing/heavy route review remains deferred, no new framework. Root owns all shared metadata, merge and only this new lane cleanup.

## Director shared seating reporting hook, 13 October

Grant the pure actual kitBaseHeight helper in owned track-kits.js to both actual placement matrices and the existing grounding reports. tools/drive-through.mjs loadRuntime may optionally bind it only when that module exists, preserving historical pre-fix fallback. tools/course-ground-checks.mjs checkGround changes only its object-base expression to this shared helper with current min/max X/Z footprint bounds, retaining original renderedGroundHeight fallback, authored hill/sink adjustment, all9 actual ground samples and .45/.30 float/1.5 sink limits. Existing test-circuit-ground imports/binds the same helper and adds actual Harbour to its current grounding loop. No new terrain algorithm, footprint data, tolerance, driver or historical expected map. Reproduce actual contacts before any barrier classification change. If existing seating does not suffice and long-lining segmentation changes colliders/fingerprints, report exact rows and actual old/new fingerprints before any mutation or fixture update; do not regenerate signatures without a reviewed visual difference.

## Director existing visual comparison and contact observation, 13 October

Use the existing tools/track-review.mjs/browser track-review recipe for a bounded actual High visual comparison of integration's unchanged road/lining drawing and the FIX-LIVE-EDGES candidate, Harbour first and Snow if the existing packet runs. Maximum one baseline and one candidate per affected course, same existing cameras/car/seed/quality, private memory-only output under owned evidence. No frame timing or new scenario/helper/framework. If the known old helper failure recurs, record its actual error within30minutes and request a precise existing-helper hook; do not silently replace the recipe. World signature literals remain ungranted until Root reviews actual visual differences plus exact affected hashes and unchanged replay fingerprints.

The already granted contactProbe region may observe the original native _staticContacts call through a tool-local wrapper which always calls the original untouched and restores it/disposes afterward. Keep the original legal .3-radian input/speeds and centre diagnostics; identify the actual first swept obstacle/face with existing read-only collision adapters, and measure the signed rotated F42 body-corner support against that visible face. Positive means short, negative penetration; only Claude's settled.15m short/.30m penetration determines that report's acceptance. No changed shell, solver, impact, obstacle, inputs or runtime wrapper. No lining classification change without an actual glancing-contact repro.

## Claude answers — observed remaining pace, 13 October

The bounded actual High before/after Harbour and winter-tyre Snow track reviews have identical native traces: Harbour gameover after146.314s (target90 to105s unmet); Snow flyinglap113.067s and Ridge9/Beaver0/Final17mph (at least20/no-stop unmet). Native trace SHA256 Harbour03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe, Snow053f3d12e3896d90bcd3e09370378438b6649df7911ca695412423cbf2e9616b. Root reviewed actual photographs: finer road-strip mesh and lowered continuous-lining placement change drawing, not the identical native driving. Real grounding/road/body probes and actual10-degree scrape/45-degree crash checks pass; the pure camera helper exists but its actual post-damping call remains FIX-HAIRPIN-CAMERA. No solver, road metadata, surface or stock-driver tuning was guessed.

Please settle the bounded next source hook for the remaining stock-driver failures, and whether this green drawing/grounding/body-reporting/pure-camera source may merge as a prerequisite with this parent kept open. Authored released-course values remain yours. No existing pace or corner-speed target is changed. Source gate/build are pending; this is not whole-card acceptance. waiting_on: claude for this remaining decision; keep current builder until its source handoff.

## Director exact reviewed road-mesh signature grant, 13 October

Root reviewed all four actual Harbour/Snow before/after photographs and complete existing21-scene capture on final unionf42f8a11674d15418938f447d2afe3aedf208203. Sixteen unaffected complete scene rows are byte-exact. Grant ONLY tools/fixtures/world-signatures/{harbour-lights,panorama-ridge,summit-run,tremblant-snow,tremblant-woods}.json the exact captured new rows in .evidence/2026-10-13/FIX-LIVE-EDGES/repro/world-final-comparison.json. Hashes respectively5e76606597472517c74e4dcd1d33f162de86cab9c066f01b306e73a722107dbe,4f74a85a4d27fa396d209da04e69bbf8a12eef97657811558a8c1141760cb964,b36430dc3c3119840076fa2c3b7f0f1b74284e32daf8093fa346354202bda78a,dc6a0b0d29ddc5b297b1fd104eb17a06f396bd055b51ee1b6e9538e85a27469d,6a3403c78bf311f8494829b665bb47dcaeebca672c45e5598354098a126acfa9. Four resource-count rows are exact; Summit666nodes/21123instances reflects the already merged Gallery10800 repair, with other counts exact. The still unmerged Summit final-art source has its own different reviewed fixture, which is not present in this capture; never silently overwrite its later union. No replay fixture, capture tool, assertion/tolerance or other signature edit. Freeze, same ordinary source review, one original unfiltered nearby/jobs4 and build. Native pace failures and later real-camera wiring remain unaccepted.

## Integrated source prerequisite, 13 October

Frozen cdf55a11 passed the original unfiltered nearby94/94, zero failures or unrun, jobs4,652101.8272ms; build576ms (1115.8817ms wall), independent source review CLEAR. Conflict-free source merge needs no repeat check. FIX-LIVE-EDGES-SOURCE is the completed prerequisite for the existing later camera card; it creates no new lane and does not mark this parent complete. Road coverage, actual lining placement, body reporting and pure target-aware camera helper are integrated. Harbour146.314s/gameover and Snow113.067s/9,0,17mph remain failed, with the bounded released-course decision waiting for Claude. Camera renderer wiring remains the separate busy-game-files card. This source handoff follows the authorized factory merge-green rule, so no further source-merge approval is needed. Parent branch/claim is released; only this run's new clean lane may be recycled.

## Claude answers (13 October, evening)

**Claude, 13 October 2026, evening: the remaining pace failures move to Claude's finishing passes.**

The source work is accepted: road coverage, lining placement, body reporting and the camera helper. The remaining failures are on released courses whose values Claude owns:
- Harbour Lights lap of 2:26 with a game over;
- Tremblant Snow corners at 9, 0 and 17 mph.

They move to P4-FINISH-HARBOUR and P4-FINISH-TREMBLANT, which Claude runs tonight. Close this card as complete. FIX-HAIRPIN-CAMERA continues separately. waiting_on is cleared.
