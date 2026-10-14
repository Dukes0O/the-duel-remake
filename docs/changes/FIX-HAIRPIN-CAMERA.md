# FIX-HAIRPIN-CAMERA

## Changed

Normal third-person vehicle cameras now call the approved pure clearCameraSightline helper after damping and existing tunnel/mountain constraints, immediately before lookAt. The actual camera copies the returned position. Its sightline target is the placed player mesh position plus the existing body aim height:1.65m for Titan,1.05m for ordinary cars. The26m-ahead lookTarget remains the normal viewing aim and is not the obstacle-test target.

Menu, hood, on-foot, Deep, journey, spur, yard-home and explicit inspection camera overrides bypass this call. Existing tunnel checks and every other camera/renderer branch remain exact. No simulation, save, geometry, feature flag or race-state change.

## Validation

The existing pure camera-clearance acceptance covers the helper. No new call-mirroring test, harness, native browser, frame or full check is added. One original unfiltered nearby/jobs4, build and independent source review remain required on the frozen source. Actual Lantern Hairpin apex photography and the Harbour lap sightline sweep remain open for the daily full check; source checks cannot claim that picture. No release or live game change.

## Changed assertions

None. All existing assertions stay exact.

## Removed

None. This adds the one approved call and replaces no model, renderer path or test.

## Final source validation

Frozen389ee8bd passed one original unfiltered nearby34/34, zero failures/unrun, jobs4,244711.1481ms wall; build547ms (1013.8245ms wall), independent code review CLEAR. Conflict-free source merge needs no repeat check. The actual post-damping renderer call is integrated; native Lantern Hairpin apex photography and full-lap sightline sweep remain UNRUN for the full check/finishing evidence. This parent is in review, not completed; busy-game-files is released and only this run's new lane may be recycled. No source proof is called a native picture, and no release/push/live save action occurred.

## Settled native observer before code, 13 October evening

Director28189c9f grants only an opt-in DUEL_HAIRPIN_CAMERA=1 observer in the existing track-review scenario and this note. Production/driver/harness/source inputs remain unchanged. The original16 photos, stock trace and pack run first. The stock driver's gameover is not called full-race or camera-sweep acceptance.

The independent controlled geometric sweep covers the whole current course at25m, the entire actual Lantern piece plus26m before/after at1m, and the existing named review apexS. Ordinary native Harbour/F42/1989 uses its actual renderer and placed scene-root position plus1.05m; no guessed body target, helper reapplication, inspection camera or capture override. Original sweepObstacle reads the unchanged barrier/tunnelWall/kitSolid/trackWall bounds with the existing zero-width/length/height sightline.

Each controlled pose gets60 real requestAnimationFrame turns and existing onFrame/renderFrame calls, not a tight16-draw loop: native damping uses actual elapsed time. Every frame error/blocker hit stays in camera-sweep.json. Transient projections are recorded; only the final settled projection is accepted. The actual apex image remains UNREVIEWED until its car visibility is judged. Complete geometric coverage is separately labelled, with no physics steps between controlled poses and no driven-lap or frame-timing claim. The existing native countdown setup is separate. No fitted tolerance, repeated controls lap or failure discarded.

Source preparation only during release hold. No test, gate, build, browser, merge or rebase has run here. After RELEASE DONE, Root authorizes original nearby/jobs4/build and bounded native packet on frozen source, with one review. Real failures stop at30minutes.

Both own junctions were checked against plain integration directories: node_modules -> C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/node_modules; .evidence -> C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence. Root verifies/unlinks both without following targets before recycling only this new lane.

## Native observer Removed

No production code, asset, old photo, assertion or trace is removed. The optional observer runs only when explicitly requested; default track review stays intact. Existing harness owns its temporary QA bundle cleanup; Root owns new lane/evidence cleanup after the verdict.
