# LAB-BRIAN-FIX

The original three parts are built, checked and approved on codex/lab-brian-fix.
Brian answers within 2.5 m using the faced target, his final-round face is
replaced, and lab-2 is on. Ordinary bench glides are removed. No merge,
push or live installation. Part 4 adds click, keyboard and map navigation.
Current integration was merged into this lane at Claude's explicit request;
only its generated STATUS snapshot conflicted, and is regenerated at the end.

## Design settled before code

Part 4 (Claude's follow-up): click, map and keyboard selection share one
travel request. Route through clear obstacle corners, then walk using the
existing acceleration and collision controller; open only after arrival.
Dragging starts after 5 pixels. Manual walking cancels travel. Tab cycles
physical machines, including the shared tunnel, and Enter travels. The map
uses the room layout and marks machines passed from the existing lesson rows.
Ignore objects at or below 0.5 m and the loose weights-and-cans cluster.
Keep large machines and Brian solid, with axis-separated wall sliding.
Brian's face, lesson files, saves and rewards are unchanged.

Part 4 checks: real-footprint routes and arrivals for every machine, four
signs, Brian and the board; low-clutter traversal and wall sliding; one
memory-only browser scenario using clicks, then Tab/Shift+Tab/Enter. Finish
with the required lane tier (jobs 4), build and independent code review.

Follow Claude's three parts in order. Brian's permanent sign names him only.
The floor prompt and E use one target: within 2.5 m for Brian and 1.8 m for
machines, choose the one closest to the player's facing direction, then distance
to break ties. Keep Brian a clear step beside each approach. At diagnosis his
body was not a walker collider; the fault was the short range and distance-only selection,
not a blocked E handler. At the pad approach Brian stands 1.7 m away, outside
the old 1.3 m range while the machine wins at zero distance.

Round 3 keeps the existing CC0 body, clothing, glasses and apron. Fit larger
dark irises under shaped lids, soften the beard with shaded stubble, and give
the mouth a gentle smile. Inspect close and at 2 m before making look-5.

Once the interaction and face pass, turn lab-2 on. Remove the unused ordinary
bench glide camera. Keep the dedicated restoration and secret fan views where
those sequences need them, with immediate camera placement rather than glide.
The fifteen unreplaced benches remain until LAB-LESSONS-2.

## Checks planned

- Real-footprint walking/selection regression at Lift and two other machines;
  browser E opens both Brian questions and reads the answers.
- Round-3 close and 2 m render review; Kyle-angle before/after sheet.
- Lab, save, switch and hygiene suites; full Lab browser flow with lab-2 on;
  lane tier with jobs 4 and production build. No frame timing.

## Changed assertions

- `test-feature-flags`: lab-2 moves from the exact dev list to the exact on
  list. The total switch count and other states stay unchanged.
- `test-lab-walk`: the two false opt-in expectations become true, and a new
  production-without-query assertion is true, because Lab 2 is released.
- `test-lab-walk` also adds real-footprint walking and selection checks at
  three machines: reachable approaches, a clear standing place, facing Brian
  versus the machine, and both sides of Brian's 2.5 m range boundary.
- `test-lab-fan-view` adds car/tunnel scale and position alignment in both
  layouts, an in-hall camera, and a real-footprint sightline clearance above
  0.75 m from Brian. This prevents the observed foreground obstruction.
- The Blender recipe enforces the existing 8,000 close-up triangle limit;
  the new sheet recipe enforces the unchanged 500 KB sheet limit.
- `test-lab-view`: remove the obsolete spare-glide-pose expectations with
  their deleted generator. Replace them with a check of every lesson keeping
  the eye-height entry camera and goal unchanged. Resource checks remain.
- `test-lab-restore`: add an exact position/goal equality proving the retained
  tank shot applies immediately. Its existing tank-goal assertion remains.
- Browser `lab-walk`: E at Lift now expects the visible five-step lesson
  instead of the retired Lift slider panel. It looks at the selected machine
  before E, tests E and both answers at three machines, and checks default-on
  walking instead of the obsolete default-off overview. New captures assert
  measured distances within 5 cm. Existing board, lock, camera-position,
  answer and close/reopen assertions remain.
- Browser `lab-lift-2`: remove the private lab-2 opt-in and look at the actual
  Lift approach before E. Remove only its incidental Brian photo detour;
  no teaching, force, input, hint, load, prediction, notebook or challenge
  assertion changes.
- Browser `lab-view`: run the complete new Lift flow before the workshop
  flow. Its old 3,000 kg/full-power slider readout and ready-button checks
  are replaced by that full five-step flow, including a real overloaded
  Dusthawk and three crates and the unchanged flight challenge. Read the
  visible door board; walk to Strength and use E instead of clicking hidden
  lesson buttons. Caption visibility is checked at Strength, where the
  existing caption remains. Save, purchase price and resource checks remain.

No tolerance or game-rule assertion is loosened. Claude approved the parts
1–3 assertions in the follow-up instruction on 26 October.

Part 4 adds assertions without changing the prior assertions: every real
machine/sign/Brian/board route reaches its endpoint without crossing a solid
object; knee-height clutter and the loose cans are passable; a wall slide
keeps moving; a delayed Brian placement cannot trap the walker. The browser
checks each map dot and actual room target, hover names, passed ticks,
click-versus-drag, stable Tab order across reopening, backwards wrapping,
Enter travel and keyboard access to each panel's Back button. Its tick
assertion was corrected from a shell-corrupted question mark to the actual
checkmark before the first run. No old expectation was relaxed or removed.
The existing lab-walk and lab-lift-2 browser recipes stop their first aisle
leg at z < 4.4 instead of z < 3.6, leaving clearance to pass Brian's new
solid body. This changes input routing only; all E, answer, camera, measured
distance and teaching assertions remain unchanged. The new keyboard recipe
includes Enter's text/keypress event so native panel buttons activate too.

## Removed

- Removed the old permanent E promise above Brian; the floor prompt owns it.
- Replaced pale bead eyes and separate jagged beard polygons in the recipe
  and runtime GLB. One current model remains; no backup asset is kept.
- Removed ordinary bench camera presets, generated spare poses, their
  occlusion raycasts and interpolation. The restoration tank and secret fan
  still need their dedicated shots, now applied immediately. Walking and
  lesson pictures own the ordinary Lab views.
- The fifteen unreplaced bench rule/control panels remain for LAB-LESSONS-2,
  as Claude directed. No lesson rules, rewards or saved progress were removed.
- Part 4 replaces unconditional model blocking with knee-height/loose-clutter
  filtering, and replaces immediate pointer rotation with a 5-pixel drag
  threshold and click travel. No old navigation path is retained as a copy.
- Recycled this run's .qa-dist, dist and LAB-BRIAN-FIX evidence after the
  verdict was written. The sheet, recipes and runtime model remain. Kyle's
  original preview image and other cards' evidence were not touched.

## Interaction and art results

The real pad approach is (-8.008125, 2.84); Brian stands at (-6.308125, 2.84),
1.7 m away. Old E selected the machine at distance zero while Brian was out
of range. At other overlapping positions distance alone still let the
machine win when the player looked at Brian. Brian was not a collision bound;
the E handler correctly used the prompt's chosen target. Placement already
leaves a 1.7 m clear side step, and all real-footprint placement checks pass.

Seven walking tests pass. The memory-only interaction browser passed on
private port 18006: E and both answers at Lift, G-force and Strength; all
board, position and close/reopen checks; zero warnings/errors. Recipe faults
were corrected without relaxing assertions: face the machine after walking
past its approach, give the G-force fixture driving lesson 1, and wait for
room disposal between visits. One over-cap own browser job was stopped;
foreign jobs were untouched. A sandbox-only Vite cache write failed before
browser launch; the authorized elevated harness used its normal cache.

Round 3 self-review inspected the exported GLB close and at 2 m, then in the
actual room at measured 2 m and 1.2 m, eye height 1.6 m. Interim round-3
renders had raised button eyes, then overly narrow openings; both were fixed
before the sheet. Final eyes have broad dark irises, separate pupils and
small catchlights under lids; the smile and feathered stubble have no jagged
edge. The existing clothes, apron and raised glasses remain. Builder verdict:
4/5 for face readability, warmth, form, grounding and scene consistency; no
remaining staring-eye defect found. No frame measurement or frame-cost claim.
Brian is 7,401 triangles and 368,096 bytes, below the enforced 8,000 limit.

Art browser passed on private port 58121, nine captures, zero warnings/errors.
Sheet: docs/board/looks/lab-2/look-5.jpg, 149,902 bytes; recipe
tools/art/lab-brian-sheet.py.
Only the compressed sheet and verdict survive review; Kyle's original is
untouched. Existing lab.clunk, lab.tick and Brian voice cues are reused.

## Final checks

- Required lane command: 58/58 passed, zero failed or not run, jobs 4,
  414.20 s. All 225 replay fingerprints and 47 exact world checks passed;
  no pinned number or signature was changed or regenerated. The helicopter
  fingerprint remains idle|panorama-ridge|116.216667|30.149797|30.764262|
  39.825237|0.031176|-0.000383|? . Hygiene and Blender placement passed.
- Additional card checks: 14/14 passed, zero failed/not run, jobs 4,
  115.29 s. These cover the Lab suites outside the lane plan, save fixtures
  (23 historical shapes, one forged, 1,029 memory-only load/round-trip
  checks) and the focused fan-camera follow-up. Early targeted Lab/view/
  restore checks passed 55 tests; switch suite passed 103 checks.
- Default-on browser batch: lab-view, lab-walk and lab-fan-view all passed,
  37 captures, zero warnings/errors, private ports 35009, 42951 and 49381.
  This covers the complete five-step Lift flow and real flight challenge,
  walking, all three Brian visits, Strength's saved pass, the exact 2,000
  credit shop purchase, room disposal and the secret fan project.
- Picture review then found Brian obscuring the fan car. A one-line
  camera-side correction clears him by 3.34 m instead of 0.30 m. Its new
  clearance assertion requires 0.75 m; nothing is loosened. Only the affected
  fan checks/browser were repeated for that follow-up. The final fan browser
  passed on private port 36658: four captures, zero warnings/errors. Builder
  inspected the finished-car picture: the real car is clearly visible through
  the tunnel glass, without Brian in front. Other passing checks remain valid.
- `npm run build` passed in 1.72 s with System32 first on PATH. Existing
  ineffective dynamic-import and large-chunk warnings remain. No frame timing.
  The lane, additional checks and browser runs also used System32 first on
  PATH and at most four test jobs, with heavy admission checked each time.
- Independent review found and confirmed fixes for the isolated G-force
  fixture, Blender review World's setup and secret fan alignment. Final code
  and assertion review is approved, including the camera-side follow-up.
  Car, compression and retained camera now follow the walking tunnel's
  position and scale. Existing fan assertions are unchanged.

The original parts 1–3 were completed before Claude explicitly requested
part 4 and the inbound integration merge. No outward merge or push occurred.
No live-folder or real-player-save access, release, frame timing, new
dependency, paid service or new voice line. Walking is silent; existing
machine/panel cues remain. Brian's approved last-round face is unchanged.

## Session end

STATUS regenerated without a live-root argument. Cockpit task T-059 now names
LAB-BRIAN-FIX in its notes; the required integration-board sync sets it to
In Progress because the expanded card remains building. The local Cockpit
was rebuilt. Other new lesson cards remain for their owners to map. That
build reported existing calendar/inbox re-consent errors; no feed or account
work was attempted. Source checks and the game build are green.

Claude's parts 1–3 review is complete. Part 4 results follow below.

## Part 4 review

Independent review found two faults and confirmed both fixes: Brian's late
load could enclose a walker in his new collision box, so placement now keeps
clear of the current walker and replans active travel; parallel GLB loading
could change Tab order, so machines are sorted in lesson order before use.
The new overlap regression proves the walker remains free and can route out.
Review also confirmed smooth turning, world-direction steering and facing
the selected target before opening. No further code fault was found.
Browser testing also found a real map overlap: Workshop's label and Rust's
dot overlapped, so a Workshop click opened Rust. Corner buttons now occupy separate rows outside
the dot floor; review confirmed the fix, and the browser checks the intended
control is on top before each click. The full click flow then passed.

## Part 4 checks

- Final lane command: 59/59 passed, zero failed or not run, jobs 4,
  409.33 s. This includes all ten walking tests, the Lab/view/resource tests,
  QA storage isolation and hygiene. All 225 replay checks and 47 exact scene
  checks pass unchanged. The prior 59/59 pass (415.05 s) preceded the map
  overlap fix; the gate repeated because game code changed for that real fault.
- Manual walking/E browser: passed on private port 7096, nine captures,
  zero warnings/errors. Both Brian answers still work at Lift, G-force and
  Strength, with the same measured-distance and camera checks.
- The corrected map browser passed all twelve machines by map and by room
  clicks, all four signs, Brian and the board, hover names, passed tick,
  unobstructed controls and drag-versus-click. Its first keyboard attempt
  lacked Enter's text event for native buttons; the recipe was corrected
  without bypassing keyboard activation or changing the close assertion.
- Final navigation browser: passed on private port 37538, two captures,
  zero warnings/errors. It repeated the complete click flow, then used only
  Tab/Shift+Tab/Enter for all twelve physical machines and their native panel
  Back buttons in a fresh room. Both captures were inspected: the map's
  corner controls are separate from its dots, the passed tick is visible,
  and selection shows its name, map ring and yellow room highlight.
  Memory-only storage throughout; no frame measurement or real save access.
- Final `npm run build`: passed in 1.03 s. Existing dynamic-import and large
  chunk warnings remain. Gates and browsers used PowerShell with System32
  first on PATH; each heavy turn checked the shared inbox and two-job cap.
  Independent review's fixes and final acceptance conditions are satisfied.
- STATUS regenerated without a live-root argument. Integration-board Cockpit
  sync completed; T-059 now includes navigation and the integration handoff.
  Its status stays board-controlled. The local Cockpit rebuilt; existing
  Google feed re-consent errors remain outside this game card.

All four parts are complete on this lane. No open game defect remains from
this card. Brian's approved face and the two other lanes' lesson files were
left unchanged. Review captures, QA bundles and build output are recycled
after committing their verdict; no extra sheet or backup binary is kept.

## Claude review (26 October 2026)

Approved. Part 1: the cause (a 1.3 m range that did not reach Brian from his
approach, with the nearer machine winning) is fixed with a 2.5 m range and
facing-based choice. Part 2: art round 3, the last; the stare is gone, the
eyes now read sleepy rather than warm, and Kyle decides whether a fourth
round is worth it. Part 3: every changed assertion follows switching
`lab-2` on and removing the glide camera; nothing is loosened. Part 4:
click to go, passable clutter, wall sliding, Tab/Enter and the map, proved
by the click and keyboard browser flows (no pictures taken; Kyle sees it in
the game). On the merged result, the switch, Lab, save, Blender-output and
hygiene suites and the build pass.
