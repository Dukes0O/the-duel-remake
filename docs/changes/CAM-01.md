# CAM-01: on-foot camera choice

## Independent runtime red contract

The preference is separate from the existing car camera: validated
`raceSettings.footCamera` defaults to `first-person`, with `overhead` the only
other value. App set/cycle methods preserve simulation input and car view.
Foot-only KeyC toggles it; no gamepad mapping is added. Named-player storage,
flag-off effective default and the pre-write backup seam remain required.

Before implementation, `test-onfoot-camera-choice.mjs` ran four runtime groups:
0/4 passed in 0.19 seconds, with expected absent preference, migration detection,
App mode and KeyC failures. All storage is synthetic memory. The existing exact
saved-preference assertion in `test-race-settings.mjs` adds only the approved
`footCamera: 'first-person'` field and retains every previous value. This
intentional additive-schema assertion will be independently reviewed.

Pure pose/aim acceptance follows in the same owned suite. Existing short
race-settings, input-contexts, onfoot-controls-camera and backup checks will run
once against completed source before any broad gate. Browser checks and source
review cover actual body/gear switching, reticle wiring and navigation cleanup.

## Independent presentation red and assertion review

Added three bounded presentation groups to the same suite: unchanged exact
first-person pose plus real behind/above overhead placement; final actual-eye
terrain/tunnel clearance across all eleven combat courses; and aim-ray
projection through actual Three cameras, including overhead parallax. Inputs
are frozen and repeated poses are exact. The terrain group uses two road
positions per course and one actual tunnel midpoint where available. Bounds
follow the existing 0.65 m ground and 0.45 m arch margins, with a short boom.
No simulation targeting or weapon rule is changed by this contract.

Before presentation source existed, the combined suite ran 5/7 in 0.88 seconds:
runtime work had already made its four groups green, while overhead-behind and
missing aim helpers remained red. The terrain control already passed for the
old first-person eye; the separate overhead assertion prevents that control
from falsely proving the requested new mode. Actual body/gear/reticle wiring,
metrics invalidation and navigation remain independent source/browser review.

The Director independently reviewed `8f73859` and approved the exact existing
race-settings assertion change: only `footCamera: 'first-person'` was added,
with every previous value and assertion retained. No other old test changed.
## Preference and input implementation

Runtime source is `e3ae8ac`. The four independent runtime groups pass.
The affected existing controls ran once before review:

- Race settings: 42 checks passed.
- Input contexts: passed.
- Existing first-person controls/camera: 1 test passed.
- Career backup: stopped at its current-format fixture on line 67. That fixture
  writes an empty raceSettings object, which now correctly requires backup for
  the missing footCamera field. The independent author and Director are
  reviewing an exact fixture addition; no assertion was changed by the builder.

The additive named-player preference defaults to first-person and accepts only
first-person or overhead. Old or malformed raw values trigger the existing
verified pre-write migration backup. No new schema version or storage key is
used. Future Wasteland profiles retain their existing startup protection, and
this setter rejects them. Flag-off uses first-person without overwriting a
stored preference.

Foot KeyC changes only the presentation preference. Car cameraMode, car keys,
gamepad mappings, race choices and fighter input stay unchanged. Switching the
view does not clear held actions; pause and menu explicitly clear held mouse
look, fire and aim, including when pointer lock is already released. Menu also
releases an active on-foot pointer lock. Existing re-entry cleanup remains.

The independent author's approved exact saved-preference expectation adds only
footCamera: first-person; the old values remain. This matches the additive
schema rather than relaxing validation. Renderer, UI, camera geometry, browser
evidence and the final gate are separate pending work.

## Independent runtime and save review

Reviewed `e3ae8ac` against the reviewer and Save Guardian requirements. No
concrete runtime defect was found. The stored preference is separate from car
cameraMode and race start choices; set/cycle does not change fighter inputs,
aim, movement or weapon rules. Flag-off exposes first person without overwriting
the stored choice. Named-player restore and the existing session-only save
failure handling remain intact. Pause/menu clear pointer actions; menu releases
foot pointer lock. No gamepad mapping or storage key was added.

The source author ran the required existing short controls once: race-settings
42 checks, input-contexts and onfoot-controls-camera passed. The backup test
caught its old current-format fixture at line 65, which wrote raceSettings:{}
and then asserted migration was unnecessary. The new raw enum guard correctly
requires a backup for a missing footCamera value. The Director approved only
adding footCamera:'first-person' to that one migrated fixture. `1f333b0` makes
that exact change; all historical/damaged fixtures and false/null no-migration
assertions remain unchanged. The focused backup suite then passed all seven
fixtures, migration, validation, recovery and quota checks (0.27 seconds).
The exact diff was sent back for independent Director review.

