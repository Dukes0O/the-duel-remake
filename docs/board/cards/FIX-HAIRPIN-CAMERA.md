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

## Director bounded native observer, 13 October evening

Prepare only new fix-hairpin-native, branch codex/fix-hairpin-native. Own tools/scenarios/track-review.mjs only a DUEL_HAIRPIN_CAMERA=1 opt-in observer and docs/changes/FIX-HAIRPIN-CAMERA.md. No production, driver, harness or new test machinery. Preserve the existing16 photographs and original stock-driver recipe/trace. The new packet labels its full-course controlled geometric camera sweep separately from the stock driver's unfinished race.

Use the actual post-render camera and actual placed F42 scene-root position plus the renderer's ordinary1.05m target height. Check original solid bounds independently via existing sweepObstacle, never call the clearance helper again or use inspection/capture overrides. Sample the whole actual course at25m and the complete named Lantern approach/turn/exit plus26m at1m, including the existing precise apex. Allow fixed60 actual animation-frame turns per controlled pose; retain every blocker intersection/frame error and record transient projections separately from final settled projection acceptance. Capture the actual visible apex car. These are native settling frames, not frame timing. Preserve tunnel constraints and all native errors; no fitted tolerance, fake completed lap or repeated accepted controls keyboard lap.

No gate/build/browser/merge/rebase until RELEASE DONE. Six active build lanes at most: camera, Ardennes, frozen Summit/Deep art, Claude's finishing lane and any active cockpit tool lane; older idle retained lanes are not new builders. Root owns shared metadata, review, merging and only this newly created lane cleanup. Source checks/native execution begin first after the hold lifts; any actual failure follows the30-minute stop and exact source-hook reslice.

## Director actual framing fault and narrow correction — 14 October

Original observer965779d8 passed18/18/jobs4/build but its actual native Lantern poses fail framing despite clear rays: at2044.8215m actual body target projects x−1.039325654, then−1.14093/−1.24969. Root viewed the actual apex image: the player car is absent. No visual acceptance or completed-card claim. The original packet may finish once; preserve every failed frame, blocker and projection. Bounded diagnosis identifies render3d's existing26m forward look, while clearance changes position only. No tolerance or geometry workaround.

Audio source72ca2f33 is now parked untested, busy-game-files handed to this first-priority card. Resume in the SAME owned fix-hairpin-native lane. Own src/render3d.js ONLY normal chase/wide post-clearance aim correction, src/camera-clearance.js ONE pure helper choosing the unchanged forward target if the actual projected player body target is inside the native frustum, otherwise the actual body target, existing tools/test-camera-clearance.mjs real THREE perspective-projection regressions, and own change note. Preserve original camera position/FOV/damping/clearance/obstacles, tunnel ceiling and all menu/hood/on-foot/directional/inspection/wreck/journey/spur/home/Deep overrides. No mutable global helper state, gameplay/physics/save/asset/flag change.

After the existing lookAt and projection update, synchronize the actual camera world matrix, project the actual placed player root plus existing1.05/1.65 height and apply this guarded aim choice for chase/wide only. Keep the original forward look byte-exact whenever the body is inside x/y/z−1..1; reject nonfinite/outside/behind projections. The fallback changes only aim and leaves the physical sightline/position unchanged. Test the observed Lantern camera/target/forward values with real PerspectiveCamera projection; include straight-road unchanged aim and behind/outside target cases, input immutability and unchanged tunnel controls. Author meaningful assertions before fixing source, no new harness.

Freeze for Root independent review. One corrected original nearby/jobs4/build after source fixes and one corrected existing native packet, with exact coverage60-frame settling and all original errors/blockers/flags/state assertions; no keyboard-lap or frame-timing repeat. Root must view the corrected actual apex pixels before success. Limit diagnosis/fix30minutes, then short facts and move on if unresolved. No merge until accepted; no release/push/live saves.

## Complete on integration — 14 October

Clean c8c4a52e passed corrected41/41/jobs4/build1.27s and one independent source review. Actual private memory-only native270poses/16200observations has zero settled misses/errors/blockers/browser warnings or issues. Root inspected and accepted the corrected actual apex PNG with the whole car visible. Merge is conflict-free, no post-merge gate. Source is complete; release/push remain Claude's. Root clears only the owned new camera lane and consumed evidence; core lock returns to audio.
