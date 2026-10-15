# TYRE-SLIP

Status: building in thin source slices, behind no runtime caller yet. This is not a completed playable feature or merge candidate.

## Pure grip foundation

Config now contains the independently reviewed constants and pure grip/scrub, braking peak/demand, exponential slip, drawn-angle, tyre-loop input and steerForYaw helpers. DRIVE and the complete released steeringYawAuthority function remain byte-identical. The helper's switch-off and all arena inputs reproduce existing steering; switch-on automatic steering asks for at most the braking-adjusted peak. No simulation, keyboard, audio, save, flag or driver call site changes yet.

The new tests were written first and failed for the missing exports. They check literal reviewed Casual/Pro values, the shared low-speed steering grip, fixed demand sensitivity under braking, full-lock/snow examples, exact exponential partition independence, drawn-angle/sound bounds, legacy steering over a speed/grip/traction/car grid and the on-rule peak ceiling. The exponential formula gives1.24690156 at0.5s from0 toward1.25; this follows the settled12/s rate and satisfies the reviewed1percent requirement. It does not substitute a different rate for the card's approximate illustration.

## Still required

Per-race dev flag and state/reset wiring; keyboard mapping against the current STEER-055 table; simulation/scrub and independent audio input; every named driver-helper copy; actual drift retune and versioned rows; arena/CPU/off parity, replay pins and all existing macro acceptance. Final nearby/jobs4, build and independent code/save review precede any merge. No live/preview install, old pin regeneration or new sound cue.

## Removed

Nothing. The feature remains uninstalled; the future approved switch-on release owns removal of legacy branches as the card states.

## Keyboard adapter slice

The existing adapter accepts an optional per-update latched-rule object. The approved STEER-055 ramp is still averaged before its speed ceiling; enabled road inputs then scale by old authority/new demand gain. All fixed-speed taps and held yaw match the current curve within1e-9 and the recomputed raw caps match the card. Below40mph and every arena identity retain exact old output. Throttle is untouched. The App does not pass the option yet: actual per-race wiring and changing-speed simulation acceptance remain pending.

## Player simulation slice

The dev switch now snapshots once per campaign start and installs its latched boolean only on road stages; every venue/arena is excluded. Actual player driving applies reviewed demand, braking peak, grip falloff, slip drawing and grounded road/gravel scrub. Reverse/airborne tyres shed slip and retain the old yaw path; parked on-foot cars retain old yaw. Existing player stage/crash/actor/journey/on-foot reset sites clear slip without adding fields to CPUs. An actual pre-edit2400step named-state fingerprint protects released driving. Driver/UI/audio wiring and full integration acceptance remain pending; this lane is not merged or release-ready.

## App and tyre-loop wiring slice

Actual App keyboard input passes the latched rules only for a grounded forward-moving car. Stock automatic steering and the one-time shoulder swerve now use steerForYaw with their original authority arguments; brake is computed first. New rules cap the stock driver at the braking-adjusted peak. Drift-specific intentional sliding/retune and remaining named tool/test driver copies are still pending. The audio loop reads a new independent tyreSlipSmoothed input with unchanged gain/pitch/filter/response mappings; legacy smoothedSlip continues to feed road and gravel. Actual existing audio-graph cases were added first and reproduced unwanted squeal at zero real slip before the fix. No new audio harness, cue, recording or mix limit.

The new audio case initially expected legacy smoothedSlip near1 while its chosen old cosmetic input only produces roughly0.77. Its input is now a valid hard-braking legacy angle0.31 (below the old0.336 maximum), which saturates that old channel as intended. The >0.99 independent-channel assertion and every gain tolerance remain unchanged; this strengthens the fixture contrast instead of relaxing a failing assertion.

## Independent early review correction

Reviewer found that the new squeal input reused the shared slip local, so road scrub, its filter and gravel also changed despite the independent legacy state. Added actual paired graph-gain/filter comparisons first; they failed on road gain. Kept legacy slip local for these layers and introduced a separate tyreLoopSlip only for squeal. Every old assertion and new gain tolerance remains unchanged. Full driver/drift/save/macro acceptance is still pending.