Independent existing save checks also passed once because the saved settings
shape changed: seven historical shapes/247 preservation checks, the 64-player
career budget (5,559,976 raw UTF-16 bytes, 230 physical bytes, maximum ghost
journal 2,500,604 / 4,000,000), and all six Wasteland profile migration/future
format checks. Combined process time was 1.24 seconds. All storage was memory
only. The original verified startup backup barrier still precedes App creation.
Presentation review, bounded visual evidence and the required lane/build gate
remain pending; no broad gate has run yet.
## Independent presentation review and remote-tunnel regression

The Director independently approved exact backup-fixture correction `1f333b0`:
only the new default was added to the current-format row; existing false/null
and preservation assertions stayed intact.

Reviewed presentation `c264692`. The old first-person pose is preserved, the
car camera stays separate and optional menu controls preserve partial consumers.
Overhead suppresses first-person gear while reusing the local fighter's existing
rig/fallback. Pose is copied directly, so smoothing cannot undo its final ground
check. The renderer skips its later car-roof constraint for overhead. Foot mode
invalidates presentation metrics. Reticle projection uses the existing fighter
origin/direction and actual camera; it neither snaps to targets nor changes aim.

One concrete defect was found before capture: High Country seed 1989, first
tunnel midpoint s2245.6, actual-ground fighter at lateral28.3 with tunnel width
8.3. A route-coordinate-only tunnel constraint pulled the camera 21.476 m away
into the unrelated tunnel. Independent regression `30481d5` reproduced it:
7/8 groups passed, only this outside-tunnel case failed (1.09 seconds).

Source fix `1b76d26` rejects tunnel correction when the candidate eye is outside
the tunnel width plus its existing clearance margin. Independent review confirms
the nearby-wall, inside-roof and final terrain checks remain, with first person
unchanged. The combined suite now passes 8/8; existing on-foot and combat HUD
checks also passed per the source author. Final reviewed source tree is
`cb889c14b761db3a3e1c328e131fe2140e4fee69`. No concrete source defect remains;
R1 capture is cleared. No additional save rerun is needed after these visual
changes. Two scored compact rounds and the required lane/build gate remain.
## Presentation handoff and retained look rounds

Source c264692 adds a pure overhead pose, real-camera-XZ terrain clearance,
bounded tunnel correction, projected existing aim ray, menu setting and
foot-aware camera action. First-person remains the exact default selector path;
existing body rendering is visible overhead and first-person gear is suppressed.
Frame metric invalidation includes foot mode. No simulation or weapon behavior
is changed by presentation. Existing optional menu fixtures remain supported.

Independent review found a remote hillside pose sharing a tunnel route
coordinate could pull the camera21.476m. A new red control preceded1b76d26,
which applies tunnel limits only near its physical width. Combined acceptance
8/8 passes, including11combatcourses and frozen pose/aim controls. Existing
onfoot-controls-camera1 andcombat-hud7 passed on presentation source. No
acceptance assertions were weakened by this owner.

Two scored look rounds retain11actual images each, separate desktop/phone
sheets, copied browser reports and hashes under looks/onfoot-camera-choice.
Private ports25211/50514, zero warnings/errors. Actual setting/KeyC/aim/fire,
repair40→80, pause/pointer release, real resume button and re-entry towide car
view passed inbothqualities. R1 failed attempt27669 usedEscape toresume;
its images/report are preserved. The corrected fixture uses the production
resume control; no production change was needed for that failure.

R2 source670f81f changes only thephone onfoot minimap sizing/placement. Its
fixture hides the exactMENU QA summary's directbodydetails andthe
#performance-results details ancestor, preserving all production overlays.
Author cleared this narrow source before capture. Camera/aim/modeldata remain
unchanged; original R1 evidence is immutable. Director scores separately.

Bounded120frame absolute samples: R1High18.2ms/Performance18.1ms p95;
R2both18.2ms. No paired feature-offbaseline orpercentage overhead is claimed.
Scene draws/triangles749/2,229,271 High,426/1,231,808 Performance include
existingpasses. Required lane/build remains the final independent gate.

## Final independent review and required gate

Independent review cleared R2 source `670f81f`: the 116 px route HUD adjustment
is limited to on-foot screens at 600 px or narrower. Desktop and car views are
unchanged. The capture fixture hides only the two identified private QA panels;
production controls remain visible. Camera, aim and art values did not change.
Director acceptance `45ec1e8` follows final retained evidence `ad83b91`.

The required gate ran on clean commit
`45ec1e85979cb37f98e4471998d79f2840be7596`:

- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`:
  232 passed, 0 failed, 0 not run; 302.18 seconds (302.36 seconds wall time).
- `npm run build`: passed in 0.98 seconds; Vite completed in 497 ms. Its existing
  large-chunk advisory remains; no build error occurred.
- Logs: `.qa-dist/cam01-final-lane.log` and `.qa-dist/cam01-final-build.log`.
- HEAD and working tree stayed unchanged and clean through both commands.
  Source tree `0f559a26003c5625d58b946ea1565985b281d562` and tools tree
  `4688c96a49edcf88740bc4c9ddcefe11b9d5019a` match before and after.

This final note is evidence only. CAM-01 is ready for development integration;
this is not a release claim. No further optional tests or captures were run.