# FIX-HAIRPIN-CAMERA

## Changed

Normal third-person vehicle cameras now call the approved pure clearCameraSightline helper after damping and existing tunnel/mountain constraints, immediately before lookAt. The actual camera copies the returned position. Its sightline target is the placed player mesh position plus the existing body aim height:1.65m for Titan,1.05m for ordinary cars. The 26 m forward look remains the normal aim when the actual car is in frame. The framing correction below chooses the placed car body otherwise; the obstacle-test target remains the placed body.

Menu, hood, on-foot, Deep, journey, spur, yard-home and explicit inspection camera overrides bypass this call. Existing tunnel checks and every other camera/renderer branch remain exact. No simulation, save, geometry, feature flag or race-state change.

## Validation

The existing pure camera-clearance acceptance covers the helper. No new call-mirroring test, harness, native browser, frame or full check is added. One original unfiltered nearby/jobs4, build and independent source review remain required on the frozen source. Actual Lantern Hairpin apex photography and the Harbour lap sightline sweep remain open for the daily full check; source checks cannot claim that picture. No release or live game change.

## Changed assertions

All original assertions stay exact. The framing correction adds real perspective-projection acceptance; it changes no old limits.

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

## Observer bounds correction before execution

Ordinary review found the native observer's zero-size sweep defaulted to measured modelMinY/modelMaxY, while the actual camera helper reads authored minY/maxY (falling back to y/height). scenery-bounds preserves separate model envelopes from measured model ranges, so these fields can differ. Director grants only useModelBounds:false on that independent observer query. This matches the helper's original authored box policy; it changes no game bounds, blocker filter, assertion, height, tolerance or camera behavior. No test, native check or build has run on either observer source during the release hold.

## Actual native framing failure and correction, 14 October

The original frozen 965779d8 observer passed 18/18 nearby suites and the build (Vite 820 ms, wall 1471.3899 ms). Its single native packet then failed: exit 1, 558165.2674 ms, all 270 poses and 16,200 observations complete. Twenty-nine settled framing failures occurred from Lantern phase 2044.821499 to 2070.821499 m. There were no frame errors, blocker hits or browser issues. Root viewed the actual apex image and confirmed that the car was absent. The original packet is preserved under native-final-965779d8; it is not accepted.

At the first failure the camera was (-975.5890524510698, 38.68503138833465, 964.8968751048432), and the actual body target was (-984.1301261934653, 36.095000005960486, 966.5034248215527). Its native projection was (-1.0393256542085658, -0.5560602026282955, 0.9553320949438208). Existing course arithmetic places the 26 m forward aim at (-998.0272022253633, 36.085, 951.3105459699659). The clear sightline still aimed beyond the tight bend, outside the car's frame.

Director e4617818 grants one pure selectCameraAim helper and the normal chase/wide renderer hook. After the original lookAt and projection update, the renderer synchronizes the native world matrix and projects the actual placed body. It preserves the original forward target by identity when that projection is finite and inside the original x/y/z bounds. Otherwise it aims at the actual body. Position, FOV, damping, tunnel constraints and obstacle bounds are unchanged. Menu, hood, on-foot, directional, inspection, catastrophic, journey, spur, home and Deep views retain their original behavior.

The existing camera test received the actual Lantern perspective fixture, straight-road preserved aim, exact frustum boundaries, outside/behind/nonfinite projections and input immutability. It failed before the helper existed, then passed all 1408 checks, including the original 1395 clearance checks. No old assertion or tolerance changed. Corrected nearby tier, build and native packet remain UNRUN at this source freeze; Root must inspect the corrected apex pixels before native acceptance. No frame measurement or keyboard-lap repeat is requested.

## Framing correction Removed

No asset, geometry, camera position path or prior check is removed. Only the failed out-of-frame forward aim is replaced when the actual body projection requires it. Root retains the failed packet until its verdict is committed and owns evidence/lane cleanup.
