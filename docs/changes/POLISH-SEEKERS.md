# POLISH-SEEKERS

Status: implementation reviewed; lane gate needs a fresh run before merge.
Waiting for Claude's
Rocket Pods hit-rate target or acceptance of the existing balance report.

## Design and implementation

Nearest eligible enemy car inside 20 degrees / 120 m, with clear smoke and
scenery line. Each rocket acquires at launch, travels at 80 m/s and turns at
most 35 degrees/s in 3D. Lock loss is permanent. A real Decoy Drone within
25 m can pull it once; Mirage clones cannot. Gunn keeps his committed point.
The dev switch is seeker-rockets and Preview requests it. Damage stays 10;
Shield remains the counter. Scene-only brackets track live locks. The new
weapon.rockets.lock cue is a short two-tone synth.

## Checks

- Acceptance tests started red; final focused tests 17/17. Cover nearest/cone,
  walls/scrap/smoke, permanent loss, 30/60/144 Hz turn cap, 3D speed, moving
  launcher, shield, CPU, Gunn, Mirage rejection and actual drone contact burst.
- Existing focused checks: wave two 39, feature flags 74, core 598 checks,
  runtime 209 subtests, wave-two audio 21; all pass.
- Private memory-only browser: High and Performance passed, four captures,
  zero console warnings/errors. Lock tone peak .03949, RMS .005009. Shield
  armor remains 100; brackets disappear when the volley ends.
- Arsenal balance, arsenal + seeker-rockets, wave-two-only: 30/30 checks,
  20 wins, 416 player / 55 CPU rockets, no unattributed damage. Its calibrated
  hit-rate band covers Crossbow only, so no Rocket Pods target was invented.
- Latest build passed: 294 modules, 555 ms; existing large-chunk warning only.
- Initial broad lane runs exposed two historic sound-bank pins. Director
  approved excluding only weapon.rockets.lock from each legacy bank slice;
  the original hash assertions remain unchanged. Core audio 14/14 and
  wave-one audio 36/36 pass. Feature-flag count changes 16 to 17 for the new
  flag; its dev isolation assertions remain intact.
- Last lane gate: 353 passed, one failed, ten not run in 892.29 s. Failure
  was the Wasteland beta exact manifest missing the new dev flag. Director
  approved adding only seeker-rockets: dev; all existing assertions stay.
  Its focused eight tests now pass. Manifest scan found only that pin, the
  corrected feature count, and the already-passing dynamic Preview check.
- Gate replay fingerprints: all 162 unchanged. The switch-off rules path is
  retained. Director deferred another broad run while Claude's balance
  decision is pending; a fresh lane gate and build are required before merge.

## Removed

No runtime assets replaced. The switch-off rocket path stays until release;
remove it when the feature switch becomes permanent.
