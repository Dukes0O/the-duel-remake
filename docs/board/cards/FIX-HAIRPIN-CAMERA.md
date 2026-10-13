# FIX-HAIRPIN-CAMERA

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Split from FIX-LIVE-EDGES finding 6 (Claude, 13 October 2026). Kyle, playing
Harbour Lights: at Lantern Hairpin the chase camera ends up behind the wall
between approach and exit and hides the car.

## Settled

FIX-LIVE-EDGES adds the pure line-of-sight function in
`src/camera-clearance.js`. This card adds only its single call in
`src/render3d.js` after camera damping, on every course: when a wall or solid
kit piece lies between camera and car, the camera pulls in and rises until
the view is clear. Tunnel ceiling behaviour stays exact. No mutable global
camera state, no guessed centreline target.

## Acceptance

The review frame at Lantern Hairpin's apex shows the car; a sweep of the
camera round the Harbour lap finds no wall between camera and car. Lane tier,
build, one review. Live only at a release on Kyle's "go live".

## Director claim and exact source hook, 13 October

The source prerequisite merged118501b1 and its own new lane was recycled; integration pull is current. Kyle's standing small-repairs priority puts this requested hairpin repair before new audio. Claim busy-game-files only in a new fix-hairpin-camera lane, branch codex/fix-hairpin-camera. Own src/render3d.js only its camera-clearance import and one call after damping and existing camera constraints, before final lookAt; own docs/changes/FIX-HAIRPIN-CAMERA.md. The helper returns a new position, which the actual camera copies. Target the actual placed player vehicle world position with the existing camera body-height values (tall1.65, ordinary1.05), never the26m-ahead lookTarget or guessed centreline. Preserve existing menu, hood, on-foot, submarine/journey/spur/home camera overrides and tunnel ceiling behavior. The normal third-person vehicle views use the same helper on every course. No simulation/save/terrain/geometry/flag change or extra core hook.

Use existing camera tests and one original unfiltered nearby/jobs4/build, fresh all-team Node/Blender inventory before each heavy job and one independent code review. No new harness or tests mirroring the call. The actual Lantern Hairpin apex picture/lap-sweep acceptance remains open for the full check unless its existing bounded recipe can run under the authorized night policy; pure source proof cannot claim that picture. Stop any real tool/source failure at30minutes and record it. Root owns board/status, merge and only this newly created lane cleanup. You are not alone: preserve Yeti, road-edge, Summit/Deep and Claude work.

## Integrated source, native review still open

Frozen389ee8bd passed one original unfiltered nearby34/34, zero failures/unrun, jobs4,244711.1481ms wall; build547ms (1013.8245ms wall), independent code review CLEAR. Conflict-free source merge needs no repeat check. The actual post-damping renderer call is integrated; native Lantern Hairpin apex photography and full-lap sightline sweep remain UNRUN for the full check/finishing evidence. This parent is in review, not completed; busy-game-files is released and only this run's new lane may be recycled. No source proof is called a native picture, and no release/push/live save action occurred.
