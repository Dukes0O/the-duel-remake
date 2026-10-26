# LAB-BRIAN-FIX

The original three parts are built and checked on codex/lab-brian-fix.
Brian answers within 2.5 m using the faced target, his final-round face is
replaced, and lab-2 is on. Ordinary bench glides are removed. No merge,
push or live installation.

## Design settled before code

Follow Claude's three parts in order. Brian's permanent sign names him only.
The floor prompt and E use one target: within 2.5 m for Brian and 1.8 m for
machines, choose the one closest to the player's facing direction, then distance
to break ties. Keep Brian a clear step beside each approach. His body is not
a walker collider; the fault is the short range and distance-only selection,
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

No tolerance or game-rule assertion is loosened. Claude's written review of
these deliberate assertion changes remains an integration handoff item.

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
- Recycled this run's .qa-dist, dist and LAB-BRIAN-FIX evidence after the
  verdict was written. The sheet, recipes and runtime model remain. Kyle's
  original preview image and other cards' evidence were not touched.

## Interaction and art results

The real pad approach is (-8.008125, 2.84); Brian stands at (-6.308125, 2.84),
1.7 m away. Old E selected the machine at distance zero while Brian was out
of range. At other overlapping positions distance alone still let the
machine win when the player looked at Brian. Brian is not a collision bound;
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

Scope is the three parts Kyle explicitly requested. Integration gained a
fourth navigation section during this run; it is not included in this commit.
The user's no-merge instruction was preserved after automatic approval review
rejected an inbound docs merge; no merge or push occurred. No live-folder or
real-player-save access, release, frame timing, new dependency, paid service
or new voice line.

## Session end

STATUS regenerated without a live-root argument. Cockpit task T-059 now names
LAB-BRIAN-FIX in its notes; the required integration-board sync sets it to
In Progress because the expanded card remains building. The local Cockpit
was rebuilt. Other new lesson cards remain for their owners to map. That
build reported existing calendar/inbox re-consent errors; no feed or account
work was attempted. Source checks and the game build are green.

Open for integration: Claude's written assertion review. The later-added
navigation part 4 is outside Kyle's original three-part lane instruction.
