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
