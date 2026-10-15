# TYRE-SLIP

Status: building in thin source slices, behind no runtime caller yet. This is not a completed playable feature or merge candidate.

## Pure grip foundation

Config now contains the independently reviewed constants and pure grip/scrub, braking peak/demand, exponential slip, drawn-angle, tyre-loop input and steerForYaw helpers. DRIVE and the complete released steeringYawAuthority function remain byte-identical. The helper's switch-off and all arena inputs reproduce existing steering; switch-on automatic steering asks for at most the braking-adjusted peak. No simulation, keyboard, audio, save, flag or driver call site changes yet.

The new tests were written first and failed for the missing exports. They check literal reviewed Casual/Pro values, the shared low-speed steering grip, fixed demand sensitivity under braking, full-lock/snow examples, exact exponential partition independence, drawn-angle/sound bounds, legacy steering over a speed/grip/traction/car grid and the on-rule peak ceiling. The exponential formula gives1.24690156 at0.5s from0 toward1.25; this follows the settled12/s rate and satisfies the reviewed1percent requirement. It does not substitute a different rate for the card's approximate illustration.

## Still required

Per-race dev flag and state/reset wiring; keyboard mapping against the current STEER-055 table; simulation/scrub and independent audio input; every named driver-helper copy; actual drift retune and versioned rows; arena/CPU/off parity, replay pins and all existing macro acceptance. Final nearby/jobs4, build and independent code/save review precede any merge. No live/preview install, old pin regeneration or new sound cue.

## Removed

Nothing. The feature remains uninstalled; the future approved switch-on release owns removal of legacy branches as the card states.
