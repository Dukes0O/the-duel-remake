# STEER-055: road keyboard steering back in balance (Kyle, 14 October 2026)

Kyle: after the 13 October change (FIX-DRIVING-FEEL) the car "steers too slow
for the car"; the acceleration and the steering no longer match. He asked for
about 55% where the old curve started at 78% and the new one at 30%.

## Changed
- `src/keyboard-steering.js`: road keyboard steering starts at 55% (was 30%),
  reaches full lock in 300 ms (was 450 ms) and gives up 30% at 120 mph and
  above (was 40%), through the new exported `KEYBOARD_STEERING_SPEED_DROP`.
  Arenas keep their original 78% / 200 ms curve. The throttle ramp is unchanged.

## Changed assertions (design numbers set by Kyle)
- `tools/test-keyboard-steering.mjs`: the constants check, the five exact
  integrated-authority values (now 0.56875, 0.5875, 0.625, 0.7, 0.865, checked
  by hand from area(t) = 0.55t + 0.75t^2 below 300 ms), the speed-cap table
  (0.85 at 80 mph, 0.7 at 120 mph and above) and the independent pressed-tick
  prediction follow the new curve. Every other check is unchanged. A 50 ms tap
  now turns the car 0.50 as much as a full key (was about 0.30).

## Removed
- The 30% / 450 ms / 40% road curve.
