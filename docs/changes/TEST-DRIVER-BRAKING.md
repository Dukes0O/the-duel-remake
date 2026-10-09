# TEST-DRIVER-BRAKING

Claude approved a separate all-seed test-driver card on 9 October.

## Decision

The pursuit wrapper currently replaces the ordinary driver's turn braking
with a speed target taken from its rival. Preserve the ordinary driver's
brake request and throttle ceiling when pursuit chooses legal inputs.
Use the greater brake request; pursue only while the ordinary driver also
allows throttle. This applies to every seed. Game code stays unchanged.
Source waits for Crew's final unchanged-driver measurement.

## Evidence

Before/after replays and focused tests pending. Keep all historical targets
and existing assertions. No pass or merge claimed.

## Removed

The pursuit wrapper's unconditional replacement of turn braking will be
removed. No game physics, saves, assets or historical samples are replaced.
